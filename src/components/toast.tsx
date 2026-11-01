import { AnimatePresence, m } from 'motion/react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { spring } from './ui'

interface Toast {
  id: number
  message: string
  action?: { label: string; onClick: () => void }
}

type Show = (message: string, action?: Toast['action']) => void

const ToastContext = createContext<Show>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const show = useCallback<Show>((message, action) => {
    clearTimeout(timer.current)
    const id = Date.now()
    setToast({ id, message, action })
    timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 5_000)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+72px)] z-[60] flex justify-center px-4">
        <AnimatePresence>
          {toast && (
            <m.div
              key={toast.id}
              role="status"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={spring}
              className="pointer-events-auto flex items-center gap-4 rounded-full bg-[#2c2c2e] py-2.5 pr-2.5 pl-5 text-[15px] text-white shadow-lg dark:bg-[#3a3a3c]"
            >
              <span>{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  className="rounded-full px-3 py-1 font-semibold text-[#5fd4d6] active:opacity-50"
                  onClick={() => {
                    toast.action?.onClick()
                    setToast(null)
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): Show {
  return useContext(ToastContext)
}
