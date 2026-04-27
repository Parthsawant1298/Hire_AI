// app/interview/[jobId]/verify-face/route.js
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const { jobId } = await params;
    const body = await request.json();

    // Convert base64 image to blob for form data
    if (body.test_image_base64) {
      // Extract base64 data (remove data:image/jpeg;base64, prefix)
      const base64Data = body.test_image_base64.split(',')[1] || body.test_image_base64;

      // Create a blob from base64
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const blob = new Blob([imageBuffer], { type: 'image/jpeg' });

      // Create form data
      const formData = new FormData();
      formData.append('testImage', blob, 'test-image.jpg');

      // Forward the request to the verification API
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/verification/verify-face`, {
        method: 'POST',
        headers: {
          'Cookie': request.headers.get('cookie') || ''
        },
        body: formData
      });

      const result = await response.json();
      return NextResponse.json(result, { status: response.status });
    } else {
      return NextResponse.json({ error: 'Missing test_image_base64' }, { status: 400 });
    }

  } catch (error) {
    console.error('Face verification proxy error:', error);
    return NextResponse.json(
      { error: 'Face verification failed' },
      { status: 500 }
    );
  }
}