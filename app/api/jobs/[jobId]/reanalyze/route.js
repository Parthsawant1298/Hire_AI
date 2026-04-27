// Force re-analysis of existing applications
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Job, Application } from '@/models/job';
import { analyzeResume } from '@/lib/ai-services';
import { extractTextFromPDF } from '@/lib/pdf-utils';

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { jobId } = await params;

    console.log(`🔄 Force re-analyzing all applications for job ${jobId}...`);

    // Get job details
    const job = await Job.findById(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get all applications
    const applications = await Application.find({ jobId });
    console.log(`📊 Found ${applications.length} applications to re-analyze`);

    let successCount = 0;
    let errorCount = 0;

    // Re-analyze each application
    for (const app of applications) {
      try {
        console.log(`\n🔍 Re-analyzing application ${app._id}...`);
        
        // Download resume from Cloudinary
        const resumeUrl = app.resumeUrl;
        const response = await fetch(resumeUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Determine file type from URL
        const fileType = resumeUrl.includes('.pdf') ? 'application/pdf' : 
                        resumeUrl.includes('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                        'application/msword';
        
        // Extract text
        const resumeText = await extractTextFromPDF(buffer, fileType);
        console.log(`📝 Extracted ${resumeText.length} characters`);
        
        // AI Analysis with location/salary
        const aiAnalysis = await analyzeResume({
          resumeText,
          jobDescription: job.jobDescription,
          jobRequirements: job.jobRequirements,
          jobTitle: job.jobTitle,
          jobLocation: job.location,
          jobSalary: job.salary,
          jobType: job.jobType
        });
        
        // Update application
        await Application.findByIdAndUpdate(app._id, {
          atsScore: aiAnalysis.atsScore,
          aiAnalysis: aiAnalysis
        });
        
        console.log(`✅ Updated: ATS Score ${aiAnalysis.atsScore}%`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Failed to re-analyze ${app._id}:`, error.message);
        errorCount++;
      }
    }

    // Now auto-rank all applications USING COMPOSITE SCORING
    console.log(`\n🎯 Auto-ranking ${applications.length} applications...`);
    
    const { calculateCompositeScore } = await import('@/lib/ai-services');
    
    const allApplications = await Application.find({ jobId })
      .populate('userId', 'email name')
      .exec();

    // Calculate composite scores
    const applicationsWithCompositeScore = allApplications.map(app => {
      const compositeScore = calculateCompositeScore(app); // Pass full app, not just aiAnalysis
      return {
        application: app,
        compositeScore: compositeScore
      };
    });

    // Sort by composite score
    applicationsWithCompositeScore.sort((a, b) => b.compositeScore - a.compositeScore);

    const positionsAvailable = job.positionsAvailable || 1;
    
    console.log(`\n📊 RANKING RESULTS (COMPOSITE SCORING):`);
    console.log(`─────────────────────────────────────────────────────────────────`);
    
    for (let i = 0; i < applicationsWithCompositeScore.length; i++) {
      const item = applicationsWithCompositeScore[i];
      const app = item.application;
      const ranking = i + 1;
      
      let aiRecommendation, status;
      if (item.compositeScore === 0) {
        aiRecommendation = 'rejected';
        status = 'ai_rejected';
        console.log(`   ${ranking}. [REJECTED] ${app.userId?.email || 'Unknown'} - Score: 0% (Incompatible)`);
      } else if (ranking <= positionsAvailable) {
        aiRecommendation = 'selected';
        status = 'ai_selected';
        console.log(`   ${ranking}. [SELECTED] ${app.userId?.email || 'Unknown'} - Composite: ${item.compositeScore.toFixed(2)}%`);
      } else {
        aiRecommendation = 'rejected';
        status = 'ai_rejected';
        console.log(`   ${ranking}. [REJECTED] ${app.userId?.email || 'Unknown'} - Composite: ${item.compositeScore.toFixed(2)}%`);
      }

      await Application.findByIdAndUpdate(app._id, {
        ranking,
        aiRecommendation,
        status,
        compositeScore: item.compositeScore
      });
    }

    console.log(`─────────────────────────────────────────────────────────────────`);

    // Calculate average composite score
    const avgCompositeScore = applicationsWithCompositeScore.reduce((sum, item) => 
      sum + item.compositeScore, 0
    ) / applicationsWithCompositeScore.length;

    // Update job
    await Job.findByIdAndUpdate(jobId, {
      rankedApplications: true,
      status: 'closed',
      averageAtsScore: Math.round(
        allApplications.reduce((sum, app) => sum + app.atsScore, 0) / allApplications.length
      ),
      averageCompositeScore: Math.round(avgCompositeScore * 100) / 100
    });

    const selectedCount = applicationsWithCompositeScore.filter((item, idx) => 
      idx < positionsAvailable && item.compositeScore > 0
    ).length;

    console.log(`✅ Re-analysis complete using COMPOSITE SCORING!`);
    console.log(`   • ${selectedCount} selected, ${applications.length - selectedCount} rejected`);
    console.log(`   • Average Composite Score: ${avgCompositeScore.toFixed(2)}%`);

    return NextResponse.json({
      success: true,
      message: 'Applications re-analyzed and ranked using composite scoring',
      stats: {
        total: applications.length,
        success: successCount,
        errors: errorCount,
        aiSelected: selectedCount,
        aiRejected: applications.length - selectedCount,
        averageCompositeScore: Math.round(avgCompositeScore * 100) / 100,
        scoringMethod: '35% ATS + 30% Skills + 25% Experience + 10% Overall Fit'
      }
    });

  } catch (error) {
    console.error('Re-analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to re-analyze applications', details: error.message },
      { status: 500 }
    );
  }
}
