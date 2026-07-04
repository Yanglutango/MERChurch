// Locale-based formatting utilities

export type Locale = 'pt-AO' | 'en-US' | 'fr-FR' | 'es-ES'
export type Currency = 'AKZ' | 'USD' | 'EUR' | 'GBP'

const localeMap: Record<string, Locale> = {
  pt: 'pt-AO',
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES',
}

export const currencyLocaleMap: Record<Currency, Locale> = {
  AKZ: 'pt-AO',
  USD: 'en-US',
  EUR: 'fr-FR',
  GBP: 'en-US',
}

/**
 * Format date based on locale
 */
export function formatDate(
  date: Date | string,
  language: string = 'pt',
  options?: Intl.DateTimeFormatOptions
): string {
  const locale = localeMap[language] || 'pt-AO'
  const dateObj = typeof date === 'string' ? new Date(date) : date

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }

  try {
    return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj)
  } catch {
    return dateObj.toLocaleDateString()
  }
}

/**
 * Format time based on locale
 */
export function formatTime(
  date: Date | string,
  language: string = 'pt',
  options?: Intl.DateTimeFormatOptions
): string {
  const locale = localeMap[language] || 'pt-AO'
  const dateObj = typeof date === 'string' ? new Date(date) : date

  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }

  try {
    return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj)
  } catch {
    return dateObj.toLocaleTimeString()
  }
}

/**
 * Format number based on locale
 */
export function formatNumber(
  value: number,
  language: string = 'pt',
  options?: Intl.NumberFormatOptions
): string {
  const locale = localeMap[language] || 'pt-AO'

  try {
    return new Intl.NumberFormat(locale, options).format(value)
  } catch {
    return value.toString()
  }
}

/**
 * Format currency based on currency type and locale
 */
export function formatCurrency(
  amount: number,
  currency: Currency = 'AKZ',
  language?: string
): string {
  const locale = language ? localeMap[language] : currencyLocaleMap[currency]

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    // Fallback to manual formatting
    const symbols: Record<Currency, string> = {
      AKZ: 'Kz',
      USD: '$',
      EUR: '€',
      GBP: '£',
    }
    return `${symbols[currency]} ${amount.toFixed(2)}`
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  date: Date | string,
  language: string = 'pt'
): string {
  const locale = localeMap[language] || 'pt-AO'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

  const units: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'week', seconds: 604800 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 },
  ]

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

    for (const { unit, seconds } of units) {
      if (Math.abs(diffInSeconds) >= seconds) {
        const value = Math.floor(diffInSeconds / seconds)
        return rtf.format(-value, unit)
      }
    }

    return rtf.format(0, 'second')
  } catch {
    // Fallback
    if (diffInSeconds < 60) return 'agora'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m atrás`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atrás`
    return `${Math.floor(diffInSeconds / 86400)}d atrás`
  }
}

/**
 * Get browser locale with fallback
 */
export function getBrowserLocale(): string {
  try {
    const browserLang = navigator.language.split('-')[0]
    return ['pt', 'en', 'fr', 'es'].includes(browserLang) ? browserLang : 'pt'
  } catch {
    return 'pt'
  }
}
