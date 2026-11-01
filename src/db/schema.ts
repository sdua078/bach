import { z } from 'zod/mini'

const isoDate = z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/))
const cents = z.int()
const amount = z.int().check(z.nonnegative())
const fraction = z.number().check(z.minimum(0), z.maximum(1))
const nonneg = z.number().check(z.nonnegative())

export const EXPENSE_CATEGORIES = [
  'equipment',
  'software',
  'internet',
  'phone',
  'supplies',
  'training',
  'accounting',
  'fees',
  'acc',
  'other',
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

/** First-time business-use share per category; afterwards the last value used is remembered. */
export const DEFAULT_BUSINESS_USE: Record<ExpenseCategory, number> = {
  equipment: 1,
  software: 1,
  internet: 0.5,
  phone: 0.3,
  supplies: 1,
  training: 1,
  accounting: 1,
  fees: 1,
  acc: 1,
  other: 1,
}

export const incomeSchema = z.object({
  id: z.string(),
  taxYear: z.string(),
  date: isoDate,
  source: z.string(),
  foreignAmount: z.optional(cents),
  foreignCurrency: z.optional(z.string()),
  nzdReceived: amount,
  platformFees: amount,
  taxSetAside: amount,
  note: z.string(),
})
export type Income = z.infer<typeof incomeSchema>

export const expenseSchema = z.object({
  id: z.string(),
  taxYear: z.string(),
  date: isoDate,
  item: z.string(),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: amount,
  businessUse: fraction,
  receiptId: z.optional(z.string()),
  note: z.string(),
})
export type Expense = z.infer<typeof expenseSchema>

export const homeOfficeSchema = z.object({
  taxYear: z.string(),
  weeklyRent: amount,
  weeksWorked: z.number().check(z.minimum(0), z.maximum(52)),
  totalArea: nonneg,
  workspaceArea: nonneg,
  businessTimeShare: fraction,
  utilitiesTotal: amount,
  internetTotal: amount,
  internetBusinessShare: fraction,
  rentShareBorne: fraction,
})
export type HomeOffice = z.infer<typeof homeOfficeSchema>

export const assetSchema = z.object({
  id: z.string(),
  purchaseDate: isoDate,
  item: z.string(),
  cost: amount,
  dvRate: fraction,
  businessUse: fraction,
  note: z.string(),
})
export type Asset = z.infer<typeof assetSchema>

export const taxYearSchema = z.object({
  id: z.string(),
  estimatedSalary: amount,
  /** Actual PAYE withheld, from myIR. Overrides the estimate when set. */
  payeWithheld: z.optional(amount),
  /** ACC work levy rate from the user's own invoice. Overrides the rules default when set. */
  workLevyRate: z.optional(fraction),
})
export type TaxYear = z.infer<typeof taxYearSchema>

export const settingsSchema = z.object({
  id: z.literal('app'),
  /** Undefined = follow the system language. */
  locale: z.optional(z.enum(['en', 'zh'])),
  disclaimerAccepted: z.boolean(),
  onboarded: z.boolean(),
  lastExportAt: z.optional(z.string()),
  recordsSinceExport: amount,
  lastIncomeSource: z.string(),
  lastBusinessUse: z.partialRecord(z.enum(EXPENSE_CATEGORIES), fraction),
})
export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  disclaimerAccepted: false,
  onboarded: false,
  recordsSinceExport: 0,
  lastIncomeSource: 'Mercor',
  lastBusinessUse: {},
}

export const BACKUP_FORMAT_VERSION = 1

export const backupSchema = z.object({
  app: z.literal('bach'),
  formatVersion: z.literal(BACKUP_FORMAT_VERSION),
  exportedAt: z.string(),
  data: z.object({
    incomes: z.array(incomeSchema),
    expenses: z.array(expenseSchema),
    homeOffice: z.array(homeOfficeSchema),
    assets: z.array(assetSchema),
    taxYears: z.array(taxYearSchema),
    settings: z.array(settingsSchema),
  }),
})
export type Backup = z.infer<typeof backupSchema>
