import { useState, useRef, useEffect, useMemo } from 'react'
import { SearchMd, ChevronDown } from '@untitledui/icons'

/**
 * Searchable employee picker - a drop-in replacement for a plain
 * <select> of employees, used across every form/table that needs to pick
 * an employee (Assets, Advances, Fines, Shifts/Overtime, Grievances,
 * Attendance, etc). Filters by name, employee code, designation, or site
 * as the user types, so finding one employee among a large roster doesn't
 * require scrolling a giant native dropdown.
 *
 * Works as a controlled component: pass `value` (employeeId or '') and
 * `onChange(employeeId)`. Compatible with react-hook-form via
 * `setValue`/`watch` in the parent (see usages), since native <select>
 * registration doesn't support this custom dropdown UI.
 */
export default function EmployeeSelect({ employees, value, onChange, placeholder = 'Select employee', disabled }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const selected = employees.find((e) => String(e.id) === String(value))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) =>
      e.name?.toLowerCase().includes(q) ||
      e.employeeCode?.toLowerCase().includes(q) ||
      e.designation?.toLowerCase().includes(q) ||
      e.siteName?.toLowerCase().includes(q)
    )
  }, [employees, query])

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="input flex items-center justify-between w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selected ? 'text-brand-900' : 'text-brand-400'}>
          {selected ? `${selected.name} (${selected.employeeCode})` : placeholder}
        </span>
        <ChevronDown size={15} className="text-brand-400 shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-brand-200 rounded-lg shadow-lg overflow-hidden">
          <div className="relative border-b border-brand-100">
            <SearchMd size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, code, designation, site..."
              className="w-full pl-9 pr-3 py-2.5 text-sm outline-none"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-sm text-brand-400 text-center">No employees found</li>
            )}
            {filtered.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(e.id)
                    setOpen(false)
                    setQuery('')
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-50 transition-colors ${String(e.id) === String(value) ? 'bg-brand-50' : ''}`}
                >
                  <p className="font-medium text-brand-900">{e.name} <span className="font-mono text-xs text-brand-400">({e.employeeCode})</span></p>
                  <p className="text-xs text-brand-500">{e.designation} &middot; {e.siteName || 'No site'}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
