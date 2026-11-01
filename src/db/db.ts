import Dexie, { type EntityTable } from 'dexie'
import type { Asset, Expense, HomeOffice, Income, Settings, TaxYear } from './schema'

export interface Receipt {
  id: string
  blob: Blob
  mimeType: string
  createdAt: string
}

/** Only src/db/ may import this. Everything else goes through repo.ts. */
export class BachDB extends Dexie {
  incomes!: EntityTable<Income, 'id'>
  expenses!: EntityTable<Expense, 'id'>
  receipts!: EntityTable<Receipt, 'id'>
  homeOffice!: EntityTable<HomeOffice, 'taxYear'>
  assets!: EntityTable<Asset, 'id'>
  taxYears!: EntityTable<TaxYear, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor(name = 'bach') {
    super(name)
    // Schema changes: add version(2) with an upgrade(), never edit version(1).
    this.version(1).stores({
      incomes: 'id, taxYear, date',
      expenses: 'id, taxYear, date, category',
      receipts: 'id',
      homeOffice: 'taxYear',
      assets: 'id, purchaseDate',
      taxYears: 'id',
      settings: 'id',
    })
  }
}

export const db = new BachDB()
