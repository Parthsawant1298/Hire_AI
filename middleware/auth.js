// lib/auth-middleware.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/mongodb';
import User from '@/models/user';

export async function requireAuth(request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in.' },
        { status: 401 }
      );
    }

    // Verify user exists in database
    await connectDB();
    const user = await User.findById(userId).select('-password');
    
    if (!user || !user.isActive) {
      // Clear invalid cookie
      cookieStore.set('userId', '', {
        expires: new Date(0),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'strict'
      });
      
      return NextResponse.json(
        { error: 'User not found. Please log in again.' },
        { status: 401 }
      );
    }

    return { user, userId };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// Rate limiting helper
const rateLimitMap = new Map();

export function rateLimit(identifier, limit = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const key = identifier;
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  const record = rateLimitMap.get(key);
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return false;
  }
  
  if (record.count >= limit) {
    return true;
  }
  
  record.count++;
  return false;
}