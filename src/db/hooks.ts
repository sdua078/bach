import { useLiveQuery } from 'dexie-react-hooks'
import { computeSummary, type Summary, type SummaryInput } from '../calc'
import { getRules } from '../tax-rules'
import { getHomeOffice, getSettings, getTaxYear, listAssets, listExpenses, listIncomes } from './repo'
import { DEFAULT_SETTINGS } from './schema'

// Reactive reads: components re-render whenever the underlying tables change.

export function useSettings() {
  return useLiveQuery(getSettings, [], DEFAULT_SETTINGS)
}

export function useTaxYear(id: string) {
  return useLiveQuery(() => getTaxYear(id), [id])
}

export function useIncomes(taxYear: string) {
  return useLiveQuery(() => listIncomes(taxYear), [taxYear], [])
}

export function useExpenses(taxYear: string) {
  return useLiveQuery(() => listExpenses(taxYear), [taxYear], [])
}

export function useHomeOffice(taxYear: string) {
  return useLiveQuery(() => getHomeOffice(taxYear), [taxYear])
}

/** Everything the calculator needs for one tax year, read from the database. */
export async function loadSummaryInput(taxYear: string): Promise<SummaryInput | undefined> {
  const rules = getRules(taxYear)
  if (!rules) return undefined
  const [year, incomes, expenses, homeOffice, assets] = await Promise.all([
    getTaxYear(taxYear),
    listIncomes(taxYear),
    listExpenses(taxYear),
    getHomeOffice(taxYear),
    listAssets(),
  ])
  return {
    rules,
    salary: year.estimatedSalary,
    payeWithheld: year.payeWithheld,
    workLevyRate: year.workLevyRate,
    incomes,
    expenses,
    homeOffice,
    assets,
  }
}

export function useSummaryInput(taxYear: string) {
  return useLiveQuery(() => loadSummaryInput(taxYear), [taxYear])
}

export function useSummary(taxYear: string): Summary | undefined {
  const input = useSummaryInput(taxYear)
  return input ? computeSummary(input) : undefined
}
