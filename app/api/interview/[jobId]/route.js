import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth } from '@/middleware/auth';
import { Application, Job } from '@/models/job';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const assistantId = searchParams.get('assistantId');

    // Handle session lookup by assistantId (for webhooks)
    if (assistantId) {
      await connectDB();

      const job = await Job.findOne({ vapiAssistantId: assistantId });
      if (!job) {
        return NextResponse.json(
          { error: 'Assistant not found' },
          { status: 404 }
        );
      }

      // For webhooks, we need to return session info
      // This is a simplified version - in production you'd store session data
      return NextResponse.json({
        success: true,
        session: {
          jobId: job._id,
          assistantId: assistantId,
          // Note: userId would need to be determined from context or stored session
          userId: null // Webhook will need to extract from metadata
        }
      });
    }

    // Regular application lookup
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    const { jobId } = await params;

    await connectDB();

    const application = await Application.findOne({
      jobId,
      userId: user._id
    }).select('status voiceInterviewCompleted voiceInterviewFeedback voiceInterviewTranscript finalScore atsScore interviewFeedback transcript');

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      application: {
        status: application.status,
        voiceInterviewCompleted: application.voiceInterviewCompleted,

        // Voice Interview Feedback
        voiceFeedback: application.voiceInterviewFeedback || application.interviewFeedback,
        voiceTranscript: application.voiceInterviewTranscript || application.transcript,

        // Scores
        finalScore: application.finalScore,
        atsScore: application.atsScore, // Resume/ATS round score
        interviewScore: application.finalScore - (application.atsScore || 0) // Voice interview contribution
      }
    });

  } catch (error) {
    console.error('❌ Fetch application error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
