import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, UploadCloud01, File04, File02, Building07, Hourglass01, Clipboard } from '@untitledui/icons'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import PageHeader from '../../components/PageHeader'
import Breadcrumbs from '../../components/Breadcrumbs'
import StatCard from '../../components/StatCard'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { MONTHS } from '../../utils/format'
import {
  previewProductReport, downloadProductExcel, downloadProductPdf, saveBlobResponse,
} from '../../api/attendanceReports'

export default function ProductAttendanceReport() {
  const now = new Date()
  const [file, setFile] = useState(null)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState('')
  const [report, setReport] = useState(null)

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i + 1)

  async function handleGenerate(e) {
    e.preventDefault()
    if (!file) return toast.error('Select the punch export Excel file first')

    setLoading(true)
    try {
      const res = await previewProductReport(file, year, month)
      setReport(res.data?.data ?? null)
      toast.success('Report generated successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload(type) {
    setDownloading(type)
    try {
      if (type === 'excel') {
        const res = await downloadProductExcel()
        saveBlobResponse(res, `Product_Attendance_${report.year}_${report.month}.xlsx`)
      } else {
        const res = await downloadProductPdf()
        saveBlobResponse(res, `Product_Attendance_${report.year}_${report.month}.pdf`)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Download failed')
    } finally {
      setDownloading('')
    }
  }

  const siteChartData = report
    ? report.siteBreakdown.map((s) => ({ site: s.site, Duty: s.totalDuty, OT: s.totalOvertime }))
    : []

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Attendance Reports', to: '/attendance-reports' }, { label: 'Haldiram Product Attendance Report' }]} />
      <PageHeader
        title="Haldiram Product Attendance Report"
        subtitle="Daily duty status, overtime and consolidated cross-site attendance summary"
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
            {loading ? 'Processing...' : 'Generate Report'}
          </button>
        </div>
      </form>

      {loading && <LoadingSpinner message="Reading punch data and calculating duty summary..." />}

      {!loading && !report && (
        <EmptyState
          title="No report generated yet"
          message="Upload the production punch export and choose the reporting month to get started"
        />
      )}

      {!loading && report && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-brand-400">
              {report.monthTitle} &middot; {report.sites.length} site{report.sites.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <button className="btn-secondary text-sm" disabled={!!downloading} onClick={() => handleDownload('excel')}>
                <File04 size={15} /> {downloading === 'excel' ? 'Preparing...' : 'Download Excel'}
              </button>
              <button className="btn-secondary text-sm" disabled={!!downloading} onClick={() => handleDownload('pdf')}>
                <File02 size={15} /> {downloading === 'pdf' ? 'Preparing...' : 'Download PDF'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Duty Units" value={report.consolidated.grandTotals.duty.toFixed(1)} icon={Clipboard} tone="green" />
            <StatCard label="Total Overtime (Hrs)" value={report.consolidated.grandTotals.overtime} icon={Hourglass01} tone="blue" />
            <StatCard label="Sites Covered" value={report.sites.length} icon={Building07} />
            <StatCard label="Daily Entries Logged" value={report.consolidated.dailyEntries.length} icon={Clipboard} />
          </div>

          <div className="card p-5 mb-6">
            <p className="text-sm font-medium text-brand-900 mb-3">Duty &amp; Overtime by Site</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={siteChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                <XAxis dataKey="site" tick={{ fontSize: 12, fill: '#525252' }} />
                <YAxis tick={{ fontSize: 12, fill: '#525252' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Duty" fill="#111111" />
                <Bar dataKey="OT" fill="#a8a8a8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-brand-100">
              <p className="text-sm font-medium text-brand-900">Site-wise Summary</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="px-4 py-3 text-left">Site</th>
                    <th className="px-4 py-3 text-center">Employees</th>
                    <th className="px-4 py-3 text-center">Daily Entries</th>
                    <th className="px-4 py-3 text-right">Total Duty</th>
                    <th className="px-4 py-3 text-right">Total OT (Hrs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {report.siteBreakdown.map((s) => (
                    <tr key={s.site} className="hover:bg-brand-50">
                      <td className="px-4 py-3 font-medium text-brand-900">{s.site}</td>
                      <td className="px-4 py-3 text-center">{s.employeeCount}</td>
                      <td className="px-4 py-3 text-center">{s.dailyEntryCount}</td>
                      <td className="px-4 py-3 text-right">{s.totalDuty.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">{s.totalOvertime.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-brand-100">
                <p className="text-sm font-medium text-brand-900">Duty Summary (Consolidated)</p>
              </div>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="table-header">
                      <th className="px-4 py-2 text-left">ID No</th>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-right">Total Duty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-50">
                    {report.consolidated.dutySummary.map((d) => (
                      <tr key={`${d.idNo}-${d.name}`} className="hover:bg-brand-50">
                        <td className="px-4 py-2">{d.idNo}</td>
                        <td className="px-4 py-2">{d.name}</td>
                        <td className="px-4 py-2 text-right">{d.totalDuty.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-brand-100">
                <p className="text-sm font-medium text-brand-900">Overtime Summary (Consolidated)</p>
              </div>
              <div className="overflow-x-auto max-h-80">
                {report.consolidated.overtimeSummary.length === 0 ? (
                  <p className="text-sm text-brand-400 px-4 py-6 text-center">No overtime recorded for this period</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="table-header">
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-right">Total OT (Hrs)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-50">
                      {report.consolidated.overtimeSummary.map((o) => (
                        <tr key={o.name} className="hover:bg-brand-50">
                          <td className="px-4 py-2">{o.name}</td>
                          <td className="px-4 py-2 text-right">{o.totalOvertime}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
