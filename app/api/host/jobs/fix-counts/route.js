// API to check and fix interview counts
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Job, Application } from '@/models/job';
import { requireHostAuth } from '@/middleware/host-auth';

export async function GET(request) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;

    await connectDB();

    // Get all jobs for this host
    const jobs = await Job.find({ hostId: host._id });

    const results = [];

    for (const job of jobs) {
      // Count actual completed interviews
      const actualCompletedCount = await Application.countDocuments({
        jobId: job._id,
        voiceInterviewCompleted: true
      });

      const dbCount = job.completedInterviews || 0;
      const needsFix = dbCount !== actualCompletedCount;

      const result = {
        jobId: job._id,
        jobTitle: job.jobTitle,
        dbCompletedInterviews: dbCount,
        actualCompletedInterviews: actualCompletedCount,
        needsFix: needsFix,
        currentApplications: job.currentApplications,
        shortlisted: job.shortlistedCandidates?.length || 0
      };

      // Fix if needed
      if (needsFix) {
        await Job.findByIdAndUpdate(job._id, {
          completedInterviews: actualCompletedCount
        });
        result.fixed = true;
      }

      results.push(result);
    }

    return NextResponse.json({
      success: true,
      results: results,
      message: 'Interview counts checked and fixed if needed'
    });

  } catch (error) {
    console.error('Check counts error:', error);
    return NextResponse.json(
      { error: 'Failed to check counts', details: error.message },
      { status: 500 }
    );
  }
}
