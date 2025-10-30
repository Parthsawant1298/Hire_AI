// app/api/host/auth/register/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Host from '@/models/host';
import { rateLimit } from '@/middleware/host-auth';

export async function POST(request) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    if (rateLimit(`host-register-${clientIP}`, 3, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    await connectDB();
    const { name, email, password, phone, organization, designation, bio } = await request.json();

    // Input validation
    if (!name?.trim() || !email?.trim() || !password || !phone?.trim() || !organization?.trim() || !designation?.trim()) {
      return NextResponse.json(
        { error: 'Please provide all required fields' },
        { status: 400 }
      );
    }

    // Detailed validation
    const trimmedName = name.trim();
    const trimmedEmail = email.toLowerCase().trim();

    if (trimmedName.length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters long' },
        { status: 400 }
      );
    }

    if (trimmedName.length > 50) {
      return NextResponse.json(
        { error: 'Name cannot exceed 50 characters' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Password validation
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Phone validation
    if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      return NextResponse.json(
        { error: 'Please provide a valid 10-digit phone number' },
        { status: 400 }
      );
    }

    // Organization validation
    if (organization.trim().length > 100) {
      return NextResponse.json(
        { error: 'Organization cannot exceed 100 characters' },
        { status: 400 }
      );
    }

    // Designation validation
    if (designation.trim().length > 100) {
      return NextResponse.json(
        { error: 'Designation cannot exceed 100 characters' },
        { status: 400 }
      );
    }

    // Bio validation (if provided)
    if (bio && bio.trim().length > 500) {
      return NextResponse.json(
        { error: 'Bio cannot exceed 500 characters' },
        { status: 400 }
      );
    }

    // Check if host already exists
    const existingHost = await Host.findOne({ email: trimmedEmail });
    
    if (existingHost) {
      return NextResponse.json(
        { error: 'A host account with this email already exists' },
        { status: 409 }
      );
    }

    // Create new host
    const hostData = {
      name: trimmedName,
      email: trimmedEmail,
      password,
      phone: phone.trim().replace(/\D/g, ''),
      organization: organization.trim(),
      designation: designation.trim(),
    };

    if (bio?.trim()) {
      hostData.bio = bio.trim();
    }

    const host = await Host.create(hostData);

    return NextResponse.json({
      success: true,
      message: 'Host account created successfully! Please sign in.',
      host: {
        id: host._id,
        name: host.name,
        email: host.email,
        organization: host.organization,
        designation: host.designation
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Host registration error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'A host account with this email already exists' },
        { status: 409 }
      );
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0]?.message || 'Validation failed';
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to register.' },
    { status: 405 }
  );
}