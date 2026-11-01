import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { centsToInput, Field, MoneyInput, parseMoney, TextInput } from '../components/form'
import { useToast } from '../components/toast'
import { Footnote, Group, InfoTip, Page, Row } from '../components/ui'
import { useSettings } from '../db/hooks'
import { clearAll, getTaxYear, saveTaxYear, updateSettings } from '../db/repo'
import type { TaxYear } from '../db/schema'
import { useI18n } from '../i18n'
import { useBackup } from '../lib/backup'
import { currentTaxYear } from '../lib/taxYear'
import { platform } from '../platform'
import { getRules } from '../tax-rules'

export function SettingsPage() {
  const { t } = useI18n()
  const taxYear = currentTaxYear()
  const year = useLiveQuery(() => getTaxYear(taxYear), [taxYear])

  return (
    <Page title={t.settings.title} back={{ to: '/more', label: t.more.title }} wide>
      <div className="space-y-8 md:grid md:grid-cols-2 md:items-start md:gap-8 md:space-y-0">
        <div className="space-y-8">
          {year && <TaxSettings year={year} />}
          <LanguageSettings />
        </div>
        <div className="space-y-8">
          <DataSettings />
          <About />
        </div>
      </div>
    </Page>
  )
}

function TaxSettings({ year }: { year: TaxYear }) {
  const { t } = useI18n()
  const rules = getRules(year.id)!
  const [salary, setSalary] = useState(centsToInput(year.estimatedSalary))
  const [paye, setPaye] = useState(centsToInput(year.payeWithheld))
  // Shown as $ per $100, the way the ACC invoice prints it.
  const [workLevy, setWorkLevy] = useState(year.workLevyRate === undefined ? '' : String(+(year.workLevyRate * 100).toFixed(4)))

  const save = (patch: Partial<TaxYear>) => void saveTaxYear({ ...year, ...patch })

  return (
    <Group header={t.settings.tax} footer={t.common.taxYear(year.id)}>
      <Field label={t.settings.salary}>
        <MoneyInput
          value={salary}
          onChange={(v) => {
            setSalary(v)
            save({ estimatedSalary: parseMoney(v) ?? 0 })
          }}
        />
      </Field>
      <Field
        label={
          <span className="whitespace-normal">
            {t.settings.payeActual}
            <InfoTip>{t.settings.payeActualInfo}</InfoTip>
          </span>
        }
      >
        <MoneyInput
          value={paye}
          placeholder={t.common.optional}
          onChange={(v) => {
            setPaye(v)
            const { payeWithheld: _, ...rest } = year
            const cents = parseMoney(v)
            void saveTaxYear(cents === undefined ? rest : { ...rest, payeWithheld: cents })
          }}
        />
      </Field>
      <Field
        label={
          <span className="whitespace-normal">
            {t.settings.workLevy}
            <InfoTip>{t.settings.workLevyInfo(`$${(rules.acc.defaultWorkLevyRate * 100).toFixed(2)}`)}</InfoTip>
          </span>
        }
      >
        <TextInput
          inputMode="decimal"
          placeholder={`$${(rules.acc.defaultWorkLevyRate * 100).toFixed(2)}`}
          value={workLevy}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d.]/g, '')
            setWorkLevy(v)
            const { workLevyRate: _, ...rest } = year
            const n = Number(v)
            void saveTaxYear(v === '' || !Number.isFinite(n) ? rest : { ...rest, workLevyRate: Math.min(1, n / 100) })
          }}
        />
      </Field>
    </Group>
  )
}

function LanguageSettings() {
  const { t } = useI18n()
  const settings = useSettings()
  return (
    <Group header={t.settings.language}>
      <Field label={t.settings.language}>
        <select
          value={settings.locale ?? 'system'}
          onChange={(e) => {
            const v = e.target.value
            void updateSettings({ locale: v === 'en' || v === 'zh' ? v : undefined })
          }}
          className="appearance-none bg-transparent text-right text-[17px] text-label-2 outline-none"
        >
          <option value="system">{t.settings.languageSystem}</option>
          <option value="en">English</option>
          <option value="zh">简体中文</option>
        </select>
      </Field>
    </Group>
  )
}

function DataSettings() {
  const { t, dateTime } = useI18n()
  const settings = useSettings()
  const toast = useToast()
  const { exportNow, importFromFile } = useBackup()
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    void platform.storage.isPersisted().then(setPersisted)
  }, [])

  const clear = async () => {
    if (!window.confirm(t.settings.clearConfirm1)) return
    if (!window.confirm(t.settings.clearConfirm2)) return
    await clearAll()
    toast(t.common.deleted)
  }

  return (
    <Group
      header={t.settings.data}
      footer={
        <>
          {settings.lastExportAt ? t.settings.lastExport(dateTime(settings.lastExportAt)) : t.settings.neverExported}
          {persisted !== null && <> · {persisted ? t.settings.storagePersisted : t.settings.storageNotPersisted}</>}
        </>
      }
    >
      <Row label={t.settings.export} tone="accent" onClick={() => void exportNow()} />
      <Row label={t.settings.import} tone="accent" onClick={() => void importFromFile()} />
      <Row label={t.settings.clear} tone="red" onClick={() => void clear()} />
    </Group>
  )
}

function About() {
  const { t } = useI18n()
  const rules = getRules(currentTaxYear())!
  return (
    <>
      <Group header={t.settings.sources}>
        {rules.sources.map((url) => (
          <a key={url} href={url} target="_blank" rel="noreferrer" className="block truncate py-2.5 pr-4 text-[15px] text-accent active:opacity-50">
            {url.replace(/^https:\/\/(www\.)?/, '')}
          </a>
        ))}
      </Group>
      <Footnote>
        {t.appName} · {t.settings.version(__APP_VERSION__)}
        <br />
        {t.disclaimer.short}
      </Footnote>
    </>
  )
}
