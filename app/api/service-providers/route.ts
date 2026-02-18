import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { ServiceProvider } from '@prisma/client';

type ProviderWithUser = ServiceProvider & { user: { name: string | null; email: string } };
type ProviderWithDistance = ProviderWithUser & { distance?: number };

// GET - List all active service providers (or nearby ones)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const radius = searchParams.get('radius') || '25'; // km
    const serviceType = searchParams.get('serviceType');

    const providers = await prisma.serviceProvider.findMany({
      where: {
        isActive: true,
        showOnMap: true,
        subscriptionStatus: {
          in: ['TRIAL', 'ACTIVE']
        },
        ...(serviceType ? {
          serviceTypes: {
            has: serviceType as any
          }
        } : {})
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { subscriptionTier: 'desc' },
        { averageRating: 'desc' }
      ]
    });

    // If location provided, filter by distance
    let filteredProviders = providers;
    if (lat && lon) {
      const userLat = parseFloat(lat);
      const userLon = parseFloat(lon);
      const maxRadius = parseFloat(radius);

      filteredProviders = providers.filter((provider: ProviderWithUser) => {
        const distance = calculateDistance(
          userLat, userLon,
          provider.latitude, provider.longitude
        );
        return distance <= maxRadius;
      }).map((provider: ProviderWithUser): ProviderWithDistance => ({
        ...provider,
        distance: calculateDistance(
          userLat, userLon,
          provider.latitude, provider.longitude
        )
      }));

      // Sort by distance
      filteredProviders.sort((a: ProviderWithDistance, b: ProviderWithDistance) => (a.distance || 0) - (b.distance || 0));
    }

    return NextResponse.json(filteredProviders);
  } catch (error) {
    console.error('Error fetching service providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service providers' },
      { status: 500 }
    );
  }
}

// POST - Register as a service provider
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const {
      businessName,
      description,
      phoneNumber,
      email,
      website,
      latitude,
      longitude,
      address,
      city,
      country,
      coverageRadius,
      serviceTypes,
      is24Hours,
      operatingHours
    } = data;

    // Validate required fields
    if (!businessName || !phoneNumber || !email || !latitude || !longitude || !serviceTypes?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already has a service provider profile
    const existingProvider = await prisma.serviceProvider.findUnique({
      where: { userId: session.user.id }
    });

    if (existingProvider) {
      return NextResponse.json(
        { error: 'You already have a service provider profile' },
        { status: 400 }
      );
    }

    // Create service provider with 14-day trial
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    const provider = await prisma.serviceProvider.create({
      data: {
        userId: session.user.id,
        businessName,
        description,
        phoneNumber,
        email,
        website,
        latitude,
        longitude,
        address,
        city,
        country,
        coverageRadius: coverageRadius || 25,
        serviceTypes,
        is24Hours: is24Hours || false,
        operatingHours,
        subscriptionTier: 'BASIC',
        subscriptionStatus: 'TRIAL',
        subscriptionEndsAt: trialEndDate
      }
    });

    return NextResponse.json(provider, { status: 201 });
  } catch (error) {
    console.error('Error creating service provider:', error);
    return NextResponse.json(
      { error: 'Failed to create service provider profile' },
      { status: 500 }
    );
  }
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
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
