'use client'

import { useTranslation } from 'react-i18next'

export function AdminDashboardHeader() {
  const { t } = useTranslation('admin')

  return (
    <div className="mb-6 sm:mb-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
        {t('dashboard.title')}
      </h1>
      <p className="text-sm sm:text-base text-gray-600 mt-1">
        {t('dashboard.subtitle')}
      </p>
    </div>
  )
}
