import { House, Settings as SettingsIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Group, Page, Row } from '../components/ui'
import { useI18n } from '../i18n'

function Icon({ children }: { children: ReactNode }) {
  return <span className="flex size-[29px] items-center justify-center rounded-[7px] bg-accent text-white">{children}</span>
}

export function MorePage() {
  const { t } = useI18n()
  return (
    <Page title={t.more.title}>
      <Group>
        <Row
          to="/more/home-office"
          label={
            <span className="flex items-center gap-3">
              <Icon>
                <House className="size-[18px]" strokeWidth={1.75} />
              </Icon>
              {t.more.homeOffice}
            </span>
          }
        />
        <Row
          to="/more/settings"
          label={
            <span className="flex items-center gap-3">
              <Icon>
                <SettingsIcon className="size-[18px]" strokeWidth={1.75} />
              </Icon>
              {t.more.settings}
            </span>
          }
        />
      </Group>
    </Page>
  )
}
