// Service Type Configuration for Premium Service Providers

export interface ServiceTypeInfo {
  id: string;
  name: string;
  nameBg: string;
  icon: string;
  description: string;
  descriptionBg: string;
  color: string;
}

export const SERVICE_TYPES: ServiceTypeInfo[] = [
  {
    id: 'TIRE_CHANGE',
    name: 'Tire Change',
    nameBg: 'Смяна на гуми',
    icon: '🛞',
    description: 'Flat tire repair or replacement',
    descriptionBg: 'Ремонт или смяна на спукана гума',
    color: '#3B82F6'
  },
  {
    id: 'TOWING',
    name: 'Towing',
    nameBg: 'Пътна помощ',
    icon: '🚗',
    description: 'Vehicle towing services',
    descriptionBg: 'Услуги по теглене на превозни средства',
    color: '#EF4444'
  },
  {
    id: 'FUEL_DELIVERY',
    name: 'Fuel Delivery',
    nameBg: 'Доставка на гориво',
    icon: '⛽',
    description: 'Emergency fuel delivery',
    descriptionBg: 'Спешна доставка на гориво',
    color: '#F59E0B'
  },
  {
    id: 'BATTERY_JUMPSTART',
    name: 'Battery Jumpstart',
    nameBg: 'Стартиране с кабели',
    icon: '🔋',
    description: 'Battery jump-start service',
    descriptionBg: 'Стартиране на акумулатор',
    color: '#10B981'
  },
  {
    id: 'LOCKOUT_SERVICE',
    name: 'Lockout Service',
    nameBg: 'Отключване',
    icon: '🔐',
    description: 'Vehicle lockout assistance',
    descriptionBg: 'Помощ при заключен автомобил',
    color: '#8B5CF6'
  },
  {
    id: 'MECHANICAL_REPAIR',
    name: 'Mechanical Repair',
    nameBg: 'Механичен ремонт',
    icon: '🔧',
    description: 'On-site mechanical repairs',
    descriptionBg: 'Механични ремонти на място',
    color: '#6366F1'
  },
  {
    id: 'FLAT_BED_TOWING',
    name: 'Flat Bed Towing',
    nameBg: 'Репатрак с платформа',
    icon: '🛻',
    description: 'Flat bed trailer towing',
    descriptionBg: 'Теглене с платформа',
    color: '#EC4899'
  },
  {
    id: 'MOTORCYCLE_TOWING',
    name: 'Motorcycle Towing',
    nameBg: 'Теглене на мотор',
    icon: '🏍️',
    description: 'Motorcycle towing service',
    descriptionBg: 'Теглене на мотоциклети',
    color: '#14B8A6'
  },
  {
    id: 'WINCHING',
    name: 'Winching',
    nameBg: 'Изтегляне с лебедка',
    icon: '⛓️',
    description: 'Vehicle winching/extraction',
    descriptionBg: 'Изтегляне на заседнали превозни средства',
    color: '#84CC16'
  },
  {
    id: 'EMERGENCY_ROADSIDE',
    name: 'Emergency Roadside',
    nameBg: 'Спешна пътна помощ',
    icon: '🚨',
    description: 'General emergency roadside assistance',
    descriptionBg: 'Обща спешна пътна помощ',
    color: '#DC2626'
  }
];

export function getServiceTypeById(id: string): ServiceTypeInfo | undefined {
  return SERVICE_TYPES.find(st => st.id === id);
}

export function getServiceTypesByIds(ids: string[]): ServiceTypeInfo[] {
  return SERVICE_TYPES.filter(st => ids.includes(st.id));
}

export const SUBSCRIPTION_TIERS = {
  BASIC: {
    name: 'Basic',
    nameBg: 'Базов',
    price: 29,
    features: ['Показване на картата', 'Основен профил', 'До 5 услуги'],
    featuresBg: ['Показване на картата', 'Основен профил', 'До 5 услуги']
  },
  PREMIUM: {
    name: 'Premium',
    nameBg: 'Премиум',
    price: 79,
    features: ['Priority notifications', 'Featured listing', 'Unlimited services', 'Analytics dashboard'],
    featuresBg: ['Приоритетни известия', 'Открояване в списъка', 'Неограничени услуги', 'Аналитика']
  },
  ENTERPRISE: {
    name: 'Enterprise',
    nameBg: 'Корпоративен',
    price: 149,
    features: ['All Premium features', 'Multiple locations', 'API access', 'Dedicated support'],
    featuresBg: ['Всички Premium функции', 'Множество локации', 'API достъп', 'Персонална поддръжка']
  }
};
