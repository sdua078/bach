import { useState } from 'react'
import { mulRate } from '../calc'
import { AddButton } from '../components/TabBar'
import { centsToInput, Field, HeroMoneyInput, parseMoney, PercentSlider, Sheet, TextInput } from '../components/form'
import { useToast } from '../components/toast'
import { Footnote, Group, Page, Row } from '../components/ui'
import { useExpenses, useSettings } from '../db/hooks'
import { addExpense, defaultBusinessUse, deleteExpense, updateExpense } from '../db/repo'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory } from '../db/schema'
import { useI18n } from '../i18n'
import { currentTaxYear, defaultEntryDate } from '../lib/taxYear'
import { rulesForDate } from '../tax-rules'

export function ExpensesPage() {
  const { t, money, date, percent } = useI18n()
  const taxYear = currentTaxYear()
  const expenses = useExpenses(taxYear)
  const [sheet, setSheet] = useState<{ editing: Expense | null; key: number } | null>(null)

  return (
    <Page title={t.expenses.title} subtitle={t.common.taxYear(taxYear)}>
      {expenses.length === 0 ? (
        <Footnote>{t.expenses.empty}</Footnote>
      ) : (
        <Group>
          {expenses.map((e) => (
            <Row
              key={e.id}
              label={e.item || t.expenses.categories[e.category]}
              sub={`${date(e.date)} · ${t.expenses.categories[e.category]}${e.businessUse < 1 ? ` · ${percent(e.businessUse)}` : ''}`}
              detail={<span className="text-label">{money(mulRate(e.amount, e.businessUse))}</span>}
              onClick={() => setSheet({ editing: e, key: Date.now() })}
            />
          ))}
        </Group>
      )}
      <AddButton label={t.expenses.add} onClick={() => setSheet({ editing: null, key: Date.now() })} />
      {sheet && <ExpenseSheet key={sheet.key} taxYear={taxYear} editing={sheet.editing} onClose={() => setSheet(null)} />}
    </Page>
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
