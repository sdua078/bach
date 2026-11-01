import { useMemo, useState } from 'react'
import { suggestSetAside } from '../calc'
import { AddButton } from '../components/TabBar'
import { centsToInput, Field, HeroMoneyInput, MoneyInput, parseMoney, Sheet, TextInput } from '../components/form'
import { useToast } from '../components/toast'
import { Footnote, Group, InfoTip, Page, Row } from '../components/ui'
import { useIncomes, useSettings, useSummaryInput } from '../db/hooks'
import { addIncome, deleteIncome, updateIncome } from '../db/repo'
import type { Income } from '../db/schema'
import { useI18n } from '../i18n'
import { currentTaxYear, defaultEntryDate } from '../lib/taxYear'
import { rulesForDate } from '../tax-rules'

export function IncomePage() {
  const { t, money, date } = useI18n()
  const taxYear = currentTaxYear()
  const incomes = useIncomes(taxYear)
  const [sheet, setSheet] = useState<{ editing: Income | null; key: number } | null>(null)

  return (
    <Page title={t.income.title} subtitle={t.common.taxYear(taxYear)}>
      {incomes.length === 0 ? (
        <Footnote>{t.income.empty}</Footnote>
      ) : (
        <Group>
          {incomes.map((i) => (
            <Row
              key={i.id}
              label={i.source || '—'}
              sub={`${date(i.date)}${i.taxSetAside ? ` · ${t.income.setAsideShort(money(i.taxSetAside))}` : ''}`}
              detail={<span className="text-label">{money(i.nzdReceived + i.platformFees)}</span>}
              onClick={() => setSheet({ editing: i, key: Date.now() })}
            />
          ))}
        </Group>
      )}
      <AddButton label={t.income.add} onClick={() => setSheet({ editing: null, key: Date.now() })} />
      {sheet && <IncomeSheet key={sheet.key} taxYear={taxYear} editing={sheet.editing} onClose={() => setSheet(null)} />}
    </Page>
  )
}

function IncomeSheet({ taxYear, editing, onClose }: { taxYear: string; editing: Income | null; onClose: () => void }) {
  const { t, money } = useI18n()
  const toast = useToast()
  const settings = useSettings()
  const summaryInput = useSummaryInput(taxYear)
  const [open, setOpen] = useState(true)
  const close = () => {
    setOpen(false)
    setTimeout(onClose, 300)
  }

  const [nzd, setNzd] = useState(centsToInput(editing?.nzdReceived))
  const [entryDate, setEntryDate] = useState(editing?.date ?? defaultEntryDate(taxYear))
  const [source, setSource] = useState(editing?.source ?? settings.lastIncomeSource)
  const [usd, setUsd] = useState(centsToInput(editing?.foreignAmount))
  const [fees, setFees] = useState(centsToInput(editing?.platformFees))
  const [note, setNote] = useState(editing?.note ?? '')
  const [setAside, setSetAside] = useState<string | null>(editing ? centsToInput(editing.taxSetAside) : null)
  const [showMore, setShowMore] = useState(Boolean(editing && (editing.foreignAmount || editing.platformFees || editing.note)))

  const nzdCents = parseMoney(nzd)
  const feeCents = parseMoney(fees) ?? 0
  const dateOk = Boolean(rulesForDate(entryDate))

  const suggestion = useMemo(() => {
    if (!summaryInput || nzdCents === undefined) return undefined
    const others = { ...summaryInput, incomes: summaryInput.incomes.filter((i) => i.id !== editing?.id) }
    return suggestSetAside(others, { date: entryDate, nzdReceived: nzdCents, platformFees: feeCents })
  }, [summaryInput, nzdCents, feeCents, entryDate, editing?.id])

  // Until the user types their own figure, "moved to tax account" follows the suggestion.
  const setAsideText = setAside ?? centsToInput(suggestion)

  const save = async () => {
    if (nzdCents === undefined || !dateOk) return
    const usdCents = parseMoney(usd)
    const draft = {
      date: entryDate,
      source: source.trim(),
      nzdReceived: nzdCents,
      platformFees: feeCents,
      taxSetAside: parseMoney(setAsideText) ?? 0,
      note: note.trim(),
      ...(usdCents ? { foreignAmount: usdCents, foreignCurrency: 'USD' } : {}),
    }
    if (editing) await updateIncome(editing.id, draft)
    else await addIncome(draft)
    close()
  }

  const remove = async () => {
    if (!editing) return
    const undo = await deleteIncome(editing.id)
    close()
    toast(t.common.deleted, { label: t.common.undo, onClick: () => void undo() })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && close()}
      title={editing ? t.income.edit : t.income.add}
      onSave={() => void save()}
      saveDisabled={nzdCents === undefined || !dateOk}
    >
      <HeroMoneyInput label={t.income.nzdReceived} value={nzd} onChange={setNzd} autoFocus={!editing} />

      {suggestion !== undefined && (
        <p className="-mt-3 text-center text-[15px] font-medium text-accent">
          {suggestion > 0 ? t.income.suggestion(money(suggestion)) : t.income.noSuggestion}
        </p>
      )}

      <Group footer={!dateOk ? <span className="text-red">{t.common.unsupportedYear}</span> : undefined}>
        <Field label={t.income.taxSetAside}>
          <MoneyInput value={setAsideText} onChange={setSetAside} />
        </Field>
        <Field label={t.common.date}>
          <TextInput type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
        </Field>
        <Field label={t.income.source}>
          <TextInput value={source} onChange={(e) => setSource(e.target.value)} />
        </Field>
      </Group>

      {showMore ? (
        <Group>
          <Field label={t.income.foreignAmount}>
            <MoneyInput value={usd} onChange={setUsd} placeholder={t.common.optional} />
          </Field>
          <Field
            label={
              <>
                {t.income.platformFees}
                <InfoTip>{t.income.platformFeesInfo}</InfoTip>
              </>
            }
          >
            <MoneyInput value={fees} onChange={setFees} />
          </Field>
          <Field label={t.common.note}>
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.common.optional} />
          </Field>
        </Group>
      ) : (
        <button type="button" className="w-full text-center text-[15px] text-accent active:opacity-50" onClick={() => setShowMore(true)}>
          {t.common.moreOptions}
        </button>
      )}

      {editing && (
        <Group>
          <Row label={t.common.delete} tone="red" onClick={() => void remove()} />
        </Group>
      )}
    </Sheet>
  )
}
