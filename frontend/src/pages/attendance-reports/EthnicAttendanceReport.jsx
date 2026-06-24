import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, UploadCloud01, File04, File02, Clock, Users01, Building07, Hourglass01 } from '@untitledui/icons'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import PageHeader from '../../components/PageHeader'
import Breadcrumbs from '../../components/Breadcrumbs'
import StatCard from '../../components/StatCard'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { MONTHS } from '../../utils/format'
import {
  previewEthnicReport, downloadEthnicExcel, downloadEthnicPdf, saveBlobResponse,
} from '../../api/attendanceReports'

// Flat grayscale palette for charts - matches the no-gradient brand theme
const CHART_COLORS = ['#111111', '#525252', '#a8a8a8', '#3d3d3d', '#737373', '#d0d0d0']

export default function EthnicAttendanceReport() {
  const now = new Date()
  const [file, setFile] = useState(null)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [shiftView, setShiftView] = useState(8)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState('')
  const [report, setReport] = useState(null)

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i + 1)

  async function handleGenerate(e) {
    e.preventDefault()
    if (!file) return toast.error('Select the punch export Excel file first')

    setLoading(true)
    try {
      const res = await previewEthnicReport(file, year, month)
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
        const res = await downloadEthnicExcel()
        saveBlobResponse(res, `Ethnic_Attendance_${report.year}_${report.month}.xlsx`)
      } else {
        const res = await downloadEthnicPdf(shiftView)
        saveBlobResponse(res, `Ethnic_Attendance_${shiftView}Hour_${report.year}_${report.month}.pdf`)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Download failed')
    } finally {
      setDownloading('')
    }
  }

  const grand = report ? (shiftView === 9 ? report.grandTotals.shift9 : report.grandTotals.shift8) : null
  const siteChartData = report
    ? report.siteBreakdown.map((s) => {
        const t = shiftView === 9 ? s.shift9 : s.shift8
        return { site: s.site, Full: t.full, Half: t.half, OT: Math.round(t.ot * 100) / 100, Missing: t.missing }
      })
    : []
  const pieData = report
    ? report.siteBreakdown.map((s) => ({ name: s.site, value: shiftView === 9 ? s.shift9.days : s.shift8.days }))
    : []

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Attendance Reports', to: '/attendance-reports' }, { label: 'Ethnic Attendance Report' }]} />
      <PageHeader
        title="Ethnic Attendance Report"
        subtitle="Housekeeping staff punch automation - 8-hour and 9-hour shift duty calculation"
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
          message="Upload the housekeeping punch export and choose the reporting month to get started"
        />
      )}

      {!loading && report && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-brand-400">Shift view:</span>
              <div className="inline-flex rounded border border-brand-200 overflow-hidden">
                {[8, 9].map((s) => (
                  <button
                    key={s}
                    onClick={() => setShiftView(s)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${shiftView === s ? 'bg-brand-900 text-white' : 'bg-white text-brand-600 hover:bg-brand-50'}`}
                  >
                    {s}-Hour Shift
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary text-sm" disabled={!!downloading} onClick={() => handleDownload('excel')}>
                <File04 size={15} /> {downloading === 'excel' ? 'Preparing...' : 'Download Excel'}
              </button>
              <button className="btn-secondary text-sm" disabled={!!downloading} onClick={() => handleDownload('pdf')}>
                <File02 size={15} /> {downloading === 'pdf' ? 'Preparing...' : `Download PDF (${shiftView}hr)`}
              </button>
            </div>
          </div>

          <p className="text-sm text-brand-400 mb-4">
            {report.monthTitle} &middot; {report.sites.length} site{report.sites.length !== 1 ? 's' : ''}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Full Duty Days" value={grand.full} icon={Users01} tone="green" />
            <StatCard label="Half Duty Days" value={grand.half} icon={Clock} tone="yellow" />
            <StatCard label="Overtime Hours" value={grand.ot.toFixed(2)} icon={Hourglass01} tone="blue" />
            <StatCard label="Sites Covered" value={report.sites.length} icon={Building07} sub={`${grand.missing} missing punch day(s)`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="card p-5 lg:col-span-2">
              <p className="text-sm font-medium text-brand-900 mb-3">Duty Breakdown by Site</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={siteChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                  <XAxis dataKey="site" tick={{ fontSize: 12, fill: '#525252' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#525252' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Full" fill="#111111" />
                  <Bar dataKey="Half" fill="#737373" />
                  <Bar dataKey="OT" fill="#a8a8a8" />
                  <Bar dataKey="Missing" fill="#d0d0d0" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card p-5">
              <p className="text-sm font-medium text-brand-900 mb-3">Attendance Days by Site</p>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label={({ name }) => name}>
                    {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="px-4 py-3 text-left">Site</th>
                    <th className="px-4 py-3 text-center">Employees</th>
                    <th className="px-4 py-3 text-center">Punches</th>
                    <th className="px-4 py-3 text-center">Days</th>
                    <th className="px-4 py-3 text-center">Full</th>
                    <th className="px-4 py-3 text-center">Half</th>
                    <th className="px-4 py-3 text-right">Hours</th>
                    <th className="px-4 py-3 text-right">OT</th>
                    <th className="px-4 py-3 text-right">Duty Units</th>
                    <th className="px-4 py-3 text-center">Missing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {report.siteBreakdown.map((s) => {
                    const t = shiftView === 9 ? s.shift9 : s.shift8
                    return (
                      <tr key={s.site} className="hover:bg-brand-50">
                        <td className="px-4 py-3 font-medium text-brand-900">{s.site}</td>
                        <td className="px-4 py-3 text-center">{s.employeeCount}</td>
                        <td className="px-4 py-3 text-center">{t.punches}</td>
                        <td className="px-4 py-3 text-center">{t.days}</td>
                        <td className="px-4 py-3 text-center">{t.full}</td>
                        <td className="px-4 py-3 text-center">{t.half}</td>
                        <td className="px-4 py-3 text-right">{t.hours.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">{t.ot.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">{t.dutyUnits.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">{t.missing}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="table-header font-semibold">
                    <td className="px-4 py-3">GRAND TOTAL</td>
                    <td className="px-4 py-3 text-center">-</td>
                    <td className="px-4 py-3 text-center">{grand.punches}</td>
                    <td className="px-4 py-3 text-center">{grand.days}</td>
                    <td className="px-4 py-3 text-center">{grand.full}</td>
                    <td className="px-4 py-3 text-center">{grand.half}</td>
                    <td className="px-4 py-3 text-right">{grand.hours.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{grand.ot.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{grand.dutyUnits.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">{grand.missing}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
