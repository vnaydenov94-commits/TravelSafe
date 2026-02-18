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
  MapPin, 
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface RoadsideHelpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userLocation?: [number, number] | null
  onAlertSent?: () => void
}

const roadsideOptions = [
  {
    type: 'FLAT_TYRE',
    label: 'Flat Tyre',
    emoji: '🛞',
    description: 'Need help changing a flat tyre'
  },
  {
    type: 'BATTERY_JUMP',
    label: 'Battery Jump',
    emoji: '⚡',
    description: 'Battery is dead, need a jump start'
  },
  {
    type: 'OUT_OF_FUEL',
    label: 'Out of Fuel',
    emoji: '⛽',
    description: 'Ran out of fuel, need assistance'
  },
  {
    type: 'NEED_TOWING',
    label: 'Need Towing',
    emoji: '🚗',
    description: 'Vehicle needs to be towed'
  },
  {
    type: 'OTHER',
    label: 'Other',
    emoji: '⚠️',
    description: 'Other roadside assistance needed'
  }
]

const priorities = [
  { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-800' }
]

export function RoadsideHelpModal({ 
  open, 
  onOpenChange, 
  userLocation,
  onAlertSent 
}: RoadsideHelpModalProps) {
  const { data: session } = useSession()
  const [selectedType, setSelectedType] = useState<string>('')
  const [priority, setPriority] = useState<string>('MEDIUM')
  const [message, setMessage] = useState('')
  const [radius, setRadius] = useState(25000)
  const [isLoading, setIsLoading] = useState(false)

  const handleSendRequest = async () => {
    if (!selectedType || !userLocation) {
      toast.error('Please select help type and ensure location is available')
      return
    }

    try {
      setIsLoading(true)
      
      const selectedOption = roadsideOptions.find(o => o.type === selectedType)
      const fullMessage = selectedType === 'OTHER' && message.trim() 
        ? message.trim() 
        : `${selectedOption?.emoji} ${selectedOption?.label}${message.trim() ? `: ${message.trim()}` : ''}`
      
      const response = await fetch('/api/locations/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'GENERAL',
          message: fullMessage,
          latitude: userLocation[0],
          longitude: userLocation[1],
          radius,
          priority
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Help request sent to ${data.alertsSent} nearby travelers`)
        onAlertSent?.()
        onOpenChange(false)
        
        // Reset form
        setSelectedType('')
        setMessage('')
        setPriority('MEDIUM')
        setRadius(25000)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send help request')
      }
    } catch (error) {
      console.error('Error sending help request:', error)
      toast.error('Failed to send help request')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <span className="text-2xl">🚧</span>
            Request Roadside Help
          </DialogTitle>
          <DialogDescription>
            Select the type of assistance you need. Nearby travelers will be notified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Location Status */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="text-sm">Location:</span>
            {userLocation ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                ✓ Available
              </Badge>
            ) : (
              <Badge variant="destructive">Not Available</Badge>
            )}
          </div>

          {/* Roadside Options */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Select Assistance Type</h3>
            {roadsideOptions.map((option) => (
              <Card
                key={option.type}
                className={cn(
                  "cursor-pointer border-2 transition-all hover:shadow-md",
                  selectedType === option.type 
                    ? "border-orange-500 bg-orange-50" 
                    : "border-gray-200 hover:border-gray-300"
                )}
                onClick={() => setSelectedType(option.type)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.emoji}</span>
                    <div className="flex-1">
                      <h4 className="font-medium">{option.label}</h4>
                      <p className="text-xs text-gray-500">{option.description}</p>
                    </div>
                    {selectedType === option.type && (
                      <Badge className="bg-orange-500">Selected</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Priority Level */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Priority Level</h3>
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
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Alert Radius</h3>
            <div className="flex gap-2 flex-wrap">
              {[5000, 10000, 25000, 50000].map((r) => (
                <Badge
                  key={r}
                  variant={radius === r ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer",
                    radius === r ? "bg-orange-500 text-white" : "hover:bg-gray-100"
                  )}
                  onClick={() => setRadius(r)}
                >
                  {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                </Badge>
              ))}
            </div>
          </div>

          {/* Additional Message for "Other" */}
          {selectedType === 'OTHER' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Describe your need:</label>
              <Textarea
                placeholder="Please describe what help you need..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={200}
                rows={3}
              />
              <p className="text-xs text-gray-400">{message.length}/200</p>
            </div>
          )}

          {/* Optional note for other types */}
          {selectedType && selectedType !== 'OTHER' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional note (optional):</label>
              <Textarea
                placeholder="Any additional details..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={200}
                rows={2}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSendRequest}
              disabled={!selectedType || !userLocation || isLoading || (selectedType === 'OTHER' && !message.trim())}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <span className="mr-2">📤</span>
                  Send Help Request
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
