// app/api/debug/interview-status/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth } from '@/middleware/auth';
import { Application } from '@/models/job';

export async function GET(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get all applications for this job (for debugging)
    const applications = await Application.find({ jobId })
      .populate('userId', 'name email')
      .select('status voiceInterviewCompleted voiceInterviewScore finalScore interviewAttempts createdAt')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      jobId,
      applications: applications.map(app => ({
        _id: app._id,
        userId: {
          _id: app.userId._id,
          name: app.userId.name,
          email: app.userId.email
        },
        status: app.status,
        voiceInterviewCompleted: app.voiceInterviewCompleted,
        voiceInterviewScore: app.voiceInterviewScore,
        finalScore: app.finalScore,
        interviewAttempts: app.interviewAttempts,
        createdAt: app.createdAt
      }))
    });

  } catch (error) {
    console.error('❌ Debug interview status error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}