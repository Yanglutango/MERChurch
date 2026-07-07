import { useAppStore } from '../stores/appStore'
import { typedTranslations, Language } from '../i18n/translations'
import { formatCurrency, formatDate, formatTime, formatNumber, formatRelativeTime } from '../lib/formatters'

// Utilitário do tipo TypeScript para extrair chaves aninhadas com pontos (Dot-Notation)
type NestedKeys<T extends object> = {
  [K in keyof T & string]: T[K] extends object
    ? `${K}` | `${K}.${NestedKeys<T[K]>}`
    : `${K}`
}[keyof T & string]

export type TranslationKeys = NestedKeys<typeof typedTranslations['pt']>

export function useTranslation() {
  // Subscreve estritamente às mudanças de estado necessárias
  const language = useAppStore((state) => state.language) as Language
  const currency = useAppStore((state) => state.currency)

  /**
   * Função t local blindada contra caminhos complexos (dot-notation)
   */
  const t = (path: TranslationKeys): string => {
    const keys = path.split('.')
    // Seleciona o dicionário do idioma atual
    let currentDictionary: any = typedTranslations[language] || typedTranslations['pt']

    // Navega pelas propriedades do objeto (ex: nav -> home)
    for (const key of keys) {
      if (currentDictionary && key in currentDictionary) {
        currentDictionary = currentDictionary[key]
      } else {
        // Fallback para o idioma nativo (pt) se a chave falhar no idioma selecionado
        return getFallbackTranslation(path)
      }
    }

    return typeof currentDictionary === 'string' ? currentDictionary : path
  }

  // Função auxiliar de resgate (Fallback) em Português
  const getFallbackTranslation = (path: string): string => {
    const keys = path.split('.')
    let fallbackObj: any = typedTranslations['pt']
    for (const key of keys) {
      if (fallbackObj && key in fallbackObj) fallbackObj = fallbackObj[key]
      else return path
    }
    return typeof fallbackObj === 'string' ? fallbackObj : path
  }

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
