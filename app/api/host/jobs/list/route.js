// File: app/api/host/jobs/list/route.js

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Application, Job } from '@/models/job';

const CACHE_HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma':        'no-cache',
  'Expires':       '0',
};

export async function GET(request) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { host }         = authResult;
    const { searchParams } = new URL(request.url);

    const page   = Math.max(1, parseInt(searchParams.get('page'))  || 1);
    const limit  = Math.min(50, parseInt(searchParams.get('limit')) || 10);
    const status = searchParams.get('status') || '';

    await connectDB();

    // ── Build query ──
    // Default: exclude cancelled jobs
    // status=all: include everything
    // status=<specific>: filter to that status
    const query = { hostId: host._id };

    if (status === 'all') {
      // no status filter — show everything including cancelled
    } else if (status) {
      query.status = status;
    } else {
      query.status = { $ne: 'cancelled' };
    }

    const [jobs, totalCount] = await Promise.all([
      Job.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),  // .lean() returns plain objects — faster, no need for .toObject()
      Job.countDocuments(query),
    ]);

    if (jobs.length === 0) {
      return NextResponse.json(
        {
          success:    true,
          jobs:       [],
          pagination: {
            currentPage: page,
            totalPages:  0,
            totalJobs:   0,
            hasNext:     false,
            hasPrev:     false,
          },
        },
        { headers: CACHE_HEADERS }
      );
    }

    // ── Attach real application counts per job ──
    // Single aggregation instead of N individual countDocuments calls
    const jobIds = jobs.map((j) => j._id);

    const appCounts = await Application.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      {
        $group: {
          _id:          '$jobId',
          total:        { $sum: 1 },
          aiShortlisted: {
            $sum: { $cond: [{ $eq: ['$status', 'ai_selected'] }, 1, 0] },
          },
          hrSelected: {
            $sum: { $cond: [{ $in: ['$status', ['hr_selected', 'offer_sent']] }, 1, 0] },
          },
        },
      },
    ]);

    // Map counts by jobId for O(1) lookup
    const countMap = {};
    for (const c of appCounts) {
      countMap[c._id.toString()] = c;
    }

    const enrichedJobs = jobs.map((job) => {
      const counts = countMap[job._id.toString()] ?? { total: 0, aiShortlisted: 0, hrSelected: 0 };
      return {
        ...job,
        currentApplications:  counts.total,
        aiShortlistedCount:   counts.aiShortlisted,
        finalSelectedCount:   counts.hrSelected,
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json(
      {
        success: true,
        jobs:    enrichedJobs,
        pagination: {
          currentPage: page,
          totalPages,
          totalJobs:   totalCount,
          hasNext:     page < totalPages,
          hasPrev:     page > 1,
        },
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Jobs list API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs' },
      { status: 500, headers: CACHE_HEADERS }
    );
  }
}