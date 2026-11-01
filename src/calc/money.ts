import type { Cents } from './types'

/**
 * Multiply cents by a rate and round half-up to whole cents.
 * toFixed(6) first strips float noise like 2422.4999999999995 → 2422.5.
 */
export function mulRate(cents: Cents, rate: number): Cents {
  const exact = Number((cents * rate).toFixed(6))
  return Math.sign(exact) * Math.round(Math.abs(exact))
}

export function sum(values: readonly Cents[]): Cents {
  return values.reduce((a, b) => a + b, 0)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
