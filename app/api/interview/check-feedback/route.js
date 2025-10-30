// app/api/interview/check-feedback/route.js
import connectDB from '@/lib/mongodb';
import { Application } from '@/models/job';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const userId = searchParams.get('userId');

    if (!jobId) {
      return NextResponse.json({ 
        error: 'Job ID is required' 
      }, { status: 400 });
    }

    await connectDB();

    // Get all applications for this job or specific user
    let query = { jobId };
    if (userId) {
      query.userId = userId;
    }

    const applications = await Application.find(query)
      .populate('userId', 'name email')
      .populate('jobId', 'jobTitle')
      .sort({ interviewCompletedAt: -1 });

    if (!applications || applications.length === 0) {
      return NextResponse.json({ 
        message: 'No applications found',
        applications: []
      });
    }

    // Format the response with feedback status
    const formattedApplications = applications.map(app => ({
      applicationId: app._id,
      candidateName: app.userId?.name || 'Unknown',
      candidateEmail: app.userId?.email || 'Unknown',
      jobTitle: app.jobId?.jobTitle || 'Unknown',
      status: app.status,
      
      // Interview Status
      voiceInterviewCompleted: app.voiceInterviewCompleted,
      interviewCompletedAt: app.interviewCompletedAt,
      
      // Feedback Data
      hasFeedback: !!app.voiceInterviewFeedback,
      voiceInterviewScore: app.voiceInterviewScore,
      finalScore: app.finalScore,
      
      // Detailed Feedback (if exists)
      feedback: app.voiceInterviewFeedback ? {
        communicationSkills: app.voiceInterviewFeedback.communicationSkills,
        technicalKnowledge: app.voiceInterviewFeedback.technicalKnowledge,
        problemSolving: app.voiceInterviewFeedback.problemSolving,
        confidence: app.voiceInterviewFeedback.confidence,
        overallPerformance: app.voiceInterviewFeedback.overallPerformance,
        detailedFeedback: app.voiceInterviewFeedback.detailedFeedback,
        interviewDuration: app.voiceInterviewFeedback.interviewDuration,
        answeredQuestions: app.voiceInterviewFeedback.answeredQuestions,
        totalQuestions: app.voiceInterviewFeedback.totalQuestions
      } : null,
      
      // ATS Analysis
      atsScore: app.atsScore,
      aiAnalysis: app.aiAnalysis
    }));

    return NextResponse.json({ 
      success: true,
      count: applications.length,
      applications: formattedApplications
    });

  } catch (error) {
    console.error('Check feedback error:', error);
    return NextResponse.json({ 
      error: 'Failed to check feedback',
      details: error.message 
    }, { status: 500 });
  }
}