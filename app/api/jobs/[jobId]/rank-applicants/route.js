// API to automatically rank all applicants for a job based on ATS scores
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Job, Application } from '@/models/job';
import { requireHostAuth } from '@/middleware/host-auth';

export async function POST(request, { params }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;

    await connectDB();

    // Verify job belongs to this host
    const job = await Job.findOne({ _id: jobId, hostId: host._id });
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get all applications for this job with COMPOSITE SCORING
    const { calculateCompositeScore } = await import('@/lib/ai-services');
    
    const applications = await Application.find({ jobId })
      .populate('userId', 'name email phone')
      .exec();

    if (applications.length === 0) {
      return NextResponse.json(
        { error: 'No applications found for this job' },
        { status: 404 }
      );
    }

    console.log(`\n🎯 RANKING ${applications.length} APPLICATIONS FOR JOB: ${job.jobTitle}`);
    console.log(`─────────────────────────────────────────────────────────────────`);

    // Calculate composite score for each application
    const applicationsWithCompositeScore = applications.map(app => {
      const compositeScore = calculateCompositeScore(app); // Pass full app, not just aiAnalysis
      return {
        application: app,
        compositeScore: compositeScore
      };
    });

    // Sort by composite score (INDUSTRY-STANDARD: ATS + Skills + Experience + Fit)
    applicationsWithCompositeScore.sort((a, b) => b.compositeScore - a.compositeScore);

    // Rank all applications and set AI recommendations
    const positionsAvailable = job.positionsAvailable || 1;
    const updatePromises = applicationsWithCompositeScore.map((item, index) => {
      const ranking = index + 1;
      const app = item.application;
      
      // AUTO-REJECT if composite score is 0 (location/salary incompatible)
      let aiRecommendation, status;
      if (item.compositeScore === 0) {
        aiRecommendation = 'rejected';
        status = 'ai_rejected';
        console.log(`   ${ranking}. [REJECTED] ${app.userId?.name || 'Unknown'} - Score: 0% (Incompatible)`);
      } else if (ranking <= positionsAvailable) {
        aiRecommendation = 'selected';
        status = 'ai_selected';
        console.log(`   ${ranking}. [SELECTED] ${app.userId?.name || 'Unknown'} - Composite: ${item.compositeScore.toFixed(2)}%`);
      } else {
        aiRecommendation = 'rejected';
        status = 'ai_rejected';
        console.log(`   ${ranking}. [REJECTED] ${app.userId?.name || 'Unknown'} - Composite: ${item.compositeScore.toFixed(2)}%`);
      }

      return Application.findByIdAndUpdate(
        app._id,
        {
          ranking,
          aiRecommendation,
          status,
          compositeScore: item.compositeScore
        },
        { new: true }
      );
    });

    const updatedApplications = await Promise.all(updatePromises);

    console.log(`─────────────────────────────────────────────────────────────────`);

    // Calculate average composite score
    const avgCompositeScore = applicationsWithCompositeScore.reduce((sum, item) => 
      sum + item.compositeScore, 0
    ) / applicationsWithCompositeScore.length;

    // Update job to mark as ranked
    await Job.findByIdAndUpdate(jobId, {
      rankedApplications: true,
      averageAtsScore: Math.round(
        applications.reduce((sum, app) => sum + app.atsScore, 0) / applications.length
      ),
      averageCompositeScore: Math.round(avgCompositeScore * 100) / 100
    });

    // Calculate statistics
    const stats = {
      totalApplications: applications.length,
      positionsAvailable,
      aiSelected: updatedApplications.filter(app => app.aiRecommendation === 'selected').length,
      aiRejected: updatedApplications.filter(app => app.aiRecommendation === 'rejected').length,
      averageAtsScore: Math.round(
        applications.reduce((sum, app) => sum + app.atsScore, 0) / applications.length
      ),
      averageCompositeScore: Math.round(avgCompositeScore * 100) / 100,
      topCompositeScore: applicationsWithCompositeScore[0].compositeScore,
      bottomCompositeScore: applicationsWithCompositeScore[applicationsWithCompositeScore.length - 1].compositeScore,
      scoringMethod: '35% ATS + 30% Skills + 25% Experience + 10% Overall Fit'
    };

    console.log(`✅ Ranking complete: ${stats.aiSelected} selected, ${stats.aiRejected} rejected`);
    console.log(`   Average Composite Score: ${stats.averageCompositeScore}%`);

    return NextResponse.json({
      success: true,
      message: 'Applications ranked successfully using composite scoring',
      stats,
      applications: updatedApplications.map(app => ({
        _id: app._id,
        ranking: app.ranking,
        atsScore: app.atsScore,
        compositeScore: app.compositeScore,
        aiRecommendation: app.aiRecommendation,
        status: app.status,
        user: app.userId
      }))
    });

  } catch (error) {
    console.error('Ranking error:', error);
    return NextResponse.json(
      { error: 'Failed to rank applications' },
      { status: 500 }
    );
  }
}

// GET endpoint to check ranking status
export async function GET(request, { params }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;

    await connectDB();

    const job = await Job.findOne({ _id: jobId, hostId: host._id });
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const applications = await Application.find({ jobId })
      .populate('userId', 'name email')
      .sort({ ranking: 1 })
      .exec();

    return NextResponse.json({
      success: true,
      ranked: job.rankedApplications,
      totalApplications: applications.length,
      applications: applications.map(app => ({
        _id: app._id,
        ranking: app.ranking,
        atsScore: app.atsScore,
        aiRecommendation: app.aiRecommendation,
        status: app.status,
        hrReviewed: app.hrReviewed,
        hrDecision: app.hrDecision,
        user: {
          name: app.userId?.name,
          email: app.userId?.email
        }
      }))
    });

  } catch (error) {
    console.error('Get ranking error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rankings' },
      { status: 500 }
    );
  }
}
