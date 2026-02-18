import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

// GET - Get a specific service provider
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const provider = await prisma.serviceProvider.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
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
          take: 10
        }
      }
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json(provider);
  } catch (error) {
    console.error('Error fetching service provider:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service provider' },
      { status: 500 }
    );
  }
}

// PUT - Update service provider profile
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const provider = await prisma.serviceProvider.findUnique({
      where: { id: params.id }
    });

    if (!provider || provider.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
      operatingHours,
      isActive,
      showOnMap
    } = data;

    const updatedProvider = await prisma.serviceProvider.update({
      where: { id: params.id },
      data: {
        ...(businessName && { businessName }),
        ...(description !== undefined && { description }),
        ...(phoneNumber && { phoneNumber }),
        ...(email && { email }),
        ...(website !== undefined && { website }),
        ...(latitude && { latitude }),
        ...(longitude && { longitude }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(country !== undefined && { country }),
        ...(coverageRadius && { coverageRadius }),
        ...(serviceTypes && { serviceTypes }),
        ...(is24Hours !== undefined && { is24Hours }),
        ...(operatingHours !== undefined && { operatingHours }),
        ...(isActive !== undefined && { isActive }),
        ...(showOnMap !== undefined && { showOnMap })
      }
    });

    return NextResponse.json(updatedProvider);
  } catch (error) {
    console.error('Error updating service provider:', error);
    return NextResponse.json(
      { error: 'Failed to update service provider' },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate service provider profile
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const provider = await prisma.serviceProvider.findUnique({
      where: { id: params.id }
    });

    if (!provider || provider.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Soft delete - just deactivate
    await prisma.serviceProvider.update({
      where: { id: params.id },
      data: {
        isActive: false,
        showOnMap: false
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting service provider:', error);
    return NextResponse.json(
      { error: 'Failed to delete service provider' },
      { status: 500 }
    );
  }
}
