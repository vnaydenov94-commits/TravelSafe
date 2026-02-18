'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { SERVICE_TYPES, SUBSCRIPTION_TIERS } from '@/lib/service-types';
import { MapPin, Phone, Mail, Globe, Wrench, Clock, Star, Check, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ProviderRegisterPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    phoneNumber: '',
    email: '',
    website: '',
    latitude: 0,
    longitude: 0,
    address: '',
    city: '',
    country: 'Bulgaria',
    coverageRadius: 25,
    serviceTypes: [] as string[],
    is24Hours: false
  });

  // Check if user already has a provider profile
  useEffect(() => {
    const checkExisting = async () => {
      if (session?.user?.id) {
        try {
          const res = await fetch('/api/service-providers/my-profile');
          const data = await res.json();
          if (data.provider) {
            setHasExistingProfile(true);
          }
        } catch (error) {
          console.error('Error checking existing profile:', error);
        }
      }
    };
    checkExisting();
  }, [session]);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({ ...prev, latitude, longitude }));

          // Reverse geocode
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await res.json();
            if (data.address) {
              setFormData(prev => ({
                ...prev,
                city: data.address.city || data.address.town || data.address.village || '',
                country: data.address.country || 'Bulgaria',
                address: data.display_name || ''
              }));
            }
          } catch (error) {
            console.error('Geocoding error:', error);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Default to Sofia
          setFormData(prev => ({
            ...prev,
            latitude: 42.6977,
            longitude: 23.3219,
            city: 'София',
            country: 'Bulgaria'
          }));
        }
      );
    }
  }, []);

  // Set email from session
  useEffect(() => {
    if (session?.user?.email) {
      setFormData(prev => ({ ...prev, email: session.user.email || '' }));
    }
  }, [session]);

  const toggleServiceType = (typeId: string) => {
    setFormData(prev => ({
      ...prev,
      serviceTypes: prev.serviceTypes.includes(typeId)
        ? prev.serviceTypes.filter(t => t !== typeId)
        : [...prev.serviceTypes, typeId]
    }));
  };

  const handleSubmit = async () => {
    if (!formData.businessName || !formData.phoneNumber || !formData.email) {
      toast.error('Моля, попълнете всички задължителни полета');
      return;
    }

    if (formData.serviceTypes.length === 0) {
      toast.error('Моля, изберете поне една услуга');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/service-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Грешка при регистрация');
      }

      toast.success('Успешна регистрация! Имате 14 дни безплатен пробен период.');
      router.push('/provider/dashboard');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin?callbackUrl=/provider/register');
    return null;
  }

  if (hasExistingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <Card className="max-w-xl mx-auto">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle>Вече имате профил</CardTitle>
            <CardDescription>Вече сте регистрирани като доставчик на услуги</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/provider/dashboard')}>
              Към таблото
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
            <Wrench className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Станете доставчик на пътна помощ
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Предлагайте услугите си на хиляди пътници
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => (
            <Card key={key} className={`relative ${key === 'PREMIUM' ? 'border-blue-500 border-2' : ''}`}>
              {key === 'PREMIUM' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-3 py-1 rounded-full">
                  Популярен
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">{tier.nameBg}</CardTitle>
                <div className="text-3xl font-bold">
                  {tier.price} <span className="text-sm font-normal text-gray-500">лв./мес.</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {tier.featuresBg.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Регистрация</CardTitle>
            <CardDescription>
              Започнете с 14 дни безплатен пробен период
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step indicators */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step >= s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {s}
                </div>
              ))}
            </div>

            {/* Step 1: Business Info */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg mb-4">Бизнес информация</h3>

                <div className="space-y-2">
                  <Label htmlFor="businessName">Име на фирмата *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                    placeholder="Напр. Авто Помощ София"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Кратко описание на услугите ви"
                    rows={3}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Телефон *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder="+359 888 123 456"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Уебсайт (опционално)
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>

                <Button
                  className="w-full mt-4"
                  onClick={() => {
                    if (!formData.businessName || !formData.phoneNumber || !formData.email) {
                      toast.error('Моля, попълнете задължителните полета');
                      return;
                    }
                    setStep(2);
                  }}
                >
                  Напред
                </Button>
              </div>
            )}

            {/* Step 2: Services */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg mb-4">Изберете услуги</h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {SERVICE_TYPES.map((service) => (
                    <div
                      key={service.id}
                      onClick={() => toggleServiceType(service.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.serviceTypes.includes(service.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{service.icon}</div>
                      <div className="font-medium text-sm">{service.nameBg}</div>
                      <div className="text-xs text-gray-500 mt-1">{service.descriptionBg}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox
                    id="is24Hours"
                    checked={formData.is24Hours}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, is24Hours: checked === true }))
                    }
                  />
                  <Label htmlFor="is24Hours" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Работим 24/7
                  </Label>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Назад
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (formData.serviceTypes.length === 0) {
                        toast.error('Моля, изберете поне една услуга');
                        return;
                      }
                      setStep(3);
                    }}
                  >
                    Напред
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Location & Coverage */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg mb-4">Локация и покритие</h3>

                <div className="space-y-2">
                  <Label>
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Адрес
                  </Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Адрес на базата"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Град</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Държава</Label>
                    <Input
                      value={formData.country}
                      onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Радиус на покритие: {formData.coverageRadius} км</Label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={formData.coverageRadius}
                    onChange={(e) => setFormData(prev => ({ ...prev, coverageRadius: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>5 км</span>
                    <span>50 км</span>
                    <span>100 км</span>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mt-4">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    14 дни безплатен пробен период
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    След пробния период можете да изберете план или да прекратите услугата.
                  </p>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Назад
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Регистриране...
                      </>
                    ) : (
                      'Завърши регистрацията'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
