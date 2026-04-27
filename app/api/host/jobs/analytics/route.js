// File: app/api/host/jobs/analytics/route.js

import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Application, Job } from '@/models/job';
import { NextResponse } from 'next/server';

const CACHE_HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

function getPeriodStartDate(period) {
  const now = new Date();
  const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
  const d = days[period] ?? 30;
  return new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
}

export async function GET(request) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { host }        = authResult;
    const { searchParams } = new URL(request.url);
    const period          = searchParams.get('period') || '30d';
    const startDate       = getPeriodStartDate(period);

    await connectDB();

    // ── Step 1: Get jobs belonging to this host created in the selected period ──
    // BOTH totalJobs AND totalApplications use the same job set.
    // This ensures the metrics are consistent with each other.
    const periodJobs = await Job.find({
      hostId:    host._id,
      status:    { $ne: 'cancelled' },
      createdAt: { $gte: startDate },
    }).select('_id');

    const periodJobIds = periodJobs.map((j) => j._id);

    // ── Step 2: All metrics scoped to the same periodJobIds ──
    const applications = await Application.find({
      jobId: { $in: periodJobIds },
    }).select('status voiceInterviewCompleted');

    const totalJobs         = periodJobIds.length;
    const totalApplications = applications.length;
    const aiShortlisted     = applications.filter((a) => a.status === 'ai_selected').length;
    const successfulHires   = applications.filter((a) =>
      a.status === 'hr_selected' || a.status === 'offer_sent'
    ).length;

    // ── Step 3: Top performing jobs (same scope) ──
    const topJobs = await Application.aggregate([
      {
        $match: { jobId: { $in: periodJobIds } },
      },
      {
        $group: {
          _id:          '$jobId',
          applications: { $sum: 1 },
          hired:        { $sum: { $cond: [{ $in: ['$status', ['hr_selected', 'offer_sent']] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from:         'jobs',
          localField:   '_id',
          foreignField: '_id',
          as:           'job',
        },
      },
      { $unwind: '$job' },
      {
        $addFields: {
          conversionRate: {
            $round: [
              {
                $multiply: [
                  {
                    $cond: [
                      { $gt: ['$applications', 0] },
                      { $divide: ['$hired', '$applications'] },
                      0,
                    ],
                  },
                  100,
                ],
              },
              1,
            ],
          },
        },
      },
      { $sort: { applications: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id:            1,
          jobTitle:       '$job.jobTitle',
          applications:   1,
          hired:          1,
          conversionRate: 1,
        },
      },
    ]);

    return NextResponse.json(
      {
        success:   true,
        analytics: {
          period,
          totalJobs,
          totalApplications,
          aiShortlisted,
          successfulHires,
          topJobs,
        },
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500, headers: CACHE_HEADERS }
    );
  }
}