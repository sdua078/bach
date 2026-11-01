import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router'
import { TabBar } from './components/TabBar'
import { ToastProvider } from './components/toast'
import { getSettings } from './db/repo'
import { I18nProvider } from './i18n'
import { ExpensesPage } from './pages/ExpensesPage'
import { IncomePage } from './pages/IncomePage'
import { MorePage } from './pages/MorePage'
import { Onboarding } from './pages/Onboarding'
import { SummaryPage } from './pages/SummaryPage'

// Less-used screens load on demand to keep first paint fast.
const HomeOfficePage = lazy(() => import('./pages/HomeOfficePage').then((m) => ({ default: m.HomeOfficePage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))

function Shell() {
  const settings = useLiveQuery(getSettings)
  if (!settings) return null // first IndexedDB read, a few ms
  if (!settings.onboarded) return <Onboarding disclaimerAccepted={settings.disclaimerAccepted} />

  return (
    <HashRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<SummaryPage />} />
          <Route path="/income" element={<IncomePage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="/more/home-office" element={<HomeOfficePage />} />
          <Route path="/more/settings" element={<SettingsPage />} />
          <Route path="*" element={<SummaryPage />} />
        </Routes>
      </Suspense>
      <TabBar />
    </HashRouter>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </I18nProvider>
  )
}
