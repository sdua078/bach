import type { TaxRules } from '../tax-rules'
import { mulRate } from './money'
import type { Cents } from './types'

export interface AccEstimate {
  /** GST-inclusive, since a non-GST-registered person pays and deducts the full invoice. */
  amount: Cents
  liableEarnings: Cents
  /** Salary + side profit exceeds the cap: ACC may refund via a Multiple Employer Adjustment. */
  refundPossible: boolean
}

export function accEstimate(
  sideProfit: Cents,
  salary: Cents,
  rules: TaxRules,
  workLevyRate: number = rules.acc.defaultWorkLevyRate,
): AccEstimate {
  const { earnersLevyRate, workingSaferLevyRate, maxLiableEarningsCents } = rules.acc
  const liableEarnings = Math.min(Math.max(0, sideProfit), maxLiableEarningsCents)
  const exGst = mulRate(liableEarnings, earnersLevyRate + workingSaferLevyRate + workLevyRate)
  const amount = exGst + mulRate(exGst, rules.gstRate)
  return {
    amount,
    liableEarnings,
    refundPossible: liableEarnings > 0 && salary + liableEarnings > maxLiableEarningsCents,
  }
}
