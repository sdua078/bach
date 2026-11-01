import { CircleEllipsis, House, LayoutDashboard, Plus, Receipt, Settings, Wallet } from 'lucide-react'
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

/** Desktop navigation: Mac-style source list on the left. */
export function Sidebar() {
  const { t } = useI18n()
  const items = [
    { to: '/', label: t.tabs.summary, Icon: LayoutDashboard },
    { to: '/income', label: t.tabs.income, Icon: Wallet },
    { to: '/expenses', label: t.tabs.expenses, Icon: Receipt },
    { to: '/more/home-office', label: t.more.homeOffice, Icon: House },
  ]
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex h-8 items-center gap-2.5 rounded-[7px] px-2.5 text-[14px] transition-colors ${
      isActive ? 'bg-accent-soft font-medium text-accent' : 'text-label hover:bg-fill'
    }`
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-56 flex-col border-r-[0.5px] border-separator bg-sidebar px-3 pt-6 pb-4">
      <div className="mb-6 flex items-center gap-2 px-2.5">
        <img src="./icon.svg" alt="" className="size-6 rounded-[6px]" />
        <span className="text-[15px] font-semibold">{t.appName}</span>
      </div>
      <nav className="space-y-0.5">
        {items.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={link}>
            <Icon className="size-[18px]" strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-3">
        <NavLink to="/more/settings" className={link}>
          <Settings className="size-[18px]" strokeWidth={1.75} />
          {t.more.settings}
        </NavLink>
        <p className="px-2.5 text-[11px] leading-[15px] text-label-3">{t.disclaimer.short}</p>
      </div>
    </aside>
  )
}
