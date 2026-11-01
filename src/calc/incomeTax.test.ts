import { describe, expect, it } from 'vitest'
import { getRules } from '../tax-rules'
import { incomeTax, marginalRate } from './incomeTax'

const rules = getRules('2026-27')!
const $ = (dollars: number) => Math.round(dollars * 100)

describe('incomeTax 2026-27', () => {
  it('salary $90,000 → $19,577.50', () => {
    expect(incomeTax($(90_000), rules)).toBe($(19_577.5))
  })

  it.each([
    [0, 0],
    [15_600, 1_638],
    [53_500, 8_270.5],
    [78_100, 15_650.5],
    [180_000, 49_277.5],
    [200_000, 57_077.5],
  ])('$%d → $%d', (income, tax) => {
    expect(incomeTax($(income), rules)).toBe($(tax))
  })

  it('one dollar over each threshold is taxed at the next rate', () => {
    expect(incomeTax($(15_601), rules)).toBe($(1_638 + 0.175))
    expect(incomeTax($(53_501), rules)).toBe($(8_270.5 + 0.3))
    expect(incomeTax($(78_101), rules)).toBe($(15_650.5 + 0.33))
    expect(incomeTax($(180_001), rules)).toBe($(49_277.5 + 0.39))
  })

  it('rounds each bracket to cents: one cent over $15,600 adds 0.175c → 0', () => {
    expect(incomeTax($(15_600) + 1, rules)).toBe($(1_638))
  })

  it('negative income → 0', () => {
    expect(incomeTax(-$(5_000), rules)).toBe(0)
  })
})

describe('marginalRate', () => {
  it.each([
    [0, 0.105],
    [15_599, 0.105],
    [15_600, 0.175],
    [53_500, 0.3],
    [78_100, 0.33],
    [90_000, 0.33],
    [180_000, 0.39],
    [-1_000, 0.105],
  ])('$%d → %d', (income, rate) => {
    expect(marginalRate($(income), rules)).toBe(rate)
  })
})
