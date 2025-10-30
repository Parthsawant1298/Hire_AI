// app/api/host/jobs/[jobId]/status/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Job, Application } from '@/models/job';
import User from '@/models/user';

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
    const job = await Job.findOne({ _id: jobId, hostId: host._id })
      .populate('hostId', 'name organization');

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Get application statistics
    const applicationStats = await Application.aggregate([
      { $match: { jobId: job._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgAtsScore: { $avg: '$atsScore' },
          avgFinalScore: { $avg: '$finalScore' },
          avgInterviewScore: { $avg: '$voiceInterviewScore' }
        }
      }
    ]);

    // Get recent applications
    const recentApplications = await Application.find({ jobId: job._id })
      .populate('userId', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('userId atsScore finalScore status createdAt');

    // Calculate progress metrics
    const totalApplications = job.currentApplications;
    const applicationProgress = Math.round((totalApplications / job.targetApplications) * 100);
    const slotsRemaining = Math.max(0, job.targetApplications - totalApplications);

    // Status counts
    const statusCounts = {
      applied: 0,
      shortlisted: 0,
      interview_completed: 0,
      selected: 0,
      rejected: 0,
      offer_sent: 0
    };

    applicationStats.forEach(stat => {
      if (statusCounts.hasOwnProperty(stat._id)) {
        statusCounts[stat._id] = stat.count;
      }
    });

    // Interview completion rate
    const shortlistedCount = statusCounts.shortlisted + statusCounts.interview_completed + statusCounts.selected;
    const interviewCompletedCount = statusCounts.interview_completed + statusCounts.selected;
    const interviewCompletionRate = shortlistedCount > 0 ? 
      Math.round((interviewCompletedCount / shortlistedCount) * 100) : 0;

    // Average scores
    const avgScores = {
      ats: applicationStats.find(s => s._id !== null)?.avgAtsScore || 0,
      final: applicationStats.find(s => s._id !== null)?.avgFinalScore || 0,
      interview: applicationStats.find(s => s._id !== null)?.avgInterviewScore || 0
    };

    // Time-based metrics
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((job.applicationDeadline - now) / (1000 * 60 * 60 * 24)));
    const isExpired = now > job.applicationDeadline;

    return NextResponse.json({
      success: true,
      job: {
        id: job._id,
        jobTitle: job.jobTitle,
        jobType: job.jobType,
        status: job.status,
        createdAt: job.createdAt,
        applicationDeadline: job.applicationDeadline,
        hostId: job.hostId
      },
      statistics: {
        applications: {
          total: totalApplications,
          target: job.targetApplications,
          progress: applicationProgress,
          remaining: slotsRemaining,
          isFull: totalApplications >= job.targetApplications
        },
        selection: {
          maxShortlist: job.maxCandidatesShortlist,
          finalSelection: job.finalSelectionCount,
          shortlisted: statusCounts.shortlisted,
          interviewCompleted: job.completedInterviews || statusCounts.interview_completed,
          selected: statusCounts.selected
        },
        timeline: {
          daysRemaining: daysRemaining,
          isExpired: isExpired,
          interviewsActive: job.status === 'interviews_active'
        },
        performance: {
          averageScores: avgScores,
          interviewCompletionRate: interviewCompletionRate,
          totalViews: job.totalViews || 0
        },
        statusBreakdown: statusCounts
      },
      recentApplications: recentApplications.map(app => ({
        id: app._id,
        candidate: {
          name: app.userId.name,
          email: app.userId.email,
          profilePicture: app.userId.profilePicture
        },
        atsScore: app.atsScore,
        finalScore: app.finalScore,
        status: app.status,
        appliedAt: app.createdAt
      })),
      actions: {
        canEdit: ['draft', 'published'].includes(job.status),
        canDelete: ['draft', 'published'].includes(job.status) && totalApplications === 0,
        canCancel: totalApplications > 0 && !['completed', 'cancelled'].includes(job.status),
        canViewCandidates: totalApplications > 0,
        canFinalize: job.status === 'interviews_active' && interviewCompletedCount >= job.maxCandidatesShortlist
      }
    });

  } catch (error) {
    console.error('Get job status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}