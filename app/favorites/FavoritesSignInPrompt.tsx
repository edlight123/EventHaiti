'use client'

import { useTranslation } from 'react-i18next'
import Link from 'next/link'

export default function FavoritesSignInPrompt() {
  const { t } = useTranslation('favorites')

  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {t('sign_in.title')}
        </h2>
        <Link
          href="/auth/login"
          className="text-orange-600 hover:text-orange-700 font-medium"
        >
          {t('sign_in.action')}
        </Link>
      </div>
    </div>
  )
}
