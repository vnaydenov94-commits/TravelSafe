'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MapPin, Shield, Users, MessageCircle, Bell, Globe, Navigation, ArrowRight, Zap, Heart, Star, TrendingUp, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/language-context'
import { LanguageSwitcher } from '@/components/language-switcher'

export default function HomePage() {
  const { t } = useLanguage()
  const [stats, setStats] = useState({ users: 0, countries: 0, alerts: 0 })
  const [activeFeature, setActiveFeature] = useState(0)

  // Real platform totals from /api/stats - the single source of truth for every
  // user count on this page (hero stats + CTA badge + trust badge)
  const [totals, setTotals] = useState({ users: 0, countries: 0, alerts: 0 })

  // Анимирани статистики (count-up to the real values)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined
    const animate = (target: { users: number; countries: number; alerts: number }) => {
      const steps = 50
      let currentStep = 0
      timer = setInterval(() => {
        currentStep++
        if (currentStep >= steps) {
          setStats(target)
          if (timer) clearInterval(timer)
          return
        }
        const progress = currentStep / steps
        setStats({
          users: Math.floor(target.users * progress),
          countries: Math.floor(target.countries * progress),
          alerts: Math.floor(target.alerts * progress)
        })
      }, 30)
    }

    fetch('/api/stats')
      .then((res) => {
        if (!res.ok) throw new Error(`Stats request failed: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        const target = {
          users: data.users ?? 0,
          countries: data.countries ?? 0,
          alerts: data.messages ?? 0
        }
        setTotals(target)
        animate(target)
      })
      .catch(() => setStats({ users: 0, countries: 0, alerts: 0 }))

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [])

  // Ротация на features
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 3)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center group cursor-pointer">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                TravelSafe
              </span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <LanguageSwitcher />
              <Link href="/map">
                <Button variant="ghost" className="hidden sm:flex items-center gap-2 hover:bg-blue-50">
                  <Navigation className="h-4 w-4" />
                  {t('header.liveMap')}
                </Button>
              </Link>
              <Link href="/auth/signin">
                <Button variant="ghost" className="hover:bg-blue-50">{t('header.signIn')}</Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                  {t('header.getStarted')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - С планинска снимка като фон */}
      <section className="relative py-20 overflow-hidden min-h-[600px]">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: 'url(/hero-background.webp)',
              backgroundPosition: 'center 40%',
              filter: 'brightness(0.85)'
            }}
          />
          {/* Dark overlay за по-добра четимост на текста и скриване на оригиналния текст */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md shadow-xl mb-6 border border-white/50">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-800">{t('hero.badge')}</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight drop-shadow-2xl">
              {t('hero.title1')}<br />
              <span className="text-white drop-shadow-2xl">
                {t('hero.title2')}
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white mb-10 max-w-4xl mx-auto leading-relaxed drop-shadow-lg">
              {t('hero.description')} <span className="font-bold text-yellow-300">{stats.countries}+ {t('hero.countries')}</span>
              {t('hero.description2')}
              <span className="font-bold"> {t('hero.description3')}</span>
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all">
                  <span className="mr-2">{t('hero.startNow')}</span>
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/map">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-blue-600 text-blue-600 hover:bg-blue-50">
                  <MapPin className="h-5 w-5 mr-2" />
                  {t('hero.viewMap')}
                </Button>
              </Link>
            </div>

            {/* Stats - Анимирани */}
            <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/50 hover:shadow-3xl transition-all hover:scale-105">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                  {stats.users.toLocaleString()}+
                </div>
                <div className="text-sm text-gray-700 font-medium">{t('hero.activeUsers')}</div>
              </div>
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/50 hover:shadow-3xl transition-all hover:scale-105">
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  {stats.countries}+
                </div>
                <div className="text-sm text-gray-700 font-medium">{t('hero.countries2')}</div>
              </div>
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/50 hover:shadow-3xl transition-all hover:scale-105">
                <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                  {stats.alerts.toLocaleString()}+
                </div>
                <div className="text-sm text-gray-700 font-medium">{t('hero.messagesSent')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Как Работи */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('howItWorks.title')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('howItWorks.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform">
                    <span className="text-4xl font-bold text-white">1</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3">{t('howItWorks.step1.title')}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {t('howItWorks.step1.desc')}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform">
                    <span className="text-4xl font-bold text-white">2</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3">{t('howItWorks.step2.title')}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {t('howItWorks.step2.desc')}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform">
                    <span className="text-4xl font-bold text-white">3</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3">{t('howItWorks.step3.title')}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {t('howItWorks.step3.desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Интерактивна */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('features.title')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('features.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-3xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200">
              <div className="absolute top-4 right-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-2xl w-fit mb-6 shadow-lg group-hover:scale-110 transition-transform">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">{t('features.realtime.title')}</h3>
              <p className="text-gray-700 leading-relaxed">
                {t('features.realtime.desc')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative bg-gradient-to-br from-red-50 to-red-100 p-8 rounded-3xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-red-200">
              <div className="absolute top-4 right-4">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-2xl w-fit mb-6 shadow-lg group-hover:scale-110 transition-transform">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">{t('features.sos.title')}</h3>
              <p className="text-gray-700 leading-relaxed">
                {t('features.sos.desc')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-3xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-purple-200">
              <div className="absolute top-4 right-4">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-2xl w-fit mb-6 shadow-lg group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">{t('features.social.title')}</h3>
              <p className="text-gray-700 leading-relaxed">
                {t('features.social.desc')}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group relative bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-3xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-green-200">
              <div className="absolute top-4 right-4">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-2xl w-fit mb-6 shadow-lg group-hover:scale-110 transition-transform">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">{t('features.messaging.title')}</h3>
              <p className="text-gray-700 leading-relaxed">
                {t('features.messaging.desc')}
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group relative bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-3xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-orange-200">
              <div className="absolute top-4 right-4">
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-2xl w-fit mb-6 shadow-lg group-hover:scale-110 transition-transform">
                <Bell className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Safety Check-ins</h3>
              <p className="text-gray-700 leading-relaxed">
                Редовни съобщения за безопасност, за да уведомиш контактите си, 
                с автоматични alerts ако пропуснеш check-in.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group relative bg-gradient-to-br from-indigo-50 to-indigo-100 p-8 rounded-3xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-indigo-200">
              <div className="absolute top-4 right-4">
                <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>
              </div>
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-2xl w-fit mb-6 shadow-lg group-hover:scale-110 transition-transform">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">{t('features.resources.title')}</h3>
              <p className="text-gray-700 leading-relaxed">
                {t('features.resources.desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials / Social Proof */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('testimonials.title')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('testimonials.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-shadow">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">
                {t('testimonials.1.text')}
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  М
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900">{t('testimonials.1.name')}</div>
                  <div className="text-sm text-gray-500">{t('testimonials.1.location')}</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-shadow">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">
                {t('testimonials.2.text')}
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  А
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900">{t('testimonials.2.name')}</div>
                  <div className="text-sm text-gray-500">{t('testimonials.2.location')}</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-shadow">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">
                {t('testimonials.3.text')}
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  И
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900">{t('testimonials.3.name')}</div>
                  <div className="text-sm text-gray-500">{t('testimonials.3.location')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - По-динамична */}
      <section className="relative py-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/20 backdrop-blur-sm mb-6">
            <TrendingUp className="h-5 w-5 text-white" />
            <span className="text-white font-semibold">{totals.users > 0
                ? t('cta.badge', { users: totals.users.toLocaleString() })
                : t('cta.badgeGeneric')}</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
            {t('cta.title1')}<br />
            {t('cta.title2')}
          </h2>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 leading-relaxed">
            {t('cta.description')} 
            {t('cta.description')}
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/auth/signup">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto bg-white text-blue-600 hover:bg-gray-100 shadow-2xl transform hover:scale-105 transition-all">
                <span className="mr-2 font-bold">{t('cta.startFree')}</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/map">
              <Button size="lg" className="w-full sm:w-auto bg-white/10 backdrop-blur-sm border-2 border-white text-white hover:bg-white/20">
                <MapPin className="h-5 w-5 mr-2" />
                {t('cta.viewLiveMap')}
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-white/80">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm">{t('cta.free')}</span>
            </div>
            {totals.users > 0 && (
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                <span className="text-sm">{t('cta.users', { users: totals.users.toLocaleString() })}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-current" />
              <span className="text-sm">{t('cta.rating')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3 rounded-xl shadow-lg">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <div className="text-xl font-bold">TravelSafe</div>
                <div className="text-sm text-gray-400">{t('footer.tagline')}</div>
              </div>
            </div>
            <div className="text-center md:text-right">
              <div className="text-sm text-gray-400 mb-2">
                {t('footer.copyright')}
              </div>
              <div className="text-xs text-gray-500">
                {t('footer.madeWith')} <Heart className="h-3 w-3 inline text-red-500 fill-current" /> {t('footer.forTravelers')}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
