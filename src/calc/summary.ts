import type { TaxRules } from '../tax-rules'
import { accEstimate, type AccEstimate } from './acc'
import {
  assetDepreciation,
  deductibleExpenses,
  homeOfficeDeduction,
  type HomeOfficeBreakdown,
  setAsideTotal,
  sideIncomeTotal,
} from './deductions'
import { incomeTax, marginalRate } from './incomeTax'
import { mulRate } from './money'
import type { AssetInput, Cents, ExpenseInput, HomeOfficeInput, IncomeInput } from './types'

export interface SummaryInput {
  rules: TaxRules
  salary: Cents
  /** Actual PAYE withheld (from myIR). When absent, estimated as income tax on salary. */
  payeWithheld?: Cents
  workLevyRate?: number
  incomes: readonly IncomeInput[]
  expenses: readonly ExpenseInput[]
  homeOffice?: HomeOfficeInput
  assets: readonly AssetInput[]
}

export interface Summary {
  incomeTotal: Cents
  expensesDeduction: Cents
  homeOffice: HomeOfficeBreakdown | null
  assetsDeduction: Cents
  deductionsTotal: Cents
  /** May be negative: a loss offsets salary. */
  sideProfit: Cents
  paye: Cents
  payeIsEstimate: boolean
  taxOnTotal: Cents
  /** Residual income tax = tax on all income − PAYE. Negative means a likely refund. */
  extraTaxDue: Cents
  acc: AccEstimate
  toPrepare: Cents
  setAsideSoFar: Cents
  /** Positive: still to set aside. Negative: set aside more than needed. */
  shortfall: Cents
  suggestedRate: number
  marginalRate: number
  provisional: { likely: boolean; perInstalment: Cents }
}

export function computeSummary(input: SummaryInput): Summary {
  const { rules } = input
  const yearStart = Number(rules.startDate.slice(0, 4))

  const incomeTotal = sideIncomeTotal(input.incomes)
  const expensesDeduction = deductibleExpenses(input.expenses)
  const homeOffice = input.homeOffice ? homeOfficeDeduction(input.homeOffice) : null
  const assetsDeduction = assetDepreciation(input.assets, yearStart, rules)
  const deductionsTotal = expensesDeduction + (homeOffice?.total ?? 0) + assetsDeduction
  const sideProfit = incomeTotal - deductionsTotal

  const payeIsEstimate = input.payeWithheld === undefined
  const paye = input.payeWithheld ?? incomeTax(input.salary, rules)
  const taxOnTotal = incomeTax(input.salary + sideProfit, rules)
  const extraTaxDue = taxOnTotal - paye

  const acc = accEstimate(sideProfit, input.salary, rules, input.workLevyRate)
  const toPrepare = Math.max(0, extraTaxDue) + acc.amount
  const setAsideSoFar = setAsideTotal(input.incomes)

  const { ritThresholdCents, standardUplift, instalments } = rules.provisionalTax
  const likely = extraTaxDue > ritThresholdCents

  return {
    incomeTotal,
    expensesDeduction,
    homeOffice,
    assetsDeduction,
    deductionsTotal,
    sideProfit,
    paye,
    payeIsEstimate,
    taxOnTotal,
    extraTaxDue,
    acc,
    toPrepare,
    setAsideSoFar,
    shortfall: toPrepare - setAsideSoFar,
    suggestedRate: suggestedRate(toPrepare, incomeTotal, rules),
    marginalRate: marginalRate(input.salary + sideProfit, rules),
    provisional: {
      likely,
      perInstalment: likely ? Math.round(mulRate(extraTaxDue, standardUplift) / instalments) : 0,
    },
  }
}

/** toPrepare ÷ income, rounded up to the next 5%. Falls back to the rules default with no income yet. */
function suggestedRate(toPrepare: Cents, incomeTotal: Cents, rules: TaxRules): number {
  if (incomeTotal <= 0) return rules.defaultSetAsideRate
  return Math.ceil((toPrepare * 20) / incomeTotal) / 20
}

/** How much to move to the tax account for a new payment: whatever closes the year's gap once it is counted. */
export function suggestSetAside(input: SummaryInput, newIncome: Omit<IncomeInput, 'taxSetAside'>): Cents {
  const withNew = computeSummary({ ...input, incomes: [...input.incomes, { ...newIncome, taxSetAside: 0 }] })
  return Math.max(0, withNew.shortfall)
}
