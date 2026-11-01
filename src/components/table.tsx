import type { ComponentProps, ReactNode } from 'react'

/** Desktop data table in a rounded card. */
export function Table({ head, children, foot }: { head: ReactNode; children: ReactNode; foot?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[12px] bg-card shadow-[0_0_0_0.5px_var(--separator)]">
      <table className="w-full border-collapse text-[14px]">
        <thead>
          <tr className="border-b-[0.5px] border-separator text-left text-[12px] font-medium text-label-2">{head}</tr>
        </thead>
        <tbody>{children}</tbody>
        {foot && (
          <tfoot>
            <tr className="border-t-[0.5px] border-separator text-[14px] font-semibold">{foot}</tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

export function Th({ children, right, className = '' }: { children?: ReactNode; right?: boolean; className?: string }) {
  return <th className={`px-4 py-2.5 font-medium ${right ? 'text-right' : ''} ${className}`}>{children}</th>
}

export function Td({
  children,
  right,
  muted,
  colSpan,
  className = '',
}: {
  children?: ReactNode
  right?: boolean
  muted?: boolean
  colSpan?: number
  className?: string
}) {
  return (
    <td colSpan={colSpan} className={`px-4 py-2.5 ${right ? 'num text-right' : ''} ${muted ? 'text-label-2' : ''} ${className}`}>{children}</td>
  )
}

/** Clickable data row. */
export function Tr({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className="cursor-default border-b-[0.5px] border-separator last:border-b-0 hover:bg-fill/60 active:bg-fill"
    >
      {children}
    </tr>
  )
}

const cellInput =
  'h-8 w-full rounded-[6px] bg-bg px-2.5 text-[14px] outline-none ring-accent placeholder:text-label-3 focus:bg-card focus:ring-2'

export function CellInput({ className = '', ...props }: ComponentProps<'input'>) {
  return <input {...props} className={`${cellInput} ${className}`} />
}

export function CellSelect({ className = '', ...props }: ComponentProps<'select'>) {
  return <select {...props} className={`${cellInput} ${className}`} />
}

/** The always-visible entry row at the top of a table. */
export function QuickRow({ children }: { children: ReactNode }) {
  return <tr className="border-b-[0.5px] border-separator bg-accent-soft/40">{children}</tr>
}
