import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/stats - Public platform statistics.
// Single source of truth for every user/country/message count shown on the homepage.
export async function GET() {
  try {
    const [users, locationCountries, profileCountries, messages] = await Promise.all([
      db.user.count(),
      db.location.findMany({
        where: { country: { not: null } },
        select: { country: true },
        distinct: ['country']
      }),
      db.travelerProfile.findMany({
        where: { currentCountry: { not: null } },
        select: { currentCountry: true },
        distinct: ['currentCountry']
      }),
      db.message.count()
    ])

    // Union of Location.country and TravelerProfile.currentCountry,
    // ignoring empty/whitespace values and case differences
    const countries = new Set<string>()
    for (const name of [
      ...locationCountries.map((l) => l.country),
      ...profileCountries.map((p) => p.currentCountry)
    ]) {
      const normalized = name?.trim().toLowerCase()
      if (normalized) countries.add(normalized)
    }

    return NextResponse.json(
      { users, countries: countries.size, messages },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ users: 0, countries: 0, messages: 0 }, { status: 500 })
  }
}
