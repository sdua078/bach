import { Plus } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { suggestSetAside } from '../calc'
import { AddButton } from '../components/TabBar'
import { centsToInput, Field, HeroMoneyInput, MoneyInput, parseMoney, Sheet, TextInput } from '../components/form'
import { useToast } from '../components/toast'
import { CellInput, QuickRow, Table, Td, Th, Tr } from '../components/table'
import { Button, Footnote, Group, InfoTip, Page, Row } from '../components/ui'
import { useIncomes, useSettings, useSummaryInput } from '../db/hooks'
import { addIncome, deleteIncome, updateIncome } from '../db/repo'
import type { Income } from '../db/schema'
import { useI18n } from '../i18n'
import { currentTaxYear, defaultEntryDate } from '../lib/taxYear'
import { useIsDesktop } from '../lib/useIsDesktop'
import { rulesForDate } from '../tax-rules'

export function IncomePage() {
  const { t } = useI18n()
  const taxYear = currentTaxYear()
  const incomes = useIncomes(taxYear)
  const desktop = useIsDesktop()
  const [sheet, setSheet] = useState<{ editing: Income | null; key: number } | null>(null)
  const open = (editing: Income | null) => setSheet({ editing, key: Date.now() })

  return (
    <Page
      title={t.income.title}
      subtitle={t.common.taxYear(taxYear)}
      wide
      actions={
        <Button onClick={() => open(null)}>
          <Plus className="size-4" strokeWidth={2} />
          {t.income.add}
        </Button>
      }
    >
      {desktop ? (
        <IncomeTable taxYear={taxYear} incomes={incomes} onEdit={open} />
      ) : (
        <IncomeList incomes={incomes} onEdit={open} />
      )}
      {!desktop && <AddButton label={t.income.add} onClick={() => open(null)} />}
      {sheet && <IncomeSheet key={sheet.key} taxYear={taxYear} editing={sheet.editing} onClose={() => setSheet(null)} />}
    </Page>
  )
}

function IncomeList({ incomes, onEdit }: { incomes: Income[]; onEdit: (i: Income) => void }) {
  const { t, money, date } = useI18n()
  if (incomes.length === 0) return <Footnote>{t.income.empty}</Footnote>
  return (
    <Group>
      {incomes.map((i) => (
        <Row
          key={i.id}
          label={i.source || '—'}
          sub={`${date(i.date)}${i.taxSetAside ? ` · ${t.income.setAsideShort(money(i.taxSetAside))}` : ''}`}
          detail={<span className="text-label">{money(i.nzdReceived + i.platformFees)}</span>}
          onClick={() => onEdit(i)}
        />
      ))}
    </Group>
  )
}

function IncomeTable({ taxYear, incomes, onEdit }: { taxYear: string; incomes: Income[]; onEdit: (i: Income) => void }) {
  const { t, money, date } = useI18n()
  const settings = useSettings()
  const summaryInput = useSummaryInput(taxYear)
  const amountRef = useRef<HTMLInputElement>(null)

  const [entryDate, setEntryDate] = useState(defaultEntryDate(taxYear))
  const [source, setSource] = useState<string | null>(null)
  const [nzd, setNzd] = useState('')
  const [setAside, setSetAside] = useState('')

  const nzdCents = parseMoney(nzd)
  const dateOk = Boolean(rulesForDate(entryDate))
  const suggestion =
    summaryInput && nzdCents !== undefined
      ? suggestSetAside(summaryInput, { date: entryDate, nzdReceived: nzdCents, platformFees: 0 })
      : undefined

  const submit = async () => {
    if (nzdCents === undefined || !dateOk) return
    await addIncome({
      date: entryDate,
      source: (source ?? settings.lastIncomeSource).trim(),
      nzdReceived: nzdCents,
      platformFees: 0,
      taxSetAside: parseMoney(setAside) ?? suggestion ?? 0,
      note: '',
    })
    // Keep date and source: batch entry from a statement usually repeats them.
    setNzd('')
    setSetAside('')
    amountRef.current?.focus()
  }

  return (
    <div className="space-y-2">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <Table
          head={
            <>
              <Th className="w-[150px]">{t.common.date}</Th>
              <Th>{t.income.source}</Th>
              <Th right className="w-[170px]">{t.income.nzdReceived}</Th>
              <Th right className="w-[170px]">{t.income.taxSetAsideShort}</Th>
              <Th className="w-[96px]" />
            </>
          }
          foot={
            incomes.length > 0 && (
              <>
                <Td colSpan={2}>{t.common.total}</Td>
                <Td right>{money(sumOf(incomes, (i) => i.nzdReceived + i.platformFees))}</Td>
                <Td right>{money(sumOf(incomes, (i) => i.taxSetAside))}</Td>
                <Td />
              </>
            )
          }
        >
          <QuickRow>
            <td className="py-2 pr-2 pl-3">
              <CellInput type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
            </td>
            <td className="px-2 py-2">
              <CellInput value={source ?? settings.lastIncomeSource} onChange={(e) => setSource(e.target.value)} />
            </td>
            <td className="px-2 py-2">
              <CellInput
                ref={amountRef}
                autoFocus
                inputMode="decimal"
                placeholder="$0.00"
                value={nzd}
                onChange={(e) => setNzd(e.target.value.replace(/[^\d.,]/g, ''))}
                className="num text-right"
              />
            </td>
            <td className="px-2 py-2">
              <CellInput
                inputMode="decimal"
                placeholder={suggestion !== undefined ? t.income.suggestedShort(money(suggestion)) : '—'}
                value={setAside}
                onChange={(e) => setSetAside(e.target.value.replace(/[^\d.,]/g, ''))}
                className="num text-right"
              />
            </td>
            <td className="py-2 pr-3 pl-2 text-right">
              <Button type="submit" variant="primary" disabled={nzdCents === undefined || !dateOk}>
                {t.common.add} ↵
              </Button>
            </td>
          </QuickRow>
          {incomes.map((i) => (
            <Tr key={i.id} onClick={() => onEdit(i)}>
              <Td muted>{date(i.date)}</Td>
              <Td>
                {i.source || '—'}
                {i.note && <span className="ml-2 text-label-2">{i.note}</span>}
              </Td>
              <Td right>{money(i.nzdReceived + i.platformFees)}</Td>
              <Td right muted>{money(i.taxSetAside)}</Td>
              <Td />
            </Tr>
          ))}
        </Table>
      </form>
      <p className="px-1 text-[12px] text-label-2">
        {!dateOk ? <span className="text-red">{t.common.unsupportedYear}</span> : suggestion !== undefined && suggestion > 0 ? (
          <span className="font-medium text-accent">{t.income.suggestion(money(suggestion))}</span>
        ) : (
          t.income.quickHint
        )}
      </p>
    </div>
  )
}

function sumOf<T>(items: readonly T[], f: (x: T) => number): number {
  return items.reduce((a, x) => a + f(x), 0)
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

      {!editing && suggestion !== undefined && (
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
