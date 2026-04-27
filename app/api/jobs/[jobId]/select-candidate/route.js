// API for HR to manually select/reject candidates
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Job, Application } from '@/models/job';
import { requireHostAuth } from '@/middleware/host-auth';
import { sendOfferEmail, sendRejectionEmail } from '@/lib/email-service';

export async function POST(request, { params }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;
    const { applicationId, decision, notes } = await request.json();

    if (!applicationId || !decision) {
      return NextResponse.json(
        { error: 'Application ID and decision are required' },
        { status: 400 }
      );
    }

    if (!['selected', 'rejected'].includes(decision)) {
      return NextResponse.json(
        { error: 'Decision must be either "selected" or "rejected"' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify job belongs to this host
    const job = await Job.findOne({ _id: jobId, hostId: host._id });
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or unauthorized' },
        { status: 404 }
      );
    }

    // Find application
    const application = await Application.findOne({
      _id: applicationId,
      jobId
    }).populate('userId', 'name email');

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Update application with HR decision
    const newStatus = decision === 'selected' ? 'hr_selected' : 'hr_rejected';
    
    application.hrReviewed = true;
    application.hrDecision = decision;
    application.hrNotes = notes || '';
    application.hrReviewedAt = new Date();
    application.status = newStatus;

    await application.save();

    // Update job's selected candidates array
    if (decision === 'selected') {
      await Job.findByIdAndUpdate(jobId, {
        $addToSet: { selectedCandidates: application._id }
      });

      // Send offer email
      try {
        await sendOfferEmail({
          user: application.userId,
          job: job
        });
        
        application.offerEmailSent = true;
        await application.save();
      } catch (emailError) {
        console.error('Failed to send offer email:', emailError);
      }
    } else {
      // Send rejection email
      try {
        await sendRejectionEmail({
          user: application.userId,
          job: job,
          reason: 'After careful review of your application, we have decided to move forward with other candidates.'
        });
        
        application.rejectionEmailSent = true;
        await application.save();
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Candidate ${decision === 'selected' ? 'selected' : 'rejected'} successfully`,
      application: {
        _id: application._id,
        status: application.status,
        hrDecision: application.hrDecision,
        hrReviewed: application.hrReviewed
      }
    });

  } catch (error) {
    console.error('Selection error:', error);
    return NextResponse.json(
      { error: 'Failed to process selection' },
      { status: 500 }
    );
  }
}

// Bulk selection endpoint
export async function PUT(request, { params }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;
    const { selections } = await request.json(); // Array of { applicationId, decision, notes }

    if (!Array.isArray(selections) || selections.length === 0) {
      return NextResponse.json(
        { error: 'Selections array is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const job = await Job.findOne({ _id: jobId, hostId: host._id }).populate('hostId');
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const results = [];
    
    for (const selection of selections) {
      try {
        const application = await Application.findOne({
          _id: selection.applicationId,
          jobId
        }).populate('userId', 'name email');

        if (!application) continue;

        const newStatus = selection.decision === 'selected' ? 'hr_selected' : 'hr_rejected';
        
        application.hrReviewed = true;
        application.hrDecision = selection.decision;
        application.hrNotes = selection.notes || '';
        application.hrReviewedAt = new Date();
        application.status = newStatus;

        await application.save();

        if (selection.decision === 'selected') {
          await Job.findByIdAndUpdate(jobId, {
            $addToSet: { selectedCandidates: application._id }
          });

          await sendOfferEmail({ user: application.userId, job });
          application.offerEmailSent = true;
        } else {
          await sendRejectionEmail({ 
            user: application.userId, 
            job,
            reason: 'After careful review, we have decided to move forward with other candidates.'
          });
          application.rejectionEmailSent = true;
        }

        await application.save();

        results.push({
          applicationId: application._id,
          status: 'success',
          decision: selection.decision
        });

      } catch (err) {
        results.push({
          applicationId: selection.applicationId,
          status: 'error',
          error: err.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Bulk selection processed',
      results
    });

  } catch (error) {
    console.error('Bulk selection error:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk selection' },
      { status: 500 }
    );
  }
}
