import { useAppStore } from '../stores/appStore'
import { formatCurrency, formatDate, formatTime, formatNumber, formatRelativeTime } from '../lib/formatters'

/**
 * Translation and formatting hook
 */
export function useTranslation() {
  const { language, currency, t } = useAppStore()

  return {
    t,
    language,
    currency,
    formatCurrency: (amount: number) => formatCurrency(amount, currency, language),
    formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
      formatDate(date, language, options),
    formatTime: (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
      formatTime(date, language, options),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(value, language, options),
    formatRelativeTime: (date: Date | string) => formatRelativeTime(date, language),
  }
}
