import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, UploadCloud01, File04, File02, Building07, Users01, Download01, Calendar } from '@untitledui/icons'
import PageHeader from '../../components/PageHeader'
import Breadcrumbs from '../../components/Breadcrumbs'
import StatCard from '../../components/StatCard'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { MONTHS } from '../../utils/format'
import {
  previewMusterRoll, downloadMusterRollExcel, downloadMusterRollPdf, saveBlobResponse,
} from '../../api/attendanceReports'

const STATUS_STYLES = {
  P: 'bg-brand-900 text-white',
  H: 'bg-brand-300 text-brand-900',
  M: 'bg-brand-100 text-brand-500',
  A: 'bg-white text-brand-300 border border-brand-100',
  WO: 'bg-brand-50 text-brand-400 border border-brand-100',
}

export default function MusterRollReport() {
  const now = new Date()
  const [file, setFile] = useState(null)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [activeSite, setActiveSite] = useState(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState('')
  const [report, setReport] = useState(null)

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i + 1)

  async function handleGenerate(e) {
    e.preventDefault()
    if (!file) return toast.error('Select the punch export Excel file first')

    setLoading(true)
    try {
      const res = await previewMusterRoll(file, year, month)
      setReport(res.data?.data ?? null)
      setActiveSite(res.data?.data?.sites?.[0] ?? null)
      toast.success('Muster roll generated successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate muster roll')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload(type, site) {
    const key = site ? `pdf-${site}` : type
    setDownloading(key)
    try {
      if (type === 'excel') {
        const res = await downloadMusterRollExcel()
        saveBlobResponse(res, `Muster_Roll_${report.year}_${report.month}.xlsx`)
      } else {
        const res = await downloadMusterRollPdf(site)
        const siteLabel = site ? `_${site.replace(/[^a-zA-Z0-9.-]/g, '_')}` : '_All_Sites'
        saveBlobResponse(res, `Muster_Roll${siteLabel}_${report.year}_${report.month}.pdf`)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Download failed')
    } finally {
      setDownloading('')
    }
  }

  const activeSiteData = report && activeSite ? report.allSitesCalculatedData[activeSite] : null
  const activeSiteBreakdown = report?.siteBreakdown.find((s) => s.site === activeSite)

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Attendance Reports', to: '/attendance-reports' }, { label: 'Muster Roll' }]} />
      <PageHeader
        title="Muster Roll"
        subtitle="Calendar-grid attendance sheet (P / H / A / M / WO per day) with weekly-off handling"
        action={
          <Link to="/attendance-reports" className="btn-secondary text-sm">
            <ArrowLeft size={15} /> Back
          </Link>
        }
      />

      <form onSubmit={handleGenerate} className="card p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="label">Punch Export File (.xlsx)</label>
            <label className="flex items-center gap-2 input cursor-pointer">
              <UploadCloud01 size={16} className="text-brand-400" />
              <span className="truncate text-brand-600">{file ? file.name : 'Choose file...'}</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div>
            <label className="label">Month</label>
            <select value={month} onChange={(e) => setMonth(+e.target.value)} className="input">
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <select value={year} onChange={(e) => setYear(+e.target.value)} className="input">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Processing...' : 'Generate Muster Roll'}
          </button>
        </div>
      </form>

      {loading && <LoadingSpinner message="Building the calendar-grid attendance sheet..." />}

      {!loading && !report && (
        <EmptyState
          title="No muster roll generated yet"
          message="Upload the punch export and choose the reporting month to get started"
        />
      )}

      {!loading && report && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              {report.sites.map((site) => (
                <button
                  key={site}
                  onClick={() => setActiveSite(site)}
                  className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${activeSite === site ? 'bg-brand-900 text-white' : 'bg-white border border-brand-200 text-brand-600 hover:bg-brand-50'}`}
                >
                  {site}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary text-sm" disabled={!!downloading} onClick={() => handleDownload('excel')}>
                <File04 size={15} /> {downloading === 'excel' ? 'Preparing...' : 'Download Excel'}
              </button>
              <button className="btn-secondary text-sm" disabled={!!downloading} onClick={() => handleDownload('pdf')}>
                <File02 size={15} /> {downloading === 'pdf' ? 'Preparing...' : 'PDF (All Sites)'}
              </button>
              <Link to="/attendance-reports/downloads" className="btn-secondary text-sm">
                <Download01 size={15} /> All Downloads
              </Link>
            </div>
          </div>

          <p className="text-sm text-brand-400 mb-4">
            {report.monthTitle} &middot; {report.daysInMonth} days &middot; {report.sites.length} site{report.sites.length !== 1 ? 's' : ''}
          </p>

          {activeSiteBreakdown && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Employees" value={activeSiteBreakdown.employeeCount} icon={Users01} />
              <StatCard label="Total Site Attendance" value={activeSiteBreakdown.totalSiteAttendance} icon={Calendar} tone="green" />
              <StatCard label="Total Half Days" value={activeSiteBreakdown.totalHalfDays} icon={Calendar} tone="yellow" />
              <StatCard label="Sites Covered" value={report.sites.length} icon={Building07} sub={`${activeSiteBreakdown.totalMissingPunches} missing punch day(s)`} />
            </div>
          )}

          {activeSiteData && (
            <div className="card overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-brand-100 flex items-center justify-between">
                <p className="text-sm font-medium text-brand-900">Calendar Grid - {activeSite}</p>
                <button
                  onClick={() => handleDownload('pdf', activeSite)}
                  disabled={!!downloading}
                  className="btn-secondary text-xs py-1"
                >
                  <File02 size={12} /> {downloading === `pdf-${activeSite}` ? 'Preparing...' : 'This Site PDF'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse">
                  <thead>
                    <tr className="table-header">
                      <th className="px-3 py-2 text-left sticky left-0 bg-brand-50">Name</th>
                      {Array.from({ length: report.daysInMonth }, (_, i) => (
                        <th key={i} className="px-1.5 py-2 text-center w-7">{i + 1}</th>
                      ))}
                      <th className="px-3 py-2 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-50">
                    {activeSiteData.employees.map((emp) => (
                      <tr key={`${emp.empId}-${emp.name}`} className="hover:bg-brand-50">
                        <td className="px-3 py-1.5 font-medium text-brand-900 whitespace-nowrap sticky left-0 bg-white">{emp.name}</td>
                        {emp.dailyStatus.map((status, i) => (
                          <td key={i} className="px-0.5 py-1.5 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-semibold ${STATUS_STYLES[status] || ''}`}>
                              {status}
                            </span>
                          </td>
                        ))}
                        <td className="px-3 py-1.5 text-center font-semibold">{emp.totalAttendance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-brand-100 text-xs text-brand-400">
                <span className="inline-flex items-center gap-1 mr-3"><span className={`inline-block w-3 h-3 rounded ${STATUS_STYLES.P}`} /> P = Full Duty</span>
                <span className="inline-flex items-center gap-1 mr-3"><span className={`inline-block w-3 h-3 rounded ${STATUS_STYLES.H}`} /> H = Half Duty</span>
                <span className="inline-flex items-center gap-1 mr-3"><span className={`inline-block w-3 h-3 rounded ${STATUS_STYLES.M}`} /> M = Missing Punch</span>
                <span className="inline-flex items-center gap-1 mr-3"><span className={`inline-block w-3 h-3 rounded ${STATUS_STYLES.A}`} /> A = Absent</span>
                <span className="inline-flex items-center gap-1"><span className={`inline-block w-3 h-3 rounded ${STATUS_STYLES.WO}`} /> WO = Weekly Off</span>
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-brand-100">
              <p className="text-sm font-medium text-brand-900">Site-wise Summary &amp; Per-Site PDF Downloads</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="px-4 py-3 text-left">Site</th>
                    <th className="px-4 py-3 text-center">Employees</th>
                    <th className="px-4 py-3 text-right">Total Attendance</th>
                    <th className="px-4 py-3 text-center">Half Days</th>
                    <th className="px-4 py-3 text-center">Missing Punches</th>
                    <th className="px-4 py-3 text-center">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {report.siteBreakdown.map((s) => (
                    <tr key={s.site} className="hover:bg-brand-50">
                      <td className="px-4 py-3 font-medium text-brand-900">{s.site}</td>
                      <td className="px-4 py-3 text-center">{s.employeeCount}</td>
                      <td className="px-4 py-3 text-right">{s.totalSiteAttendance}</td>
                      <td className="px-4 py-3 text-center">{s.totalHalfDays}</td>
                      <td className="px-4 py-3 text-center">{s.totalMissingPunches}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDownload('pdf', s.site)}
                          disabled={!!downloading}
                          className="btn-secondary text-xs py-1"
                        >
                          <File02 size={12} /> {downloading === `pdf-${s.site}` ? '...' : 'Site PDF'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
