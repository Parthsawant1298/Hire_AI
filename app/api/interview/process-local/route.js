// app/api/interview/process-local/route.js
// Process interview transcript locally (for localhost development)

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Job, Application } from '@/models/job';
import User from '@/models/user';
import { analyzeVoiceInterview } from '@/lib/ai-services';
import { requireAuth } from '@/middleware/auth';

export async function POST(request) {
  try {
    console.log('🎯 Processing interview locally...');
    
    // Verify authentication
    const authCheck = await requireAuth(request);
    if (authCheck instanceof NextResponse) {
      // Auth failed, return the error response
      return authCheck;
    }

    const userId = authCheck.userId; // requireAuth returns { user, userId }
    const { jobId, messages, duration, proctorViolations } = await request.json();

    console.log('📊 Interview data:', {
      jobId,
      userId,
      messageCount: messages?.length,
      duration
    });

    if (!jobId || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Get job and user details
    const [job, user] = await Promise.all([
      Job.findById(jobId),
      User.findById(userId)
    ]);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find user's application
    const application = await Application.findOne({
      jobId: jobId,
      userId: userId
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    console.log('✅ Found application:', application._id);
    console.log('📊 Processing', messages.length, 'messages');

    // Build transcript from messages - handle various VAPI message formats
    const transcriptLines = [];
    
    messages.forEach((msg, index) => {
      console.log(`Message ${index}:`, JSON.stringify(msg).substring(0, 150));
      
      // Handle different VAPI message types
      if (msg.role === 'assistant' || msg.type === 'assistant') {
        const text = msg.content || msg.text || msg.message || msg.transcript || '';
        if (text) transcriptLines.push(`AI: ${text}`);
      } else if (msg.role === 'user' || msg.type === 'user') {
        const text = msg.content || msg.text || msg.message || msg.transcript || '';
        if (text) transcriptLines.push(`Candidate: ${text}`);
      } else if (msg.type === 'transcript' && msg.transcript) {
        // Some VAPI versions send transcript in nested format
        transcriptLines.push(`${msg.role || 'User'}: ${msg.transcript}`);
      } else if (msg.transcriptType === 'final') {
        // Final transcript messages
        const text = msg.transcript || msg.text || '';
        if (text) transcriptLines.push(`Candidate: ${text}`);
      }
    });

    const transcript = transcriptLines.join('\n');

    console.log('📝 ===== TRANSCRIPT GENERATION =====');
    console.log('📝 Total messages received:', messages.length);
    console.log('📝 Transcript lines collected:', transcriptLines.length);
    console.log('📝 Transcript length:', transcript.length, 'characters');
    console.log('📝 ===== FULL TRANSCRIPT =====');
    console.log(transcript);
    console.log('📝 ===== END TRANSCRIPT =====');

    if (!transcript || transcript.length < 50) {
      console.error('❌ Transcript too short!');
      console.error('📊 Message types received:', messages.map(m => m.type || m.role || 'unknown'));
      console.error('📄 Full messages:', JSON.stringify(messages, null, 2));
      
      return NextResponse.json(
        { 
          error: 'Transcript too short or empty',
          messageCount: messages.length,
          messageTypes: messages.map(m => m.type || m.role || 'unknown'),
          hint: 'Messages may not contain transcript data. Check VAPI message format.'
        },
        { status: 400 }
      );
    }

    // Analyze interview with AI
    console.log('🤖 Analyzing interview with AI...');
    
    // Count actual questions from AI (lines that look like "AI: 1," or "AI: 1.")
    const aiQuestions = transcriptLines.filter(line => line.startsWith('AI:') && /AI: \d+[,.]/.test(line));
    const questionCount = Math.max(aiQuestions.length, 1); // At least 1 if we have a transcript
    
    console.log('📊 Sending to AI:', {
      transcriptLength: transcript.length,
      jobTitle: job.jobTitle,
      messageCount: messages.length,
      detectedQuestions: questionCount
    });
    
    let feedback;
    try {
      feedback = await analyzeVoiceInterview({
        transcript: transcript,
        questions: [],
        jobTitle: job.jobTitle,
        jobDescription: job.jobDescription,
        jobRequirements: job.jobRequirements,
        jobResponsibilities: job.jobResponsibilities,
        interviewDuration: duration || 300,
        answeredQuestions: questionCount,
        totalQuestions: 5,
        monitoringData: [],
        anomalies: []
      });
      
      console.log('✅ AI analysis complete:', {
        score: feedback.overallPerformance,
        hasFeedback: !!feedback.detailedFeedback
      });
    } catch (aiError) {
      console.error('❌ AI analysis FAILED:', aiError);
      console.error('❌ This means NO REAL SCORES - returning error');
      
      return NextResponse.json(
        { 
          error: 'AI analysis failed',
          details: `Unable to analyze interview: ${aiError.message}`,
          transcriptReceived: true,
          transcriptLength: transcript.length
        },
        { status: 500 }
      );
    }

    // Update application with results
    application.voiceInterviewCompleted = true;
    application.voiceInterviewScore = feedback.overallPerformance;
    application.voiceTranscript = transcript;
    application.status = 'interview_completed'; 
    
    // Save feedback as structured object
    application.voiceInterviewFeedback = {
      communicationSkills: feedback.communicationSkills || 0,
      technicalKnowledge: feedback.technicalKnowledge || 0,
      problemSolving: feedback.problemSolving || 0,
      confidence: feedback.confidence || 0,
      overallPerformance: feedback.overallPerformance || 0,
      detailedFeedback: feedback.detailedFeedback || 'Interview completed successfully.',
      proctorViolations: proctorViolations || [],
      interviewDuration: duration || 0,
      answeredQuestions: questionCount,
      totalQuestions: 5
    };
    
    application.interviewCompletedAt = new Date();
    
    // Calculate final score (weighted average)
    // ATS Score (Resume) is 30%, Voice Interview is 70%
    const resumeScore = application.atsScore || 0;
    const voiceScore = feedback.overallPerformance || 0;
    application.finalScore = Math.round((resumeScore * 0.3) + (voiceScore * 0.7));
    
    await application.save();

    console.log('💾 Application saved with data:', {
      applicationId: application._id,
      voiceInterviewScore: application.voiceInterviewScore,
      atsScore: resumeScore,
      finalScore: application.finalScore,
      status: application.status
    });

    // Update job's completed interviews count
    const updatedJob = await Job.findByIdAndUpdate(jobId, {
      $inc: { completedInterviews: 1 }
    }, { new: true });

    console.log('✅ Application updated with interview results');
    console.log('✅ Job completedInterviews count incremented to:', updatedJob ? updatedJob.completedInterviews : 'NULL');

    return NextResponse.json({
      success: true,
      score: feedback.overallPerformance,
      finalScore: application.finalScore,
      feedback: feedback.detailedFeedback,
      communicationSkills: feedback.communicationSkills,
      technicalKnowledge: feedback.technicalKnowledge,
      problemSolving: feedback.problemSolving,
      confidence: feedback.confidence
    });

  } catch (error) {
    console.error('❌ Error processing interview locally:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process interview',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
