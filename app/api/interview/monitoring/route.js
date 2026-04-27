import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

// Enhanced monitoring data schema with professional red flag tracking
const MonitoringDataSchema = {
  userId: String,
  jobId: String,
  candidateName: String,
  anomalies: [{
    timestamp: Date,
    type: String, // 'face', 'voice', 'environment', 'appearance'
    severity: String, // 'low', 'medium', 'high', 'critical'
    details: Object,
    category: String // 'person_switch', 'voice_change', 'environment_change', etc.
  }],
  redFlags: [{ // Professional red flag tracking for HR review
    type: String, // 'IDENTITY_FRAUD_SUSPECTED', 'FACE_VERIFICATION_FAILED', etc.
    details: String,
    severity: String, // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    timestamp: Date,
    data: Object // Supporting technical data
  }],
  securityAlerts: {
    criticalCount: Number,
    highCount: Number,
    mediumCount: Number,
    lowCount: Number,
    lastCriticalAlert: Date,
    identityFraudSuspected: Boolean,
    voiceVerificationFailures: Number,
    faceVerificationFailures: Number
  },
  summary: {
    totalAnomalies: Number,
    totalRedFlags: Number,
    faceDeviations: Number,
    voiceAnomalies: Number,
    personSwitches: Number,
    environmentChanges: Number,
    attentionLapses: Number,
    monitoringDuration: Number, // in seconds
    riskLevel: String, // 'low', 'medium', 'high', 'critical'
    overallSecurityScore: Number, // 0-100 score for HR review
    interviewIntegrity: String // 'VERIFIED', 'QUESTIONABLE', 'COMPROMISED'
  },
  createdAt: Date,
  updatedAt: Date
};

