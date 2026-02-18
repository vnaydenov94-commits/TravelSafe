
'use client'

import React from 'react'
import { VEHICLE_TYPES, getVehicleTypeById } from '@/lib/vehicle-types'
import { cn } from '@/lib/utils'

interface VehicleTypeSelectorProps {
  value?: string
  onChange: (value: string) => void
  className?: string
  error?: string
}

export function VehicleTypeSelector({ value, onChange, className, error }: VehicleTypeSelectorProps) {
  const selectedType = value ? getVehicleTypeById(value) : null

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-gray-700">
        Vehicle Type <span className="text-red-500">*</span>
      </label>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {VEHICLE_TYPES.map((vehicleType) => {
          const Icon = vehicleType.icon
          const isSelected = value === vehicleType.id
          
          return (
            <button
              key={vehicleType.id}
              type="button"
              onClick={() => onChange(vehicleType.id)}
              className={cn(
                'flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md',
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                error && !value && 'border-red-300'
              )}
            >
              <Icon 
                className="w-6 h-6 mb-2" 
                style={{ color: isSelected ? vehicleType.color : undefined }}
              />
              <span className="text-xs font-medium text-center leading-tight">
                {vehicleType.name}
              </span>
            </button>
          )
        })}
      </div>
      
      {error && !value && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      {selectedType && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-medium">{selectedType.name}:</span> {selectedType.description}
          </p>
        </div>
      )}
    </div>
  )
}

// Compact version for forms with limited space
interface VehicleTypeSelectorCompactProps {
  value?: string
  onChange: (value: string) => void
  className?: string
  error?: string
}

export function VehicleTypeSelectorCompact({ value, onChange, className, error }: VehicleTypeSelectorCompactProps) {
  const selectedType = value ? getVehicleTypeById(value) : null

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-gray-700">
        Vehicle Type <span className="text-red-500">*</span>
      </label>
      
      <div className="grid grid-cols-4 gap-2">
        {VEHICLE_TYPES.map((vehicleType) => {
          const Icon = vehicleType.icon
          const isSelected = value === vehicleType.id
          
          return (
            <button
              key={vehicleType.id}
              type="button"
              onClick={() => onChange(vehicleType.id)}
              className={cn(
                'flex flex-col items-center p-2 rounded-md border transition-all duration-200',
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                error && !value && 'border-red-300'
              )}
              title={vehicleType.name}
            >
              <Icon 
                className="w-4 h-4 mb-1" 
                style={{ color: isSelected ? vehicleType.color : undefined }}
              />
              <span className="text-xs font-medium leading-tight">
                {vehicleType.name}
              </span>
            </button>
          )
        })}
      </div>
      
      {error && !value && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
