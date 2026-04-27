// app/api/host/auth/user/route.js
import { NextResponse } from 'next/server';
import { requireHostAuth } from '@/middleware/host-auth';

export async function GET(request) {
    try {
        const authResult = await requireHostAuth(request);
        
        // If authResult is a NextResponse (error), return it
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { host } = authResult;

        return NextResponse.json({
            success: true,
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
                totalEvents: host.totalEvents,
                expertise: host.expertise,
                socialLinks: host.socialLinks,
                createdAt: host.createdAt,
                lastLogin: host.lastLogin
            }
        });

    } catch (error) {
        console.error('Get host error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST() {
    return NextResponse.json(
        { error: 'Method not allowed. Use GET to fetch host data.' },
        { status: 405 }
    );
}