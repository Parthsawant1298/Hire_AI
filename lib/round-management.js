// lib/round-management.js - Round Management Utility
import { Job, Application } from '@/models/job';

/**
 * Check and advance rounds automatically based on application statuses
 * This should be called whenever candidate statuses change (ai_selected/ai_rejected)
 */
export async function checkAndAdvanceRound(jobId) {
  try {
    console.log(`🔄 Checking round advancement for job ${jobId}`);

    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    // Get all applications for current round
    const currentRoundApplications = await Application.find({
      jobId: jobId,
      round: job.currentRound
    });

    // Check if all applications have been processed
    const processedApplications = currentRoundApplications.filter(app =>
      app.status === 'ai_selected' || app.status === 'ai_rejected'
    );

    const pendingApplications = currentRoundApplications.filter(app =>
      app.status === 'applied'
    );

    const isRoundComplete = pendingApplications.length === 0 && currentRoundApplications.length > 0;

    console.log(`Round ${job.currentRound} status:`, {
      total: currentRoundApplications.length,
      processed: processedApplications.length,
      pending: pendingApplications.length,
      isComplete: isRoundComplete
    });

    if (isRoundComplete) {
      return await advanceToNextRound(job, currentRoundApplications);
    }

    return {
      success: true,
      roundAdvanced: false,
      currentRound: job.currentRound,
      roundStats: {
        total: currentRoundApplications.length,
        processed: processedApplications.length,
        pending: pendingApplications.length
      }
    };

  } catch (error) {
    console.error('Round management error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Advance to the next round
 */
async function advanceToNextRound(job, currentRoundApplications) {
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

  let nextRound = null;
  let jobCompleted = false;

  if (job.currentRound === 1) {
    // After Resume Round (Round 1)
    if (selectedCount > 0) {
      // Move selected candidates to Round 2 (Interview Round)
      await Application.updateMany(
        { jobId: job._id, status: 'ai_selected', round: 1 },
        {
          round: 2,
          status: 'shortlisted'  // Ready for interviews
        }
      );

      nextRound = 2;
      console.log(`✅ Round 1 completed. ${selectedCount} candidates moved to Round 2 (Interview)`);
    } else {
      jobCompleted = true;
      console.log(`❌ Round 1 completed with no selections. Job completed.`);
    }

  } else if (job.currentRound === 2) {
    // After Interview Round (Round 2)
    if (selectedCount > 0) {
      // Move to Final Round (Round 3) or HR review
      await Application.updateMany(
        { jobId: job._id, status: 'ai_selected', round: 2 },
        {
          round: 3,
          status: 'hr_selected'  // Ready for HR final review
        }
      );

      nextRound = 3;
      console.log(`✅ Round 2 completed. ${selectedCount} candidates moved to Round 3 (Final Review)`);
    } else {
      jobCompleted = true;
      console.log(`❌ Round 2 completed with no selections. Job completed.`);
    }

  } else if (job.currentRound === 3) {
    // Final Round completed
    jobCompleted = true;
    console.log(`✅ Round 3 (Final) completed. Job completed.`);
  }

  // Update job status
  if (jobCompleted) {
    job.status = 'completed';
    job.roundStatus = 'completed';
    console.log(`🎯 Job ${job._id} marked as completed`);
  } else if (nextRound) {
    job.currentRound = nextRound;
    job.roundStatus = 'active';
    console.log(`🔄 Job ${job._id} advanced to Round ${nextRound}`);
  }

  await job.save();

  return {
    success: true,
    roundAdvanced: true,
    previousRound: nextRound ? nextRound - 1 : job.currentRound,
    currentRound: job.currentRound,
    nextRound: nextRound,
    jobCompleted: jobCompleted,
    roundStats: {
      processed: currentRoundApplications.length,
      selected: selectedCount,
      rejected: rejectedCount
    }
  };
}

/**
 * Get round display information
 */
export function getRoundDisplayInfo(roundNumber) {
  const roundInfo = {
    1: {
      name: 'Resume Round',
      description: 'AI-powered resume screening and analysis',
      nextAction: 'Interview Round'
    },
    2: {
      name: 'Interview Round',
      description: 'Voice interview with AI assessment',
      nextAction: 'Final Review'
    },
    3: {
      name: 'Final Round',
      description: 'HR review and final selection',
      nextAction: 'Completed'
    }
  };

  return roundInfo[roundNumber] || {
    name: `Round ${roundNumber}`,
    description: 'Selection round',
    nextAction: 'Next Round'
  };
}

/**
 * Calculate round completion percentage
 */
export function calculateRoundProgress(job, candidates) {
  if (!job || !candidates) return 0;

  const currentRoundCandidates = candidates.filter(c => c.round === job.currentRound);
  const processedCandidates = currentRoundCandidates.filter(c =>
    c.status === 'ai_selected' || c.status === 'ai_rejected'
  );

  if (currentRoundCandidates.length === 0) return 100;

  return Math.round((processedCandidates.length / currentRoundCandidates.length) * 100);
}