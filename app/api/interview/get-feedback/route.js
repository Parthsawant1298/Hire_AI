import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Application } from '@/models/job';
import { requireAuth } from '@/middleware/auth';

export async function GET(request) {
  try {
    await connectDB();
    
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID required' },
        { status: 400 }
      );
    }

    const application = await Application.findOne({
      jobId: jobId,
      candidateId: user._id
    }).populate('jobId');

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    if (!application.voiceInterviewCompleted) {
      return NextResponse.json(
        { success: false, error: 'Interview not completed yet' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback: {
        score: application.voiceInterviewScore,
        finalScore: application.finalScore,
        feedback: application.interviewFeedback,
        status: application.status,
        recommendation: application.aiRecommendation,
        completedAt: application.interviewCompletedAt,
        duration: application.interviewDuration,
        attempts: application.interviewAttempts,
        history: application.interviewHistory || []
      },
      job: {
        title: application.jobId.jobTitle,
        company: application.jobId.hostId?.organization || 'Company'
      }
    });

  } catch (error) {
    console.error('❌ Get feedback error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
