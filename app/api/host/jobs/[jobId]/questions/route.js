// app/api/host/jobs/[jobId]/questions/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Job } from '@/models/job';

// GET: Fetch questions for a job
export async function GET(request, { params }) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;

    await connectDB();

    const job = await Job.findOne({ _id: jobId, hostId: host._id })
      .select('interviewQuestions jobTitle voiceInterviewDuration');

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      questions: job.interviewQuestions || [],
      jobTitle: job.jobTitle,
      duration: job.voiceInterviewDuration
    });

  } catch (error) {
    console.error('Get questions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

// PUT: Update questions for a job
export async function PUT(request, { params }) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;
    const body = await request.json();

    await connectDB();

    const job = await Job.findOne({ _id: jobId, hostId: host._id });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Update questions
    job.interviewQuestions = body.questions;
    await job.save();

    console.log(`✅ Updated questions for job ${jobId}`);

    return NextResponse.json({
      success: true,
      message: 'Questions updated successfully',
      questions: job.interviewQuestions
    });

  } catch (error) {
    console.error('Update questions error:', error);
    return NextResponse.json(
      { error: 'Failed to update questions' },
      { status: 500 }
    );
  }
}
