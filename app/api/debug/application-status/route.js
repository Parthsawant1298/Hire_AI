import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth } from '@/middleware/auth';
import { Application } from '@/models/job';

export async function GET(request) {
  try {
    await connectDB();
    
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json({ error: 'JobId parameter required' }, { status: 400 });
    }
    
    // Get application status
    const application = await Application.findOne({
      jobId: jobId,
      userId: user._id
    });
    
    return NextResponse.json({
      success: true,
      userId: user._id,
      jobId: jobId,
      application: application ? {
        id: application._id,
        status: application.status,
        appliedAt: application.createdAt,
        atsScore: application.atsScore,
        voiceInterviewCompleted: application.voiceInterviewCompleted
      } : null,
      hasApplication: !!application,
      allowedForInterview: application && ['shortlisted', 'interview_scheduled', 'interview_completed'].includes(application.status)
    });
    
  } catch (error) {
    console.error('Debug application status error:', error);
    return NextResponse.json(
      { error: 'Failed to check application status' },
      { status: 500 }
    );
  }
}