
import { Truck, Car, Bike, Home, Bus, MapPin, RectangleHorizontal, Building } from 'lucide-react'

export type VehicleType = {
  id: string
  name: string
  nameBg: string
  icon: typeof Car
  color: string
  description: string
  emoji: string  // Emoji for map markers
}

export const VEHICLE_TYPES: VehicleType[] = [
  {
    id: 'car',
    name: 'Car',
    nameBg: 'Коли',
    icon: Car,
    color: '#3B82F6', // blue
    description: 'Personal vehicles, sedans, hatchbacks',
    emoji: '🚗'
  },
  {
    id: 'truck',
    name: 'Truck',
    nameBg: 'Камиони',
    icon: Truck,
    color: '#F59E0B', // amber
    description: 'Commercial trucks, delivery vehicles',
    emoji: '🚚'
  },
  {
    id: 'motorcycle',
    name: 'Motorcycle',
    nameBg: 'Мотори',
    icon: Bike,
    color: '#EF4444', // red
    description: 'Motorcycles, scooters, motorbikes',
    emoji: '🏍️'
  },
  {
    id: 'caravan',
    name: 'Caravan',
    nameBg: 'Каравани',
    icon: RectangleHorizontal,
    color: '#8B5CF6', // purple
    description: 'Travel trailers, caravans',
    emoji: '🚐'
  },
  {
    id: 'camper',
    name: 'Camper/RV',
    nameBg: 'Кемпери',
    icon: Building,
    color: '#10B981', // emerald
    description: 'Motorhomes, recreational vehicles',
    emoji: '🏕️'
  },
  {
    id: 'bus',
    name: 'Bus',
    nameBg: 'Автобуси',
    icon: Bus,
    color: '#F97316', // orange
    description: 'Buses, coaches, minibuses',
    emoji: '🚌'
  },
  {
    id: 'bicycle',
    name: 'Bicycle',
    nameBg: 'Велосипеди',
    icon: Bike,
    color: '#06B6D4', // cyan
    description: 'Bicycles, e-bikes, cycling',
    emoji: '🚴'
  },
  {
    id: 'walking',
    name: 'Walking',
    nameBg: 'Пеша',
    icon: MapPin,
    color: '#84CC16', // lime
    description: 'On foot, hiking, walking',
    emoji: '🚶'
  }
]

// Export as object for easy lookup
export const VEHICLE_TYPES_MAP = VEHICLE_TYPES.reduce((acc, type) => {
  acc[type.id] = type
  return acc
}, {} as Record<string, VehicleType>)

// Export vehicle type IDs for validation
export const VEHICLE_TYPE_IDS = VEHICLE_TYPES.map(type => type.id)

// Default vehicle type
export const DEFAULT_VEHICLE_TYPE = 'car'

export function getVehicleTypeById(id: string): VehicleType {
  return VEHICLE_TYPES_MAP[id] || VEHICLE_TYPES_MAP[DEFAULT_VEHICLE_TYPE]
}

export function getVehicleTypeIcon(id: string): typeof Car {
  const vehicleType = getVehicleTypeById(id)
  return vehicleType.icon
}

export function getVehicleTypeColor(id: string): string {
  const vehicleType = getVehicleTypeById(id)
  return vehicleType.color
}

export function getVehicleTypeName(id: string, useBulgarian = false): string {
  const vehicleType = getVehicleTypeById(id)
  return useBulgarian ? vehicleType.nameBg : vehicleType.name
}

export function getVehicleTypeEmoji(id: string): string {
  const vehicleType = getVehicleTypeById(id)
  return vehicleType.emoji
}
