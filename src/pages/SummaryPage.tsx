import { ChevronDown } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { useEffect, useState } from 'react'
import { daysBetween, mulRate, todayIso } from '../calc'
import { Banner, Footnote, Group, InfoTip, Page, Row, spring } from '../components/ui'
import { useSettings, useSummary } from '../db/hooks'
import { getRules } from '../tax-rules'
import { useI18n } from '../i18n'
import { platform } from '../platform'
import { currentTaxYear } from '../lib/taxYear'
import { useBackup } from '../lib/backup'

const BACKUP_AFTER_DAYS = 30
const BACKUP_AFTER_RECORDS = 10

export function SummaryPage() {
  const { t, money, moneyShort, percent } = useI18n()
  const taxYear = currentTaxYear()
  const rules = getRules(taxYear)!
  const s = useSummary(taxYear)
  const settings = useSettings()
  const { exportNow } = useBackup()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [installDismissed, setInstallDismissed] = useState(false)
  const [installed] = useState(() => platform.isInstalled())
  const today = todayIso()

  useEffect(() => {
    void platform.storage.persist()
  }, [])

  if (!s) return <Page title={t.summary.title}>{null}</Page>

  const needsBackup =
    settings.recordsSinceExport > BACKUP_AFTER_RECORDS ||
    (settings.recordsSinceExport > 0 &&
      settings.lastExportAt !== undefined &&
      daysBetween(settings.lastExportAt.slice(0, 10), today) > BACKUP_AFTER_DAYS)

  const over = s.shortfall < 0

  return (
    <Page title={t.summary.title} subtitle={t.common.taxYear(taxYear)}>
      {/* Hero: the one number that matters */}
      <section className="rounded-[14px] bg-card px-5 pt-5 pb-4">
        <p className="text-[15px] font-medium text-label-2">{over ? t.summary.overSaved : t.summary.stillToSetAside}</p>
        <m.p
          key={s.shortfall}
          initial={{ opacity: 0.4, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className={`num mt-0.5 text-[48px] leading-[54px] font-bold tracking-tight ${over ? 'text-green' : ''}`}
        >
          {moneyShort(Math.abs(s.shortfall))}
        </m.p>
        <p className="mt-1 text-[15px] leading-5 text-label-2">
          {s.incomeTotal > 0
            ? t.summary.savedSoFar(money(s.setAsideSoFar), percent(s.suggestedRate))
            : t.summary.noIncomeYet(percent(s.suggestedRate))}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            [t.summary.income, s.incomeTotal],
            [t.summary.deductions, s.deductionsTotal],
            [t.summary.profit, s.sideProfit],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[10px] bg-fill px-3 py-2.5">
              <p className="text-[12px] text-label-2">{label}</p>
              <p className="num truncate text-[17px] font-semibold">{moneyShort(value as number)}</p>
            </div>
          ))}
        </div>
      </section>

      {(s.provisional.likely || needsBackup || (!installed && !installDismissed)) && (
        <div className="space-y-3">
          {s.provisional.likely && (
            <Banner>
              {t.summary.provisional(
                moneyShort(rules.provisionalTax.ritThresholdCents),
                rules.provisionalTax.instalments,
                money(s.provisional.perInstalment),
              )}
              <InfoTip>{t.summary.provisionalInfo(moneyShort(rules.provisionalTax.ritThresholdCents))}</InfoTip>
            </Banner>
          )}
          {needsBackup && (
            <Banner tone="accent" action={{ label: t.summary.backupNow, onClick: () => void exportNow() }}>
              {t.summary.backupNudge}
            </Banner>
          )}
          {!installed && !installDismissed && (
            <Banner tone="accent" onDismiss={{ label: t.summary.dismiss, onClick: () => setInstallDismissed(true) }}>
              {t.summary.installNudge}
              <span className="mt-1 block text-[13px] text-label-2">{t.summary.installHow}</span>
            </Banner>
          )}
        </div>
      )}

      <section>
        <button
          type="button"
          onClick={() => setDetailsOpen((o) => !o)}
          aria-expanded={detailsOpen}
          className="mb-1.5 flex w-full items-center justify-between px-4 text-[13px] text-label-2 uppercase active:opacity-50"
        >
          {t.summary.details}
          <ChevronDown className={`size-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
        </button>
        <AnimatePresence initial={false}>
          {detailsOpen && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={spring}
              className="overflow-hidden"
            >
              <div className="space-y-8">
                <Group>
                  <Row
                    label={
                      <span className="whitespace-normal">
                        {s.extraTaxDue < 0 ? t.summary.likelyRefund : t.summary.extraTax}
                        <InfoTip>{t.summary.extraTaxInfo}</InfoTip>
                      </span>
                    }
                    detail={money(Math.abs(s.extraTaxDue))}
                  />
                  <Row
                    label={
                      <span className="whitespace-normal">
                        {t.summary.accEstimate}
                        <InfoTip>{t.summary.accInfo}</InfoTip>
                      </span>
                    }
                    detail={money(s.acc.amount)}
                  />
                  <Row label={<span className="font-semibold">{t.summary.toPrepare}</span>} detail={money(s.toPrepare)} />
                </Group>
                {s.acc.refundPossible && <Footnote>{t.summary.accRefund}</Footnote>}

                <Group footer={t.summary.marginal(percent(s.marginalRate), money(mulRate(10_000, s.marginalRate)))}>
                  <Row
                    label={t.summary.paye}
                    sub={s.payeIsEstimate ? t.summary.payeEstimated : undefined}
                    detail={money(s.paye)}
                  />
                </Group>

                <Group>
                  <Row label={t.summary.ir3Due} sub={rules.ir3DueDate} detail={t.summary.daysLeft(daysBetween(today, rules.ir3DueDate))} />
                  <Row
                    label={t.summary.taxDue}
                    sub={rules.terminalTaxDate}
                    detail={t.summary.daysLeft(daysBetween(today, rules.terminalTaxDate))}
                  />
                </Group>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </section>

      <Footnote>{t.disclaimer.short}</Footnote>
    </Page>
  )
}
