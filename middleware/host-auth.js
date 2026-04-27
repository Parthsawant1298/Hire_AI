// lib/host-auth-middleware.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/mongodb';
import Host from '@/models/host';

export async function requireHostAuth(request) {
  try {
    const cookieStore = await cookies();
    const hostId = cookieStore.get('hostId')?.value;

    if (!hostId) {
      return NextResponse.json(
        { error: 'Host authentication required. Please log in.' },
        { status: 401 }
      );
    }

    // Verify host exists in database
    await connectDB();
    const host = await Host.findById(hostId).select('-password');
    
    if (!host || !host.isActive) {
      // Clear invalid cookie
      cookieStore.set('hostId', '', {
        expires: new Date(0),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'strict'
      });
      
      return NextResponse.json(
        { error: 'Host not found. Please log in again.' },
        { status: 401 }
      );
    }

    return { host, hostId };
  } catch (error) {
    console.error('Host auth middleware error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// Rate limiting helper for host routes
const hostRateLimitMap = new Map();

export function rateLimit(identifier, limit = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const key = identifier;
  
  if (!hostRateLimitMap.has(key)) {
    hostRateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  const record = hostRateLimitMap.get(key);
  
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