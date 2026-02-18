import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

// GET - Get current user's service provider profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const provider = await prisma.serviceProvider.findUnique({
      where: { userId: session.user.id },
      include: {
        reviews: {
          include: {
            user: {
              select: {
                name: true,
                profile: {
                  select: {
                    profileImage: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 20
        },
        helpRequests: {
          where: {
            status: {
              in: ['PENDING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS']
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    });

    if (!provider) {
      return NextResponse.json({ provider: null });
    }

    return NextResponse.json({ provider });
  } catch (error) {
    console.error('Error fetching service provider profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service provider profile' },
      { status: 500 }
    );
  }
}

// PUT - Update location (for mobile providers on the road)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { latitude, longitude, city, country, address } = data;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Location required' },
        { status: 400 }
      );
    }

    const provider = await prisma.serviceProvider.update({
      where: { userId: session.user.id },
      data: {
        latitude,
        longitude,
        ...(city && { city }),
        ...(country && { country }),
        ...(address && { address })
      }
    });

    return NextResponse.json(provider);
  } catch (error) {
    console.error('Error updating provider location:', error);
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}
