// app/api/verification/verify-voice/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/user';
import { requireAuth } from '@/middleware/auth';

export async function POST(request) {
  try {
    await connectDB();
    
    // Get form data with the test audio
    const formData = await request.formData();
    const testAudioFile = formData.get('testAudio');
    const textRead = formData.get('textRead');
    
    if (!testAudioFile) {
      return NextResponse.json(
        { error: 'Test audio is required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return NextResponse.json(
        { 
          success: false,
          verified: false,
          ensembleScore: 0.0,
          confidence: 0.0,
          result: 'AUTH_REQUIRED',
          error: 'Authentication required',
          details: 'User must be logged in to verify voice'
        },
        { status: 200 }
      );
    }

    const { user } = authResult;
    const fullUser = await User.findById(user._id).select('verificationVoiceAudio verificationTextRead name email');
    
    if (!fullUser || !fullUser.verificationVoiceAudio) {
      return NextResponse.json(
        { 
          success: false,
          verified: false,
          ensembleScore: 0.0,
          confidence: 0.0,
          result: 'NO_STORED_AUDIO',
          error: 'No verification voice audio found. Please complete verification setup first.',
          details: 'User needs to set up voice verification profile first'
        },
        { status: 200 }
      );
    }

    // Convert test audio to base64
    const testAudioBuffer = await testAudioFile.arrayBuffer();
    const testAudioBase64 = `data:${testAudioFile.type};base64,${Buffer.from(testAudioBuffer).toString('base64')}`;

    console.log('🔍 Voice verification debug info:', {
      userId: fullUser?._id,
      hasVerificationVoiceAudio: !!fullUser?.verificationVoiceAudio,
      verificationTextRead: fullUser?.verificationTextRead,
      currentTextRead: textRead
    });

    // Call Python voice verification service (implementing your exact audio.py logic)
    const comparisonResult = await callPythonVoiceVerification(
      fullUser.verificationVoiceAudio,
      testAudioBase64,
      fullUser.verificationTextRead,
      textRead
    );

    console.log('🎵 Voice verification result:', {
      verified: comparisonResult.verified,
      confidence: comparisonResult.confidence,
      ensembleScore: comparisonResult.ensembleScore,
      result: comparisonResult.result
    });

    return NextResponse.json({
      success: true,
      verified: comparisonResult.verified,
      confidence: comparisonResult.confidence,
      ensembleScore: comparisonResult.ensembleScore,
      result: comparisonResult.result,
      details: comparisonResult.details,
      modelResults: comparisonResult.modelResults
    });

  } catch (error) {
    console.error('Voice verification error:', error);
    return NextResponse.json(
      { 
        success: false,
        verified: false,
        ensembleScore: 0.0,
        confidence: 0.0,
        result: 'VERIFICATION_ERROR',
        error: 'Voice verification failed',
        details: error.message || 'Internal server error'
      },
      { status: 200 }
    );
  }
}

// Call Flask Voice Service (Port 8003) - REAL SpeechBrain verification
async function callPythonVoiceVerification(storedAudioUrl, testAudioBase64, originalText, currentText) {
  try {
    console.log('🎵 CALLING FLASK VOICE SERVICE (PORT 8003)');
    console.log('🎵 Stored audio URL:', storedAudioUrl.substring(0, 50) + '...');
    console.log('🎵 Test audio size:', testAudioBase64.length);
    
    const flaskUrl = 'http://localhost:8003/verify-voice';
    
    const response = await fetch(flaskUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stored_audio_url: storedAudioUrl,
        test_audio_base64: testAudioBase64,
        original_text: originalText || '',
        current_text: currentText || ''
      }),
      timeout: 60000 // 60 second timeout (voice processing takes longer)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Flask voice service error:', response.status, errorText);
      throw new Error(`Flask voice service returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Flask voice verification result:', {
      verified: result.verified,
      ensembleScore: result.ensembleScore,
      confidence: result.confidence,
      result: result.result
    });
    
    return {
      verified: result.verified || false,
      ensembleScore: result.ensembleScore || 0,
      confidence: result.confidence || 'Unknown',
      result: result.result || 'UNKNOWN',
      details: result.details || 'No details provided',
      modelResults: result.modelResults || []
    };

  } catch (error) {
    console.error('❌ Flask voice service error:', error);
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Voice verification service not running. Please start Flask service: python python-services/voice_service.py');
    }
    
    throw new Error(`Voice verification failed: ${error.message}`);
  }
}


export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to verify voice.' },
    { status: 405 }
  );
}
