// app/api/debug/get-jobs/route.js
import connectDB from '@/lib/mongodb';
import { Job, Application } from '@/models/job';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();
    
    const jobs = await Job.find({}).sort({ createdAt: -1 }).limit(5);
    const applications = await Application.find({}).sort({ createdAt: -1 }).limit(10);
    
    return NextResponse.json({ 
      success: true,
      jobs: jobs.map(job => ({
        _id: job._id,
        jobTitle: job.jobTitle,
        status: job.status,
        createdAt: job.createdAt,
        completedInterviews: job.completedInterviews
      })),
      applications: applications.map(app => ({
        _id: app._id,
        jobId: app.jobId,
        status: app.status,
        voiceInterviewCompleted: app.voiceInterviewCompleted,
        voiceInterviewScore: app.voiceInterviewScore,
        finalScore: app.finalScore,
        createdAt: app.createdAt,
        interviewCompletedAt: app.interviewCompletedAt
      }))
    });

  } catch (error) {
    console.error('Debug jobs error:', error);
    return NextResponse.json({ 
      error: 'Failed to get jobs',
      details: error.message 
    }, { status: 500 });
  }
}