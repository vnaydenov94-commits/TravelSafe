import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { RESET_IDENTIFIER_PREFIX, hashToken } from '@/lib/password-reset'

export const dynamic = 'force-dynamic'

const MIN_PASSWORD_LENGTH = 6

// POST /api/auth/reset-password { token, password }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = typeof body.token === 'string' ? body.token : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!token) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      )
    }

    const record = await db.verificationToken.findUnique({ where: { token: hashToken(token) } })

    if (!record || !record.identifier.startsWith(RESET_IDENTIFIER_PREFIX)) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    }
    if (record.expires < new Date()) {
      await db.verificationToken.delete({ where: { token: record.token } }).catch(() => {})
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    }

    const email = record.identifier.slice(RESET_IDENTIFIER_PREFIX.length)
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update password and invalidate every reset token for this user in one transaction
    await db.$transaction([
      db.user.update({ where: { email }, data: { password: hashedPassword } }),
      db.verificationToken.deleteMany({ where: { identifier: record.identifier } })
    ])

    return NextResponse.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Error in reset-password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
