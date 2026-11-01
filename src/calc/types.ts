/** Money is always integer cents. */
export type Cents = number

/** 0..1 */
export type Fraction = number

export interface IncomeInput {
  date: string
  nzdReceived: Cents
  platformFees: Cents
  taxSetAside: Cents
}

export interface ExpenseInput {
  amount: Cents
  businessUse: Fraction
}

export interface HomeOfficeInput {
  weeklyRent: Cents
  weeksWorked: number
  totalArea: number
  workspaceArea: number
  businessTimeShare: Fraction
  utilitiesTotal: Cents
  internetTotal: Cents
  internetBusinessShare: Fraction
  /** Share of household rent this person actually pays. */
  rentShareBorne: Fraction
}

export interface AssetInput {
  purchaseDate: string
  cost: Cents
  dvRate: Fraction
  businessUse: Fraction
}
