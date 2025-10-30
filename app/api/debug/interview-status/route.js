// app/api/debug/interview-status/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Job, Application } from '@/models/job';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    await connectDB();

    // Get job details
    const job = await Job.findById(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get all applications for this job
    const applications = await Application.find({ jobId })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    // Format the response
    const applicationDetails = applications.map(app => ({
      applicationId: app._id,
      candidateName: app.userId?.name || 'Unknown',
      candidateEmail: app.userId?.email || 'Unknown',
      status: app.status,
      atsScore: app.atsScore,
      voiceInterviewCompleted: app.voiceInterviewCompleted,
      voiceInterviewScore: app.voiceInterviewScore,
      finalScore: app.finalScore,
      interviewCompletedAt: app.interviewCompletedAt,
      hasFeedback: !!app.voiceInterviewFeedback,
      feedbackKeys: app.voiceInterviewFeedback ? Object.keys(app.voiceInterviewFeedback) : [],
      createdAt: app.createdAt,
      updatedAt: app.updatedAt
    }));

    return NextResponse.json({
      success: true,
      jobId: job._id,
      jobTitle: job.jobTitle,
      status: job.status,
      completedInterviews: job.completedInterviews || 0,
      totalApplications: applications.length,
      shortlistedCount: applications.filter(app => app.status === 'shortlisted').length,
      completedInterviewsCount: applications.filter(app => app.voiceInterviewCompleted).length,
      applications: applicationDetails,
      debug: {
        timestamp: new Date().toISOString(),
        message: 'Debug data retrieved successfully'
      }
    });

  } catch (error) {
    console.error('Debug interview status error:', error);
    return NextResponse.json({
      error: 'Failed to get interview status',
      details: error.message
    }, { status: 500 });
  }
}
