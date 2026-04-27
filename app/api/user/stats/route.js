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
      console.log('  - Status:', app.status, 'ATS Score:', app.atsScore);
    });

    // Calculate stats based on new resume-only workflow
    const stats = {
      totalApplications: applications.length,
      pendingReview: applications.filter(app =>
        app.status === 'applied'
      ).length,
      aiShortlisted: applications.filter(app =>
        app.status === 'ai_selected'
      ).length,
      finalSelected: applications.filter(app =>
        app.status === 'hr_selected' || app.status === 'offer_sent'
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