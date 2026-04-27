// app/api/host/jobs/[jobId]/edit/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Job } from '@/models/job';

// Get job for editing
export async function GET(request, { params }) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;

    await connectDB();

    // Find job and verify ownership
    const job = await Job.findOne({ _id: jobId, hostId: host._id })
      .populate('hostId', 'name organization');

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job._id,
        jobTitle: job.jobTitle,
        jobDescription: job.jobDescription,
        jobResponsibilities: job.jobResponsibilities,
        jobRequirements: job.jobRequirements,
        jobType: job.jobType,
        jobImage: job.jobImage,
        maxCandidatesShortlist: job.maxCandidatesShortlist,
        finalSelectionCount: job.finalSelectionCount,
        targetApplications: job.targetApplications,
        voiceInterviewDuration: job.voiceInterviewDuration,
        applicationDeadline: job.applicationDeadline,
        status: job.status,
        currentApplications: job.currentApplications,
        createdAt: job.createdAt,
        hostId: job.hostId
      }
    });

  } catch (error) {
    console.error('Get job for editing error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job details' },
      { status: 500 }
    );
  }
}

// Update job
export async function PUT(request, { params }) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;

    await connectDB();

    // Find job and verify ownership
    const existingJob = await Job.findOne({ _id: jobId, hostId: host._id });
    if (!existingJob) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Check if job can be edited (not if it has applications and is in progress)
    const canEdit = ['draft', 'published', 'applications_open'].includes(existingJob.status);
    if (!canEdit && existingJob.currentApplications > 0) {
      return NextResponse.json(
        { error: 'Cannot edit job with active applications. You can only update deadline and candidate limits.' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    
    // Extract form data
    const updateData = {
      jobTitle: formData.get('jobTitle')?.trim(),
      jobDescription: formData.get('jobDescription')?.trim(),
      jobResponsibilities: formData.get('jobResponsibilities')?.trim(),
      jobRequirements: formData.get('jobRequirements')?.trim(),
      jobType: formData.get('jobType'),
      maxCandidatesShortlist: parseInt(formData.get('maxCandidatesShortlist')),
      finalSelectionCount: parseInt(formData.get('finalSelectionCount')),
      targetApplications: parseInt(formData.get('targetApplications')),
      voiceInterviewDuration: parseInt(formData.get('voiceInterviewDuration')),
      applicationDeadline: formData.get('applicationDeadline') ? new Date(formData.get('applicationDeadline')) : undefined
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null || updateData[key] === '') {
        delete updateData[key];
      }
    });

    // Handle job image upload if provided
    const jobImage = formData.get('jobImage');
    if (jobImage && jobImage.size > 0) {
      // Validate image
      if (jobImage.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Image size must be less than 5MB' },
          { status: 400 }
        );
      }

      if (!jobImage.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Only image files are allowed' },
          { status: 400 }
        );
      }

      // Upload to Cloudinary
      const { uploadToCloudinary } = await import('@/lib/cloudinary');
      const bytes = await jobImage.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const uploadResult = await uploadToCloudinary(buffer, jobImage.name, 'job-images');
      updateData.jobImage = uploadResult.secure_url;
    }

    // Validate constraints
    if (updateData.finalSelectionCount && updateData.maxCandidatesShortlist && 
        updateData.finalSelectionCount > updateData.maxCandidatesShortlist) {
      return NextResponse.json(
        { error: 'Final selection count cannot be greater than max candidates for shortlist' },
        { status: 400 }
      );
    }

    if (updateData.maxCandidatesShortlist && updateData.targetApplications && 
        updateData.maxCandidatesShortlist > updateData.targetApplications) {
      return NextResponse.json(
        { error: 'Max candidates for shortlist cannot be greater than target applications' },
        { status: 400 }
      );
    }

    // Update job
    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      {
        ...updateData,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Job updated successfully',
      job: {
        id: updatedJob._id,
        jobTitle: updatedJob.jobTitle,
        status: updatedJob.status
      }
    });

  } catch (error) {
    console.error('Update job error:', error);
    
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0]?.message || 'Validation failed';
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update job. Please try again.' },
      { status: 500 }
    );
  }
}