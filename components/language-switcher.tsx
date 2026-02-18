'use client'

import { useLanguage } from '@/lib/language-context'
import { Button } from '@/components/ui/button'
import { Languages } from 'lucide-react'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'bg' ? 'en' : 'bg')
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2 hover:bg-blue-50"
    >
      <Languages className="h-4 w-4" />
      <span className="font-semibold">{language === 'bg' ? '🇧🇬 БГ' : '🇬🇧 EN'}</span>
    </Button>
  )
}
