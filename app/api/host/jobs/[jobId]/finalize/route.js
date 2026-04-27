// FIXED: app/api/host/jobs/[jobId]/finalize/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Job } from '@/models/job';
import { createVAPIAssistant } from '@/lib/vapi-service';

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

    if (!job.interviewQuestions || job.interviewQuestions.length === 0) {
      return NextResponse.json(
        { error: 'Interview questions are required before finalizing' },
        { status: 400 }
      );
    }

    console.log('Creating VAPI assistant for job:', jobId);

    // Create VAPI assistant with questions (optional - skip if no API key)
    let vapiAssistantId = null;
    let interviewLink = null;

    try {
      const vapiAssistant = await createVAPIAssistant({
        jobTitle: job.jobTitle,
        jobDescription: job.jobDescription,
        jobRequirements: job.jobRequirements,
        jobType: job.jobType,
        location: job.location,
        salary: job.salary,
        companyName: job.companyName,
        questions: job.interviewQuestions,
        duration: job.voiceInterviewDuration
      });

      console.log('VAPI assistant created:', vapiAssistant.id);

      // FIXED: Proper base URL handling
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                     process.env.APP_URL || 
                     (process.env.NODE_ENV === 'production' 
                       ? 'https://your-domain.com' 
                       : 'https://hire-ai-sepia.vercel.app');
      
      vapiAssistantId = vapiAssistant.id;
      interviewLink = `${baseUrl}/interview/${jobId}?assistant=${vapiAssistant.id}`;

      console.log('Generated interview link:', interviewLink);
    } catch (vapiError) {
      console.warn('⚠️ VAPI assistant creation skipped:', vapiError.message);
      // Continue without VAPI - job can still be published
      // Interviews will create assistant on-the-fly
    }

    // Update job with VAPI details and publish
    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      {
        vapiAssistantId: vapiAssistantId,
        interviewLink: interviewLink,
        status: 'published',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedJob) {
      throw new Error('Failed to update job');
    }

    console.log('✅ Job published:', jobId);

    return NextResponse.json({
      success: true,
      message: vapiAssistantId 
        ? 'Job published successfully with voice interview' 
        : 'Job published successfully (voice interview will be configured per-candidate)',
      jobId: updatedJob._id,
      interviewLink: interviewLink,
      vapiAssistantId: vapiAssistantId,
      questionsCount: job.interviewQuestions.length
    });

  } catch (error) {
    console.error('Finalize job error:', error);
    return NextResponse.json(
      { error: `Failed to finalize job: ${error.message}` },
      { status: 500 }
    );
  }
}