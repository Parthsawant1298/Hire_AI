// app/api/host/jobs/[jobId]/rounds/check-completion/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Job, Application } from '@/models/job';

export async function POST(request, { params }) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;

    await connectDB();

    // Find the job and verify ownership
    const job = await Job.findOne({ _id: jobId, hostId: host._id });
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Get all applications for this job in the current round
    const currentRoundApplications = await Application.find({
      jobId: jobId,
      round: job.currentRound
    });

    // Check if all applications have been processed (either ai_selected or ai_rejected)
    const processedApplications = currentRoundApplications.filter(app =>
      app.status === 'ai_selected' || app.status === 'ai_rejected'
    );

    const pendingApplications = currentRoundApplications.filter(app =>
      app.status === 'applied'
    );

    const isRoundComplete = pendingApplications.length === 0 && currentRoundApplications.length > 0;

    console.log(`Round ${job.currentRound} status check:`, {
      total: currentRoundApplications.length,
      processed: processedApplications.length,
      pending: pendingApplications.length,
      isComplete: isRoundComplete
    });

    if (isRoundComplete) {
      // Count results
      const selectedCount = currentRoundApplications.filter(app => app.status === 'ai_selected').length;
      const rejectedCount = currentRoundApplications.filter(app => app.status === 'ai_rejected').length;

      // Mark current round as completed
      job.roundsCompleted.push({
        roundNumber: job.currentRound,
        completedAt: new Date(),
        candidatesProcessed: currentRoundApplications.length,
        candidatesSelected: selectedCount,
        candidatesRejected: rejectedCount
      });

      // Determine next action based on current round and selected candidates
      let nextRound = null;
      let jobCompleted = false;

      if (job.currentRound === 1) {
        // After Resume Round (Round 1)
        if (selectedCount > 0) {
          // Move selected candidates to Round 2 (Interview Round)
          await Application.updateMany(
            { jobId: jobId, status: 'ai_selected', round: 1 },
            { round: 2, status: 'shortlisted' }
          );

          nextRound = 2;
        } else {
          // No candidates selected - job completed with no hires
          jobCompleted = true;
        }
      } else if (job.currentRound === 2) {
        // After Interview Round (Round 2)
        if (selectedCount > 0) {
          // Move to Final Round (Round 3) or directly to HR review
          await Application.updateMany(
            { jobId: jobId, status: 'ai_selected', round: 2 },
            { round: 3, status: 'hr_selected' }
          );

          nextRound = 3;
        } else {
          // No candidates passed interview - job completed
          jobCompleted = true;
        }
      } else if (job.currentRound === 3) {
        // Final Round completed
        jobCompleted = true;
      }

      if (jobCompleted) {
        job.status = 'completed';
        job.roundStatus = 'completed';
      } else if (nextRound) {
        job.currentRound = nextRound;
        job.roundStatus = 'active';
      }

      await job.save();

      return NextResponse.json({
        success: true,
        roundCompleted: true,
        completedRound: job.currentRound === nextRound ? job.currentRound - 1 : job.currentRound,
        currentRound: job.currentRound,
        nextRound: nextRound,
        jobCompleted: jobCompleted,
        roundStats: {
          processed: currentRoundApplications.length,
          selected: selectedCount,
          rejected: rejectedCount
        }
      });
    }

    return NextResponse.json({
      success: true,
      roundCompleted: false,
      currentRound: job.currentRound,
      roundStats: {
        total: currentRoundApplications.length,
        processed: processedApplications.length,
        pending: pendingApplications.length
      }
    });

  } catch (error) {
    console.error('Round completion check error:', error);
    return NextResponse.json(
      { error: 'Failed to check round completion' },
      { status: 500 }
    );
  }
}