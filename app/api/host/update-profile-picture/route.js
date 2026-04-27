// app/api/host/update-profile-picture/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Readable } from 'stream';
import connectDB from '@/lib/mongodb';
import Host from '@/models/host';
import { v2 as cloudinary } from 'cloudinary';

// Validate environment variables on startup
const requiredEnvVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Always use HTTPS
});

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const UPLOAD_FOLDER = 'hireai/host-profile-pictures';

// Upload function using Cloudinary's upload API
const uploadToCloudinary = async (buffer, fileName) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: UPLOAD_FOLDER,
        public_id: `host_profile_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        resource_type: 'auto',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto:good' },
          { format: 'webp' }
        ],
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        max_file_size: MAX_FILE_SIZE
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(new Error(`Upload failed: ${error.message}`));
        }
        resolve(result);
      }
    );
    
    try {
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);
      stream.pipe(uploadStream);
    } catch (error) {
      reject(new Error(`Stream processing failed: ${error.message}`));
    }
  });
};

// Delete old image from Cloudinary
const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) return;
    
    // Extract public_id from Cloudinary URL
    const urlParts = imageUrl.split('/');
    const versionIndex = urlParts.findIndex(part => part.startsWith('v'));
    
    if (versionIndex === -1) return;
    
    const pathAfterVersion = urlParts.slice(versionIndex + 1);
    const fileWithExtension = pathAfterVersion.join('/');
    const publicId = fileWithExtension.replace(/\.[^/.]+$/, '');
    
    await cloudinary.uploader.destroy(publicId);
    console.log('Old host image deleted successfully');
  } catch (error) {
    console.error('Error deleting old host image:', error);
    // Don't throw - log and continue
  }
};

// Validate file helper
const validateFile = (file) => {
  if (!file) {
    throw new Error('No image file provided');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image size must be less than 5MB');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Only JPG, PNG, WebP, and GIF images are allowed');
  }
};

export async function POST(request) {
  try {
    // Get host ID from cookies
    const cookieStore = await cookies();
    const hostId = cookieStore.get('hostId')?.value;
    
    if (!hostId) {
      return NextResponse.json(
        { error: 'Host authentication required. Please log in.' },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Verify host exists
    const existingHost = await Host.findById(hostId);
    if (!existingHost || !existingHost.isActive) {
      return NextResponse.json(
        { error: 'Host not found. Please log in again.' },
        { status: 404 }
      );
    }

    // Get and validate form data
    const formData = await request.formData();
    const file = formData.get('profileImage');

    // Validate file
    validateFile(file);

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload new image to Cloudinary
    console.log('Uploading host image to Cloudinary...');
    const uploadResult = await uploadToCloudinary(buffer, file.name);
    
    if (!uploadResult?.secure_url) {
      throw new Error('Failed to upload image to cloud storage');
    }
    
    const newImageUrl = uploadResult.secure_url;
    console.log('Host image uploaded successfully:', newImageUrl);

    // Update host profile in database
    const updatedHost = await Host.findByIdAndUpdate(
      hostId,
      { 
        profilePicture: newImageUrl,
        updatedAt: new Date()
      },
      { 
        new: true,
        runValidators: true
      }
    ).select('-password');
    
    if (!updatedHost) {
      throw new Error('Failed to update host profile');
    }

    // Delete old profile picture (async, don't wait)
    if (existingHost.profilePicture && existingHost.profilePicture !== newImageUrl) {
      deleteFromCloudinary(existingHost.profilePicture).catch(console.error);
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Host profile picture updated successfully',
      profilePicture: newImageUrl,
      host: {
        id: updatedHost._id,
        name: updatedHost.name,
        email: updatedHost.email,
        organization: updatedHost.organization,
        designation: updatedHost.designation,
        profilePicture: updatedHost.profilePicture,
        isVerified: updatedHost.isVerified,
        rating: updatedHost.rating,
        totalEvents: updatedHost.totalEvents,
        updatedAt: updatedHost.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Update host profile picture error:', error);
    
    // Handle specific error types
    if (error.message.includes('Host authentication required') || 
        error.message.includes('Host not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    if (error.message.includes('No image file') ||
        error.message.includes('File must be') ||
        error.message.includes('Image size') ||
        error.message.includes('Only JPG')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    if (error.http_code || error.message.includes('Upload failed')) {
      return NextResponse.json(
        { error: 'Image upload failed. Please try again.' },
        { status: 400 }
      );
    }
    
    // Generic server error
    return NextResponse.json(
      { 
        error: 'Internal server error. Please try again later.',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      },
      { status: 500 }
    );
  }
}

// Handle unsupported HTTP methods
const methodNotAllowed = () => NextResponse.json(
  { error: 'Method not allowed. Use POST to upload host profile picture.' },
  { status: 405 }
);

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const PATCH = methodNotAllowed;