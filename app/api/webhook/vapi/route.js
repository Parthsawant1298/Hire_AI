// app/api/webhook/vapi/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Job, Application } from '@/models/job';
import { analyzeVoiceInterview } from '@/lib/ai-services';
import { sendInterviewCompletionEmail } from '@/lib/email-service';

export async function POST(request) {
  try {
    console.log('🎯 VAPI Webhook received');

    const body = await request.json();
    console.log('🎯 Webhook payload:', JSON.stringify(body, null, 2));

    // Handle different webhook events
    if (body.type === 'call.ended') {
      console.log('📞 Call ended event received');
      await processCompletedInterview(body.data);
    } else {
      console.log('ℹ️ Other webhook event:', body.type);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ VAPI Webhook error:', error);
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
          const sessionResponse = await fetch(`${process.env.APP_URL || 'https://hire-ai-sepia.vercel.app'}/api/interview/session?assistantId=${call.assistantId}`);
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            if (sessionData.success) {
              jobId = sessionData.session.jobId;
              userId = sessionData.session.userId;
              console.log('✅ Found session data:', { jobId, userId });
            }
          }
        } catch (sessionError) {
          console.error('❌ Failed to fetch session data:', sessionError);
        }
      }
    }

    if (!jobId || !userId) {
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

    // Analyze the interview performance
    const interviewAnalysis = await analyzeVoiceInterview({
      transcript: transcript || '',
      questions: job.interviewQuestions || [],
      jobTitle: job.jobTitle,
      interviewDuration: duration,
      answeredQuestions: calculateAnsweredQuestions(transcript, job.interviewQuestions || []),
      totalQuestions: job.interviewQuestions?.length || 0
    });

    console.log('Interview analysis completed:', {
      overallPerformance: interviewAnalysis.overallPerformance,
      communicationSkills: interviewAnalysis.communicationSkills
    });

    // Update application with interview results
    application.voiceInterviewCompleted = true;
    application.voiceInterviewScore = interviewAnalysis.overallPerformance;
    application.voiceInterviewFeedback = {
      ...interviewAnalysis,
      interviewDuration: duration,
      answeredQuestions: calculateAnsweredQuestions(transcript, job.interviewQuestions || []),
      totalQuestions: job.interviewQuestions?.length || 0,
      transcript: transcript.substring(0, 1000), // Store first 1000 chars for reference
      processedVia: 'webhook',
      processedAt: new Date()
    };

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

    console.log(`✅ Interview saved as attempt ${application.interviewAttempts} (${application.interviewAttempts > 1 ? 'Re-interview' : 'First attempt'})`);
    console.log(`📊 New score: ${application.finalScore} (Resume: ${resumeScore} + Interview: ${interviewScore})`);

    // Update job completion count
    await Job.findByIdAndUpdate(jobId, {
      $inc: { completedInterviews: 1 }
    });

    // FIXED: Send interview completion email
    try {
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
      error: error.message
    }, { status: 500 });
  }
}

// Helper function to estimate answered questions from transcript
function calculateAnsweredQuestions(transcript, questions) {
  if (!transcript || !questions || questions.length === 0) {
    return 0;
  }

  // Simple heuristic: count meaningful responses
  const candidateResponses = transcript
    .split(/(?:interviewer|assistant|ai)[\s:]/i)
    .filter(response => {
      const cleaned = response.trim().toLowerCase();
      return cleaned.length > 30 && // Minimum response length
             !cleaned.startsWith('thank you') &&
             !cleaned.startsWith('hello') &&
             !cleaned.includes('next question');
    });

  return Math.min(candidateResponses.length, questions.length);
}