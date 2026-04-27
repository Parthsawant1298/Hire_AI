// app/api/host/jobs/[jobId]/candidates/update-status/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Job, Application } from '@/models/job';
import { checkAndAdvanceRound } from '@/lib/round-management';

export async function POST(request, { params }) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;
    const { candidateIds, action } = await request.json();

    // Validate action
    if (!['select', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "select" or "reject"' },
        { status: 400 }
      );
    }

    if (!candidateIds || candidateIds.length === 0) {
      return NextResponse.json(
        { error: 'No candidates specified' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify job ownership
    const job = await Job.findOne({ _id: jobId, hostId: host._id });
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Update candidate statuses
    const newStatus = action === 'select' ? 'ai_selected' : 'ai_rejected';

    const updateResult = await Application.updateMany(
      {
        _id: { $in: candidateIds },
        jobId: jobId,
        round: job.currentRound
      },
      {
        status: newStatus,
        [`${action}edAt`]: new Date()
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'No candidates found to update' },
        { status: 404 }
      );
    }

    console.log(`✅ Updated ${updateResult.modifiedCount} candidates to ${newStatus}`);

    // Check if round should advance automatically
    const roundResult = await checkAndAdvanceRound(jobId);

    let message = `${updateResult.modifiedCount} candidates ${action === 'select' ? 'selected' : 'rejected'} successfully`;

    if (roundResult.roundAdvanced) {
      if (roundResult.jobCompleted) {
        message += '. Job completed - all rounds finished.';
      } else {
        message += `. Round ${roundResult.previousRound} completed. Advanced to Round ${roundResult.currentRound}.`;
      }
    }

    return NextResponse.json({
      success: true,
      message,
      updatedCount: updateResult.modifiedCount,
      action,
      roundManagement: roundResult
    });

  } catch (error) {
    console.error('Update candidate status error:', error);
    return NextResponse.json(
      { error: 'Failed to update candidate status' },
      { status: 500 }
    );
  }
}

// Handle bulk operations for AI-powered ranking
export async function PUT(request, { params }) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;
    const { rankings } = await request.json();

    if (!rankings || !Array.isArray(rankings)) {
      return NextResponse.json(
        { error: 'Rankings array is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify job ownership
    const job = await Job.findOne({ _id: jobId, hostId: host._id });
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Apply AI-based selections based on rankings and thresholds
    const bulkOps = [];
    let selectedCount = 0;

    for (const ranking of rankings) {
      const { candidateId, score, rank, autoSelect } = ranking;

      // Determine status based on AI recommendation and thresholds
      let status = 'applied';

      if (autoSelect === true) {
        status = 'ai_selected';
        selectedCount++;
      } else if (autoSelect === false) {
        status = 'ai_rejected';
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: candidateId, jobId: jobId, round: job.currentRound },
          update: {
            ranking: rank,
            atsScore: score,
            status: status,
            ...(status !== 'applied' && { processedAt: new Date() })
          }
        }
      });
    }

    if (bulkOps.length > 0) {
      const result = await Application.bulkWrite(bulkOps);
      console.log(`📊 AI Processing: Updated ${result.modifiedCount} candidates (${selectedCount} selected)`);

      // Check if round should advance
      const roundResult = await checkAndAdvanceRound(jobId);

      return NextResponse.json({
        success: true,
        message: `AI processing completed. ${selectedCount} candidates selected.`,
        processedCount: result.modifiedCount,
        selectedCount,
        roundManagement: roundResult
      });
    }

    return NextResponse.json({
      success: true,
      message: 'No updates needed',
      processedCount: 0
    });

  } catch (error) {
    console.error('Bulk ranking update error:', error);
    return NextResponse.json(
      { error: 'Failed to update candidate rankings' },
      { status: 500 }
    );
  }
}