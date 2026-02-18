
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { VEHICLE_TYPE_IDS, DEFAULT_VEHICLE_TYPE } from '@/lib/vehicle-types'

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName, phoneNumber, nationality, homeCountry, vehicleType } = body

    // Validate vehicle type
    const validVehicleType = vehicleType && VEHICLE_TYPE_IDS.includes(vehicleType) 
      ? vehicleType 
      : DEFAULT_VEHICLE_TYPE

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user and profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: `${firstName} ${lastName}`,
        }
      })

      const profile = await tx.travelerProfile.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          phoneNumber,
          nationality,
          homeCountry,
          vehicleType: validVehicleType,
        }
      })

      return { user, profile }
    })

    return NextResponse.json(
      { 
        message: 'User created successfully',
        userId: result.user.id
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
