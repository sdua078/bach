// Everything that differs between the web (PWA) and a future native (Capacitor) build.
// Components call `platform.*` only — never the browser APIs below directly.
// A native build swaps in another implementation of `Platform`.

export interface Platform {
  files: {
    /** Save or share a JSON file. Resolves false if the user cancelled. */
    saveJson(filename: string, data: unknown): Promise<boolean>
    /** Let the user pick a JSON file. Resolves undefined if cancelled. */
    pickJson(): Promise<unknown | undefined>
  }
  storage: {
    /** Ask the OS not to evict our data. */
    persist(): Promise<boolean>
    isPersisted(): Promise<boolean>
  }
  /** Running as an installed app (Home Screen / native), not a browser tab. */
  isInstalled(): boolean
  haptics: { tap(): void }
}

const web: Platform = {
  files: {
    async saveJson(filename, data) {
      const file = new File([JSON.stringify(data, null, 2)], filename, { type: 'application/json' })
      // Share sheet on phones lets the user save straight to iCloud / Drive.
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] })
          return true
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return false
          // Fall through to a plain download.
        }
      }
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1_000)
      return true
    },

    pickJson() {
      return new Promise((resolve, reject) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'application/json,.json'
        input.addEventListener('cancel', () => resolve(undefined))
        input.addEventListener('change', async () => {
          const file = input.files?.[0]
          if (!file) return resolve(undefined)
          try {
            resolve(JSON.parse(await file.text()))
          } catch (e) {
            reject(e)
          }
        })
        input.click()
      })
    },
  },

  storage: {
    async persist() {
      return (await navigator.storage?.persist?.()) ?? false
    },
    async isPersisted() {
      return (await navigator.storage?.persisted?.()) ?? false
    },
  },

  isInstalled() {
    const nav = navigator as Navigator & { standalone?: boolean }
    return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches
  },

  haptics: {
    tap() {
      navigator.vibrate?.(10)
    },
  },
}

export const platform: Platform = web
