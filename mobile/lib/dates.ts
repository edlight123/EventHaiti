import { format } from 'date-fns'
import { enUS, fr } from 'date-fns/locale'

import type { Language } from '../contexts/I18nContext'

export function getDateFnsLocale(language: Language) {
  switch (language) {
    case 'fr':
      return fr
    case 'ht':
      // date-fns doesn't currently ship an ht locale; French is the closest match.
      return fr
    case 'en':
    default:
      return enUS
  }
}

export function formatDateForLanguage(date: Date, pattern: string, language: Language) {
  return format(date, pattern, { locale: getDateFnsLocale(language) })
}
