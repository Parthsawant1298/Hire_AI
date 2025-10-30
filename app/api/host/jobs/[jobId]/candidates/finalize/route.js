// 🔗 8. API ROUTE - HOST CANDIDATES SHORTLIST
// File: app/api/host/jobs/[jobId]/candidates/finalize/route.js
// =================
import { sendOfferEmail, sendRejectionEmail } from '@/lib/email-service';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Application, Job } from '@/models/job';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;
    const { selectedCandidateIds } = await request.json();

    await connectDB();

    // Verify job ownership
    const job = await Job.findOne({ _id: jobId, hostId: host._id }).populate('hostId');
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (selectedCandidateIds.length > job.finalSelectionCount) {
      return NextResponse.json(
        { error: `Cannot select more than ${job.finalSelectionCount} candidates` },
        { status: 400 }
      );
    }

    // Get all shortlisted applications
    const shortlistedApplications = await Application.find({
      jobId: jobId,
      status: { $in: ['shortlisted', 'interview_completed'] }
    }).populate('userId', 'name email');

    // Update selected candidates
    const selectedApplications = await Application.find({
      _id: { $in: selectedCandidateIds }
    }).populate('userId', 'name email');

    // Update rejected candidates
    const rejectedApplications = shortlistedApplications.filter(
      app => !selectedCandidateIds.includes(app._id.toString())
    );

    // Process selected candidates
    for (const application of selectedApplications) {
      application.status = 'selected';
      await application.save();

      // Send offer email
      try {
        await sendOfferEmail({
          user: application.userId,
          job: job,
          offerDetails: {
            startDate: 'To be discussed',
            salary: 'Competitive package'
          }
        });
        application.offerEmailSent = true;
        await application.save();
      } catch (emailError) {
        console.error('Failed to send offer email:', emailError);
      }
    }

    // Process rejected candidates
    for (const application of rejectedApplications) {
      application.status = 'rejected';
      await application.save();

      // Send rejection email
      try {
        await sendRejectionEmail({
          user: application.userId,
          job: job
        });
        application.rejectionEmailSent = true;
        await application.save();
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }
    }

    // Update job status
    job.finalSelectedCandidates = selectedCandidateIds;
    job.status = 'completed';
    await job.save();

    return NextResponse.json({
      success: true,
      message: 'Selection finalized successfully',
      selectedCount: selectedApplications.length,
      rejectedCount: rejectedApplications.length
    });

  } catch (error) {
    console.error('Finalize selection error:', error);
    return NextResponse.json(
      { error: 'Failed to finalize selection' },
      { status: 500 }
    );
  }
}