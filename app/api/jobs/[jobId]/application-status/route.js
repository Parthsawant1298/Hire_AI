// app/api/jobs/[jobId]/application-status/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth } from '@/middleware/auth';
import { Job, Application } from '@/models/job';

export async function GET(request, { params }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const { jobId } = await params;

    await connectDB();

    // Find the user's application for this job
    const application = await Application.findOne({
      userId: user._id,
      jobId: jobId
    });

    if (!application) {
      return NextResponse.json({
        success: false,
        error: 'No application found for this job'
      }, { status: 404 });
    }

    // Get job details
    const job = await Job.findById(jobId).populate('hostId', 'name organization');

    if (!job) {
      return NextResponse.json({
        success: false,
        error: 'Job not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      application: {
        _id: application._id,
        status: application.status,
        voiceInterviewCompleted: application.voiceInterviewCompleted,
        voiceInterviewScore: application.voiceInterviewScore,
        voiceInterviewFeedback: application.voiceInterviewFeedback,
        finalScore: application.finalScore,
        atsScore: application.atsScore,
        appliedAt: application.appliedAt,
        interviewCompletedAt: application.interviewCompletedAt,
        monitoringData: application.monitoringData
      },
      job: {
        _id: job._id,
        jobTitle: job.jobTitle,
        companyName: job.companyName,
        interviewQuestions: job.interviewQuestions,
        hostId: job.hostId
      }
    });

  } catch (error) {
    console.error('Application status error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch application status'
    }, { status: 500 });
  }
}