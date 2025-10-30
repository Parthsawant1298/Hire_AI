// app/api/host/jobs/[jobId]/route.js
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Job, Application } from '@/models/job';
import User from '@/models/user';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;

    await connectDB();

    // Find job and verify ownership
    const job = await Job.findOne({ _id: jobId, hostId: host._id });
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Get recent applications for this job
    const applications = await Application.find({ jobId })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({
      success: true,
      job: {
        _id: job._id,
        jobTitle: job.jobTitle,
        jobDescription: job.jobDescription,
        jobResponsibilities: job.jobResponsibilities,
        jobRequirements: job.jobRequirements,
        jobType: job.jobType,
        jobImage: job.jobImage,
        status: job.status,
        targetApplications: job.targetApplications,
        maxCandidatesShortlist: job.maxCandidatesShortlist,
        finalSelectionCount: job.finalSelectionCount,
        voiceInterviewDuration: job.voiceInterviewDuration,
        views: job.views || 0,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      },
      applications: applications.map(app => ({
        _id: app._id,
        userId: app.userId,
        status: app.status,
        atsScore: app.atsScore,
        finalScore: app.finalScore,
        voiceInterviewCompleted: app.voiceInterviewCompleted,
        createdAt: app.createdAt
      }))
    });

  } catch (error) {
    console.error('Job details fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job details' },
      { status: 500 }
    );
  }
}