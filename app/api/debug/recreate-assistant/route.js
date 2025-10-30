import { NextResponse } from 'next/server';
import { createVAPIAssistant } from '@/lib/vapi-service';
import connectDB from '@/lib/mongodb';
import { Job } from '@/models/job';

export async function POST(request) {
  try {
    const { jobId } = await request.json();
    
    if (!jobId) {
      return NextResponse.json({ error: 'JobId is required' }, { status: 400 });
    }

    await connectDB();
    
    // Get job details
    const job = await Job.findById(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Create a new VAPI assistant with better configuration
    const assistant = await createVAPIAssistant({
      jobTitle: job.jobTitle,
      questions: job.interviewQuestions || [
        {
          question: "Tell me about yourself and your experience.",
          type: "general",
          difficulty: "easy",
          expectedDuration: 120
        },
        {
          question: "What interests you most about this position?",
          type: "behavioral", 
          difficulty: "easy",
          expectedDuration: 90
        }
      ],
      duration: job.voiceInterviewDuration || 15
    });

    // Update job with new assistant
    const interviewLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/interview/${jobId}?assistant=${assistant.id}`;
    
    await Job.findByIdAndUpdate(jobId, {
      vapiAssistantId: assistant.id,
      interviewLink: interviewLink
    });

    return NextResponse.json({
      success: true,
      assistant: {
        id: assistant.id,
        name: assistant.name
      },
      interviewLink: interviewLink,
      message: 'New VAPI assistant created successfully'
    });

  } catch (error) {
    console.error('Recreate assistant error:', error);
    return NextResponse.json(
      { error: `Failed to recreate assistant: ${error.message}` },
      { status: 500 }
    );
  }
}