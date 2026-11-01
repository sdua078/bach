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
import { useIsDesktop } from '../lib/useIsDesktop'

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
  const desktop = useIsDesktop()
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

  const hero = (
    <section className="rounded-[14px] bg-card px-5 pt-5 pb-4 md:px-7 md:pt-6 md:pb-6 md:shadow-[0_0_0_0.5px_var(--separator)]">
      <p className="text-[15px] font-medium text-label-2">{over ? t.summary.overSaved : t.summary.stillToSetAside}</p>
      <m.p
        key={s.shortfall}
        initial={{ opacity: 0.4, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className={`num mt-0.5 text-[48px] leading-[54px] font-bold tracking-tight md:text-[56px] md:leading-[64px] ${over ? 'text-green' : ''}`}
      >
        {moneyShort(Math.abs(s.shortfall))}
      </m.p>
      <p className="mt-1 text-[15px] leading-5 text-label-2">
        {s.incomeTotal > 0
          ? t.summary.savedSoFar(money(s.setAsideSoFar), percent(s.suggestedRate))
          : t.summary.noIncomeYet(percent(s.suggestedRate))}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 md:mt-6 md:gap-3">
        {[
          [t.summary.income, s.incomeTotal],
          [t.summary.deductions, s.deductionsTotal],
          [t.summary.profit, s.sideProfit],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[10px] bg-fill px-3 py-2.5 md:px-4 md:py-3">
            <p className="text-[12px] text-label-2">{label}</p>
            <p className="num truncate text-[17px] font-semibold md:text-[20px]">{moneyShort(value as number)}</p>
          </div>
        ))}
      </div>
    </section>
  )

  const banners = (s.provisional.likely || needsBackup || (!installed && !installDismissed)) && (
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
          {desktop ? t.summary.installNudgeDesktop : t.summary.installNudge}
          <span className="mt-1 block text-[13px] text-label-2">{desktop ? t.summary.installHowDesktop : t.summary.installHow}</span>
        </Banner>
      )}
    </div>
  )

  const taxGroup = (
    <div className="space-y-2">
      <Group header={desktop ? t.summary.details : undefined}>
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
    </div>
  )

  const payeGroup = (
    <Group header={desktop ? t.summary.salary : undefined} footer={t.summary.marginal(percent(s.marginalRate), money(mulRate(10_000, s.marginalRate)))}>
      <Row label={t.summary.paye} sub={s.payeIsEstimate ? t.summary.payeEstimated : undefined} detail={money(s.paye)} />
    </Group>
  )

  const datesGroup = (
    <Group header={desktop ? t.summary.deadlines : undefined}>
      <Row label={t.summary.ir3Due} sub={rules.ir3DueDate} detail={t.summary.daysLeft(daysBetween(today, rules.ir3DueDate))} />
      <Row label={t.summary.taxDue} sub={rules.terminalTaxDate} detail={t.summary.daysLeft(daysBetween(today, rules.terminalTaxDate))} />
    </Group>
  )

  if (desktop) {
    return (
      <Page title={t.summary.title} subtitle={t.common.taxYear(taxYear)} wide>
        {banners}
        <div className="grid grid-cols-3 items-start gap-6">
          <div className="col-span-2">{hero}</div>
          {datesGroup}
        </div>
        <div className="grid grid-cols-2 items-start gap-6">
          {taxGroup}
          {payeGroup}
        </div>
      </Page>
    )
  }

  return (
    <Page title={t.summary.title} subtitle={t.common.taxYear(taxYear)}>
      {hero}
      {banners}
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
                {taxGroup}
                {payeGroup}
                {datesGroup}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </section>
      <Footnote>{t.disclaimer.short}</Footnote>
    </Page>
  )
}
