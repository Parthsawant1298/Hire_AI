// app/api/verification/upload-profile/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/user';
import { requireAuth } from '@/middleware/auth';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {
    // Authenticate user
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    await connectDB();

    const formData = await request.formData();
    const faceImage = formData.get('faceImage');
    const voiceAudio = formData.get('voiceAudio');
    const textRead = formData.get('textRead');

    if (!faceImage || !voiceAudio || !textRead) {
      return NextResponse.json(
        { error: 'Face image, voice audio, and text are required' },
        { status: 400 }
      );
    }

    let faceImageUrl = null;
    let voiceAudioUrl = null;

    try {
      // Upload face image to Cloudinary
      const faceBuffer = Buffer.from(await faceImage.arrayBuffer());
      const faceBase64 = `data:${faceImage.type};base64,${faceBuffer.toString('base64')}`;
      
      const faceUploadResult = await cloudinary.uploader.upload(faceBase64, {
        folder: 'verification/faces',
        public_id: `face_${user._id}_${Date.now()}`,
        resource_type: 'image',
        transformation: [
          { width: 640, height: 640, crop: 'fill', quality: 'auto' }
        ]
      });
      faceImageUrl = faceUploadResult.secure_url;

      // Upload voice audio to Cloudinary
      const voiceBuffer = Buffer.from(await voiceAudio.arrayBuffer());
      const voiceBase64 = `data:${voiceAudio.type};base64,${voiceBuffer.toString('base64')}`;
      
      const voiceUploadResult = await cloudinary.uploader.upload(voiceBase64, {
        folder: 'verification/voices',
        public_id: `voice_${user._id}_${Date.now()}`,
        resource_type: 'video' // Cloudinary treats audio as video
      });
      voiceAudioUrl = voiceUploadResult.secure_url;

    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload files to cloud storage' },
        { status: 500 }
      );
    }

    // Update user with verification data
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        verificationFaceImage: faceImageUrl,
        verificationVoiceAudio: voiceAudioUrl,
        verificationTextRead: textRead,
        verificationSetupCompleted: true,
        verificationSetupDate: new Date()
      },
      { new: true, select: '-password' }
    );

    return NextResponse.json({
      success: true,
      message: 'Verification profile setup completed successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        verificationSetupCompleted: updatedUser.verificationSetupCompleted,
        verificationSetupDate: updatedUser.verificationSetupDate
      }
    });

  } catch (error) {
    console.error('Verification profile setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup verification profile' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to upload verification data.' },
    { status: 405 }
  );
}
