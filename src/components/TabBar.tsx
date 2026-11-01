import { CircleEllipsis, LayoutDashboard, Receipt, Wallet, Plus } from 'lucide-react'
import { m } from 'motion/react'
import { NavLink } from 'react-router'
import { useI18n } from '../i18n'
import { platform } from '../platform'
import { spring } from './ui'

export function TabBar() {
  const { t } = useI18n()
  const tabs = [
    { to: '/', label: t.tabs.summary, Icon: LayoutDashboard },
    { to: '/income', label: t.tabs.income, Icon: Wallet },
    { to: '/expenses', label: t.tabs.expenses, Icon: Receipt },
    { to: '/more', label: t.tabs.more, Icon: CircleEllipsis },
  ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t-[0.5px] border-separator bg-bar pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto flex h-[50px] max-w-2xl">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => platform.haptics.tap()}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                isActive ? 'text-accent' : 'text-label-2'
              }`
            }
          >
            <Icon className="size-6" strokeWidth={1.5} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

/** Floating + button above the tab bar. */
export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <m.button
      type="button"
      aria-label={label}
      whileTap={{ scale: 0.9 }}
      transition={spring}
      onClick={() => {
        platform.haptics.tap()
        onClick()
      }}
      className="fixed right-5 bottom-[calc(env(safe-area-inset-bottom)+66px)] z-30 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-[0_4px_16px_rgb(0_0_0/0.18)]"
    >
      <Plus className="size-7" strokeWidth={2} />
    </m.button>
  )
}
