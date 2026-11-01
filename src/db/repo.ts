import { taxYearOf, rulesForDate } from '../tax-rules'
import { db } from './db'
import {
  BACKUP_FORMAT_VERSION,
  backupSchema,
  DEFAULT_BUSINESS_USE,
  DEFAULT_SETTINGS,
  type Backup,
  type Expense,
  type ExpenseCategory,
  type HomeOffice,
  type Income,
  type Settings,
  type TaxYear,
} from './schema'

export class UnsupportedTaxYearError extends Error {
  readonly date: string
  constructor(date: string) {
    super(`No tax rules for the tax year containing ${date}`)
    this.date = date
    this.name = 'UnsupportedTaxYearError'
  }
}

function assertSupported(date: string): string {
  if (!rulesForDate(date)) throw new UnsupportedTaxYearError(date)
  return taxYearOf(date)
}

const newId = () => crypto.randomUUID()

// ---------- settings ----------

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('app')) ?? DEFAULT_SETTINGS
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = await getSettings()
    await db.settings.put({ ...current, ...patch })
  })
}

async function bumpRecordsSinceExport(patch: Partial<Omit<Settings, 'id'>> = {}): Promise<void> {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch, recordsSinceExport: current.recordsSinceExport + 1 })
}

export function defaultBusinessUse(settings: Settings, category: ExpenseCategory): number {
  return settings.lastBusinessUse[category] ?? DEFAULT_BUSINESS_USE[category]
}

// ---------- tax year ----------

export async function getTaxYear(id: string): Promise<TaxYear> {
  return (await db.taxYears.get(id)) ?? { id, estimatedSalary: 0 }
}

export async function saveTaxYear(taxYear: TaxYear): Promise<void> {
  await db.taxYears.put(taxYear)
}

// ---------- incomes ----------

export type IncomeDraft = Omit<Income, 'id' | 'taxYear'>

export async function listIncomes(taxYear: string): Promise<Income[]> {
  return (await db.incomes.where('taxYear').equals(taxYear).sortBy('date')).reverse()
}

export async function addIncome(draft: IncomeDraft): Promise<Income> {
  const income: Income = { ...draft, id: newId(), taxYear: assertSupported(draft.date) }
  await db.transaction('rw', db.incomes, db.settings, async () => {
    await db.incomes.add(income)
    await bumpRecordsSinceExport({ lastIncomeSource: income.source })
  })
  return income
}

export async function updateIncome(id: string, draft: IncomeDraft): Promise<void> {
  await db.incomes.put({ ...draft, id, taxYear: assertSupported(draft.date) })
}

/** Deletes and returns an undo function that restores the record. */
export async function deleteIncome(id: string): Promise<() => Promise<void>> {
  const existing = await db.incomes.get(id)
  await db.incomes.delete(id)
  return async () => {
    if (existing) await db.incomes.put(existing)
  }
}

// ---------- expenses ----------

export type ExpenseDraft = Omit<Expense, 'id' | 'taxYear'>

export async function listExpenses(taxYear: string): Promise<Expense[]> {
  return (await db.expenses.where('taxYear').equals(taxYear).sortBy('date')).reverse()
}

export async function addExpense(draft: ExpenseDraft): Promise<Expense> {
  const expense: Expense = { ...draft, id: newId(), taxYear: assertSupported(draft.date) }
  await db.transaction('rw', db.expenses, db.settings, async () => {
    await db.expenses.add(expense)
    const current = await getSettings()
    await bumpRecordsSinceExport({
      lastBusinessUse: { ...current.lastBusinessUse, [expense.category]: expense.businessUse },
    })
  })
  return expense
}

export async function updateExpense(id: string, draft: ExpenseDraft): Promise<void> {
  await db.expenses.put({ ...draft, id, taxYear: assertSupported(draft.date) })
}

export async function deleteExpense(id: string): Promise<() => Promise<void>> {
  const existing = await db.expenses.get(id)
  await db.expenses.delete(id)
  return async () => {
    if (existing) await db.expenses.put(existing)
  }
}

// ---------- home office & assets ----------

export async function getHomeOffice(taxYear: string): Promise<HomeOffice | undefined> {
  return db.homeOffice.get(taxYear)
}

export async function saveHomeOffice(homeOffice: HomeOffice): Promise<void> {
  await db.homeOffice.put(homeOffice)
}

export async function listAssets() {
  return db.assets.orderBy('purchaseDate').toArray()
}

// ---------- backup ----------

/** Snapshot of all data. Does not mark it as exported: call markExported() once the file is saved. */
export async function exportBackup(now: Date = new Date()): Promise<Backup> {
  const exportedAt = now.toISOString()
  return db.transaction('r', db.tables, async () => ({
    app: 'bach' as const,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt,
    data: {
      incomes: await db.incomes.toArray(),
      expenses: await db.expenses.toArray(),
      homeOffice: await db.homeOffice.toArray(),
      assets: await db.assets.toArray(),
      taxYears: await db.taxYears.toArray(),
      // Stored as already-exported so a restore does not immediately nag for a backup.
      settings: [{ ...(await getSettings()), lastExportAt: exportedAt, recordsSinceExport: 0 }],
    },
  }))
}

export async function markExported(backup: Backup): Promise<void> {
  await updateSettings({ lastExportAt: backup.exportedAt, recordsSinceExport: 0 })
}

export async function hasAnyRecords(): Promise<boolean> {
  const counts = await Promise.all([db.incomes.count(), db.expenses.count(), db.homeOffice.count()])
  return counts.some((c) => c > 0)
}

export class InvalidBackupError extends Error {
  readonly issues: string
  constructor(issues: string) {
    super(`Invalid backup file: ${issues}`)
    this.issues = issues
    this.name = 'InvalidBackupError'
  }
}

/** Validates without touching the database. */
export function parseBackup(json: unknown): Backup {
  const result = backupSchema.safeParse(json)
  if (!result.success) throw new InvalidBackupError(result.error.message)
  return result.data
}

/** Replaces everything with the backup's contents, atomically. */
export async function restoreBackup(backup: Backup): Promise<void> {
  const { data } = backup
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    await db.incomes.bulkAdd(data.incomes)
    await db.expenses.bulkAdd(data.expenses)
    await db.homeOffice.bulkAdd(data.homeOffice)
    await db.assets.bulkAdd(data.assets)
    await db.taxYears.bulkAdd(data.taxYears)
    await db.settings.bulkAdd(data.settings)
  })
}

export async function clearAll(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
}
