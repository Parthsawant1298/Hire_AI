// app/api/host/jobs/[jobId]/questions/update/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Job } from '@/models/job';

export async function PUT(request, { params }) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;
    const { questions } = await request.json();

    await connectDB();

    // Validate questions format
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: 'At least one question is required' },
        { status: 400 }
      );
    }

    // Validate each question
    for (const question of questions) {
      if (!question.question || !question.question.trim()) {
        return NextResponse.json(
          { error: 'All questions must have valid text' },
          { status: 400 }
        );
      }
    }

    // Use findByIdAndUpdate to avoid version conflicts
    const updatedJob = await Job.findOneAndUpdate(
      { _id: jobId, hostId: host._id }, // Ensure ownership
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
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Questions updated successfully',
      questionsCount: questions.length
    });

  } catch (error) {
    console.error('Update questions error:', error);
    return NextResponse.json(
      { error: 'Failed to update questions. Please try again.' },
      { status: 500 }
    );
  }
}