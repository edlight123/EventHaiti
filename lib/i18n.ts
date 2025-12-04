import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import commonEn from '@/public/locales/en/common.json'
import commonFr from '@/public/locales/fr/common.json'
import commonHt from '@/public/locales/ht/common.json'

import authEn from '@/public/locales/en/auth.json'
import authFr from '@/public/locales/fr/auth.json'
import authHt from '@/public/locales/ht/auth.json'

import eventsEn from '@/public/locales/en/events.json'
import eventsFr from '@/public/locales/fr/events.json'
import eventsHt from '@/public/locales/ht/events.json'

import profileEn from '@/public/locales/en/profile.json'
import profileFr from '@/public/locales/fr/profile.json'
import profileHt from '@/public/locales/ht/profile.json'

import adminEn from '@/public/locales/en/admin.json'
import adminFr from '@/public/locales/fr/admin.json'
import adminHt from '@/public/locales/ht/admin.json'

const resources = {
  en: {
    common: commonEn,
    auth: authEn,
    events: eventsEn,
    profile: profileEn,
    admin: adminEn,
  },
  fr: {
    common: commonFr,
    auth: authFr,
    events: eventsFr,
    profile: profileFr,
    admin: adminFr,
  },
  ht: {
    common: commonHt,
    auth: authHt,
    events: eventsHt,
    profile: profileHt,
    admin: adminHt,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr', 'ht'],
    defaultNS: 'common',
    ns: ['common', 'auth', 'events', 'profile', 'admin'],
    
    // Enable debug mode in development
    debug: process.env.NODE_ENV === 'development',
    
    // Show warnings for missing keys in development
    saveMissing: process.env.NODE_ENV === 'development',
    missingKeyHandler: (lng, ns, key) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Missing translation key: [${lng}][${ns}][${key}]`)
      }
    },
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  })

export default i18n
