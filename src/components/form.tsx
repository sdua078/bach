import { Drawer } from 'vaul'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { useI18n } from '../i18n'

/** Bottom sheet for adding / editing. Swipe down or tap outside to dismiss. */
export function Sheet({
  open,
  onOpenChange,
  title,
  onSave,
  saveDisabled,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onSave: () => void
  saveDisabled?: boolean
  children: ReactNode
}) {
  const { t } = useI18n()
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] max-w-2xl flex-col rounded-t-[12px] bg-bg outline-none">
          <div className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-label-3" />
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault()
              if (!saveDisabled) onSave()
            }}
          >
            <div className="flex h-12 shrink-0 items-center justify-between px-4">
              <button type="button" className="text-[17px] text-accent active:opacity-50" onClick={() => onOpenChange(false)}>
                {t.common.cancel}
              </button>
              <Drawer.Title className="text-[17px] font-semibold">{title}</Drawer.Title>
              <button
                type="submit"
                disabled={saveDisabled}
                className="text-[17px] font-semibold text-accent active:opacity-50 disabled:text-label-3"
              >
                {t.common.save}
              </button>
            </div>
            <Drawer.Description className="sr-only">{title}</Drawer.Description>
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+24px)]">
              {children}
            </div>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/** Label on the left, input on the right, inside a Group. */
export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="flex min-h-11 items-center gap-3 py-1.5 pr-4">
      <span className="shrink-0 text-[17px]">{label}</span>
      <span className="flex min-w-0 flex-1 justify-end">{children}</span>
    </label>
  )
}

const inputClass =
  'num w-full min-w-0 bg-transparent text-right text-[17px] text-label-2 outline-none placeholder:text-label-3 focus:text-label'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />
}

/** Dollar amount typed as text, e.g. "1,234.50". */
export function MoneyInput({
  value,
  onChange,
  ...rest
}: { value: string; onChange: (v: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <TextInput
      inputMode="decimal"
      placeholder="$0.00"
      autoComplete="off"
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
    />
  )
}

/** "1,234.5" → 123450 cents. Undefined when empty or not a number. */
export function parseMoney(text: string): number | undefined {
  const clean = text.replace(/,/g, '').trim()
  if (!/^\d+(\.\d{0,2})?$|^\.\d{1,2}$/.test(clean)) return undefined
  return Math.round(Number(clean) * 100)
}

/** 123450 → "1234.50"; 0 → "" so the placeholder shows. */
export function centsToInput(cents: number | undefined): string {
  if (!cents) return ''
  return (cents / 100).toFixed(2).replace(/\.00$/, '')
}

/** 0–100% slider in steps of 5, shown as a big percentage. */
export function PercentSlider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const pct = Math.round(value * 100)
  return (
    <div className="py-3 pr-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[17px]">{label}</span>
        <span className="num text-[17px] font-semibold text-accent">{pct}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={pct}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="mt-2 w-full accent-[var(--accent)]"
      />
    </div>
  )
}

/** Large centered amount for the main field of a sheet. */
export function HeroMoneyInput({
  value,
  onChange,
  label,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  autoFocus?: boolean
}) {
  return (
    <label className="block rounded-[10px] bg-card px-4 py-4 text-center">
      <span className="block text-[13px] text-label-2">{label}</span>
      <span className="mt-1 flex items-baseline justify-center">
        <span className="text-[34px] font-semibold text-label-3">$</span>
        <input
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
          className="num w-full max-w-[12ch] bg-transparent text-center !text-[40px] font-semibold tracking-tight outline-none placeholder:text-label-3"
          style={{ width: `${Math.max(1, value.length) + 1}ch` }}
        />
      </span>
    </label>
  )
}
