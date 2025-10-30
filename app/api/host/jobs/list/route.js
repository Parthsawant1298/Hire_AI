import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Job } from '@/models/job';

export async function GET(request) {
  try {
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const status = searchParams.get('status');

    console.log('Jobs List API: Host ID:', host._id, 'Host name:', host.name);

    await connectDB();

    // Build query - exclude cancelled jobs by default unless specifically requested
    const query = { hostId: host._id };
    if (status && status !== 'all') {
      query.status = status;
    } else if (!status) {
      // By default, don't show cancelled jobs
      query.status = { $ne: 'cancelled' };
    }
    // If status === 'all', don't add any status filter

    console.log('Jobs List API: Query:', JSON.stringify(query));

    // Get jobs with pagination
    const jobs = await Job.find(query)
      .select('-interviewQuestions') // Exclude questions for list view
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('shortlistedCandidates finalSelectedCandidates', 'userId atsScore finalScore status');

    console.log('Jobs List API: Found jobs count:', jobs.length);
    jobs.forEach(job => console.log('  - Job:', job._id, job.jobTitle));

    // Calculate actual completed interviews for each job from applications
    const Application = (await import('@/models/job')).Application;
    
    const jobsWithCounts = await Promise.all(jobs.map(async (job) => {
      const jobObj = job.toObject();
      
      // Count actual completed interviews
      const completedCount = await Application.countDocuments({
        jobId: job._id,
        voiceInterviewCompleted: true
      });
      
      // Override with actual count
      jobObj.completedInterviews = completedCount;
      
      return jobObj;
    }));

    const totalJobs = await Job.countDocuments(query);

    return NextResponse.json({
      success: true,
      jobs: jobsWithCounts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalJobs / limit),
        totalJobs,
        hasNext: page < Math.ceil(totalJobs / limit),
        hasPrev: page > 1
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('List jobs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
