// 🔗 12. API ROUTE - HOST OFFER LETTERS
// File: app/api/host/jobs/[jobId]/candidates/offer/route.js
// =================
import { sendOfferEmail } from '@/lib/email-service';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Application } from '@/models/job';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;
    const { candidateIds, offerDetails } = await request.json();

    await connectDB();

    // Verify job ownership first
    const job = await Job.findOne({ _id: jobId, hostId: host._id }).populate('hostId');
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    const applications = await Application.find({
      _id: { $in: candidateIds },
      jobId: jobId
    }).populate('userId');

    const results = [];

    for (const application of applications) {
      try {
        await sendOfferEmail({
          user: application.userId,
          job: job,
          offerDetails
        });

        application.status = 'offer_sent';
        application.offerEmailSent = true;
        await application.save();

        results.push({
          candidateId: application._id,
          success: true
        });
      } catch (error) {
        results.push({
          candidateId: application._id,
          success: false,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Send offers error:', error);
    return NextResponse.json(
      { error: 'Failed to send offers' },
      { status: 500 }
    );
  }
}