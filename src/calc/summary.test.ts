import { describe, expect, it } from 'vitest'
import { getRules } from '../tax-rules'
import { accEstimate } from './acc'
import { daysBetween } from './dates'
import { computeSummary, suggestSetAside, type SummaryInput } from './summary'

const rules = getRules('2026-27')!
const $ = (dollars: number) => Math.round(dollars * 100)

const income = (nzd: number, fees = 0, setAside = 0) => ({
  date: '2026-06-01',
  nzdReceived: $(nzd),
  platformFees: $(fees),
  taxSetAside: $(setAside),
})

const base: SummaryInput = { rules, salary: $(90_000), incomes: [], expenses: [], assets: [] }

describe('computeSummary', () => {
  it('no side income → nothing extra due, default suggested rate', () => {
    const s = computeSummary(base)
    expect(s.paye).toBe($(19_577.5))
    expect(s.extraTaxDue).toBe(0)
    expect(s.toPrepare).toBe(0)
    expect(s.suggestedRate).toBe(rules.defaultSetAsideRate)
    expect(s.provisional.likely).toBe(false)
  })

  it('typical year: $10k income, $500 deductible, $2k set aside', () => {
    const s = computeSummary({
      ...base,
      incomes: [income(9_900, 100, 2_000)],
      expenses: [{ amount: $(1_000), businessUse: 0.5 }],
    })
    expect(s.incomeTotal).toBe($(10_000))
    expect(s.sideProfit).toBe($(9_500))
    expect(s.extraTaxDue).toBe($(3_135)) // 9500 × 33%
    expect(s.acc.amount).toBe($(185.73)) // 9500 × 1.7% = 161.50 + GST 24.23
    expect(s.toPrepare).toBe($(3_135 + 185.73))
    expect(s.setAsideSoFar).toBe($(2_000))
    expect(s.shortfall).toBe($(1_320.73))
    expect(s.suggestedRate).toBe(0.35) // 33.2% rounded up to 5%
    expect(s.marginalRate).toBe(0.33)
  })

  it('negative side profit → negative extraTaxDue (likely refund), nothing to prepare', () => {
    const s = computeSummary({
      ...base,
      incomes: [income(1_000)],
      expenses: [{ amount: $(3_000), businessUse: 1 }],
    })
    expect(s.sideProfit).toBe(-$(2_000))
    expect(s.extraTaxDue).toBe(-$(660))
    expect(s.acc.amount).toBe(0)
    expect(s.toPrepare).toBe(0)
  })

  it('actual PAYE withheld overrides the estimate', () => {
    const s = computeSummary({ ...base, payeWithheld: $(19_000), incomes: [income(1_000)] })
    expect(s.payeIsEstimate).toBe(false)
    expect(s.extraTaxDue).toBe($(19_577.5 + 330 - 19_000))
  })

  it('extra tax over $5,000 flags provisional tax with 105% ÷ 3 instalments', () => {
    const s = computeSummary({ ...base, incomes: [income(30_000)] })
    expect(s.extraTaxDue).toBe($(9_900))
    expect(s.provisional.likely).toBe(true)
    expect(s.provisional.perInstalment).toBe($(3_465))
  })

  it('extra tax exactly $5,000 is not over the threshold', () => {
    const s = computeSummary({ ...base, payeWithheld: $(19_577.5), incomes: [income(5_000 / 0.33)] })
    expect(s.extraTaxDue).toBeLessThanOrEqual($(5_000))
    expect(s.provisional.likely).toBe(false)
  })

  it('includes home office and asset deductions', () => {
    const s = computeSummary({
      ...base,
      incomes: [income(10_000)],
      homeOffice: {
        weeklyRent: $(600),
        weeksWorked: 22,
        totalArea: 80,
        workspaceArea: 10,
        businessTimeShare: 1,
        utilitiesTotal: 0,
        internetTotal: 0,
        internetBusinessShare: 0,
        rentShareBorne: 1,
      },
      assets: [{ purchaseDate: '2026-10-15', cost: $(2_000), dvRate: 0.5, businessUse: 0.6 }],
    })
    expect(s.deductionsTotal).toBe($(1_650 + 300))
    expect(s.sideProfit).toBe($(10_000 - 1_950))
  })
})

describe('accEstimate', () => {
  it('liable earnings capped at the maximum', () => {
    const r = accEstimate($(200_000), 0, rules)
    expect(r.liableEarnings).toBe(rules.acc.maxLiableEarningsCents)
  })

  it('flags possible refund when salary + side profit exceed the cap', () => {
    expect(accEstimate($(20_000), $(150_000), rules).refundPossible).toBe(true)
    expect(accEstimate($(20_000), $(90_000), rules).refundPossible).toBe(false)
  })

  it('work levy override changes the amount', () => {
    expect(accEstimate($(10_000), 0, rules, 0).amount).toBe($(184)) // 10000 × 1.6% = 160 + GST 24
  })
})

describe('suggestSetAside', () => {
  it('first payment: whole year gap', () => {
    expect(suggestSetAside(base, { date: '2026-06-01', nzdReceived: $(1_000), platformFees: 0 })).toBe(
      $(330 + 19.55), // 1000 × 33% + 1000 × 1.7% × 1.15
    )
  })

  it('already over-saved → 0', () => {
    const input = { ...base, incomes: [income(1_000, 0, 5_000)] }
    expect(suggestSetAside(input, { date: '2026-07-01', nzdReceived: $(1_000), platformFees: 0 })).toBe(0)
  })
})

describe('daysBetween', () => {
  it('2026-11-02 → IR3 due 2027-07-07 is 247 days', () => {
    expect(daysBetween('2026-11-02', '2027-07-07')).toBe(247)
  })
})
