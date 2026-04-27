// app/api/host/auth/logout/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    
    // Clear the host authentication cookie securely
    cookieStore.set({
      name: 'hostId',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0),
      path: '/',
      sameSite: 'strict'
    });

    return NextResponse.json({
      success: true,
      message: 'Host logged out successfully'
    });
    
  } catch (error) {
    console.error('Host logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to logout.' },
    { status: 405 }
  );
}