// app/api/host/jobs/[jobId]/candidates/rank/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Job, Application } from '@/models/job';
import User from '@/models/user';

export async function POST(request, { params }) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;
    const { rankingData } = await request.json();

    await connectDB();

    // Verify job ownership
    const job = await Job.findOne({ _id: jobId, hostId: host._id });
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Update candidate rankings
    const updatePromises = rankingData.map(async (item) => {
      return Application.findByIdAndUpdate(
        item.candidateId,
        { 
          ranking: item.ranking,
          finalScore: item.finalScore || item.score,
          status: item.status || 'interview_completed'
        },
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    // Trigger final ranking completion if all interviews done
    const allApplications = await Application.find({ 
      jobId: jobId,
      status: { $in: ['interview_completed', 'selected', 'rejected'] }
    });

    const interviewCompletedCount = allApplications.filter(
      app => app.voiceInterviewCompleted
    ).length;

    // Update job status if all interviews are complete
    if (interviewCompletedCount >= job.maxCandidatesShortlist) {
      await Job.findByIdAndUpdate(jobId, { 
        status: 'interviews_completed'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Candidate rankings updated successfully',
      totalCandidates: allApplications.length,
      completedInterviews: interviewCompletedCount
    });

  } catch (error) {
    console.error('Update rankings error:', error);
    return NextResponse.json(
      { error: 'Failed to update candidate rankings' },
      { status: 500 }
    );
  }
}

// Get final ranking view
export async function GET(request, { params }) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;

    await connectDB();

    // Verify job ownership
    const job = await Job.findOne({ _id: jobId, hostId: host._id });
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Get all applications with completed interviews
    const applications = await Application.find({ 
      jobId: jobId,
      voiceInterviewCompleted: true
    })
    .populate('userId', 'name email phone profilePicture branch')
    .sort({ finalScore: -1, voiceInterviewScore: -1, atsScore: -1 });

    // Format for final ranking view
    const rankedCandidates = applications.map((app, index) => ({
      id: app._id,
      rank: index + 1,
      user: app.userId,
      atsScore: app.atsScore || 0,
      voiceInterviewScore: app.voiceInterviewScore || 0,
      finalScore: app.finalScore || 0,
      status: app.status,
      aiAnalysis: app.aiAnalysis,
      voiceInterviewFeedback: app.voiceInterviewFeedback,
      resumeUrl: app.resumeUrl,
      appliedAt: app.createdAt,
      interviewCompletedAt: app.interviewCompletedAt
    }));

    return NextResponse.json({
      success: true,
      job: {
        id: job._id,
        jobTitle: job.jobTitle,
        maxCandidatesShortlist: job.maxCandidatesShortlist,
        finalSelectionCount: job.finalSelectionCount,
        status: job.status
      },
      candidates: rankedCandidates,
      stats: {
        totalCandidates: rankedCandidates.length,
        averageScore: rankedCandidates.reduce((acc, c) => acc + c.finalScore, 0) / rankedCandidates.length,
        interviewsCompleted: rankedCandidates.filter(c => c.voiceInterviewScore > 0).length
      }
    });

  } catch (error) {
    console.error('Get final ranking error:', error);
    return NextResponse.json(
      { error: 'Failed to get final ranking' },
      { status: 500 }
    );
  }
}