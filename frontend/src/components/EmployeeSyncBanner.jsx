import { useState } from 'react'
import { UserCheck01, UserPlus01, UserX01, Building07, AlertCircle, ChevronDown, ChevronUp, Briefcase01 } from '@untitledui/icons'

/**
 * Displays the employeeSync summary returned by the attendance-report
 * preview endpoints as a single collapsed notification bar (one-line
 * summary), so it doesn't take up page space - HR can click to expand and
 * see exactly what was extracted from the Excel's Department column and
 * written to each employee, or leave it collapsed. Nothing happens
 * silently, but the detail is opt-in rather than always-on.
 */
export default function EmployeeSyncBanner({ sync }) {
  const [expanded, setExpanded] = useState(false)

  if (!sync) return null

  if (sync.error) {
    return (
      <div className="card p-3 mb-4 border-l-4 border-l-red-500 flex items-start gap-3">
        <AlertCircle size={16} className="text-red-500 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-brand-900">Employee sync failed</p>
          <p className="text-xs text-brand-500 mt-0.5">{sync.error}</p>
        </div>
      </div>
    )
  }

  const {
    matched = 0, autoCreated = 0, newSites = 0,
    autoCreatedEmployees = [], newSiteNames = [], markedLeft = [], designationUpdated = [], skippedLowCoverage = [],
  } = sync
  if (matched === 0 && autoCreated === 0 && newSites === 0 && markedLeft.length === 0 && skippedLowCoverage.length === 0) return null

  const hasDetails = autoCreatedEmployees.length > 0 || newSiteNames.length > 0 || markedLeft.length > 0 || designationUpdated.length > 0 || skippedLowCoverage.length > 0

  return (
    <div className="card mb-4 border-l-4 border-l-brand-900 overflow-hidden">
      <button
        type="button"
        onClick={() => hasDetails && setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left ${hasDetails ? 'cursor-pointer hover:bg-brand-50' : 'cursor-default'}`}
      >
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium text-brand-900">Employee Sync:</span>
          <span className="inline-flex items-center gap-1.5 text-brand-600">
            <UserCheck01 size={15} className="text-green-600" /> {matched} matched
          </span>
          <span className="inline-flex items-center gap-1.5 text-brand-600">
            <UserPlus01 size={15} className="text-blue-600" /> {autoCreated} auto-created
          </span>
          <span className="inline-flex items-center gap-1.5 text-brand-600">
            <Building07 size={15} className="text-amber-600" /> {newSites} new site(s)
          </span>
          {designationUpdated.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-brand-600">
              <Briefcase01 size={15} className="text-purple-600" /> {designationUpdated.length} designation(s) updated
            </span>
          )}
          {markedLeft.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-brand-600">
              <UserX01 size={15} className="text-red-600" /> {markedLeft.length} marked LEFT
            </span>
          )}
        </div>
        {hasDetails && (
          expanded
            ? <ChevronUp size={16} className="text-brand-400 shrink-0" />
            : <ChevronDown size={16} className="text-brand-400 shrink-0" />
        )}
      </button>

      {expanded && hasDetails && (
        <div className="px-4 pb-4 border-t border-brand-100 pt-3 space-y-3">
          {autoCreatedEmployees.length > 0 && (
            <div className="text-xs text-brand-500">
              <p className="font-medium text-brand-700 mb-1">
                Auto-created employees (designation extracted from the Department column):
              </p>
              <ul className="list-disc list-inside space-y-0.5 max-h-48 overflow-y-auto">
                {autoCreatedEmployees.map((e) => (
                  <li key={e.employeeId}>
                    <span className="font-mono">{e.employeeCode}</span> - {e.name} ({e.site}) &rarr;{' '}
                    <span className="font-medium text-brand-700">{e.designation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {designationUpdated.length > 0 && (
            <div className="text-xs text-brand-500">
              <p className="font-medium text-brand-700 mb-1">
                Designation updated from Department column (existing employees):
              </p>
              <ul className="list-disc list-inside space-y-0.5 max-h-48 overflow-y-auto">
                {designationUpdated.map((e) => (
                  <li key={e.employeeId}>
                    <span className="font-mono">{e.employeeCode}</span> - {e.name} ({e.site}):{' '}
                    <span className="text-brand-400">{e.oldDesignation}</span> &rarr;{' '}
                    <span className="font-medium text-brand-700">{e.newDesignation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {markedLeft.length > 0 && (
            <div className="text-xs text-brand-500">
              <p className="font-medium text-brand-700 mb-1">
                Marked LEFT (previously punch-mapped, not found in this upload - reversible via Employee Hub):
              </p>
              <ul className="list-disc list-inside space-y-0.5 max-h-48 overflow-y-auto">
                {markedLeft.map((e) => (
                  <li key={e.employeeId}>
                    <span className="font-mono">{e.employeeCode}</span> - {e.name} ({e.site})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {skippedLowCoverage.length > 0 && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              <p className="font-medium mb-1">
                Skipped auto-LEFT check (upload covers too small a slice of the known roster to be trusted):
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                {skippedLowCoverage.map((s) => (
                  <li key={s.site}>
                    {s.site}: only {s.presentInUpload} of {s.knownActive} previously known active employee(s) present in this file ({Math.round(s.coverageRatio * 100)}% coverage)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {newSiteNames.length > 0 && (
            <p className="text-xs text-brand-500">
              New sites: <span className="font-medium text-brand-700">{newSiteNames.join(', ')}</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
