import { describe, expect, it } from 'vitest'
import { getRules } from '../tax-rules'
import { assetDeduction, deductibleExpenses, homeOfficeDeduction, sideIncomeTotal } from './deductions'
import type { HomeOfficeInput } from './types'

const rules = getRules('2026-27')!
const $ = (dollars: number) => Math.round(dollars * 100)

describe('sideIncomeTotal', () => {
  it('counts platform fees as income (fee is an expense elsewhere)', () => {
    const incomes = [
      { date: '2026-05-01', nzdReceived: $(990), platformFees: $(10), taxSetAside: 0 },
      { date: '2026-06-01', nzdReceived: $(500), platformFees: 0, taxSetAside: 0 },
    ]
    expect(sideIncomeTotal(incomes)).toBe($(1_500))
  })

  it('empty → 0', () => {
    expect(sideIncomeTotal([])).toBe(0)
  })
})

describe('deductibleExpenses', () => {
  it('Σ amount × business use', () => {
    expect(
      deductibleExpenses([
        { amount: $(100), businessUse: 1 },
        { amount: $(200), businessUse: 0.4 },
        { amount: $(50), businessUse: 0 },
      ]),
    ).toBe($(180))
  })

  it('clamps business use to 0..1', () => {
    expect(deductibleExpenses([{ amount: $(100), businessUse: 1.5 }])).toBe($(100))
    expect(deductibleExpenses([{ amount: $(100), businessUse: -1 }])).toBe(0)
  })
})

describe('homeOfficeDeduction', () => {
  const base: HomeOfficeInput = {
    weeklyRent: $(600),
    weeksWorked: 22,
    totalArea: 80,
    workspaceArea: 10,
    businessTimeShare: 1,
    utilitiesTotal: $(2_600),
    internetTotal: $(1_040),
    internetBusinessShare: 0.5,
    rentShareBorne: 1,
  }

  it('brief example: $600 × 22 weeks, 10 of 80 m², 100% time → rent $1,650', () => {
    expect(homeOfficeDeduction(base).rent).toBe($(1_650))
  })

  it('utilities and internet are pro-rated by weeks worked / 52', () => {
    const r = homeOfficeDeduction(base)
    expect(r.utilities).toBe($(137.5)) // 2600 × 22/52 × 1/8
    expect(r.internet).toBe($(220)) // 1040 × 22/52 × 0.5
    expect(r.total).toBe($(1_650 + 137.5 + 220))
  })

  it('rent is capped at the share of rent the person pays', () => {
    const r = homeOfficeDeduction({ ...base, rentShareBorne: 0.1 })
    expect(r.rent).toBe($(1_320)) // 600 × 22 × 0.1
    expect(r.rentUncapped).toBe($(1_650))
    expect(r.rentCapped).toBe(true)
  })

  it('half-time use halves rent and utilities', () => {
    const r = homeOfficeDeduction({ ...base, businessTimeShare: 0.5 })
    expect(r.rent).toBe($(825))
    expect(r.utilities).toBe($(68.75))
  })

  it('zero area or zero weeks → 0', () => {
    expect(homeOfficeDeduction({ ...base, totalArea: 0 }).rent).toBe(0)
    expect(homeOfficeDeduction({ ...base, weeksWorked: 0 }).total).toBe(0)
  })

  it('weeks above 52 are clamped', () => {
    expect(homeOfficeDeduction({ ...base, weeksWorked: 60 }).rent).toBe($(600 * 52 * 0.125))
  })
})

describe('assetDeduction', () => {
  const laptop = { purchaseDate: '2026-10-15', cost: $(2_000), dvRate: 0.5, businessUse: 0.6 }

  it('DV first year pro-rated by months held (Oct–Mar = 6), × business use', () => {
    expect(assetDeduction(laptop, 2026, rules)).toBe($(300)) // 2000 × 0.5 × 6/12 × 0.6
  })

  it('second year depreciates the reduced book value in full', () => {
    expect(assetDeduction(laptop, 2027, rules)).toBe($(450)) // 1500 × 0.5 × 0.6
  })

  it('April purchase counts 12 months; March purchase counts 1', () => {
    expect(assetDeduction({ ...laptop, purchaseDate: '2026-04-30' }, 2026, rules)).toBe($(600))
    expect(assetDeduction({ ...laptop, purchaseDate: '2027-03-01' }, 2026, rules)).toBe($(50))
  })

  it('below $1,000 is written off in full in the purchase year only', () => {
    const cheap = { ...laptop, cost: $(999.99) }
    expect(assetDeduction(cheap, 2026, rules)).toBe($(599.99)) // 99999 × 0.6 = 59999.4 → 59999
    expect(assetDeduction(cheap, 2027, rules)).toBe(0)
  })

  it('exactly $1,000 is depreciated, not written off', () => {
    expect(assetDeduction({ ...laptop, cost: $(1_000) }, 2026, rules)).toBe($(150))
  })

  it('bought after the tax year → 0', () => {
    expect(assetDeduction({ ...laptop, purchaseDate: '2027-04-01' }, 2026, rules)).toBe(0)
  })
})
