import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth } from '@/middleware/auth';
import { Job, Application } from '@/models/job';
import User from '@/models/user';
import Host from '@/models/host';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { jobId } = await params;

    // Check request parameters
    const url = new URL(request.url);
    const isInterviewAccess = url.searchParams.get('interview') === 'true';
    const isHostView = url.searchParams.get('host') === 'true';

    if (isInterviewAccess) {
      // Handle interview access - require authentication
      const authResult = await requireAuth(request);
      if (authResult instanceof NextResponse) {
        return authResult;
      }

      const { user } = authResult;

      // Get job with VAPI details for interviews
      const job = await Job.findById(jobId)
        .populate('hostId', 'name email organization designation')
        .select('jobTitle jobDescription voiceInterviewDuration vapiAssistantId interviewLink hostId status interviewQuestions');

      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }

      // Check if user has applied and is authorized for interview
      const application = await Application.findOne({
        jobId: jobId,
        userId: user._id
      });

      const allowedStatuses = ['shortlisted', 'interview_scheduled', 'interview_completed'];
      if (!application || !allowedStatuses.includes(application.status)) {
        return NextResponse.json(
          { error: 'You are not authorized to access this interview' },
          { status: 403 }
        );
      }

      // Block interview if AI ranking/evaluation is completed
      if (job.status === 'interviews_completed') {
        return NextResponse.json(
          { error: 'Interview period has ended. AI evaluation has been completed and rankings are finalized.' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        job: job,
        application: {
          id: application._id,
          status: application.status,
          voiceInterviewCompleted: application.voiceInterviewCompleted
        }
      });
    }

    // Handle host view
    if (isHostView) {
      const { requireHostAuth } = await import('@/middleware/host-auth');
      const authResult = await requireHostAuth(request);
      if (authResult instanceof NextResponse) {
        return authResult;
      }

      const { host } = authResult;
      const job = await Job.findOne({ _id: jobId, hostId: host._id })
        .populate('hostId', 'name organization profilePicture');

      if (!job) {
        return NextResponse.json(
          { error: 'Job not found or access denied' },
          { status: 404 }
        );
      }

      // Get application count and recent applications for host
      const applications = await Application.find({ jobId })
        .populate('userId', 'name email profilePicture')
        .sort({ createdAt: -1 })
        .limit(3);

      return NextResponse.json({
        success: true,
        job: {
          ...job.toObject(),
          applicationProgress: {
            current: job.currentApplications,
            target: job.targetApplications,
            percentage: Math.round((job.currentApplications / job.targetApplications) * 100),
            slotsRemaining: job.targetApplications - job.currentApplications,
            isFull: job.currentApplications >= job.targetApplications
          },
          recentApplications: applications.map(app => ({
            id: app._id,
            candidate: app.userId,
            status: app.status,
            appliedAt: app.createdAt
          })),
          actions: {
            canEdit: ['draft', 'published'].includes(job.status),
            canDelete: ['draft', 'published'].includes(job.status) && job.currentApplications === 0,
            canViewCandidates: job.currentApplications > 0
          }
        },
        userApplication: null,
        isHost: true
      });
    }

    // Regular job details view (for users)
    const job = await Job.findOne({ 
      _id: jobId,
      status: { $in: ['published', 'applications_open', 'applications_closed', 'interviews_active'] }
    })
    .select('-interviewQuestions -vapiAssistantId -shortlistedCandidates -finalSelectedCandidates')
    .populate('hostId', 'name organization profilePicture isVerified rating totalEvents');

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if user is authenticated and has applied
    let userApplication = null;
    try {
      const authResult = await requireAuth(request);
      if (!(authResult instanceof NextResponse)) {
        const { user } = authResult;
        userApplication = await Application.findOne({
          jobId: jobId,
          userId: user._id
        }).select('status createdAt atsScore finalScore ranking');
      }
    } catch (error) {
      // User not authenticated, continue without application info
    }

    // Increment view count
    await Job.findByIdAndUpdate(jobId, { $inc: { totalViews: 1 } });

    return NextResponse.json({
      success: true,
      job: {
        ...job.toObject(),
        applicationProgress: {
          current: job.currentApplications,
          target: job.targetApplications,
          percentage: Math.round((job.currentApplications / job.targetApplications) * 100),
          slotsRemaining: job.targetApplications - job.currentApplications,
          isFull: job.currentApplications >= job.targetApplications
        }
      },
      userApplication
    });

  } catch (error) {
    console.error('Get job details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job details' },
      { status: 500 }
    );
  }
}