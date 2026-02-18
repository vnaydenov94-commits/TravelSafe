import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { ServiceProvider } from '@prisma/client';

// POST - Create a roadside help request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const {
      serviceType,
      description,
      latitude,
      longitude,
      address,
      city,
      country,
      vehicleType,
      vehicleMake,
      vehicleModel,
      vehicleColor,
      licensePlate,
      priority
    } = data;

    if (!serviceType || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find nearby service providers offering this service
    const nearbyProviders = await prisma.serviceProvider.findMany({
      where: {
        isActive: true,
        showOnMap: true,
        subscriptionStatus: {
          in: ['TRIAL', 'ACTIVE']
        },
        serviceTypes: {
          has: serviceType
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Filter providers within coverage range
    type ProviderWithUser = ServiceProvider & { user: { id: string; name: string | null } };
    const eligibleProviders = nearbyProviders.filter((provider: ProviderWithUser) => {
      const distance = calculateDistance(
        latitude, longitude,
        provider.latitude, provider.longitude
      );
      return distance <= provider.coverageRadius;
    });

    // Create the help request
    const helpRequest = await prisma.roadsideHelpRequest.create({
      data: {
        userId: session.user.id,
        serviceType,
        description,
        latitude,
        longitude,
        address,
        city,
        country,
        vehicleType,
        vehicleMake,
        vehicleModel,
        vehicleColor,
        licensePlate,
        priority: priority || 'MEDIUM',
        status: 'PENDING',
        notifiedProviders: eligibleProviders.map((p: ProviderWithUser) => p.id)
      }
    });

    // Send push notifications to eligible providers
    for (const provider of eligibleProviders) {
      if (provider.pushSubscription && provider.notificationsEnabled) {
        try {
          await fetch(`${process.env.NEXTAUTH_URL}/api/push/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: provider.userId,
              title: '🚨 Нова заявка за помощ!',
              body: `${address || 'Близо до вас'} - ${serviceType}`,
              data: {
                type: 'roadside_help',
                requestId: helpRequest.id,
                url: `/provider/dashboard`
              }
            })
          });
        } catch (error) {
          console.error('Failed to send push to provider:', provider.id, error);
        }
      }
    }

    return NextResponse.json({
      request: helpRequest,
      notifiedProviders: eligibleProviders.length
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating help request:', error);
    return NextResponse.json(
      { error: 'Failed to create help request' },
      { status: 500 }
    );
  }
}

// GET - Get user's active help requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requests = await prisma.roadsideHelpRequest.findMany({
      where: {
        userId: session.user.id,
        status: {
          in: ['PENDING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS']
        }
      },
      include: {
        provider: {
          select: {
            id: true,
            businessName: true,
            phoneNumber: true,
            averageRating: true,
            latitude: true,
            longitude: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching help requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch help requests' },
      { status: 500 }
    );
  }
}

// Helper function
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
