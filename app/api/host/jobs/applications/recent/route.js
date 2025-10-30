import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Application } from '@/models/job';

export async function GET(request) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 5;

    await connectDB();

    // Get recent applications for this host's jobs
    const applications = await Application.find()
      .populate({
        path: 'jobId',
        match: { hostId: host._id },
        select: 'jobTitle'
      })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Filter out applications where jobId is null (not this host's jobs)
    const filteredApplications = applications.filter(app => app.jobId !== null);

    return NextResponse.json({
      success: true,
      applications: filteredApplications
    });

  } catch (error) {
    console.error('Recent applications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent applications' },
      { status: 500 }
    );
  }
}