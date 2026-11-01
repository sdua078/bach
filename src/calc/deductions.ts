import type { TaxRules } from '../tax-rules'
import { clamp, mulRate, sum } from './money'
import type { AssetInput, Cents, ExpenseInput, HomeOfficeInput, IncomeInput } from './types'

/** Income to declare = NZD received + platform fees taken before payout. */
export function sideIncomeTotal(incomes: readonly IncomeInput[]): Cents {
  return sum(incomes.map((i) => i.nzdReceived + i.platformFees))
}

export function setAsideTotal(incomes: readonly IncomeInput[]): Cents {
  return sum(incomes.map((i) => i.taxSetAside))
}

/** Σ amount × business-use share, rounded per item. */
export function deductibleExpenses(expenses: readonly ExpenseInput[]): Cents {
  return sum(expenses.map((e) => mulRate(e.amount, clamp(e.businessUse, 0, 1))))
}

export interface HomeOfficeBreakdown {
  rent: Cents
  /** Rent before the cap at the person's own share. */
  rentUncapped: Cents
  rentCapped: boolean
  utilities: Cents
  internet: Cents
  total: Cents
  areaShare: number
  weekShare: number
}

const WEEKS_PER_YEAR = 52

export function homeOfficeDeduction(h: HomeOfficeInput): HomeOfficeBreakdown {
  const weeks = clamp(h.weeksWorked, 0, WEEKS_PER_YEAR)
  const weekShare = weeks / WEEKS_PER_YEAR
  const areaShare = h.totalArea > 0 ? clamp(h.workspaceArea / h.totalArea, 0, 1) : 0
  const timeShare = clamp(h.businessTimeShare, 0, 1)

  const rentForWeeks = h.weeklyRent * weeks
  const rentUncapped = mulRate(rentForWeeks, areaShare * timeShare)
  const rentCap = mulRate(rentForWeeks, clamp(h.rentShareBorne, 0, 1))
  const rent = Math.min(rentUncapped, rentCap)

  const utilities = mulRate(h.utilitiesTotal, weekShare * areaShare * timeShare)
  const internet = mulRate(h.internetTotal, weekShare * clamp(h.internetBusinessShare, 0, 1))

  return {
    rent,
    rentUncapped,
    rentCapped: rent < rentUncapped,
    utilities,
    internet,
    total: rent + utilities + internet,
    areaShare,
    weekShare,
  }
}

/** Months the asset is held in its first tax year; the purchase month counts as a full month. */
function monthsInFirstYear(purchaseMonth: number): number {
  return purchaseMonth >= 4 ? 16 - purchaseMonth : 4 - purchaseMonth
}

function taxYearStartYear(isoDate: string): number {
  const year = Number(isoDate.slice(0, 4))
  return Number(isoDate.slice(5, 7)) >= 4 ? year : year - 1
}

/**
 * Deduction for one asset in the tax year starting 1 April `yearStart`.
 * Below the low-value threshold: written off in full in the purchase year.
 * Otherwise diminishing value (DV), first year pro-rated by months held.
 * Only the business-use share is deductible; book value falls by the full depreciation.
 */
export function assetDeduction(asset: AssetInput, yearStart: number, rules: TaxRules): Cents {
  const purchaseYear = taxYearStartYear(asset.purchaseDate)
  if (yearStart < purchaseYear) return 0
  const use = clamp(asset.businessUse, 0, 1)

  if (asset.cost < rules.lowValueAssetThresholdCents) {
    return yearStart === purchaseYear ? mulRate(asset.cost, use) : 0
  }

  let bookValue = asset.cost
  let depreciation = 0
  for (let y = purchaseYear; y <= yearStart; y++) {
    const months = y === purchaseYear ? monthsInFirstYear(Number(asset.purchaseDate.slice(5, 7))) : 12
    depreciation = mulRate(bookValue, (asset.dvRate * months) / 12)
    bookValue -= depreciation
  }
  return mulRate(depreciation, use)
}

export function assetDepreciation(assets: readonly AssetInput[], yearStart: number, rules: TaxRules): Cents {
  return sum(assets.map((a) => assetDeduction(a, yearStart, rules)))
}
