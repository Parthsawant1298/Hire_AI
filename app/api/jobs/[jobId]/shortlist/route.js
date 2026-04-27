// app/api/jobs/[jobId]/shortlist/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Job, Application } from '@/models/job';
import { User } from '@/models/user'; // Ensure User model is registered

// Helper function to determine professional security status for HR review
function determineSecurityStatus(summary, securityAlerts, redFlags) {
  // Critical security issues
  if (securityAlerts.identityFraudSuspected || securityAlerts.criticalCount > 0) {
    return 'COMPROMISED';
  }

  // High risk security issues
  if (securityAlerts.highCount >= 2 || summary.personSwitches > 0) {
    return 'HIGH_RISK';
  }

  // Medium risk issues
  if (redFlags.length >= 3 || securityAlerts.highCount >= 1) {
    return 'MEDIUM_RISK';
  }

  // Low risk but some anomalies
  if (redFlags.length > 0 || summary.totalAnomalies > 0) {
    return 'LOW_RISK';
  }

  // Clean interview
  return 'VERIFIED';
}

export async function GET(request, { params }) {
  try {
    // This route should be accessible to hosts only
    const authResult = await requireHostAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { host } = authResult;
    const { jobId } = await params;

    await connectDB();

    // Verify job ownership
    const job = await Job.findOne({ _id: jobId, hostId: host._id });
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Get all applications with populated user data and extracted resume data
    const applications = await Application.find({
      jobId: jobId
    })
      .populate('userId', 'name email phone profilePicture')
      .sort({ ranking: 1, atsScore: -1 }); // Sort by ranking first, then ATS score

    // Debug: Log interview completion status
    console.log('📊 Applications for job:', jobId);
    applications.forEach(app => {
      console.log(`  - ${app.userId?.name}: voiceInterviewCompleted=${app.voiceInterviewCompleted}, status=${app.status}, score=${app.voiceInterviewScore}`);
    });

    // Format response with candidate data including professional monitoring results
    const candidates = applications.map(app => {
      // Extract monitoring data for HR review
      const monitoringData = app.monitoringData || {};
      const redFlags = monitoringData.redFlags || [];
      const securityAlerts = monitoringData.securityAlerts || {};
      const summary = monitoringData.summary || {};

      // Professional security assessment
      const securityStatus = determineSecurityStatus(summary, securityAlerts, redFlags);

      // Calculate individual AI Score (composite of different metrics)
      const aiScore = app.atsScore || 0; // Primary AI matching score
      const compositeScore = app.compositeScore || aiScore; // Enhanced scoring if available

      return {
        id: app._id,
        user: {
          id: app.userId._id,
          name: app.userId.name,
          email: app.userId.email,
          phone: app.userId.phone,
          profilePicture: app.userId.profilePicture
        },
        // EXTRACTED RESUME DATA (from Qwen-2-VL-72B)
        extractedData: app.extractedData || null,
        candidateInfo: app.extractedData ? {
          fullName: app.extractedData.personalInfo?.fullName || app.userId.name,
          email: app.extractedData.personalInfo?.email || app.userId.email,
          phone: app.extractedData.personalInfo?.phone || app.userId.phone,
          location: app.extractedData.personalInfo?.location,
          linkedinUrl: app.extractedData.personalInfo?.linkedinUrl,
          portfolioUrl: app.extractedData.personalInfo?.portfolioUrl,
          githubUrl: app.extractedData.personalInfo?.githubUrl,
          totalExperience: app.extractedData.totalExperienceYears,
          skills: app.extractedData.skills,
          experience: app.extractedData.experience,
          education: app.extractedData.education,
          salaryExpectations: app.extractedData.salaryExpectations,
          workPreferences: app.extractedData.workPreferences
        } : null,
        // Individual Scores (FIXED - Each candidate gets their own scores)
        aiScore: aiScore, // Individual AI matching score
        atsScore: app.atsScore || 0, // Individual ATS score
        compositeScore: compositeScore, // Individual composite score
        finalScore: app.finalScore || 0, // Individual final score
        matchScore: app.atsScore || 0, // Individual match score (alias for consistency)

        // Round and Status Info
        round: app.round || 1,
        ranking: app.ranking || 0,
        status: app.status,

        // Interview Data
        voiceInterviewCompleted: app.voiceInterviewCompleted || false,
        voiceInterviewScore: app.voiceInterviewScore || 0,

        // Application Info
        appliedAt: app.createdAt,
        resumeUrl: app.resumeUrl,
        verificationResult: app.verificationResult || null, // ADDED: Enable detailed verification UI
        aiAnalysis: app.aiAnalysis || {
          skillsMatch: 0,
          experienceMatch: 0,
          overallFit: 0,
          strengths: [],
          weaknesses: [],
          recommendations: []
        },
        voiceInterviewFeedback: app.voiceInterviewFeedback || null,

        // PROFESSIONAL MONITORING DATA FOR HR REVIEW
        securityAnalysis: {
          status: securityStatus,
          overallSecurityScore: summary.overallSecurityScore || 100,
          interviewIntegrity: summary.interviewIntegrity || 'UNKNOWN',
          riskLevel: summary.riskLevel || 'low',
          hasRedFlags: redFlags.length > 0,
          redFlagsCount: redFlags.length,
          criticalAlerts: securityAlerts.criticalCount || 0,
          identityFraudSuspected: securityAlerts.identityFraudSuspected || false
        },

        // Detailed red flags for HR review
        redFlags: redFlags.map(flag => ({
          type: flag.type,
          details: flag.details,
          severity: flag.severity,
          timestamp: flag.timestamp
        })),

        // Security alerts summary
        securityAlerts: {
          critical: securityAlerts.criticalCount || 0,
          high: securityAlerts.highCount || 0,
          medium: securityAlerts.mediumCount || 0,
          low: securityAlerts.lowCount || 0,
          faceVerificationFailures: securityAlerts.faceVerificationFailures || 0,
          voiceVerificationFailures: securityAlerts.voiceVerificationFailures || 0
        },

        // Traditional monitoring data
        monitoringSummary: {
          totalAnomalies: summary.totalAnomalies || 0,
          personSwitches: summary.personSwitches || 0,
          voiceAnomalies: summary.voiceAnomalies || 0,
          faceDeviations: summary.faceDeviations || 0,
          environmentChanges: summary.environmentChanges || 0,
          monitoringDuration: summary.monitoringDuration || 0
        }
      };
    });

    // Get round statistics
    const currentRoundApplications = applications.filter(app => app.round === job.currentRound);
    const processedApplications = currentRoundApplications.filter(app =>
      app.status === 'ai_selected' || app.status === 'ai_rejected'
    );

    return NextResponse.json({
      success: true,
      job: {
        id: job._id,
        jobTitle: job.jobTitle,
        maxCandidatesShortlist: job.maxCandidatesShortlist,
        finalSelectionCount: job.finalSelectionCount,
        status: job.status,
        currentApplications: job.currentApplications,
        targetApplications: job.targetApplications,
        averageCompositeScore: job.averageCompositeScore || job.averageAtsScore || 0,
        averageAtsScore: job.averageAtsScore || 0,

        // Round Management Info (ADDED)
        currentRound: job.currentRound || 1,
        roundStatus: job.roundStatus || 'active',
        roundsCompleted: job.roundsCompleted || [],

        // Round Statistics
        roundStats: {
          total: currentRoundApplications.length,
          processed: processedApplications.length,
          pending: currentRoundApplications.length - processedApplications.length,
          isComplete: processedApplications.length === currentRoundApplications.length && currentRoundApplications.length > 0
        }
      },
      candidates
    });

  } catch (error) {
    console.error('Get shortlist error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shortlisted candidates' },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to fetch shortlisted candidates.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to fetch shortlisted candidates.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to fetch shortlisted candidates.' },
    { status: 405 }
  );
}