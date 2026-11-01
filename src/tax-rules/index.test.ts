import { describe, expect, it } from 'vitest'
import { getRules, rulesForDate, taxYearOf } from '.'

describe('tax rules', () => {
  it('2026-27 loads and validates', () => {
    expect(getRules('2026-27')?.startDate).toBe('2026-04-01')
  })

  it.each([
    ['2026-04-01', '2026-27'],
    ['2027-03-31', '2026-27'],
    ['2027-04-01', '2027-28'],
    ['2026-03-31', '2025-26'],
    ['2099-12-31', '2099-00'],
  ])('taxYearOf(%s) → %s', (date, year) => {
    expect(taxYearOf(date)).toBe(year)
  })

  it('unsupported tax year → undefined', () => {
    expect(rulesForDate('2026-03-31')).toBeUndefined()
    expect(rulesForDate('2026-11-02')?.taxYear).toBe('2026-27')
  })
})
