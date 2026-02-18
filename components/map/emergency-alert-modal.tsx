
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { 
  AlertTriangle, 
  Heart, 
  Shield, 
  MapPin, 
  Phone, 
  Flame,
  HelpCircle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface EmergencyAlertModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userLocation?: [number, number] | null
  onAlertSent?: () => void
}

const emergencyTypes = [
  {
    type: 'MEDICAL',
    label: 'Medical Emergency',
    icon: Heart,
    color: 'bg-red-600 hover:bg-red-700',
    description: 'Health-related emergency requiring immediate attention'
  },
  {
    type: 'SAFETY',
    label: 'Safety Concern',
    icon: Shield,
    color: 'bg-orange-600 hover:bg-orange-700',
    description: 'Personal safety issue or threat'
  },
  {
    type: 'LOST',
    label: 'Lost/Stranded',
    icon: MapPin,
    color: 'bg-yellow-600 hover:bg-yellow-700',
    description: 'Lost or stranded in unfamiliar location'
  },
  {
    type: 'POLICE',
    label: 'Police Needed',
    icon: Phone,
    color: 'bg-blue-600 hover:bg-blue-700',
    description: 'Situation requiring police intervention'
  },
  {
    type: 'FIRE',
    label: 'Fire Emergency',
    icon: Flame,
    color: 'bg-red-700 hover:bg-red-800',
    description: 'Fire or related emergency'
  },
  {
    type: 'GENERAL',
    label: 'Other Emergency',
    icon: HelpCircle,
    color: 'bg-gray-600 hover:bg-gray-700',
    description: 'Other urgent situation requiring help'
  }
]

const priorities = [
  { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-800' }
]

export function EmergencyAlertModal({ 
  open, 
  onOpenChange, 
  userLocation,
  onAlertSent 
}: EmergencyAlertModalProps) {
  const { data: session } = useSession()
  const [selectedType, setSelectedType] = useState<string>('')
  const [priority, setPriority] = useState<string>('HIGH')
  const [message, setMessage] = useState('')
  const [radius, setRadius] = useState(5000)
  const [isLoading, setIsLoading] = useState(false)

  const handleSendAlert = async () => {
    if (!selectedType || !userLocation) {
      toast.error('Please select emergency type and ensure location is available')
      return
    }

    try {
      setIsLoading(true)
      
      const response = await fetch('/api/locations/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: selectedType,
          message: message.trim() || null,
          latitude: userLocation[0],
          longitude: userLocation[1],
          radius,
          priority
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Emergency alert sent to ${data.alertsSent} connections`)
        onAlertSent?.()
        onOpenChange(false)
        
        // Reset form
        setSelectedType('')
        setMessage('')
        setPriority('HIGH')
        setRadius(5000)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send emergency alert')
      }
    } catch (error) {
      console.error('Error sending emergency alert:', error)
      toast.error('Failed to send emergency alert')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisableEmergency = async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/locations/emergency', {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Emergency mode disabled')
        onAlertSent?.()
        onOpenChange(false)
      } else {
        toast.error('Failed to disable emergency mode')
      }
    } catch (error) {
      console.error('Error disabling emergency mode:', error)
      toast.error('Failed to disable emergency mode')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Emergency Alert System
          </DialogTitle>
          <DialogDescription>
            Send an emergency alert to all your connections. They will be notified immediately with your location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Location Status */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">Current Location:</span>
                {userLocation ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Location Available
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    Location Not Available
                  </Badge>
                )}
              </div>
              {!userLocation && (
                <p className="text-sm text-red-600 mt-2">
                  Please enable location services to send emergency alerts
                </p>
              )}
            </CardContent>
          </Card>

          {/* Emergency Type Selection */}
          <div className="space-y-3">
            <h3 className="font-semibold">Select Emergency Type</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {emergencyTypes.map((type) => {
                const Icon = type.icon
                return (
                  <Card
                    key={type.type}
                    className={cn(
                      "cursor-pointer border-2 transition-all hover:shadow-md",
                      selectedType === type.type 
                        ? "border-red-500 bg-red-50" 
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() => setSelectedType(type.type)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-lg text-white", type.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{type.label}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Priority Level */}
          <div className="space-y-3">
            <h3 className="font-semibold">Priority Level</h3>
            <div className="flex gap-2 flex-wrap">
              {priorities.map((p) => (
                <Badge
                  key={p.value}
                  variant={priority === p.value ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer",
                    priority === p.value ? p.color : "hover:bg-gray-100"
                  )}
                  onClick={() => setPriority(p.value)}
                >
                  {p.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Alert Radius */}
          <div className="space-y-3">
            <h3 className="font-semibold">Alert Radius</h3>
            <div className="flex gap-2 flex-wrap">
              {[1000, 5000, 10000, 25000].map((r) => (
                <Badge
                  key={r}
                  variant={radius === r ? "default" : "outline"}
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => setRadius(r)}
                >
                  {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                </Badge>
              ))}
            </div>
          </div>

          {/* Additional Message */}
          <div className="space-y-3">
            <h3 className="font-semibold">Additional Information (Optional)</h3>
            <Textarea
              placeholder="Provide any additional details about your emergency..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-sm text-gray-500">
              {message.length}/500 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSendAlert}
              disabled={!selectedType || !userLocation || isLoading}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Alert...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Send Emergency Alert
                </>
              )}
            </Button>
            <Button
              onClick={handleDisableEmergency}
              variant="outline"
              disabled={isLoading}
            >
              Disable Emergency Mode
            </Button>
          </div>

          {/* Warning */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Important:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• This will immediately notify all your connections</li>
                    <li>• Use only for genuine emergencies</li>
                    <li>• Local emergency services (911/112) should be contacted for immediate threats</li>
                    <li>• Your exact location will be shared with connections</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