export async function POST(request) {
  try {
    await connectDB();

    // Add error handling for JSON parsing
    let anomalyData;
    try {
      anomalyData = await request.json();
    } catch (jsonError) {
      console.error('❌ JSON parsing error:', jsonError);
      return NextResponse.json(
        { error: 'Invalid JSON data', details: jsonError.message },
        { status: 400 }
      );
    }

    console.log('📊 Professional monitoring data received:', {
      hasData: !!anomalyData,
      keys: Object.keys(anomalyData || {}),
      candidateName: anomalyData.userName,
      redFlagsCount: anomalyData.redFlags?.length || 0,
      severity: anomalyData.severity
    });

    const {
      userId,
      jobId,
      userName,
      timestamp,
      faceAnomaly,
      voiceAnomaly,
      environmentAnomaly,
      clothingAnomaly,
      cumulativeData,
      redFlags = [],
      severity = 'low',
      realTimeFaceMatch,
      realTimeVoiceMatch,
      faceServiceStatus,
      voiceServiceStatus
    } = anomalyData;

    // Validate input
    if (!userId || !jobId) {
      console.error('❌ Missing required fields:', { userId, jobId, hasUserId: !!userId, hasJobId: !!jobId });
      return NextResponse.json({
        error: 'userId and jobId required',
        debug: { userId: !!userId, jobId: !!jobId }
      }, { status: 400 });
    }

    // Import models
    const { Application } = await import('@/models/job');

    // Find the application
    const application = await Application.findOne({
      userId: userId,
      jobId: jobId
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Initialize professional monitoring data if it doesn't exist
    if (!application.monitoringData) {
      application.monitoringData = {
        candidateName: userName,
        anomalies: [],
        redFlags: [],
        securityAlerts: {
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          lastCriticalAlert: null,
          identityFraudSuspected: false,
          voiceVerificationFailures: 0,
          faceVerificationFailures: 0
        },
        summary: {
          totalAnomalies: 0,
          totalRedFlags: 0,
          faceDeviations: 0,
          voiceAnomalies: 0,
          personSwitches: 0,
          environmentChanges: 0,
          attentionLapses: 0,
          monitoringDuration: 0,
          riskLevel: 'low',
          overallSecurityScore: 100,
          interviewIntegrity: 'VERIFIED'
        },
        startTime: new Date(),
        lastUpdate: new Date()
      };
    }

    // Process each anomaly
    const anomalies = [];

    if (faceAnomaly) {
      anomalies.push({
        timestamp: new Date(timestamp),
        type: 'face',
        severity: faceAnomaly.severity,
        category: faceAnomaly.type,
        details: {
          ...faceAnomaly.data,
          description: getFaceAnomalyDescription(faceAnomaly)
        }
      });
    }

    if (voiceAnomaly) {
      anomalies.push({
        timestamp: new Date(timestamp),
        type: 'voice',
        severity: voiceAnomaly.severity,
        category: voiceAnomaly.type,
        details: {
          ...voiceAnomaly.data,
          description: getVoiceAnomalyDescription(voiceAnomaly)
        }
      });
    }

    if (environmentAnomaly) {
      anomalies.push({
        timestamp: new Date(timestamp),
        type: 'environment',
        severity: environmentAnomaly.severity,
        category: environmentAnomaly.type,
        details: {
          ...environmentAnomaly.data,
          description: getEnvironmentAnomalyDescription(environmentAnomaly)
        }
      });
    }

    // Add anomalies to the record
    application.monitoringData.anomalies.push(...anomalies);

    // Update summary with cumulative data
    application.monitoringData.summary = {
      totalAnomalies: application.monitoringData.anomalies.length,
      faceDeviations: cumulativeData.faceDeviations || 0,
      voiceAnomalies: cumulativeData.voiceAnomalies || 0,
      personSwitches: cumulativeData.personSwitches || 0,
      environmentChanges: cumulativeData.environmentChanges || 0,
      attentionLapses: cumulativeData.attentionLapses || 0,
      monitoringDuration: Math.floor((Date.now() - new Date(application.monitoringData.startTime)) / 1000),
      riskLevel: calculateRiskLevel(cumulativeData)
    };

    application.monitoringData.lastUpdate = new Date();

    // Save the application
    await application.save();

    console.log('✅ Monitoring data stored:', {
      applicationId: application._id,
      anomaliesCount: anomalies.length,
      totalAnomalies: application.monitoringData.summary.totalAnomalies,
      riskLevel: application.monitoringData.summary.riskLevel
    });

    return NextResponse.json({
      success: true,
      stored: anomalies.length,
      totalAnomalies: application.monitoringData.summary.totalAnomalies,
      riskLevel: application.monitoringData.summary.riskLevel
    });

  } catch (error) {
    console.error('❌ Monitoring data storage error:', error);
    return NextResponse.json(
      { error: 'Failed to store monitoring data' },
      { status: 500 }
    );
  }
}

function getFaceAnomalyDescription(faceAnomaly) {
  switch (faceAnomaly.type) {
    case 'person_switch':
      return `Face verification failed - similarity ${(faceAnomaly.data.currentSimilarity * 100).toFixed(1)}% (threshold: ${(faceAnomaly.data.threshold * 100)}%). Possible person switch or face occlusion detected.`;
    case 'face_quality_low':
      return `Low face detection confidence. Face may be partially occluded, too far, or poor lighting conditions.`;
    default:
      return `Face anomaly detected: ${faceAnomaly.type}`;
  }
}

function getVoiceAnomalyDescription(voiceAnomaly) {
  switch (voiceAnomaly.type) {
    case 'volume_change':
      return `Significant voice volume change detected. Current: ${voiceAnomaly.data.currentVolume.toFixed(1)}, Baseline: ${voiceAnomaly.data.baselineVolume.toFixed(1)} (Δ${voiceAnomaly.data.change.toFixed(1)})`;
    case 'voice_characteristics_change':
      return `Voice characteristics changed significantly. Spectral centroid shift: ${voiceAnomaly.data.change.toFixed(1)} Hz. Possible person switch or voice modulation.`;
    default:
      return `Voice anomaly detected: ${voiceAnomaly.type}`;
  }
}

function getEnvironmentAnomalyDescription(environmentAnomaly) {
  switch (environmentAnomaly.type) {
    case 'environment_change':
      return `Significant environment change detected. Average pixel difference: ${environmentAnomaly.data.averageDifference.toFixed(1)}. Possible location change or lighting variation.`;
    default:
      return `Environment anomaly detected: ${environmentAnomaly.type}`;
  }
}

function calculateRiskLevel(cumulativeData, securityAlerts) {
  const totalAnomalies = (cumulativeData.faceDeviations || 0) +
                        (cumulativeData.voiceAnomalies || 0) +
                        (cumulativeData.personSwitches || 0) +
                        (cumulativeData.environmentChanges || 0);

  const personSwitches = cumulativeData.personSwitches || 0;
  const criticalAlerts = securityAlerts?.criticalCount || 0;
  const identityFraudSuspected = securityAlerts?.identityFraudSuspected || false;

  // Critical risk for identity fraud
  if (identityFraudSuspected || criticalAlerts > 0) {
    return 'critical';
  }

  // High risk if any person switches detected
  if (personSwitches > 0) {
    return 'high';
  }

  // High risk for multiple verification failures
  const highAlerts = securityAlerts?.highCount || 0;
  if (highAlerts >= 3) {
    return 'high';
  }

  // Medium risk if multiple anomalies
  if (totalAnomalies >= 5 || highAlerts >= 1) {
    return 'medium';
  }

  // Low risk for few anomalies
  if (totalAnomalies >= 2) {
    return 'medium';
  }

  return 'low';
}

function calculateSecurityScore(securityAlerts, cumulativeData) {
  let score = 100; // Start with perfect score

  // Deduct points for security issues
  score -= (securityAlerts.criticalCount || 0) * 30; // Critical issues: -30 each
  score -= (securityAlerts.highCount || 0) * 15; // High issues: -15 each
  score -= (securityAlerts.mediumCount || 0) * 8; // Medium issues: -8 each
  score -= (securityAlerts.lowCount || 0) * 3; // Low issues: -3 each

  // Additional deductions for specific issues
  if (securityAlerts.identityFraudSuspected) score -= 40;
  score -= (securityAlerts.faceVerificationFailures || 0) * 10;
  score -= (securityAlerts.voiceVerificationFailures || 0) * 10;

  // General anomaly deductions
  score -= (cumulativeData.personSwitches || 0) * 25;
  score -= (cumulativeData.faceDeviations || 0) * 5;
  score -= (cumulativeData.voiceAnomalies || 0) * 5;

  return Math.max(0, Math.min(100, score)); // Clamp between 0-100
}

function determineInterviewIntegrity(securityAlerts, securityScore) {
  if (securityAlerts.identityFraudSuspected || securityAlerts.criticalCount > 0) {
    return 'COMPROMISED';
  }

  if (securityScore < 60 || securityAlerts.highCount >= 2) {
    return 'QUESTIONABLE';
  }

  if (securityScore >= 85) {
    return 'VERIFIED';
  }

  return 'QUESTIONABLE';
}

function getAppearanceAnomalyDescription(appearanceAnomaly) {
  switch (appearanceAnomaly.type) {
    case 'clothing_change':
      return `Clothing change detected during interview. Color difference: ${appearanceAnomaly.data.colorDifference?.toFixed(1) || 'N/A'}. Possible person switch or deliberate disguise.`;
    default:
      return `Appearance anomaly detected: ${appearanceAnomaly.type}`;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const userId = searchParams.get('userId');

    if (!jobId || !userId) {
      return NextResponse.json({ error: 'jobId and userId required' }, { status: 400 });
    }

    await connectDB();
    const { Application } = await import('@/models/job');

    const application = await Application.findOne({
      userId: userId,
      jobId: jobId
    });

    if (!application || !application.monitoringData) {
      return NextResponse.json({
        monitoringData: null,
        message: 'No monitoring data found'
      });
    }

    return NextResponse.json({
      monitoringData: application.monitoringData,
      success: true
    });

  } catch (error) {
    console.error('❌ Monitoring data retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve monitoring data' },
      { status: 500 }
    );
  }
}