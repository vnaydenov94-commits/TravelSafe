export type Expense = {
  id: string
  amount: number
  category: string
  description: string
  date: Date
}

export type ExpenseFormData = Omit<Expense, 'id' | 'date'> & {
  date: string
}

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transportation',
  'Housing',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Shopping',
  'Education',
  'Other'
] as const

export type DateRange = {
  from: Date | undefined
  to: Date | undefined
}

// Vehicle Type related types
export type VehicleTypeId = 'car' | 'truck' | 'motorcycle' | 'caravan' | 'camper' | 'bus' | 'bicycle' | 'walking'

export interface UserWithProfile {
  id: string
  name?: string | null
  email: string
  profile?: {
    firstName: string
    lastName: string
    vehicleType: string
    currentCountry?: string | null
    currentCity?: string | null
    bio?: string | null
    locationSharing: string
  } | null
}

export interface MapUser {
  id: string
  name?: string
  firstName: string
  lastName: string
  vehicleType: string
  latitude: number
  longitude: number
  lastSeen: Date
}