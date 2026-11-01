import { Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { mulRate } from '../calc'
import { AddButton } from '../components/TabBar'
import { centsToInput, Field, HeroMoneyInput, parseMoney, PercentSlider, Sheet, TextInput } from '../components/form'
import { useToast } from '../components/toast'
import { CellInput, CellSelect, QuickRow, Table, Td, Th, Tr } from '../components/table'
import { Button, Footnote, Group, Page, Row } from '../components/ui'
import { useExpenses, useSettings } from '../db/hooks'
import { addExpense, defaultBusinessUse, deleteExpense, updateExpense } from '../db/repo'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory } from '../db/schema'
import { useI18n } from '../i18n'
import { currentTaxYear, defaultEntryDate } from '../lib/taxYear'
import { useIsDesktop } from '../lib/useIsDesktop'
import { rulesForDate } from '../tax-rules'

export function ExpensesPage() {
  const { t } = useI18n()
  const taxYear = currentTaxYear()
  const expenses = useExpenses(taxYear)
  const desktop = useIsDesktop()
  const [sheet, setSheet] = useState<{ editing: Expense | null; key: number } | null>(null)
  const open = (editing: Expense | null) => setSheet({ editing, key: Date.now() })

  return (
    <Page
      title={t.expenses.title}
      subtitle={t.common.taxYear(taxYear)}
      wide
      actions={
        <Button onClick={() => open(null)}>
          <Plus className="size-4" strokeWidth={2} />
          {t.expenses.add}
        </Button>
      }
    >
      {desktop ? (
        <ExpenseTable taxYear={taxYear} expenses={expenses} onEdit={open} />
      ) : (
        <ExpenseList expenses={expenses} onEdit={open} />
      )}
      {!desktop && <AddButton label={t.expenses.add} onClick={() => open(null)} />}
      {sheet && <ExpenseSheet key={sheet.key} taxYear={taxYear} editing={sheet.editing} onClose={() => setSheet(null)} />}
    </Page>
  )
}

function ExpenseList({ expenses, onEdit }: { expenses: Expense[]; onEdit: (e: Expense) => void }) {
  const { t, money, date, percent } = useI18n()
  if (expenses.length === 0) return <Footnote>{t.expenses.empty}</Footnote>
  return (
    <Group>
      {expenses.map((e) => (
        <Row
          key={e.id}
          label={e.item || t.expenses.categories[e.category]}
          sub={`${date(e.date)} · ${t.expenses.categories[e.category]}${e.businessUse < 1 ? ` · ${percent(e.businessUse)}` : ''}`}
          detail={<span className="text-label">{money(mulRate(e.amount, e.businessUse))}</span>}
          onClick={() => onEdit(e)}
        />
      ))}
    </Group>
  )
}

function ExpenseTable({ taxYear, expenses, onEdit }: { taxYear: string; expenses: Expense[]; onEdit: (e: Expense) => void }) {
  const { t, money, date, percent } = useI18n()
  const settings = useSettings()
  const itemRef = useRef<HTMLInputElement>(null)

  const [entryDate, setEntryDate] = useState(defaultEntryDate(taxYear))
  const [item, setItem] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('software')
  const [amount, setAmount] = useState('')
  // Follows the remembered share for the chosen category until typed over.
  const [usePct, setUsePct] = useState<string | null>(null)

  const amountCents = parseMoney(amount)
  const use = usePct === null ? defaultBusinessUse(settings, category) : Math.min(100, Number(usePct) || 0) / 100
  const dateOk = Boolean(rulesForDate(entryDate))
  const valid = amountCents !== undefined && item.trim() !== '' && dateOk

  const submit = async () => {
    if (!valid) return
    await addExpense({ date: entryDate, item: item.trim(), category, amount: amountCents, businessUse: use, note: '' })
    setItem('')
    setAmount('')
    setUsePct(null)
    itemRef.current?.focus()
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
              <Th>{t.expenses.item}</Th>
              <Th className="w-[200px]">{t.expenses.category}</Th>
              <Th right className="w-[130px]">{t.expenses.amount}</Th>
              <Th right className="w-[100px]">{t.expenses.businessUseShort}</Th>
              <Th right className="w-[130px]">{t.expenses.deductibleCol}</Th>
              <Th className="w-[96px]" />
            </>
          }
          foot={
            expenses.length > 0 && (
              <>
                <Td colSpan={3}>{t.common.total}</Td>
                <Td right>{money(expenses.reduce((a, e) => a + e.amount, 0))}</Td>
                <Td />
                <Td right>{money(expenses.reduce((a, e) => a + mulRate(e.amount, e.businessUse), 0))}</Td>
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
              <CellInput ref={itemRef} autoFocus value={item} placeholder={t.expenses.itemPlaceholder} onChange={(e) => setItem(e.target.value)} />
            </td>
            <td className="px-2 py-2">
              <CellSelect value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t.expenses.categories[c]}
                  </option>
                ))}
              </CellSelect>
            </td>
            <td className="px-2 py-2">
              <CellInput
                inputMode="decimal"
                placeholder="$0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
                className="num text-right"
              />
            </td>
            <td className="px-2 py-2">
              <div className="relative">
                <CellInput
                  inputMode="numeric"
                  value={usePct ?? String(Math.round(use * 100))}
                  onChange={(e) => setUsePct(e.target.value.replace(/[^\d]/g, ''))}
                  className="num pr-6 text-right"
                />
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[14px] text-label-2">%</span>
              </div>
            </td>
            <td className="num px-4 py-2 text-right text-label-2">{amountCents !== undefined ? money(mulRate(amountCents, use)) : '—'}</td>
            <td className="py-2 pr-3 pl-2 text-right">
              <Button type="submit" variant="primary" disabled={!valid}>
                {t.common.add} ↵
              </Button>
            </td>
          </QuickRow>
          {expenses.map((e) => (
            <Tr key={e.id} onClick={() => onEdit(e)}>
              <Td muted>{date(e.date)}</Td>
              <Td>{e.item}</Td>
              <Td muted>{t.expenses.categories[e.category]}</Td>
              <Td right>{money(e.amount)}</Td>
              <Td right muted>{percent(e.businessUse)}</Td>
              <Td right>{money(mulRate(e.amount, e.businessUse))}</Td>
              <Td />
            </Tr>
          ))}
        </Table>
      </form>
      <p className="px-1 text-[12px] text-label-2">
        {!dateOk ? <span className="text-red">{t.common.unsupportedYear}</span> : t.expenses.quickHint}
      </p>
      <p className="px-1 text-[12px] text-label-2">{t.expenses.businessUseInfo}</p>
    </div>
  )
}

