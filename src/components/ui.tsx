import { Info, ChevronRight } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useIsDesktop } from '../lib/useIsDesktop'

/** iOS spring used everywhere. */
export const spring = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 } as const

interface PageProps {
  title: string
  subtitle?: string
  back?: { to: string; label: string }
  /** Buttons shown at the right of the title on desktop. */
  actions?: ReactNode
  /** Desktop content width. */
  wide?: boolean
  children: ReactNode
}

export function Page(props: PageProps) {
  return useIsDesktop() ? <DesktopPage {...props} /> : <MobilePage {...props} />
}

/** Mac-style: plain title row with actions; the sidebar handles navigation. */
function DesktopPage({ title, subtitle, actions, wide, children }: PageProps) {
  return (
    <div className={`mx-auto px-10 pt-10 pb-16 ${wide ? 'max-w-6xl' : 'max-w-4xl'}`}>
      <header className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[28px] leading-[34px] font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[14px] text-label-2">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className="space-y-8">{children}</div>
    </div>
  )
}

/** Large title that hands over to a compact centered title in a frosted bar once scrolled past. */
function MobilePage({ title, subtitle, back, children }: PageProps) {
  const sentinel = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setCompact(!entry?.isIntersecting), {
      rootMargin: '-44px 0px 0px 0px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="pb-tabbar">
      <header
        className={`pt-safe sticky top-0 z-20 transition-colors duration-200 ${
          compact ? 'border-b-[0.5px] border-separator bg-bar backdrop-blur-xl' : 'border-b-[0.5px] border-transparent'
        }`}
      >
        <div className="relative flex h-11 items-center justify-center px-4">
          {back && (
            <Link to={back.to} className="absolute left-2 flex items-center text-[17px] text-accent active:opacity-50">
              <ChevronRight className="size-6 rotate-180" strokeWidth={2.25} />
              {back.label}
            </Link>
          )}
          <span
            className={`text-[17px] font-semibold transition-opacity duration-200 ${compact ? 'opacity-100' : 'opacity-0'}`}
          >
            {title}
          </span>
        </div>
      </header>
      <div className="px-4 pb-2">
        <h1 className="text-[34px] leading-[41px] font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-[15px] text-label-2">{subtitle}</p>}
        <div ref={sentinel} />
      </div>
      <div className="mx-auto max-w-2xl space-y-8 px-4 pt-3">{children}</div>
    </div>
  )
}

/** Mac-style push button. */
export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'secondary',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}) {
  const look =
    variant === 'primary'
      ? 'bg-accent text-white hover:brightness-110'
      : 'bg-card text-label shadow-[0_0_0_0.5px_var(--separator),0_1px_2px_rgb(0_0_0/0.06)] hover:bg-card-pressed'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 items-center gap-1.5 rounded-[7px] px-3.5 text-[14px] font-medium transition active:scale-[0.98] disabled:opacity-40 ${look}`}
    >
      {children}
    </button>
  )
}

/** Inset grouped section, as in the iOS Settings app. */
export function Group({ header, footer, children }: { header?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <section>
      {header && <h2 className="mb-1.5 px-4 text-[13px] text-label-2 uppercase">{header}</h2>}
      <div className="divide-y-[0.5px] divide-separator overflow-hidden rounded-[10px] bg-card md:rounded-[12px] md:shadow-[0_0_0_0.5px_var(--separator)] [&>*]:ml-4">
        {children}
      </div>
      {footer && <p className="mt-1.5 px-4 text-[13px] leading-[18px] text-label-2">{footer}</p>}
    </section>
  )
}

export function Row({
  label,
  detail,
  sub,
  to,
  onClick,
  tone,
}: {
  label: ReactNode
  detail?: ReactNode
  sub?: ReactNode
  to?: string
  onClick?: () => void
  tone?: 'accent' | 'red'
}) {
  const color = tone === 'accent' ? 'text-accent' : tone === 'red' ? 'text-red' : ''
  const body = (
    <div className="flex min-h-11 items-center gap-3 py-2.5 pr-4">
      <div className="min-w-0 flex-1">
        <div className={`truncate text-[17px] md:text-[15px] ${color}`}>{label}</div>
        {sub && <div className="truncate text-[13px] text-label-2">{sub}</div>}
      </div>
      {detail !== undefined && <div className="num shrink-0 text-right text-[17px] text-label-2 md:text-[15px]">{detail}</div>}
      {to && <ChevronRight className="size-5 shrink-0 text-label-3" strokeWidth={2} />}
    </div>
  )
  // Group indents each row by 1rem (inset separators), so a full-width button must be 1rem narrower.
  const pressable = 'block text-left transition-colors active:bg-card-pressed'
  if (to)
    return (
      <Link to={to} className={pressable}>
        {body}
      </Link>
    )
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={`${pressable} w-[calc(100%-1rem)]`}>
        {body}
      </button>
    )
  return body
}

/** ⓘ that expands an inline explanation. Jargon lives here, not in labels. */
export function InfoTip({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-label="Info"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className="ml-1 inline-flex align-[-3px] text-label-3 active:opacity-50"
      >
        <Info className="size-[18px]" strokeWidth={1.5} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.span
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring}
            className="block overflow-hidden text-[13px] leading-[18px] font-normal text-label-2"
          >
            <span className="block pt-1">{children}</span>
          </m.span>
        )}
      </AnimatePresence>
    </>
  )
}

export function Banner({
  children,
  action,
  onDismiss,
  tone = 'yellow',
}: {
  children: ReactNode
  action?: { label: string; onClick: () => void }
  onDismiss?: { label: string; onClick: () => void }
  tone?: 'yellow' | 'accent'
}) {
  return (
    <m.div

      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className={`rounded-[10px] px-4 py-3 text-[15px] leading-5 ${tone === 'yellow' ? 'bg-yellow-soft' : 'bg-accent-soft'}`}
    >
      {children}
      {(action || onDismiss) && (
        <div className="mt-2 flex gap-5 text-[15px] font-semibold">
          {action && (
            <button type="button" className="text-accent active:opacity-50" onClick={action.onClick}>
              {action.label}
            </button>
          )}
          {onDismiss && (
            <button type="button" className="text-label-2 active:opacity-50" onClick={onDismiss.onClick}>
              {onDismiss.label}
            </button>
          )}
        </div>
      )}
    </m.div>
  )
}

export function Footnote({ children }: { children: ReactNode }) {
  return <p className="px-4 text-center text-[12px] leading-4 text-label-3">{children}</p>
}
