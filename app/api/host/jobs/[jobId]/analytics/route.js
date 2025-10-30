// app/api/host/jobs/[jobId]/analytics/route.js
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Job, Application } from '@/models/job';
import User from '@/models/user';
import { NextResponse } from 'next/server';

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
    const job = await Job.findOne({ _id: jobId, hostId: host._id });
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Get all applications for this job
    const applications = await Application.find({ jobId })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50); // Limit for performance

    // Calculate statistics
    const stats = {
      totalViews: job.views || 0,
      totalApplications: applications.length,
      completedInterviews: applications.filter(app => 
        app.status === 'interview_completed' || app.status === 'shortlisted'
      ).length,
      shortlisted: applications.filter(app => app.status === 'shortlisted').length,
      rejected: applications.filter(app => app.status === 'rejected').length,
      pending: applications.filter(app => app.status === 'applied').length,
    };

    // Calculate conversion rates
    const conversionRates = {
      viewToApplication: stats.totalViews > 0 ? (stats.totalApplications / stats.totalViews * 100).toFixed(1) : 0,
      applicationToInterview: stats.totalApplications > 0 ? (stats.completedInterviews / stats.totalApplications * 100).toFixed(1) : 0,
      interviewToShortlist: stats.completedInterviews > 0 ? (stats.shortlisted / stats.completedInterviews * 100).toFixed(1) : 0
    };

    // Get application trends (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentApplications = applications.filter(app => 
      new Date(app.createdAt) >= sevenDaysAgo
    );

    // Group by day for trend chart
    const applicationTrends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const dayApplications = recentApplications.filter(app => {
        const appDate = new Date(app.createdAt);
        return appDate >= dayStart && appDate <= dayEnd;
      });

      applicationTrends.push({
        date: dayStart.toISOString().split('T')[0],
        applications: dayApplications.length
      });
    }

    // Score distribution
    const scoreRanges = {
      excellent: applications.filter(app => (app.finalScore || 0) >= 80).length,
      good: applications.filter(app => (app.finalScore || 0) >= 60 && (app.finalScore || 0) < 80).length,
      average: applications.filter(app => (app.finalScore || 0) >= 40 && (app.finalScore || 0) < 60).length,
      poor: applications.filter(app => (app.finalScore || 0) < 40).length
    };

    return NextResponse.json({
      success: true,
      analytics: {
        job: {
          _id: job._id,
          jobTitle: job.jobTitle,
          status: job.status,
          createdAt: job.createdAt,
          targetApplications: job.targetApplications,
          maxCandidatesShortlist: job.maxCandidatesShortlist,
          finalSelectionCount: job.finalSelectionCount
        },
        applications: applications.map(app => ({
          _id: app._id,
          userId: app.userId,
          status: app.status,
          atsScore: app.atsScore,
          finalScore: app.finalScore,
          createdAt: app.createdAt,
          voiceInterviewCompleted: !!app.voiceInterviewCompleted
        })),
        stats,
        conversionRates,
        applicationTrends,
        scoreRanges
      }
    });

  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}