function ExpenseSheet({ taxYear, editing, onClose }: { taxYear: string; editing: Expense | null; onClose: () => void }) {
  const { t, money } = useI18n()
  const toast = useToast()
  const settings = useSettings()
  const [open, setOpen] = useState(true)
  const close = () => {
    setOpen(false)
    setTimeout(onClose, 300)
  }

  const [amount, setAmount] = useState(centsToInput(editing?.amount))
  const [item, setItem] = useState(editing?.item ?? '')
  const [category, setCategory] = useState<ExpenseCategory>(editing?.category ?? 'software')
  const [businessUse, setBusinessUse] = useState<number | null>(editing?.businessUse ?? null)
  const [entryDate, setEntryDate] = useState(editing?.date ?? defaultEntryDate(taxYear))
  const [note, setNote] = useState(editing?.note ?? '')

  // Follows the remembered share for the chosen category until the user moves the slider.
  const use = businessUse ?? defaultBusinessUse(settings, category)
  const amountCents = parseMoney(amount)
  const dateOk = Boolean(rulesForDate(entryDate))
  const valid = amountCents !== undefined && item.trim() !== '' && dateOk

  const save = async () => {
    if (!valid) return
    const draft = { date: entryDate, item: item.trim(), category, amount: amountCents, businessUse: use, note: note.trim() }
    if (editing) await updateExpense(editing.id, draft)
    else await addExpense(draft)
    close()
  }

  const remove = async () => {
    if (!editing) return
    const undo = await deleteExpense(editing.id)
    close()
    toast(t.common.deleted, { label: t.common.undo, onClick: () => void undo() })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && close()}
      title={editing ? t.expenses.edit : t.expenses.add}
      onSave={() => void save()}
      saveDisabled={!valid}
    >
      <HeroMoneyInput label={t.expenses.amount} value={amount} onChange={setAmount} autoFocus={!editing} />
      {amountCents !== undefined && (
        <p className="-mt-3 text-center text-[15px] font-medium text-accent">
          {t.expenses.deductible(money(mulRate(amountCents, use)))}
        </p>
      )}

      <Group>
        <Field label={t.expenses.item}>
          <TextInput value={item} onChange={(e) => setItem(e.target.value)} placeholder={t.expenses.itemPlaceholder} />
        </Field>
        <Field label={t.expenses.category}>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="max-w-[60vw] appearance-none truncate bg-transparent text-right text-[17px] text-label-2 outline-none"
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t.expenses.categories[c]}
              </option>
            ))}
          </select>
        </Field>
      </Group>

      <Group footer={t.expenses.businessUseInfo}>
        <PercentSlider label={t.expenses.businessUse} value={use} onChange={setBusinessUse} />
      </Group>

      <Group footer={!dateOk ? <span className="text-red">{t.common.unsupportedYear}</span> : undefined}>
        <Field label={t.common.date}>
          <TextInput type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
        </Field>
        <Field label={t.common.note}>
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.common.optional} />
        </Field>
      </Group>

      {editing && (
        <Group>
          <Row label={t.common.delete} tone="red" onClick={() => void remove()} />
        </Group>
      )}
    </Sheet>
  )
}
