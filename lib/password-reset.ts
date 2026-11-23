import crypto from 'crypto'

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

const EMAIL_SUBJECT = 'TravelSafe – reset your password / нулиране на парола'

function emailText(resetUrl: string) {
  return (
    `Someone requested a password reset for your TravelSafe account.\n` +
    `Open this link within 1 hour to choose a new password:\n\n${resetUrl}\n\n` +
    `If you did not request this, you can safely ignore this email.\n\n` +
    `-----\n` +
    `Получихме заявка за нулиране на паролата за вашия TravelSafe акаунт.\n` +
    `Отворете линка до 1 час, за да изберете нова парола.\n` +
    `Ако не сте я поискали, игнорирайте този имейл.`
  )
}

function emailHtml(resetUrl: string) {
  return (
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">` +
    `<h2 style="color:#2563eb">TravelSafe</h2>` +
    `<p>Someone requested a password reset for your TravelSafe account.</p>` +
    `<a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">` +
    `Choose a new password</a>` +
    `<p style="color:#6b7280;font-size:13px">Link is valid for 1 hour. If you did not request this, you can ignore this email.</p>` +
    `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>` +
    `<p>Получихме заявка за нулиране на паролата за вашия TravelSafe акаунт.</p>` +
    `<p><a href="${resetUrl}">Изберете нова парола</a> (линкът е валиден 1 час).</p>` +
    `</div>`
  )
}

// Priority: Resend (RESEND_API_KEY) → nodemailer SMTP (SMTP_HOST + SMTP_FROM)
// Returns true when email was dispatched, false when no provider is configured.
export async function sendResetEmail(to: string, resetUrl: string): Promise<boolean> {
  // --- 1. Resend ---
  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.RESEND_FROM || process.env.SMTP_FROM || 'TravelSafe <noreply@travelsafemap.com>'
    const { error } = await resend.emails.send({
      from,
      to,
      subject: EMAIL_SUBJECT,
      text: emailText(resetUrl),
      html: emailHtml(resetUrl)
    })
    if (error) throw new Error(`Resend error: ${error.message}`)
    return true
  }

  // --- 2. SMTP fallback (nodemailer) ---
  if (process.env.SMTP_HOST && process.env.SMTP_FROM) {
    const nodemailer = (await import('nodemailer')).default
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
      subject: EMAIL_SUBJECT,
      text: emailText(resetUrl),
      html: emailHtml(resetUrl)
    })
    return true
  }

  // --- no provider ---
  console.warn(
    '[password-reset] No email provider configured (RESEND_API_KEY or SMTP_HOST+SMTP_FROM missing).' +
      (process.env.NODE_ENV !== 'production' ? ` Reset link: ${resetUrl}` : '')
  )
  return false
}
