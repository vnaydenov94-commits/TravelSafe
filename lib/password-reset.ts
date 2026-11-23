import crypto from 'crypto'
import nodemailer from 'nodemailer'

// Password reset tokens are stored (hashed) in the existing VerificationToken table,
// with identifier = `reset:<email>` so they never collide with other token types.
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour
export const RESET_IDENTIFIER_PREFIX = 'reset:'

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function generateResetToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function getBaseUrl(request: Request) {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, '') || new URL(request.url).origin
}

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM)
}

// Sends the reset email via SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM).
// Returns false when SMTP is not configured so the caller can log it.
export async function sendResetEmail(to: string, resetUrl: string): Promise<boolean> {
  if (!isSmtpConfigured()) {
    console.warn(
      '[password-reset] SMTP is not configured (SMTP_HOST / SMTP_FROM). Reset email was NOT sent.' +
        (process.env.NODE_ENV !== 'production' ? ` Reset link: ${resetUrl}` : '')
    )
    return false
  }

  const port = Number(process.env.SMTP_PORT || 587)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'TravelSafe – reset your password / нулиране на парола',
    text:
      `Someone requested a password reset for your TravelSafe account.\n` +
      `Open this link within 1 hour to choose a new password:\n\n${resetUrl}\n\n` +
      `If you did not request this, you can ignore this email.\n\n` +
      `Получихме заявка за нулиране на паролата за вашия TravelSafe акаунт.\n` +
      `Отворете линка до 1 час, за да изберете нова парола. Ако не сте я поискали, игнорирайте този имейл.`,
    html:
      `<p>Someone requested a password reset for your TravelSafe account.</p>` +
      `<p><a href="${resetUrl}">Choose a new password</a> (link valid for 1 hour).</p>` +
      `<p>If you did not request this, you can ignore this email.</p><hr/>` +
      `<p>Получихме заявка за нулиране на паролата за вашия TravelSafe акаунт. ` +
      `<a href="${resetUrl}">Изберете нова парола</a> (линкът е валиден 1 час).</p>`
  })
  return true
}
