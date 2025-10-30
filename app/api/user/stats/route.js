// 🔗 API ROUTE - USER STATS
// File: app/api/user/stats/route.js
// =================
import connectDB from '@/lib/mongodb';
import { requireAuth } from '@/middleware/auth';
import { Application } from '@/models/job';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;

    await connectDB();

    // Get all applications for this user
    const applications = await Application.find({ userId: user._id });

    console.log('Stats API: Found applications:', applications.length);
    applications.forEach(app => {
      console.log('  - Status:', app.status, 'voiceInterviewCompleted:', app.voiceInterviewCompleted);
    });

    // Calculate stats
    const stats = {
      totalApplications: applications.length,
      pendingInterviews: applications.filter(app =>
        app.status === 'shortlisted' || app.status === 'interview_scheduled'
      ).length,
      completedInterviews: applications.filter(app =>
        app.status === 'interview_completed' || app.voiceInterviewCompleted === true
      ).length,
      acceptedOffers: applications.filter(app =>
        app.status === 'selected' || app.status === 'accepted' || app.status === 'offer_sent'
      ).length
    };

    console.log('Stats API: Calculated stats:', stats);

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user stats' },
      { status: 500 }
    );
  }
}