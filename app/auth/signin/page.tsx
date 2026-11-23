
'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { MapPin, Shield, Users } from 'lucide-react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Load saved email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('travelsafe_remembered_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        rememberMe: rememberMe.toString(),
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        // Save or clear remembered email
        if (rememberMe) {
          localStorage.setItem('travelsafe_remembered_email', email)
          localStorage.setItem('travelsafe_remember_session', 'true')
        } else {
          localStorage.removeItem('travelsafe_remembered_email')
          localStorage.removeItem('travelsafe_remember_session')
          // Set session storage flag to track browser session
          sessionStorage.setItem('travelsafe_session_active', 'true')
        }
        
        const session = await getSession()
        if (session) {
          router.push('/dashboard')
          router.refresh()
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" aria-label="TravelSafe – home" className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full hover:scale-110 transition-transform">
              <MapPin className="h-8 w-8 text-white" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">TravelSafe</h1>
          <p className="text-gray-600">Connect with travelers worldwide</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center">
            <div className="bg-white p-3 rounded-lg shadow-sm mb-2">
              <MapPin className="h-6 w-6 text-blue-600 mx-auto" />
            </div>
            <p className="text-xs text-gray-600">Real-time Location</p>
          </div>
          <div className="text-center">
            <div className="bg-white p-3 rounded-lg shadow-sm mb-2">
              <Shield className="h-6 w-6 text-green-600 mx-auto" />
            </div>
            <p className="text-xs text-gray-600">Emergency Alerts</p>
          </div>
          <div className="text-center">
            <div className="bg-white p-3 rounded-lg shadow-sm mb-2">
              <Users className="h-6 w-6 text-purple-600 mx-auto" />
            </div>
            <p className="text-xs text-gray-600">Connect & Chat</p>
          </div>
        </div>

        {/* Sign In Form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Welcome back! Enter your credentials to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                  Запомни акаунта
                </Label>
              </div>
              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link href="/auth/signup" className="text-blue-600 hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
