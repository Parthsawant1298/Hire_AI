// Debug route to manually update application status
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Application } from '@/models/job';

export async function POST(request) {
  try {
    await connectDB();
    
    const { jobId, userId, status } = await request.json();
    
    if (!jobId || !userId || !status) {
      return NextResponse.json(
        { error: 'jobId, userId, and status are required' },
        { status: 400 }
      );
    }

    // Find and update the application
    const application = await Application.findOneAndUpdate(
      { jobId, userId },
      { status },
      { new: true }
    );

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Application status updated to ${status}`,
      application: {
        id: application._id,
        status: application.status,
        userId: application.userId,
        jobId: application.jobId
      }
    });

  } catch (error) {
    console.error('Update application status error:', error);
    return NextResponse.json(
      { error: 'Failed to update application status' },
      { status: 500 }
    );
  }
}