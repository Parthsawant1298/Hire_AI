// 🔗 10. API ROUTE - HOST ANALYTICS
// File: app/api/host/jobs/analytics/route.js
// =================
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Application, Job } from '@/models/job';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    await connectDB();

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // 30d
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get jobs in period
    const jobs = await Job.find({
      hostId: host._id,
      createdAt: { $gte: startDate }
    });

    const jobIds = jobs.map(job => job._id);

    // Get applications
    const applications = await Application.find({
      jobId: { $in: jobIds },
      createdAt: { $gte: startDate }
    });

    // Calculate metrics
    const totalJobs = jobs.length;
    const totalApplications = applications.length;
    const completedInterviews = applications.filter(app => app.voiceInterviewCompleted).length;
    const successfulHires = applications.filter(app => app.status === 'selected').length;

    // Top performing jobs
    const jobPerformance = await Application.aggregate([
      {
        $match: {
          jobId: { $in: jobIds },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$jobId',
          applications: { $sum: 1 },
          interviewed: { $sum: { $cond: ['$voiceInterviewCompleted', 1, 0] } },
          hired: { $sum: { $cond: [{ $eq: ['$status', 'selected'] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'jobs',
          localField: '_id',
          foreignField: '_id',
          as: 'job'
        }
      },
      {
        $unwind: '$job'
      },
      {
        $addFields: {
          conversionRate: {
            $multiply: [
              { $divide: ['$hired', '$applications'] },
              100
            ]
          }
        }
      },
      {
        $sort: { applications: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          jobTitle: '$job.jobTitle',
          applications: 1,
          interviewed: 1,
          hired: 1,
          conversionRate: { $round: ['$conversionRate', 1] }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      analytics: {
        totalJobs,
        totalApplications,
        completedInterviews,
        successfulHires,
        topJobs: jobPerformance,
        period
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}