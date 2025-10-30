// app/api/host/jobs/[jobId]/questions/generate/route.js
import { generateInterviewQuestions } from '@/lib/ai-services';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Job } from '@/models/job';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;

    await connectDB();

    // Find job and verify ownership
    const job = await Job.findOne({ _id: jobId, hostId: host._id });
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Generate questions using AI
    const questions = await generateInterviewQuestions({
      jobTitle: job.jobTitle,
      jobDescription: job.jobDescription,
      jobRequirements: job.jobRequirements,
      jobType: job.jobType,
      interviewDuration: job.voiceInterviewDuration
    });

    // Use findByIdAndUpdate to avoid version conflicts
    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      { 
        interviewQuestions: questions,
        updatedAt: new Date()
      },
      { 
        new: true, // Return the updated document
        runValidators: true, // Run schema validators
        useFindAndModify: false // Use native findOneAndUpdate
      }
    );

    if (!updatedJob) {
      return NextResponse.json(
        { error: 'Failed to update job with questions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      questions: questions,
      message: 'Interview questions generated successfully'
    });

  } catch (error) {
    console.error('Generate questions error:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions. Please try again.' },
      { status: 500 }
    );
  }
}