// app/api/host/auth/login/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/mongodb';
import Host from '@/models/host';
export async function POST(request) {
  try {
    await connectDB();
    const { email, password } = await request.json();

    // Input validation
    if (!email?.trim() || !password) {
      return NextResponse.json(
        { error: 'Please provide email and password' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Find host and include password for comparison
    const host = await Host.findOne({ 
      email: email.toLowerCase().trim(),
      isActive: true
    }).select('+password');
    
    if (!host) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check password
    const isPasswordMatch = await host.comparePassword(password);
    
    if (!isPasswordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    host.lastLogin = new Date();
    await host.save({ validateBeforeSave: false });

    // Set secure cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'hostId',
      value: host._id.toString(),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      sameSite: 'strict'
    });

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      host: {
        id: host._id,
        name: host.name,
        email: host.email,
        phone: host.phone,
        organization: host.organization,
        designation: host.designation,
        bio: host.bio,
        profilePicture: host.profilePicture,
        isVerified: host.isVerified,
        rating: host.rating,
        totalEvents: host.totalEvents
      }
    });

  } catch (error) {
    console.error('Host login error:', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to login.' },
    { status: 405 }
  );
}