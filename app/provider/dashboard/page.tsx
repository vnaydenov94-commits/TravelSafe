'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { getServiceTypeById, SERVICE_TYPES } from '@/lib/service-types';
import {
  Wrench, MapPin, Phone, Mail, Star, Clock, Users,
  TrendingUp, Bell, Settings, AlertTriangle, Check, X, Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ServiceProvider {
  id: string;
  businessName: string;
  description: string;
  phoneNumber: string;
  email: string;
  website: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
  coverageRadius: number;
  serviceTypes: string[];
  isVerified: boolean;
  isActive: boolean;
  showOnMap: boolean;
  subscriptionTier: string;
  subscriptionStatus: string;
  subscriptionEndsAt: string;
  averageRating: number;
  totalRatings: number;
  totalJobsCompleted: number;
  is24Hours: boolean;
  notificationsEnabled: boolean;
  helpRequests: any[];
}

export default function ProviderDashboardPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/service-providers/my-profile');
        const data = await res.json();
        if (data.provider) {
          setProvider(data.provider);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchProfile();
    }
  }, [session]);

  const toggleActive = async () => {
    if (!provider) return;
    try {
      const res = await fetch(`/api/service-providers/${provider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !provider.isActive })
      });
      if (res.ok) {
        setProvider(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
        toast.success(provider.isActive ? 'Профилът е деактивиран' : 'Профилът е активиран');
      }
    } catch (error) {
      toast.error('Грешка при промяна');
    }
  };

  const toggleShowOnMap = async () => {
    if (!provider) return;
    try {
      const res = await fetch(`/api/service-providers/${provider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showOnMap: !provider.showOnMap })
      });
      if (res.ok) {
        setProvider(prev => prev ? { ...prev, showOnMap: !prev.showOnMap } : null);
        toast.success(provider.showOnMap ? 'Скрит от картата' : 'Показан на картата');
      }
    } catch (error) {
      toast.error('Грешка при промяна');
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <Card className="max-w-xl mx-auto">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle>Нямате профил на доставчик</CardTitle>
            <CardDescription>Регистрирайте се като доставчик на пътна помощ</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/provider/register')}>
              Регистрация
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysRemaining = provider.subscriptionEndsAt
    ? Math.ceil((new Date(provider.subscriptionEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wrench className="w-6 h-6 text-blue-600" />
              {provider.businessName}
              {provider.isVerified && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Check className="w-3 h-3 mr-1" /> Верифициран
                </Badge>
              )}
            </h1>
            <p className="text-gray-500 flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4" />
              {provider.city}, {provider.country}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={provider.subscriptionStatus === 'TRIAL' ? 'outline' : 'default'}>
              {provider.subscriptionStatus === 'TRIAL' ? `Пробен период (${daysRemaining} дни)` : provider.subscriptionTier}
            </Badge>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-1" />
              Настройки
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Рейтинг</p>
                  <p className="text-2xl font-bold flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    {provider.averageRating.toFixed(1)}
                  </p>
                </div>
                <span className="text-sm text-gray-500">({provider.totalRatings} оценки)</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Завършени</p>
                  <p className="text-2xl font-bold">{provider.totalJobsCompleted}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Активни заявки</p>
                  <p className="text-2xl font-bold">{provider.helpRequests?.length || 0}</p>
                </div>
                <Bell className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Покритие</p>
                  <p className="text-2xl font-bold">{provider.coverageRadius} км</p>
                </div>
                <MapPin className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Controls & Services */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Контроли</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Активен</p>
                    <p className="text-sm text-gray-500">Приемам заявки</p>
                  </div>
                  <Switch checked={provider.isActive} onCheckedChange={toggleActive} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">На картата</p>
                    <p className="text-sm text-gray-500">Видим за потребители</p>
                  </div>
                  <Switch checked={provider.showOnMap} onCheckedChange={toggleShowOnMap} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Услуги</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {provider.serviceTypes.map((type) => {
                    const serviceInfo = getServiceTypeById(type);
                    return (
                      <Badge key={type} variant="secondary" className="text-sm">
                        {serviceInfo?.icon} {serviceInfo?.nameBg || type}
                      </Badge>
                    );
                  })}
                </div>
                {provider.is24Hours && (
                  <div className="mt-3 flex items-center gap-2 text-green-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">24/7</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Контакти</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-500" />
                  {provider.phoneNumber}
                </p>
                <p className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-500" />
                  {provider.email}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Active Requests */}
          <div className="md:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Активни заявки за помощ
                </CardTitle>
              </CardHeader>
              <CardContent>
                {provider.helpRequests?.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Няма активни заявки</p>
                    <p className="text-sm">Ще получите известие при нова заявка в района ви</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {provider.helpRequests?.map((request: any) => (
                      <div key={request.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              {getServiceTypeById(request.serviceType)?.icon}{' '}
                              {getServiceTypeById(request.serviceType)?.nameBg}
                            </p>
                            <p className="text-sm text-gray-500">{request.address}</p>
                          </div>
                          <Badge>{request.status}</Badge>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <Check className="w-4 h-4 mr-1" /> Приеми
                          </Button>
                          <Button size="sm" variant="outline">
                            <X className="w-4 h-4 mr-1" /> Откажи
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
