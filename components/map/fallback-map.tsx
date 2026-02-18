
'use client'

import { getVehicleTypeById } from '@/lib/vehicle-types'
import { MapPin, Users, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface MapUser {
  id: string
  name: string
  vehicleType: string
  location: {
    latitude: number
    longitude: number
    city?: string
    country?: string
  }
  emergencyMode?: boolean
  isVerified?: boolean
}

interface FallbackMapProps {
  users?: MapUser[]
  vehicleTypeFilter?: string[]
}

export function FallbackMap({ users = [], vehicleTypeFilter = [] }: FallbackMapProps) {
  // Filter users based on vehicle type
  const filteredUsers = users.filter(user => 
    vehicleTypeFilter.length === 0 || vehicleTypeFilter.includes(user.vehicleType)
  )

  return (
    <div className="h-full w-full bg-gradient-to-br from-blue-50 to-indigo-100 p-4 overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">TravelSafe Map</h2>
          <p className="text-gray-600">
            {filteredUsers.length} travelers visible in the area
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Travelers</p>
                  <p className="text-2xl font-bold text-blue-600">{filteredUsers.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Emergency Alerts</p>
                  <p className="text-2xl font-bold text-red-600">
                    {filteredUsers.filter(u => u.emergencyMode).length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Verified Users</p>
                  <p className="text-2xl font-bold text-green-600">
                    {filteredUsers.filter(u => u.isVerified).length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">✓</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Travelers List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Active Travelers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No travelers visible in the current filter</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => {
                  const vehicleType = getVehicleTypeById(user.vehicleType)
                  const VehicleIcon = vehicleType?.icon
                  
                  return (
                    <div
                      key={user.id}
                      className="flex items-start space-x-4 p-4 bg-white rounded-lg border hover:border-blue-200 transition-colors"
                    >
                      {/* Vehicle Icon */}
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: vehicleType?.color || '#3B82F6' }}
                      >
                        {VehicleIcon ? (
                          <VehicleIcon className="h-6 w-6 text-white" />
                        ) : (
                          <span className="text-white font-bold">
                            {vehicleType?.name?.charAt(0) || 'T'}
                          </span>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {user.name}
                          </h3>
                          {user.isVerified && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <span className="mr-1">✓</span>
                              Verified
                            </Badge>
                          )}
                          {user.emergencyMode && (
                            <Badge variant="destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Emergency
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <span className="font-medium" style={{ color: vehicleType?.color }}>
                            {vehicleType?.name || 'Unknown vehicle'}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="w-4 h-4 mr-1" />
                          {user.location.city && `${user.location.city}, `}
                          {user.location.country}
                        </div>
                        
                        <div className="text-xs text-gray-400 mt-1">
                          Coordinates: {user.location.latitude.toFixed(4)}, {user.location.longitude.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
