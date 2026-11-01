import type { TaxRules } from '../tax-rules'
import { mulRate, sum } from './money'
import type { Cents } from './types'

/** Progressive income tax. Each bracket's tax is rounded to cents, then summed. */
export function incomeTax(taxable: Cents, rules: TaxRules): Cents {
  if (taxable <= 0) return 0
  let lower = 0
  const parts: Cents[] = []
  for (const { upToCents, rate } of rules.incomeTaxBrackets) {
    const upper = upToCents ?? Infinity
    if (taxable <= lower) break
    parts.push(mulRate(Math.min(taxable, upper) - lower, rate))
    lower = upper
  }
  return sum(parts)
}

/** Rate applied to the next dollar earned on top of `taxable`. */
export function marginalRate(taxable: Cents, rules: TaxRules): number {
  const brackets = rules.incomeTaxBrackets
  const hit = brackets.find((b) => b.upToCents === null || Math.max(0, taxable) < b.upToCents)
  return (hit ?? brackets[brackets.length - 1]!).rate
}
