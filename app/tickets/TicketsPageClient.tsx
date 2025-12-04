'use client'

import { useTranslation } from 'react-i18next'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'

interface TicketsPageClientProps {
  userId: string
  children: React.ReactNode
}

export default function TicketsPageClient({ userId, children }: TicketsPageClientProps) {
  const { t } = useTranslation('tickets')

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-600 mt-1">{t('subtitle')}</p>
      </div>

      {children}
    </div>
  )
}
