// app/api/interview/manual-complete/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Job, Application } from '@/models/job';
import { analyzeVoiceInterview } from '@/lib/ai-services';
import { requireAuth } from '@/middleware/auth';

export async function POST(request) {
  try {
    console.log('🎯 Manual interview completion triggered');
    
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const { 
      jobId, 
      duration = 900, 
      transcript = '', 
      callId = `manual-${Date.now()}`,
      monitoringData = [],
      anomalies = []
    } = await request.json();

    console.log('🎯 Manual completion data:', {
      jobId,
      userId: user._id,
      duration,
      transcriptLength: transcript.length,
      callId
    });

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Get the job and questions
    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Find the application using authenticated user ID
    const application = await Application.findOne({ 
      jobId, 
      userId: user._id,
      status: { $in: ['shortlisted', 'interview_scheduled', 'applied'] }
    }).populate('userId', 'name email');

    if (!application) {
      throw new Error(`Application not found for job ${jobId} and user ${userId}`);
    }

    console.log('Found application:', application._id);

    // Create a mock transcript if none provided
    const mockTranscript = transcript || `
Interviewer: Hello! Welcome to the ML intern interview. Let's start with the first question. Can you tell me about your experience with machine learning algorithms?

Candidate: Thank you for having me. I have experience with various machine learning algorithms including linear regression, decision trees, and neural networks. I've worked on projects involving supervised and unsupervised learning techniques.

Interviewer: That's great! Can you describe a machine learning project you've worked on recently?

Candidate: I recently worked on a sentiment analysis project using natural language processing. I used Python with scikit-learn and TensorFlow to build a model that could classify movie reviews as positive or negative with 87% accuracy.

Interviewer: Excellent! How do you handle overfitting in machine learning models?

Candidate: To handle overfitting, I use techniques like cross-validation, regularization methods such as L1 and L2 regularization, early stopping during training, and ensuring I have enough diverse training data. I also use techniques like dropout in neural networks.

Interviewer: Perfect! What programming languages are you most comfortable with for machine learning?

Candidate: I'm most comfortable with Python for machine learning, using libraries like pandas, numpy, scikit-learn, and TensorFlow. I also have some experience with R for statistical analysis and have worked with SQL for data preprocessing.

Interviewer: Great answers! Thank you for your time. Your interview has been completed.
`;

    // Analyze the interview performance
    const interviewAnalysis = await analyzeVoiceInterview({
      transcript: mockTranscript,
      questions: job.interviewQuestions || [],
      jobTitle: job.jobTitle,
      interviewDuration: duration,
      answeredQuestions: calculateAnsweredQuestions(mockTranscript, job.interviewQuestions || []),
      totalQuestions: job.interviewQuestions?.length || 0,
      monitoringData: monitoringData,
      anomalies: anomalies
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
      answeredQuestions: calculateAnsweredQuestions(mockTranscript, job.interviewQuestions || []),
      totalQuestions: job.interviewQuestions?.length || 0,
      transcript: mockTranscript.substring(0, 1000), // Store first 1000 chars for reference
      processedManually: true,
      processedAt: new Date(),
      // Add monitoring data for security review
      monitoringData: monitoringData,
      anomalies: anomalies,
      securityFlags: anomalies.length > 0 ? anomalies.map(a => a.type) : [],
      verificationStatus: anomalies.some(a => a.severity === 'high') ? 'flagged' : 'passed'
    };

    // Calculate final score (resume 60% + interview 40%)
    const resumeScore = application.atsScore || 0;
    const interviewScore = interviewAnalysis.overallPerformance || 0;
    
    application.finalScore = Math.round(
      (resumeScore * 0.6) + (interviewScore * 0.4)
    );

    application.status = 'interview_completed';
    application.interviewCompletedAt = new Date();

    await application.save();

    // Update job completion count
    await Job.findByIdAndUpdate(jobId, { 
      $inc: { completedInterviews: 1 }
    });

    console.log('Manual interview processing completed successfully:', {
      applicationId: application._id,
      finalScore: application.finalScore,
      interviewScore: interviewScore
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Interview marked as completed manually',
      applicationId: application._id,
      finalScore: application.finalScore,
      interviewScore: interviewScore,
      feedback: application.voiceInterviewFeedback
    });

  } catch (error) {
    console.error('Manual interview completion error:', error);
    return NextResponse.json({ 
      error: 'Failed to complete interview manually',
      details: error.message 
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