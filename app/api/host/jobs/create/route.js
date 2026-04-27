// app/api/host/jobs/create/route.js
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Job } from '@/models/job';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    await connectDB();

    const formData = await request.formData();
    
    // DEBUG: Log all form data
    console.log('📋 Received Form Data:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}: ${typeof value === 'object' ? '[File]' : value}`);
    }
    
    // Extract form data
    const jobData = {
      hostId: host._id,
      jobTitle: formData.get('jobTitle')?.trim(),
      jobDescription: formData.get('jobDescription')?.trim(),
      jobResponsibilities: formData.get('jobResponsibilities')?.trim(),
      jobRequirements: formData.get('jobRequirements')?.trim(),
      jobType: formData.get('jobType'),
      location: formData.get('location')?.trim(),
      salary: formData.get('salary')?.trim(),
      companyName: host.organization || host.name || 'Company',
      targetApplications: parseInt(formData.get('targetApplications')),
      positionsAvailable: parseInt(formData.get('positionsAvailable')),
      // Interview Round Settings
      firstRoundShortlist: formData.get('firstRoundShortlist') ? parseInt(formData.get('firstRoundShortlist')) : 50,
      finalRoundShortlist: formData.get('finalRoundShortlist') ? parseInt(formData.get('finalRoundShortlist')) : 10,
      voiceInterviewDuration: formData.get('voiceInterviewDuration') ? parseInt(formData.get('voiceInterviewDuration')) : 15,
      applicationDeadline: formData.get('applicationDeadline') ? new Date(formData.get('applicationDeadline')) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
      status: 'draft' // Start as draft, publish after setup
    };

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
      jobData.jobImage = uploadResult.secure_url;
    }

    // Validate required fields
    const requiredFields = ['jobTitle', 'jobDescription', 'jobResponsibilities', 'jobRequirements', 'location', 'salary'];
    for (const field of requiredFields) {
      if (!jobData[field]) {
        return NextResponse.json(
          { error: `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required` },
          { status: 400 }
        );
      }
    }

    // Create job in database as draft
    const job = await Job.create(jobData);
    
    console.log('✅ Job created as draft:', job._id);

    return NextResponse.json({
      success: true,
      message: 'Job created successfully. Please configure interview questions.',
      job: {
        id: job._id,
        jobTitle: job.jobTitle,
        status: job.status,
        companyName: job.companyName,
        firstRoundShortlist: job.firstRoundShortlist,
        finalRoundShortlist: job.finalRoundShortlist,
        voiceInterviewDuration: job.voiceInterviewDuration
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Create job error:', error);
    
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0]?.message || 'Validation failed';
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create job. Please try again.' },
      { status: 500 }
    );
  }
}
