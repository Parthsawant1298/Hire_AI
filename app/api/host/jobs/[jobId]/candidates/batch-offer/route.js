// app/api/host/jobs/[jobId]/candidates/batch-offer/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Job, Application } from '@/models/job';
import { sendOfferEmail } from '@/lib/email-service';

export async function POST(request, { params }) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;
    const { offerDetails } = await request.json();

    await connectDB();

    // Verify job ownership
    const job = await Job.findOne({ _id: jobId, hostId: host._id }).populate('hostId');
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Get all selected candidates
    const selectedApplications = await Application.find({
      jobId: jobId,
      status: 'selected'
    }).populate('userId', 'name email phone');

    if (selectedApplications.length === 0) {
      return NextResponse.json(
        { error: 'No selected candidates found' },
        { status: 400 }
      );
    }

    const results = [];

    // Send offers to all selected candidates
    for (const application of selectedApplications) {
      try {
        await sendOfferEmail({
          user: application.userId,
          job: job,
          offerDetails: {
            startDate: offerDetails.startDate || 'To be discussed',
            salary: offerDetails.salary || 'Competitive package',
            workLocation: offerDetails.workLocation || 'As discussed',
            employmentType: job.jobType === 'job' ? 'Full-time' : 'Internship',
            benefits: offerDetails.benefits || [],
            additionalNotes: offerDetails.additionalNotes || ''
          }
        });

        // Update application status
        application.status = 'offer_sent';
        application.offerEmailSent = true;
        await application.save();

        results.push({
          candidateId: application._id,
          candidateName: application.userId.name,
          email: application.userId.email,
          success: true
        });

        console.log(`Offer email sent to ${application.userId.email}`);

      } catch (error) {
        console.error(`Failed to send offer to ${application.userId.email}:`, error);
        
        results.push({
          candidateId: application._id,
          candidateName: application.userId.name,
          email: application.userId.email,
          success: false,
          error: error.message
        });
      }
    }

    // Update job status
    await Job.findByIdAndUpdate(jobId, { 
      status: 'offers_sent' 
    });

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Offers sent successfully to ${successCount} candidates${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      results,
      stats: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      }
    });

  } catch (error) {
    console.error('Batch offer sending error:', error);
    return NextResponse.json(
      { error: 'Failed to send offers' },
      { status: 500 }
    );
  }
}

// Get offer templates
export async function GET(request, { params }) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Return offer templates/defaults
    const offerTemplates = {
      internship: {
        duration: '3-6 months',
        stipend: 'As per company policy',
        workLocation: 'Office/Remote',
        learningOpportunities: [
          'Mentorship from senior professionals',
          'Real-world project experience',
          'Skills development workshops',
          'Career guidance and feedback'
        ]
      },
      fullTime: {
        probationPeriod: '3-6 months',
        workLocation: 'Office/Hybrid/Remote',
        benefits: [
          'Health insurance',
          'Paid time off',
          'Professional development allowance',
          'Flexible working hours'
        ]
      }
    };

    return NextResponse.json({
      success: true,
      templates: offerTemplates
    });

  } catch (error) {
    console.error('Get offer templates error:', error);
    return NextResponse.json(
      { error: 'Failed to get offer templates' },
      { status: 500 }
    );
  }
}