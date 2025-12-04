'use client'

import { useTranslation } from 'react-i18next'
import SearchBar from '@/components/SearchBar'
import FeaturedCarousel from '@/components/FeaturedCarousel'

interface HeroSectionProps {
  hasActiveFilters: boolean
  featuredEvents: any[]
  brandTagline?: string
}

export default function HeroSection({ 
  hasActiveFilters, 
  featuredEvents,
  brandTagline 
}: HeroSectionProps) {
  const { t } = useTranslation('common')

  if (!hasActiveFilters && featuredEvents.length > 0) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <FeaturedCarousel events={featuredEvents} />
      </div>
    )
  }

  return (
    <div className="relative bg-gradient-to-br from-brand-600 via-brand-700 to-accent-600 overflow-hidden">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 relative">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 drop-shadow-lg">
            {hasActiveFilters 
              ? t('events.find_perfect_event') 
              : (brandTagline || t('events.find_perfect_event'))}
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-brand-50 max-w-2xl mx-auto drop-shadow-md">
            {t('events.hero_subtitle')}
          </p>
        </div>
        <SearchBar />
      </div>
    </div>
  )
}
