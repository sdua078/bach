import { updateSettings } from '../db/repo'
import { useI18n, type Locale } from '../i18n'

const OPTIONS: { value: Locale; label: string }[] = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'EN' },
]

/** Segmented 中文 / EN switch. Picking one overrides the system language. */
export function LanguageToggle() {
  const { locale } = useI18n()
  return (
    <div role="radiogroup" aria-label="Language" className="inline-flex rounded-[8px] bg-fill p-0.5 text-[12px] font-medium">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={locale === value}
          onClick={() => void updateSettings({ locale: value })}
          className={`h-6 rounded-[6px] px-3 transition-colors ${
            locale === value ? 'bg-card text-label shadow-[0_1px_2px_rgb(0_0_0/0.12)]' : 'text-label-2 hover:text-label'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
