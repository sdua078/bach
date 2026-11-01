import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  addExpense,
  addIncome,
  clearAll,
  defaultBusinessUse,
  deleteIncome,
  exportBackup,
  getSettings,
  InvalidBackupError,
  listExpenses,
  listIncomes,
  parseBackup,
  restoreBackup,
  UnsupportedTaxYearError,
  updateIncome,
} from './repo'

const incomeDraft = (date = '2026-06-01') => ({
  date,
  source: 'Mercor',
  nzdReceived: 100_000,
  platformFees: 0,
  taxSetAside: 35_000,
  note: '',
})

const expenseDraft = {
  date: '2026-06-02',
  item: 'Notion',
  category: 'software' as const,
  amount: 2_000,
  businessUse: 0.8,
  note: '',
}

beforeEach(clearAll)

describe('incomes', () => {
  it('assigns tax year from date and lists newest first', async () => {
    await addIncome(incomeDraft('2026-05-01'))
    await addIncome(incomeDraft('2026-09-01'))
    const list = await listIncomes('2026-27')
    expect(list.map((i) => i.date)).toEqual(['2026-09-01', '2026-05-01'])
    expect(list[0]!.taxYear).toBe('2026-27')
  })

  it('rejects dates outside supported tax years', async () => {
    await expect(addIncome(incomeDraft('2026-03-31'))).rejects.toBeInstanceOf(UnsupportedTaxYearError)
    await expect(addIncome(incomeDraft('2027-04-01'))).rejects.toBeInstanceOf(UnsupportedTaxYearError)
    expect(await listIncomes('2026-27')).toHaveLength(0)
  })

  it('update keeps tax year in sync and rejects unsupported dates', async () => {
    const { id } = await addIncome(incomeDraft())
    await updateIncome(id, { ...incomeDraft(), nzdReceived: 5 })
    expect((await listIncomes('2026-27'))[0]!.nzdReceived).toBe(5)
    await expect(updateIncome(id, incomeDraft('2020-01-01'))).rejects.toBeInstanceOf(UnsupportedTaxYearError)
  })

  it('delete returns an undo that restores the record', async () => {
    const { id } = await addIncome(incomeDraft())
    const undo = await deleteIncome(id)
    expect(await listIncomes('2026-27')).toHaveLength(0)
    await undo()
    expect((await listIncomes('2026-27'))[0]!.id).toBe(id)
  })

  it('remembers last source and counts records since export', async () => {
    await addIncome({ ...incomeDraft(), source: 'Other client' })
    const s = await getSettings()
    expect(s.lastIncomeSource).toBe('Other client')
    expect(s.recordsSinceExport).toBe(1)
  })
})

describe('expenses', () => {
  it('remembers business use per category', async () => {
    expect(defaultBusinessUse(await getSettings(), 'phone')).toBe(0.3)
    await addExpense({ ...expenseDraft, category: 'phone', businessUse: 0.45 })
    expect(defaultBusinessUse(await getSettings(), 'phone')).toBe(0.45)
    expect(defaultBusinessUse(await getSettings(), 'software')).toBe(1)
  })

  it('lists by tax year', async () => {
    await addExpense(expenseDraft)
    expect(await listExpenses('2026-27')).toHaveLength(1)
    expect(await listExpenses('2027-28')).toHaveLength(0)
  })
})

describe('backup', () => {
  it('round-trips through JSON and resets the export counter', async () => {
    await addIncome(incomeDraft())
    await addExpense(expenseDraft)
    const backup = await exportBackup(new Date('2026-11-02T00:00:00Z'))
    expect(backup.formatVersion).toBe(1)
    expect((await getSettings()).recordsSinceExport).toBe(0)
    expect((await getSettings()).lastExportAt).toBe('2026-11-02T00:00:00.000Z')

    const text = JSON.stringify(backup)
    await clearAll()
    await addIncome(incomeDraft('2026-12-01')) // replaced, not merged
    await restoreBackup(parseBackup(JSON.parse(text)))

    const incomes = await listIncomes('2026-27')
    expect(incomes).toHaveLength(1)
    expect(incomes[0]!.date).toBe('2026-06-01')
    expect(await listExpenses('2026-27')).toHaveLength(1)
  })

  it('rejects files that are not a Bach backup', () => {
    expect(() => parseBackup({ hello: 'world' })).toThrow(InvalidBackupError)
    expect(() => parseBackup({ app: 'bach', formatVersion: 99, exportedAt: '', data: {} })).toThrow(
      InvalidBackupError,
    )
  })
})
