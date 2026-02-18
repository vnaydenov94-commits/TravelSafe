
'use client'

import React, { useState } from 'react'
import { VEHICLE_TYPES } from '@/lib/vehicle-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Filter, X } from 'lucide-react'

interface VehicleTypeFilterProps {
  selectedTypes: string[]
  onSelectionChange: (selectedTypes: string[]) => void
  className?: string
}

export function VehicleTypeFilter({ selectedTypes, onSelectionChange, className }: VehicleTypeFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleVehicleType = (typeId: string) => {
    if (selectedTypes.includes(typeId)) {
      onSelectionChange(selectedTypes.filter(id => id !== typeId))
    } else {
      onSelectionChange([...selectedTypes, typeId])
    }
  }

  const clearAll = () => {
    onSelectionChange([])
  }

  const selectAll = () => {
    onSelectionChange(VEHICLE_TYPES.map(type => type.id))
  }

  const activeFiltersCount = selectedTypes.length

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Vehicle Types</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-auto p-1"
          >
            {isExpanded ? 'Hide' : 'Show'}
          </Button>
        </div>

        {/* Filter Controls */}
        {isExpanded && (
          <div className="space-y-3">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="text-xs"
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                className="text-xs"
                disabled={activeFiltersCount === 0}
              >
                Clear All
              </Button>
            </div>

            {/* Vehicle Type Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {VEHICLE_TYPES.map((vehicleType) => {
                const Icon = vehicleType.icon
                const isSelected = selectedTypes.includes(vehicleType.id)
                
                return (
                  <button
                    key={vehicleType.id}
                    onClick={() => toggleVehicleType(vehicleType.id)}
                    className={`
                      flex items-center gap-2 p-2 rounded-md border transition-all duration-200 text-left
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon 
                      className="h-4 w-4 flex-shrink-0" 
                      style={{ color: isSelected ? vehicleType.color : undefined }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">
                        {vehicleType.name}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Active Filters Display (when collapsed) */}
        {!isExpanded && activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedTypes.slice(0, 3).map((typeId) => {
              const vehicleType = VEHICLE_TYPES.find(t => t.id === typeId)
              if (!vehicleType) return null
              
              const Icon = vehicleType.icon
              
              return (
                <Badge 
                  key={typeId}
                  variant="secondary" 
                  className="text-xs flex items-center gap-1"
                  style={{ backgroundColor: `${vehicleType.color}20`, color: vehicleType.color }}
                >
                  <Icon className="h-3 w-3" />
                  {vehicleType.name}
                  <button
                    onClick={() => toggleVehicleType(typeId)}
                    className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                  >
                    <X className="h-2 w-2" />
                  </button>
                </Badge>
              )
            })}
            {activeFiltersCount > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{activeFiltersCount - 3} more
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

// Compact version for mobile or limited space
export function VehicleTypeFilterCompact({ selectedTypes, onSelectionChange, className }: VehicleTypeFilterProps) {
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {VEHICLE_TYPES.map((vehicleType) => {
        const Icon = vehicleType.icon
        const isSelected = selectedTypes.includes(vehicleType.id)
        
        return (
          <button
            key={vehicleType.id}
            onClick={() => {
              if (isSelected) {
                onSelectionChange(selectedTypes.filter(id => id !== vehicleType.id))
              } else {
                onSelectionChange([...selectedTypes, vehicleType.id])
              }
            }}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-full border transition-all duration-200 text-xs
              ${isSelected 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }
            `}
            title={vehicleType.name}
          >
            <Icon 
              className="h-3 w-3" 
              style={{ color: isSelected ? vehicleType.color : undefined }}
            />
            <span>{vehicleType.name}</span>
          </button>
        )
      })}
    </div>
  )
}
