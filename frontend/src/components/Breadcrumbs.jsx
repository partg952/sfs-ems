import { Link } from 'react-router-dom'
import { ChevronRight } from '@untitledui/icons'

/**
 * Lightweight breadcrumb trail for deep pages that need a real entity name
 * (e.g. an employee's name, a payroll period) rather than the generic
 * path-segment trail already shown in the persistent Topbar.
 *
 * @param {{label: string, to?: string}[]} items - last item is treated as
 *   the current page and rendered without a link, even if `to` is provided.
 */
export default function Breadcrumbs({ items = [] }) {
  if (items.length === 0) return null
  return (
    <nav className="flex items-center gap-1.5 text-sm text-brand-400 mb-4 min-w-0 overflow-hidden">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <ChevronRight size={14} className="text-brand-200 flex-shrink-0" />}
            {isLast || !item.to ? (
              <span className="text-brand-700 font-medium truncate">{item.label}</span>
            ) : (
              <Link to={item.to} className="hover:text-brand-700 transition-colors truncate">{item.label}</Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
