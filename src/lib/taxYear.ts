import { todayIso } from '../calc'
import { getRules, supportedTaxYears, taxYearOf } from '../tax-rules'

/** The tax year containing today, or the latest one we have rules for. */
export function currentTaxYear(today = todayIso()): string {
  const year = taxYearOf(today)
  if (getRules(year)) return year
  return supportedTaxYears().at(-1)!
}

/** Today if it falls inside the tax year, otherwise the year's last day — a sensible default date for new entries. */
export function defaultEntryDate(taxYear: string, today = todayIso()): string {
  const rules = getRules(taxYear)
  if (!rules) return today
  if (today < rules.startDate) return rules.startDate
  if (today > rules.endDate) return rules.endDate
  return today
}
