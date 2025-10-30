// app/api/jobs/list/route.js
import connectDB from '@/lib/mongodb';
import { Job } from '@/models/job';
import Host from '@/models/host';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 12;
    const jobType = searchParams.get('jobType');
    const search = searchParams.get('search');

    // Build query - include more statuses for user visibility
    const query = { 
      status: { $in: ['published', 'applications_open', 'interviews_active'] },
      applicationDeadline: { $gte: new Date() }
    };

    if (jobType && ['job', 'internship'].includes(jobType)) {
      query.jobType = jobType;
    }

    if (search) {
      query.$or = [
        { jobTitle: { $regex: search, $options: 'i' } },
        { jobDescription: { $regex: search, $options: 'i' } },
        { jobRequirements: { $regex: search, $options: 'i' } }
      ];
    }

    // Get jobs with host info
    const jobs = await Job.find(query)
      .select('-interviewQuestions -vapiAssistantId -shortlistedCandidates -finalSelectedCandidates')
      .populate('hostId', 'name organization profilePicture isVerified')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const totalJobs = await Job.countDocuments(query);

    // Calculate application progress for each job
    const jobsWithProgress = jobs.map(job => ({
      ...job.toObject(),
      applicationProgress: {
        current: job.currentApplications,
        target: job.targetApplications,
        percentage: Math.round((job.currentApplications / job.targetApplications) * 100),
        slotsRemaining: job.targetApplications - job.currentApplications
      }
    }));

    return NextResponse.json({
      success: true,
      jobs: jobsWithProgress,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalJobs / limit),
        totalJobs,
        hasNext: page < Math.ceil(totalJobs / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('List jobs error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch jobs',
        details: error.message 
      },
      { status: 500 }
    );
  }
}