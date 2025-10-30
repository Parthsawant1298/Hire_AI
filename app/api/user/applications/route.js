// 🔗 9. API ROUTE - USER APPLICATIONS HISTORY  
// File: app/api/user/applications/route.js
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
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    await connectDB();

    let query = { userId: user._id };
    if (jobId) {
      query.jobId = jobId;
    }

    const applications = await Application.find(query)
      .populate({
        path: 'jobId',
        populate: {
          path: 'hostId',
          select: 'name organization profilePicture'
        }
      })
      .sort({ createdAt: -1 });

    // If specific job requested, return single application
    if (jobId && applications.length > 0) {
      return NextResponse.json({
        success: true,
        application: applications[0],
        job: applications[0].jobId
      });
    }

    return NextResponse.json({
      success: true,
      applications
    });

  } catch (error) {
    console.error('Get applications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}