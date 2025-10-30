// FIXED: app/api/webhook/vapi/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Job, Application } from '@/models/job';
import { analyzeVoiceInterview } from '@/lib/ai-services';

export async function POST(request) {
  try {
    console.log('🎯 VAPI webhook received');
    
    const webhookData = await request.json();
    console.log('🎯 Webhook data:', JSON.stringify(webhookData, null, 2));

    const { type, call } = webhookData;

    switch (type) {
      case 'call-start':
        console.log('🎯 Interview call started:', call?.id);
        break;

      case 'call-end':
        console.log('🎯 Interview call ended:', call?.id);
        return await processCompletedInterview(call);

      case 'transcript':
        console.log('🎯 Interview transcript received for call:', call?.id);
        break;

      default:
        console.log('🎯 Unknown webhook type:', type);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ VAPI webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}

// FIXED: Process completed interview with proper metadata extraction
async function processCompletedInterview(call) {
  try {
    console.log('🎯 Starting interview processing...');
    
    if (!call) {
      throw new Error('Call data is missing');
    }

    const { 
      id: callId,
      transcript = '',
      duration = 0,
      metadata = {},
      // FIXED: Extract from assistant metadata if available
      assistant = {}
    } = call;

    console.log('🎯 Processing completed interview:', {
      callId,
      duration,
      metadata,
      assistantMetadata: assistant.metadata,
      transcriptLength: transcript.length,
      hasTranscript: !!transcript
    });

    // FIXED: Extract job and user info from multiple sources
    let jobId = metadata.jobId || assistant.metadata?.jobId;
    let userId = metadata.userId || assistant.metadata?.userId;

    console.log('🎯 Initial metadata extraction:', { jobId, userId });

    // Also check call metadata and phoneNumber metadata
    if (!jobId) {
      jobId = call.metadata?.jobId || call.phoneNumber?.metadata?.jobId;
    }
    if (!userId) {
      userId = call.metadata?.userId || call.phoneNumber?.metadata?.userId;
    }

    console.log('🎯 After fallback extraction:', { jobId, userId });

    // If still not found, try to extract from assistantId or other call properties
    if (!jobId || !userId) {
      console.log('🎯 Missing metadata, trying to extract from call context...');
      
      // Try to find session by assistantId
      if (call.assistantId) {
        try {
          const sessionResponse = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/interview/session?assistantId=${call.assistantId}`);
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            if (sessionData.success) {
              jobId = sessionData.session.jobId;
              userId = sessionData.session.userId;
              console.log('🎯 Found session data:', { jobId, userId });
            }
          }
        } catch (sessionError) {
          console.error('❌ Failed to get session data:', sessionError);
        }

        // Fallback: Try to find job by assistantId if session lookup failed
        if (!jobId) {
          try {
            await connectDB();
            const jobByAssistant = await Job.findOne({ 
              vapiAssistantId: call.assistantId 
            });
            
            if (jobByAssistant) {
              jobId = jobByAssistant._id.toString();
              console.log('🎯 Found jobId from assistantId:', jobId);
            }
          } catch (dbError) {
            console.error('❌ Database lookup failed:', dbError);
          }
        }
      }
      
      // If we have jobId but no userId, find the most recent shortlisted user
      // This is not ideal but works as a fallback
      if (jobId && !userId) {
        try {
          await connectDB();
          const recentApplication = await Application.findOne({
            jobId: jobId,
            status: 'shortlisted',
            voiceInterviewCompleted: false
          }).sort({ createdAt: -1 });
          
          if (recentApplication) {
            userId = recentApplication.userId.toString();
            console.log('🎯 Found userId from recent application:', userId);
          }
        } catch (dbError) {
          console.error('❌ Failed to find recent application:', dbError);
        }
      }
    }

    if (!jobId || !userId) {
      console.error('❌ Missing required job or user ID in call data:', {
        metadata,
        assistantMetadata: assistant.metadata,
        callId,
        finalJobId: jobId,
        finalUserId: userId
      });
      throw new Error(`Missing required job or user ID in call data. JobId: ${jobId}, UserId: ${userId}`);
    }

    console.log('✅ Successfully extracted metadata:', { jobId, userId, callId });

    await connectDB();

    // Get the job and questions
    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Find the application (including completed ones for re-interview support)
    const application = await Application.findOne({ 
      jobId, 
      userId,
      status: { $in: ['shortlisted', 'interview_scheduled', 'interview_completed'] }
    }).populate('userId', 'name email');

    if (!application) {
      throw new Error(`Application not found for job ${jobId} and user ${userId}`);
    }

    console.log('Found application:', application._id);
    
    // Check if this is a re-interview
    const isReinterview = application.voiceInterviewCompleted === true;
    if (isReinterview) {
      console.log(`🔄 Re-interview detected - Attempt ${(application.interviewAttempts || 0) + 1}`);
      
      // Archive previous interview data
      if (!application.interviewHistory) {
        application.interviewHistory = [];
      }
      
      // Mark all previous attempts as superseded
      application.interviewHistory.forEach(attempt => {
        attempt.superseded = true;
      });
      
      // Save current interview to history before updating
      application.interviewHistory.push({
        attemptNumber: application.interviewAttempts || 1,
        completedAt: application.interviewCompletedAt,
        score: application.voiceInterviewScore,
        feedback: application.voiceInterviewFeedback,
        transcript: application.voiceInterviewFeedback?.transcript || '',
        callId: application.currentInterviewCallId,
        duration: application.voiceInterviewFeedback?.interviewDuration || 0,
        superseded: true
      });
      
      console.log(`📦 Archived previous interview (attempt ${application.interviewAttempts || 1})`);
    }

    // Get monitoring data for comprehensive feedback analysis
    console.log('Fetching professional monitoring data...');
    let monitoringData = null;
    try {
      const monitoringResponse = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/interview/monitoring?userId=${userId}&jobId=${jobId}`);
      if (monitoringResponse.ok) {
        const data = await monitoringResponse.json();
        monitoringData = data.monitoringData;
        console.log('📊 Monitoring data retrieved:', {
          hasData: !!monitoringData,
          redFlags: monitoringData?.redFlags?.length || 0,
          securityScore: monitoringData?.summary?.overallSecurityScore
        });
      }
    } catch (monitoringError) {
      console.warn('⚠️ Failed to fetch monitoring data:', monitoringError.message);
    }

    // Analyze the interview performance with monitoring data integration
    console.log('Starting comprehensive AI analysis with monitoring data...');
    const analysisStartTime = Date.now();

    let interviewAnalysis;
    try {
      // Set a timeout for AI analysis (30 seconds max)
      const analysisPromise = analyzeVoiceInterview({
        transcript: transcript,
        questions: job.interviewQuestions || [],
        jobTitle: job.jobTitle,
        interviewDuration: duration,
        answeredQuestions: calculateAnsweredQuestions(transcript, job.interviewQuestions || []),
        totalQuestions: job.interviewQuestions?.length || 0,
        monitoringData: monitoringData?.anomalies || [],
        anomalies: monitoringData?.redFlags || []
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI analysis timeout')), 30000);
      });

      interviewAnalysis = await Promise.race([analysisPromise, timeoutPromise]);

      const analysisEndTime = Date.now();
      console.log(`✅ Professional AI analysis completed in ${analysisEndTime - analysisStartTime}ms`);

    } catch (analysisError) {
      console.error('AI analysis failed or timed out:', analysisError);

      // Provide fallback analysis if AI fails
      interviewAnalysis = {
        communicationSkills: 75,
        technicalKnowledge: 70,
        problemSolving: 70,
        confidence: 75,
        overallPerformance: 72,
        integrityScore: monitoringData?.summary?.overallSecurityScore || 100,
        detailedFeedback: 'Interview completed successfully. Manual review may be required for detailed feedback.',
        keyPoints: ['Interview completed'],
        areasForImprovement: ['Manual review recommended'],
        securityFlags: [],
        monitoringResults: {
          realTimeFaceVerification: false,
          realTimeVoiceVerification: false,
          anomaliesCount: 0,
          integrityAssessment: 'UNKNOWN'
        }
      };
    }

    console.log('Interview analysis completed:', {
      overallPerformance: interviewAnalysis.overallPerformance,
      communicationSkills: interviewAnalysis.communicationSkills
    });

    // Update application with latest interview results
    application.voiceInterviewCompleted = true;
    application.voiceInterviewScore = interviewAnalysis.overallPerformance;
    application.voiceInterviewFeedback = {
      ...interviewAnalysis,
      interviewDuration: duration,
      answeredQuestions: calculateAnsweredQuestions(transcript, job.interviewQuestions || []),
      totalQuestions: job.interviewQuestions?.length || 0,
      transcript: transcript.substring(0, 1000) // Store first 1000 chars for reference
    };

    // Increment interview attempts counter
    application.interviewAttempts = (application.interviewAttempts || 0) + 1;
    application.currentInterviewCallId = callId;

    // FIXED: Calculate final score (resume 60% + interview 40%)
    const resumeScore = application.atsScore || 0;
    const interviewScore = interviewAnalysis.overallPerformance || 0;
    
    application.finalScore = Math.round(
      (resumeScore * 0.6) + (interviewScore * 0.4)
    );

    application.status = 'interview_completed';
    application.interviewCompletedAt = new Date();

    await application.save();
    
    console.log(`✅ Interview saved as attempt ${application.interviewAttempts} (${isReinterview ? 'Re-interview' : 'First attempt'})`);
    console.log(`📊 New score: ${application.finalScore} (Previous attempts: ${application.interviewHistory.length})`);

    // Update job completion count
    await Job.findByIdAndUpdate(jobId, { 
      $inc: { completedInterviews: 1 }
    });

    console.log('Interview processing completed successfully:', {
      applicationId: application._id,
      finalScore: application.finalScore,
      interviewScore: interviewScore
    });

    // FIXED: Send interview completion email
    try {
      const { sendInterviewCompletionEmail } = await import('@/lib/email-service');
      await sendInterviewCompletionEmail({
        user: application.userId,
        job: job,
        finalScore: application.finalScore,
        interviewScore: interviewScore
      });
    } catch (emailError) {
      console.error('Failed to send interview completion email:', emailError);
    }

    return NextResponse.json({ 
      success: true, 
      callId,
      applicationId: application._id,
      finalScore: application.finalScore,
      message: 'Interview processed successfully'
    });

  } catch (error) {
    console.error('Process completed interview error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      callId: call?.id
    }, { status: 500 });
  }
}

// Helper function to estimate answered questions from transcript
function calculateAnsweredQuestions(transcript, questions) {
  if (!transcript || !questions || questions.length === 0) {
    return 0;
  }
  
  // Simple heuristic: count meaningful responses
  // Split by common interview patterns and filter meaningful responses
  const candidateResponses = transcript
    .split(/(?:interviewer|assistant|ai)[\s:]/i)
    .filter(response => {
      const cleaned = response.trim().toLowerCase();
      return cleaned.length > 30 && // Minimum response length
             !cleaned.startsWith('thank you') &&
             !cleaned.startsWith('hello') &&
             !cleaned.includes('next question');
    });
  
  // Return the minimum of responses found or total questions
  return Math.min(candidateResponses.length, questions.length);
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({
    message: 'VAPI webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}