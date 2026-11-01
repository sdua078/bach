import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { homeOfficeDeduction } from '../calc'
import { centsToInput, Field, MoneyInput, parseMoney, PercentSlider, TextInput } from '../components/form'
import { Footnote, Group, Page, Row } from '../components/ui'
import { getHomeOffice, saveHomeOffice } from '../db/repo'
import type { HomeOffice } from '../db/schema'
import { useI18n } from '../i18n'
import { currentTaxYear } from '../lib/taxYear'
import { useIsDesktop } from '../lib/useIsDesktop'

const EMPTY = (taxYear: string): HomeOffice => ({
  taxYear,
  weeklyRent: 0,
  weeksWorked: 0,
  totalArea: 0,
  workspaceArea: 0,
  businessTimeShare: 1,
  utilitiesTotal: 0,
  internetTotal: 0,
  internetBusinessShare: 0.5,
  rentShareBorne: 1,
})

export function HomeOfficePage() {
  const { t } = useI18n()
  const taxYear = currentTaxYear()
  // Wrapped so "loaded, nothing saved yet" is distinguishable from "still loading".
  const loaded = useLiveQuery(async () => ({ value: await getHomeOffice(taxYear) }), [taxYear])

  return (
    <Page title={t.homeOffice.title} subtitle={`${t.common.taxYear(taxYear)} · ${t.homeOffice.intro}`} back={{ to: '/more', label: t.more.title }} wide>
      {loaded && <HomeOfficeForm initial={loaded.value ?? EMPTY(taxYear)} />}
    </Page>
  )
}

function num(text: string): number {
  const n = Number(text.replace(/,/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function HomeOfficeForm({ initial }: { initial: HomeOffice }) {
  const { t, money, percent } = useI18n()
  const [h, setH] = useState(initial)
  // Text mirrors so partially-typed numbers ("12.") survive re-renders.
  const [text, setText] = useState({
    weeklyRent: centsToInput(initial.weeklyRent),
    weeksWorked: initial.weeksWorked ? String(initial.weeksWorked) : '',
    totalArea: initial.totalArea ? String(initial.totalArea) : '',
    workspaceArea: initial.workspaceArea ? String(initial.workspaceArea) : '',
    utilitiesTotal: centsToInput(initial.utilitiesTotal),
    internetTotal: centsToInput(initial.internetTotal),
  })

  const update = (patch: Partial<HomeOffice>) => {
    const next = { ...h, ...patch }
    setH(next)
    void saveHomeOffice(next)
  }
  const money$ = (key: 'weeklyRent' | 'utilitiesTotal' | 'internetTotal') => (v: string) => {
    setText((s) => ({ ...s, [key]: v }))
    update({ [key]: parseMoney(v) ?? 0 })
  }
  const number$ = (key: 'weeksWorked' | 'totalArea' | 'workspaceArea', max = Infinity) => (v: string) => {
    const clean = v.replace(/[^\d.]/g, '')
    setText((s) => ({ ...s, [key]: clean }))
    update({ [key]: Math.min(max, num(clean)) })
  }

  const r = homeOfficeDeduction(h)
  const desktop = useIsDesktop()

  const inputs = (
    <div className="space-y-8">
      <Group header={t.homeOffice.rent}>
        <Field label={t.homeOffice.weeklyRent}>
          <MoneyInput value={text.weeklyRent} onChange={money$('weeklyRent')} />
        </Field>
        <Field label={t.homeOffice.weeksWorked}>
          <TextInput inputMode="numeric" placeholder="0" value={text.weeksWorked} onChange={(e) => number$('weeksWorked', 52)(e.target.value)} />
        </Field>
        <PercentSlider label={t.homeOffice.rentShareBorne} value={h.rentShareBorne} onChange={(v) => update({ rentShareBorne: v })} />
      </Group>
      <Group header={t.homeOffice.space}>
        <Field label={t.homeOffice.totalArea}>
          <TextInput inputMode="decimal" placeholder="0" value={text.totalArea} onChange={(e) => number$('totalArea')(e.target.value)} />
        </Field>
        <Field label={t.homeOffice.workspaceArea}>
          <TextInput inputMode="decimal" placeholder="0" value={text.workspaceArea} onChange={(e) => number$('workspaceArea')(e.target.value)} />
        </Field>
        <PercentSlider label={t.homeOffice.businessTimeShare} value={h.businessTimeShare} onChange={(v) => update({ businessTimeShare: v })} />
      </Group>
      <Group header={t.homeOffice.bills} footer={t.homeOffice.internetNote}>
        <Field label={t.homeOffice.utilitiesTotal}>
          <MoneyInput value={text.utilitiesTotal} onChange={money$('utilitiesTotal')} />
        </Field>
        <Field label={t.homeOffice.internetTotal}>
          <MoneyInput value={text.internetTotal} onChange={money$('internetTotal')} />
        </Field>
        <PercentSlider
          label={t.homeOffice.internetBusinessShare}
          value={h.internetBusinessShare}
          onChange={(v) => update({ internetBusinessShare: v })}
        />
      </Group>
    </div>
  )
  const results = (
    <div className="space-y-8 md:sticky md:top-10">
      <Group header={t.homeOffice.result} footer={r.rentCapped ? t.homeOffice.rentCapped : undefined}>
        <Row label={t.homeOffice.rentLine} detail={money(r.rent)} />
        <Row label={t.homeOffice.utilitiesLine} detail={money(r.utilities)} />
        <Row label={t.homeOffice.internetLine} detail={money(r.internet)} />
        <Row label={<span className="font-semibold">{t.homeOffice.total}</span>} detail={<span className="font-semibold text-accent">{money(r.total)}</span>} />
      </Group>
      <Group header={t.homeOffice.howTitle} footer={t.homeOffice.coupleNote}>
        <p className="py-3 pr-4 text-[15px] leading-5 text-label-2">{t.homeOffice.how(percent(r.areaShare), percent(r.weekShare))}</p>
      </Group>
    </div>
  )

  return (
    <>
      {!desktop && <Footnote>{t.homeOffice.intro}</Footnote>}
      {desktop ? (
        <div className="grid grid-cols-2 items-start gap-8">
          {inputs}
          {results}
        </div>
      ) : (
        <>
          {results}
          {inputs}
        </>
      )}
    </>
  )
}
