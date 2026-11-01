import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Cents } from '../calc'
import { useSettings } from '../db/hooks'
import { en, type Messages } from './en'
import { zh } from './zh'

export type Locale = 'en' | 'zh'

const DICTS: Record<Locale, Messages> = { en, zh }

export function systemLocale(): Locale {
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

interface I18n {
  locale: Locale
  t: Messages
  money: (cents: Cents) => string
  /** Whole dollars, no cents — for headline numbers. */
  moneyShort: (cents: Cents) => string
  percent: (fraction: number) => string
  date: (iso: string) => string
  dateTime: (iso: string) => string
}

function build(locale: Locale): I18n {
  const tag = locale === 'zh' ? 'zh-CN' : 'en-NZ'
  // en-NZ renders NZD as "$" in both languages.
  const money = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' })
  const moneyShort = new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    maximumFractionDigits: 0,
  })
  const percent = new Intl.NumberFormat(tag, { style: 'percent', maximumFractionDigits: 1 })
  const date = new Intl.DateTimeFormat(tag, { month: 'short', day: 'numeric', timeZone: 'UTC' })
  const dateTime = new Intl.DateTimeFormat(tag, { dateStyle: 'medium' })
  return {
    locale,
    t: DICTS[locale],
    money: (c) => money.format(c / 100),
    moneyShort: (c) => moneyShort.format(Math.round(c / 100)),
    percent: (f) => percent.format(f),
    date: (iso) => date.format(new Date(`${iso}T00:00:00Z`)),
    dateTime: (iso) => dateTime.format(new Date(iso)),
  }
}

const I18nContext = createContext<I18n>(build('en'))

export function I18nProvider({ children }: { children: ReactNode }) {
  const settings = useSettings()
  const locale = settings.locale ?? systemLocale()
  const value = useMemo(() => build(locale), [locale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  return useContext(I18nContext)
}
