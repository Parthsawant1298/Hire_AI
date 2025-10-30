// app/api/jobs/[jobId]/shortlist/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireHostAuth } from '@/middleware/host-auth';
import { Job, Application } from '@/models/job';

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

    // Get shortlisted applications with populated user data
    const applications = await Application.find({ 
      jobId: jobId,
      status: { $in: ['shortlisted', 'interview_completed', 'selected', 'rejected'] }
    })
    .populate('userId', 'name email phone profilePicture')
    .sort({ finalScore: -1 });

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

      return {
        id: app._id,
        user: {
          id: app.userId._id,
          name: app.userId.name,
          email: app.userId.email,
          phone: app.userId.phone,
          profilePicture: app.userId.profilePicture
        },
        atsScore: app.atsScore || 0,
        finalScore: app.finalScore || 0,
        ranking: app.ranking || 0,
        status: app.status,
        voiceInterviewCompleted: app.voiceInterviewCompleted || false,
        voiceInterviewScore: app.voiceInterviewScore || 0,
        appliedAt: app.createdAt,
        resumeUrl: app.resumeUrl,
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

    return NextResponse.json({
      success: true,
      job: {
        id: job._id,
        jobTitle: job.jobTitle,
        maxCandidatesShortlist: job.maxCandidatesShortlist,
        finalSelectionCount: job.finalSelectionCount,
        status: job.status,
        currentApplications: job.currentApplications,
        targetApplications: job.targetApplications
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