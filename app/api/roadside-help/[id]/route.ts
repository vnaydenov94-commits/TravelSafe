import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

// GET - Get a specific help request
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const helpRequest = await prisma.roadsideHelpRequest.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            name: true,
            profile: {
              select: {
                phoneNumber: true,
                vehicleType: true
              }
            }
          }
        },
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
      }
    });

    if (!helpRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json(helpRequest);
  } catch (error) {
    console.error('Error fetching help request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch help request' },
      { status: 500 }
    );
  }
}

// PUT - Update help request status (for providers)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { action, estimatedPrice } = data;

    const helpRequest = await prisma.roadsideHelpRequest.findUnique({
      where: { id: params.id },
      include: {
        user: true
      }
    });

    if (!helpRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Check if user is the provider or the request owner
    const provider = await prisma.serviceProvider.findUnique({
      where: { userId: session.user.id }
    });

    const isProvider = provider && helpRequest.notifiedProviders.includes(provider.id);
    const isOwner = helpRequest.userId === session.user.id;

    if (!isProvider && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let updateData: any = {};

    switch (action) {
      case 'accept':
        if (!isProvider) return NextResponse.json({ error: 'Only providers can accept' }, { status: 403 });
        if (helpRequest.status !== 'PENDING') {
          return NextResponse.json({ error: 'Request already accepted' }, { status: 400 });
        }
        updateData = {
          status: 'ACCEPTED',
          providerId: provider!.id,
          acceptedAt: new Date(),
          estimatedPrice
        };
        break;

      case 'decline':
        if (!isProvider) return NextResponse.json({ error: 'Only providers can decline' }, { status: 403 });
        // Add provider to declined list
        updateData = {
          declinedProviders: {
            push: provider!.id
          }
        };
        break;

      case 'en_route':
        if (!isProvider || helpRequest.providerId !== provider!.id) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
        updateData = { status: 'EN_ROUTE' };
        break;

      case 'arrived':
        if (!isProvider || helpRequest.providerId !== provider!.id) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
        updateData = { status: 'ARRIVED', arrivedAt: new Date() };
        break;

      case 'complete':
        if (!isProvider || helpRequest.providerId !== provider!.id) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
        updateData = {
          status: 'COMPLETED',
          completedAt: new Date(),
          finalPrice: data.finalPrice || helpRequest.estimatedPrice
        };
        // Update provider stats
        await prisma.serviceProvider.update({
          where: { id: provider!.id },
          data: {
            totalJobsCompleted: { increment: 1 }
          }
        });
        break;

      case 'cancel':
        updateData = {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: data.reason
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updatedRequest = await prisma.roadsideHelpRequest.update({
      where: { id: params.id },
      data: updateData,
      include: {
        provider: {
          select: {
            businessName: true,
            phoneNumber: true
          }
        }
      }
    });

    // Send push notification to user about status change
    if (action !== 'decline') {
      try {
        const userProfile = await prisma.travelerProfile.findUnique({
          where: { userId: helpRequest.userId }
        });

        if (userProfile?.pushSubscription && userProfile?.notificationsEnabled) {
          const statusMessages: Record<string, string> = {
            accept: `${provider?.businessName} прие вашата заявка!`,
            en_route: 'Помощта е на път!',
            arrived: 'Помощта пристигна!',
            complete: 'Заявката е завършена'
          };

          await fetch(`${process.env.NEXTAUTH_URL}/api/push/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: helpRequest.userId,
              title: '🚗 Обновление на заявката',
              body: statusMessages[action] || 'Status updated',
              data: {
                type: 'help_request_update',
                requestId: params.id
              }
            })
          });
        }
      } catch (error) {
        console.error('Failed to send push notification:', error);
      }
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error updating help request:', error);
    return NextResponse.json(
      { error: 'Failed to update help request' },
      { status: 500 }
    );
  }
}
