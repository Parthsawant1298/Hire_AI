// app/api/debug/get-applications/route.js
import connectDB from '@/lib/mongodb';
import { Application } from '@/models/job';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    await connectDB();
    
    let query = {};
    if (jobId) {
      query.jobId = jobId;
    }
    
    const applications = await Application.find(query)
      .populate('userId', 'name email')
      .populate('jobId', 'jobTitle')
      .sort({ createdAt: -1 })
      .limit(10);
    
    return NextResponse.json({ 
      success: true,
      applications: applications.map(app => ({
        _id: app._id,
        jobId: app.jobId?._id,
        jobTitle: app.jobId?.jobTitle,
        userId: app.userId?._id,
        userName: app.userId?.name,
        userEmail: app.userId?.email,
        status: app.status,
        voiceInterviewCompleted: app.voiceInterviewCompleted,
        voiceInterviewScore: app.voiceInterviewScore,
        finalScore: app.finalScore,
        createdAt: app.createdAt
      }))
    });

  } catch (error) {
    console.error('Debug applications error:', error);
    return NextResponse.json({ 
      error: 'Failed to get applications',
      details: error.message 
    }, { status: 500 });
  }
}