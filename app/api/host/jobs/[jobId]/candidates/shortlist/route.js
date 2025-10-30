// app/api/host/jobs/[jobId]/candidates/shortlist/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Job, Application } from '@/models/job';
import { sendShortlistEmail } from '@/lib/email-service';
import { createVAPIAssistant } from '@/lib/vapi-service';

export async function POST(request, { params }) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;
    const { candidateIds } = await request.json();

    await connectDB();

    // Verify job ownership
    const job = await Job.findOne({ _id: jobId, hostId: host._id }).populate('hostId');
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    if (candidateIds.length > job.maxCandidatesShortlist) {
      return NextResponse.json(
        { error: `Cannot shortlist more than ${job.maxCandidatesShortlist} candidates` },
        { status: 400 }
      );
    }

    // Create VAPI assistant if needed
    let vapiAssistantId = job.vapiAssistantId;
    if (!vapiAssistantId && job.interviewQuestions && job.interviewQuestions.length > 0) {
      try {
        const assistant = await createVAPIAssistant({
          jobTitle: job.jobTitle,
          questions: job.interviewQuestions,
          duration: job.voiceInterviewDuration || 15
        });
        vapiAssistantId = assistant.id;
        
        // Update job with assistant ID
        await Job.findByIdAndUpdate(jobId, { 
          vapiAssistantId: vapiAssistantId,
          interviewLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/interview/${jobId}?assistant=${vapiAssistantId}`
        });
      } catch (vapiError) {
        console.error('Failed to create VAPI assistant:', vapiError);
        // Continue without VAPI - can be created later
      }
    }

    // Update selected applications to shortlisted
    const applications = await Application.find({
      _id: { $in: candidateIds },
      jobId: jobId,
      status: 'applied'
    }).populate('userId');

    const results = [];

    for (const application of applications) {
      try {
        // Update application status
        application.status = 'shortlisted';
        await application.save();

        // Send shortlist email with interview invitation
        const interviewLink = vapiAssistantId 
          ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/interview/${jobId}?assistant=${vapiAssistantId}`
          : null;

        await sendShortlistEmail({
          user: application.userId,
          job: job,
          interviewLink: interviewLink,
          ranking: candidateIds.indexOf(application._id.toString()) + 1
        });

        results.push({
          candidateId: application._id,
          success: true,
          status: 'shortlisted'
        });
      } catch (error) {
        console.error(`Failed to shortlist candidate ${application._id}:`, error);
        results.push({
          candidateId: application._id,
          success: false,
          error: error.message
        });
      }
    }

    // Update job status and shortlisted candidates
    await Job.findByIdAndUpdate(jobId, {
      shortlistedCandidates: candidateIds,
      status: 'interviews_active'
    });

    return NextResponse.json({
      success: true,
      message: `${applications.length} candidates shortlisted successfully`,
      results,
      assistantCreated: !!vapiAssistantId
    });

  } catch (error) {
    console.error('Shortlist candidates error:', error);
    return NextResponse.json(
      { error: 'Failed to shortlist candidates' },
      { status: 500 }
    );
  }
}