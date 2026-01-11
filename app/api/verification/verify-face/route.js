// app/api/verification/verify-face/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/user';
import { requireAuth } from '@/middleware/auth';

export async function POST(request) {
  try {
    await connectDB();
    
    // Handle both form data and JSON data for real-time checks
    let testImageBase64 = null;
    const contentType = request.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      // Real-time check with base64 data
      const body = await request.json();
      testImageBase64 = body.testImageBase64;

      if (!testImageBase64) {
        return NextResponse.json(
          { error: 'Test image base64 is required' },
          { status: 400 }
        );
      }
    } else {
      // Regular form upload
      const formData = await request.formData();
      const testImageFile = formData.get('testImage');

      if (!testImageFile) {
        return NextResponse.json(
          { error: 'Test image is required' },
          { status: 400 }
        );
      }

      // Convert test image to base64
      const testImageBuffer = await testImageFile.arrayBuffer();
      testImageBase64 = `data:${testImageFile.type};base64,${Buffer.from(testImageBuffer).toString('base64')}`;
    }

    // Authenticate user
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return NextResponse.json(
        { 
          success: false,
          verified: false,
          similarity: 0.0,
          confidence: 'AUTH_REQUIRED',
          result: 'AUTH_REQUIRED',
          error: 'Authentication required',
          details: 'User must be logged in to verify face'
        },
        { status: 200 }  // Return 200 with error info instead of 401
      );
    }

    const { user } = authResult;
    const fullUser = await User.findById(user._id).select('verificationFaceImage profilePicture name email');
    
    // Try to use verificationFaceImage first, then fallback to profilePicture
    const storedImageUrl = fullUser?.verificationFaceImage || fullUser?.profilePicture;
    
    console.log('🔍 Face verification debug info:', {
      userId: fullUser?._id,
      hasVerificationFaceImage: !!fullUser?.verificationFaceImage,
      hasProfilePicture: !!fullUser?.profilePicture,
      storedImageUrl: storedImageUrl ? storedImageUrl.substring(0, 50) + '...' : null,
      imageSource: fullUser?.verificationFaceImage ? 'verificationFaceImage' : 'profilePicture'
    });
    
    if (!fullUser || !storedImageUrl) {
      return NextResponse.json(
        { 
          success: false,
          verified: false,
          similarity: 0.0,
          confidence: 'NO_STORED_IMAGE',
          result: 'NO_STORED_IMAGE',
          error: 'No face image found. Please upload a profile picture or complete verification setup first.',
          details: 'User needs to upload a profile picture or set up face verification profile first'
        },
        { status: 200 }  // Return 200 with error info instead of 404
      );
    }

    // Call Python face verification service (Flask on port 8002)
    const comparisonResult = await callFlaskFaceService(
      storedImageUrl, 
      testImageBase64
    );

    return NextResponse.json({
      success: true,
      verified: comparisonResult.verified,
      similarity: comparisonResult.similarity,
      confidence: comparisonResult.confidence,
      result: comparisonResult.result,
      details: comparisonResult.details,
      bbox: comparisonResult.bbox,
      face2_bbox: comparisonResult.bbox, // Alias for compatibility
      model_used: comparisonResult.model_used
    });

  } catch (error) {
    console.error('Face verification error:', error);
    return NextResponse.json(
      { 
        success: false,
        verified: false,
        similarity: 0.0,
        confidence: 'ERROR',
        result: 'VERIFICATION_ERROR',
        error: 'Face verification failed',
        details: error.message || 'Internal server error'
      },
      { status: 200 }  // Return 200 with error info instead of 500
    );
  }
}

// Call Flask Face Service (Port 8001) - REAL InsightFace verification
async function callFlaskFaceService(storedImageUrl, testImageBase64) {
  try {
    console.log('🔍 CALLING FLASK FACE SERVICE (PORT 8001)');
    console.log('📸 Stored image URL:', storedImageUrl.substring(0, 50) + '...');
    console.log('📸 Test image size:', testImageBase64.length);
    
    const flaskUrl = 'http://localhost:8001/verify-face';
    
    const response = await fetch(flaskUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stored_image_url: storedImageUrl,
        test_image_base64: testImageBase64
      }),
      timeout: 30000 // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Flask face service error:', response.status, errorText);
      throw new Error(`Flask service returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Flask face verification result:', {
      verified: result.verified,
      similarity: result.similarity,
      confidence: result.confidence,
      result: result.result
    });
    
    // Return with bbox for real-time tracking
    return {
      verified: result.verified || false,
      similarity: result.similarity || 0,
      confidence: result.confidence || 'Unknown',
      result: result.result || 'UNKNOWN',
      details: result.details || 'No details provided',
      bbox: result.face2_bbox || null,
      model_used: result.model_used || 'InsightFace ArcFace'
    };

  } catch (error) {
    console.error('❌ Flask face service error:', error);
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Face verification service not running on port 8001. Please start Flask service: python python-services/face_service.py');
    }
    
    throw new Error(`Face verification failed: ${error.message}`);
  }
}

// Removed fallback methods - using ONLY Flask service now

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to verify face.' },
    { status: 405 }
  );
}
