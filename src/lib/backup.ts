import { useCallback } from 'react'
import { useToast } from '../components/toast'
import { exportBackup, hasAnyRecords, markExported, parseBackup, restoreBackup } from '../db/repo'
import { useI18n } from '../i18n'
import { platform } from '../platform'
import { todayIso } from '../calc'

export function useBackup() {
  const { t } = useI18n()
  const toast = useToast()

  /** Resolves true once the file is saved (false if the user cancelled). */
  const saveBackup = useCallback(async (): Promise<boolean> => {
    const backup = await exportBackup()
    const saved = await platform.files.saveJson(`bach-backup-${todayIso()}.json`, backup)
    if (saved) await markExported(backup)
    return saved
  }, [])

  const exportNow = useCallback(async () => {
    if (await saveBackup()) toast(t.settings.exportDone)
  }, [saveBackup, toast, t])

  const importFromFile = useCallback(async () => {
    let backup
    try {
      const json = await platform.files.pickJson()
      if (json === undefined) return
      backup = parseBackup(json)
    } catch {
      toast(t.settings.importInvalid)
      return
    }
    const d = backup.data
    const count = d.incomes.length + d.expenses.length + d.homeOffice.length + d.assets.length
    if (!window.confirm(t.settings.importConfirm(count))) return
    // Safety net: keep a copy of what is about to be replaced. Abort if the user cancels it.
    if ((await hasAnyRecords()) && !(await saveBackup())) return
    await restoreBackup(backup)
    toast(t.settings.importDone)
  }, [saveBackup, toast, t])

  return { exportNow, importFromFile }
}
