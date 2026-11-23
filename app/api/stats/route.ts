import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/stats - Public platform statistics.
// Single source of truth for every user/country/message count shown on the homepage.
export async function GET() {
  try {
    const [users, countryRows, messages] = await Promise.all([
      db.user.count(),
      db.location.findMany({
        where: { country: { not: null } },
        select: { country: true },
        distinct: ['country']
      }),
      db.message.count()
    ])

    return NextResponse.json(
      { users, countries: countryRows.length, messages },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ users: 0, countries: 0, messages: 0 }, { status: 500 })
  }
}
