import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { translations, Language } from '../i18n/translations'

export type Currency = 'AKZ' | 'USD' | 'EUR' | 'GBP'

export const currencySymbols: Record<Currency, string> = {
  AKZ: 'Kz',
  USD: '$',
  EUR: '€',
  GBP: '£',
}

export const currencyRates: Record<Currency, number> = {
  AKZ: 1,
  USD: 830, // 1 USD ≈ 830 AKZ (exemplo)
  EUR: 900, // 1 EUR ≈ 900 AKZ (exemplo)
  GBP: 1050, // 1 GBP ≈ 1050 AKZ (exemplo)
}

interface AppState {
  language: Language
  currency: Currency
  setLanguage: (language: Language) => void
  setCurrency: (currency: Currency) => void
  t: (key: string) => string
  formatCurrency: (amount: number, showSymbol?: boolean) => string
  convertCurrency: (amount: number, from: Currency, to: Currency) => number
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      language: 'pt',
      currency: 'AKZ',
      
      setLanguage: (language) => set({ language }),
      
      setCurrency: (currency) => set({ currency }),
      
      t: (key: string) => {
        const { language } = get()
        const keys = key.split('.')
        let value: any = translations[language]
        
        for (const k of keys) {
          value = value?.[k]
        }
        
        return value || key
      },
      
      formatCurrency: (amount: number, showSymbol = true) => {
        const { currency } = get()
        const symbol = currencySymbols[currency]
        const formatted = new Intl.NumberFormat('pt-AO', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount)
        
        return showSymbol ? `${symbol} ${formatted}` : formatted
      },
      
      convertCurrency: (amount: number, from: Currency, to: Currency) => {
        if (from === to) return amount
        const amountInAKZ = amount * currencyRates[from]
        return amountInAKZ / currencyRates[to]
      },
    }),
    {
      name: 'mer-app-storage',
    }
  )
)
