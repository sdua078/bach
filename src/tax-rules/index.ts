import { z } from 'zod'
import nz202627 from './nz-2026-27.json'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const rate = z.number().min(0).max(1)
const cents = z.number().int().nonnegative()

export const taxRulesSchema = z.object({
  taxYear: z.string().regex(/^\d{4}-\d{2}$/),
  startDate: isoDate,
  endDate: isoDate,
  incomeTaxBrackets: z
    .array(z.object({ upToCents: cents.nullable(), rate }))
    .min(1)
    .refine((b) => b.at(-1)?.upToCents === null, 'last bracket must be open-ended'),
  ir3DueDate: isoDate,
  terminalTaxDate: isoDate,
  provisionalTax: z.object({
    ritThresholdCents: cents,
    standardUplift: z.number().positive(),
    instalments: z.number().int().positive(),
    safeHarbourRitLimitCents: cents,
  }),
  acc: z.object({
    earnersLevyRate: rate,
    workingSaferLevyRate: rate,
    defaultWorkLevyRate: rate,
    maxLiableEarningsCents: cents,
  }),
  gstRate: rate,
  gstRegistrationThresholdCents: cents,
  lowValueAssetThresholdCents: cents,
  entertainmentDeductibleShare: rate,
  recordKeepingYears: z.number().int().positive(),
  defaultSetAsideRate: rate,
  sources: z.array(z.url()).min(1),
})

export type TaxRules = z.infer<typeof taxRulesSchema>

// Add one line per new tax year. Parsed at load so a typo in JSON fails loudly.
const ALL_RULES: readonly TaxRules[] = [nz202627].map((r) => taxRulesSchema.parse(r))

export function getRules(taxYear: string): TaxRules | undefined {
  return ALL_RULES.find((r) => r.taxYear === taxYear)
}

export function supportedTaxYears(): string[] {
  return ALL_RULES.map((r) => r.taxYear)
}

/** NZ tax year runs 1 April – 31 March. '2026-08-15' → '2026-27'. */
export function taxYearOf(isoDate: string): string {
  const year = Number(isoDate.slice(0, 4))
  const month = Number(isoDate.slice(5, 7))
  const start = month >= 4 ? year : year - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}

/** Rules for the tax year containing this date, or undefined when not supported yet. */
export function rulesForDate(isoDate: string): TaxRules | undefined {
  return getRules(taxYearOf(isoDate))
}
