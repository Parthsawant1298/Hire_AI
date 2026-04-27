// app/api/host/jobs/[jobId]/delete/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Job, Application } from '@/models/job';

export async function DELETE(request, { params }) {
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
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Check if job can be deleted
    const canDelete = ['draft', 'published'].includes(job.status) && job.currentApplications === 0;
    
    if (!canDelete) {
      // If job has applications, we don't delete but mark as cancelled
      if (job.currentApplications > 0) {
        // Cancel the job instead of deleting
        const updatedJob = await Job.findByIdAndUpdate(
          jobId,
          { 
            status: 'cancelled',
            updatedAt: new Date() 
          },
          { new: true }
        );

        // Notify candidates if there are applications
        if (job.currentApplications > 0) {
          try {
            const applications = await Application.find({ jobId })
              .populate('userId', 'name email');
            
            // Send cancellation emails (optional)
            const { sendJobCancellationEmail } = await import('@/lib/email-service');
            for (const app of applications) {
              try {
                await sendJobCancellationEmail({
                  user: app.userId,
                  job: job
                });
              } catch (emailError) {
                console.error('Failed to send cancellation email:', emailError);
              }
            }
          } catch (error) {
            console.error('Error notifying candidates:', error);
          }
        }

        return NextResponse.json({
          success: true,
          message: 'Job has been cancelled successfully',
          action: 'cancelled'
        });
      } else {
        return NextResponse.json(
          { error: 'Cannot delete job in current status' },
          { status: 400 }
        );
      }
    }

    // Delete all related applications first
    await Application.deleteMany({ jobId: jobId });

    // Delete the job
    await Job.findByIdAndDelete(jobId);

    // Clean up Cloudinary image if exists
    if (job.jobImage) {
      try {
        const { deleteFromCloudinary } = await import('@/lib/cloudinary');
        const publicId = job.jobImage.split('/').pop().split('.')[0];
        await deleteFromCloudinary(publicId);
      } catch (cloudinaryError) {
        console.error('Failed to delete image from Cloudinary:', cloudinaryError);
        // Don't fail the request for this
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Job deleted successfully',
      action: 'deleted'
    });

  } catch (error) {
    console.error('Delete job error:', error);
    return NextResponse.json(
      { error: 'Failed to delete job. Please try again.' },
      { status: 500 }
    );
  }
}