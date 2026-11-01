import { AnimatePresence, m } from 'motion/react'
import { useState } from 'react'
import { Field, MoneyInput, parseMoney } from '../components/form'
import { Group, spring } from '../components/ui'
import { saveTaxYear, updateSettings } from '../db/repo'
import { useI18n } from '../i18n'
import { currentTaxYear } from '../lib/taxYear'

/** First launch: disclaimer → salary → done. */
export function Onboarding({ disclaimerAccepted }: { disclaimerAccepted: boolean }) {
  const { t } = useI18n()
  const [step, setStep] = useState<'disclaimer' | 'salary'>(disclaimerAccepted ? 'salary' : 'disclaimer')
  const [salary, setSalary] = useState('')
  const salaryCents = parseMoney(salary)

  const finish = async () => {
    if (salaryCents === undefined) return
    await saveTaxYear({ id: currentTaxYear(), estimatedSalary: salaryCents })
    await updateSettings({ onboarded: true })
  }

  return (
    <div className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <AnimatePresence mode="wait">
        <m.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={spring}
          className="flex flex-1 flex-col"
        >
          {step === 'disclaimer' ? (
            <>
              <div className="flex-1 pt-16">
                <p className="text-[17px] font-semibold text-accent">{t.appName}</p>
                <h1 className="mt-2 text-[34px] leading-[41px] font-bold tracking-tight">{t.disclaimer.title}</h1>
                <div className="mt-6 space-y-4 text-[17px] leading-[24px] text-label-2">
                  {t.disclaimer.body.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </div>
              <PrimaryButton
                onClick={() => {
                  void updateSettings({ disclaimerAccepted: true })
                  setStep('salary')
                }}
              >
                {t.disclaimer.accept}
              </PrimaryButton>
            </>
          ) : (
            <form
              className="flex flex-1 flex-col"
              onSubmit={(e) => {
                e.preventDefault()
                void finish()
              }}
            >
              <div className="flex-1 pt-16">
                <h1 className="text-[34px] leading-[41px] font-bold tracking-tight">{t.onboarding.salaryTitle}</h1>
                <p className="mt-3 mb-8 text-[17px] leading-[24px] text-label-2">{t.onboarding.salaryBody}</p>
                <Group>
                  <Field label={t.onboarding.salaryLabel}>
                    <MoneyInput value={salary} onChange={setSalary} autoFocus />
                  </Field>
                </Group>
              </div>
              <PrimaryButton type="submit" disabled={salaryCents === undefined}>
                {t.onboarding.start}
              </PrimaryButton>
            </form>
          )}
        </m.div>
      </AnimatePresence>
    </div>
  )
}

function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled,
}: {
  children: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  return (
    <m.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.97 }}
      transition={spring}
      className="h-[50px] w-full rounded-[12px] bg-accent text-[17px] font-semibold text-white disabled:opacity-40"
    >
      {children}
    </m.button>
  )
}
