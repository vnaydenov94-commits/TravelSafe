import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  RESET_IDENTIFIER_PREFIX,
  RESET_TOKEN_TTL_MS,
  generateResetToken,
  getBaseUrl,
  hashToken,
  sendResetEmail
} from '@/lib/password-reset'

export const dynamic = 'force-dynamic'

// POST /api/auth/forgot-password { email }
// Always answers with the same generic message so the endpoint cannot be used
// to discover which emails are registered.
export async function POST(request: NextRequest) {
  const genericResponse = NextResponse.json({
    message: 'If an account with that email exists, a reset link has been sent.'
  })

  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }

    const user = await db.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { email: true, password: true }
    })
    // Only credential (password) accounts can reset a password
    if (!user || !user.password) return genericResponse

    const identifier = `${RESET_IDENTIFIER_PREFIX}${user.email}`
    const token = generateResetToken()

    // One active reset token per user
    await db.verificationToken.deleteMany({ where: { identifier } })
    await db.verificationToken.create({
      data: {
        identifier,
        token: hashToken(token),
        expires: new Date(Date.now() + RESET_TOKEN_TTL_MS)
      }
    })

    const resetUrl = `${getBaseUrl(request)}/auth/reset-password?token=${token}`
    await sendResetEmail(user.email, resetUrl)

    return genericResponse
  } catch (error) {
    console.error('Error in forgot-password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
