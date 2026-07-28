import { useEffect, useState } from 'react'
import { Plus } from '@untitledui/icons'
import { getShifts, createShift, assignShift, recordOvertime, getOvertimeByMonth } from '../../api/shifts'
import { getEmployees } from '../../api/employees'
import { useAuth } from '../../context/AuthContext'
import { useForm } from 'react-hook-form'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { formatCurrency, MONTHS } from '../../utils/format'
import toast from 'react-hot-toast'

export default function ShiftsPage() {
  const { canWrite } = useAuth()
  const now = new Date()
  const [tab, setTab] = useState('shifts')
  const [shifts, setShifts] = useState([])
  const [employees, setEmployees] = useState([])
  const [overtime, setOvertime] = useState([])
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [loading, setLoading] = useState(true)
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showOvertimeModal, setShowOvertimeModal] = useState(false)
  const shiftForm = useForm()
  const assignForm = useForm()
  const overtimeForm = useForm()

  const load = () => {
    setLoading(true)
    Promise.all([getShifts(), getEmployees(), getOvertimeByMonth(month, year)])
      .then(([sR, eR, oR]) => {
        setShifts(sR.data?.data ?? [])
        setEmployees(eR.data?.data ?? [])
        setOvertime(oR.data?.data ?? [])
      }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [month, year])

  const onCreateShift = async (data) => {
    try {
      await createShift({ ...data, isNightShift: !!data.isNightShift })
      toast.success('Shift created')
      shiftForm.reset()
      setShowShiftModal(false)
      load()
    } catch {/* handled */}
  }

  const onAssign = async (data) => {
    try {
      await assignShift({ ...data, employeeId: Number(data.employeeId), shiftId: Number(data.shiftId) })
      toast.success('Shift assigned')
      assignForm.reset()
      setShowAssignModal(false)
    } catch {/* handled */}
  }

  const onRecordOvertime = async (data) => {
    try {
      await recordOvertime({
        ...data, employeeId: Number(data.employeeId), month, year,
        hours: Number(data.hours), rate: Number(data.rate),
      })
      toast.success('Overtime recorded')
      overtimeForm.reset()
      setShowOvertimeModal(false)
      load()
    } catch {/* handled */}
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div>
      <PageHeader
        title="Shifts & Overtime"
        subtitle="Manage shift schedules and overtime pay that feeds into payroll"
        action={canWrite() && (
          <div className="flex gap-2">
            <button onClick={() => setShowShiftModal(true)} className="btn-secondary"><Plus size={16}/> Add Shift</button>
            <button onClick={() => setShowAssignModal(true)} className="btn-secondary"><Plus size={16}/> Assign Shift</button>
            <button onClick={() => setShowOvertimeModal(true)} className="btn-primary"><Plus size={16}/> Record Overtime</button>
          </div>
        )}
      />

      <div className="flex gap-1 mb-5 border border-brand-200 p-1 rounded w-fit">
        {[{id:'shifts',label:'Shifts'},{id:'overtime',label:'Overtime'}].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-brand-900 text-white' : 'text-brand-600 hover:bg-brand-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overtime' && (
        <div className="flex gap-3 mb-5">
          <select value={month} onChange={e => setMonth(+e.target.value)} className="input w-40">
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(+e.target.value)} className="input w-28">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {loading ? <LoadingSpinner /> : tab === 'shifts' ? (
        shifts.length === 0 ? <EmptyState title="No shifts configured" /> : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Start</th>
                  <th className="px-4 py-3 text-left">End</th>
                  <th className="px-4 py-3 text-center">Night Shift</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {shifts.map(s => (
                  <tr key={s.id} className="hover:bg-brand-50">
                    <td className="px-4 py-3 font-medium text-brand-900">{s.name}</td>
                    <td className="px-4 py-3 text-brand-600">{s.startTime}</td>
                    <td className="px-4 py-3 text-brand-600">{s.endTime}</td>
                    <td className="px-4 py-3 text-center">{s.isNightShift ? <span className="badge-blue">Night</span> : <span className="badge-gray">Day</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        overtime.length === 0 ? <EmptyState title="No overtime recorded for this period" /> : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-right">Hours</th>
                  <th className="px-4 py-3 text-right">Rate/hr</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {overtime.map(o => (
                  <tr key={o.id} className="hover:bg-brand-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-900">{o.employeeName}</p>
                      <p className="text-xs text-brand-400">{o.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3 text-right">{o.hours}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(o.rate)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-900">{formatCurrency(o.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {showShiftModal && (
        <Modal title="Add Shift" onClose={() => setShowShiftModal(false)}>
          <form onSubmit={shiftForm.handleSubmit(onCreateShift)} className="space-y-4">
            <div>
              <label className="label">Shift Name *</label>
              <input {...shiftForm.register('name', { required: true })} className="input" placeholder="e.g. Night Shift A" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start Time *</label>
                <input {...shiftForm.register('startTime', { required: true })} type="time" className="input" />
              </div>
              <div>
                <label className="label">End Time *</label>
                <input {...shiftForm.register('endTime', { required: true })} type="time" className="input" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-brand-700">
              <input type="checkbox" {...shiftForm.register('isNightShift')} /> Night shift
            </label>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={shiftForm.formState.isSubmitting} className="btn-primary">
                {shiftForm.formState.isSubmitting ? 'Saving...' : 'Add Shift'}
              </button>
              <button type="button" onClick={() => setShowShiftModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {showAssignModal && (
        <Modal title="Assign Shift" onClose={() => setShowAssignModal(false)}>
          <form onSubmit={assignForm.handleSubmit(onAssign)} className="space-y-4">
            <div>
              <label className="label">Employee *</label>
              <select {...assignForm.register('employeeId', { required: true })} className="input">
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeCode})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Shift *</label>
              <select {...assignForm.register('shiftId', { required: true })} className="input">
                <option value="">Select shift</option>
                {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Effective Date</label>
              <input {...assignForm.register('effectiveDate')} type="date" className="input" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={assignForm.formState.isSubmitting} className="btn-primary">
                {assignForm.formState.isSubmitting ? 'Saving...' : 'Assign'}
              </button>
              <button type="button" onClick={() => setShowAssignModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {showOvertimeModal && (
        <Modal title="Record Overtime" onClose={() => setShowOvertimeModal(false)}>
          <form onSubmit={overtimeForm.handleSubmit(onRecordOvertime)} className="space-y-4">
            <p className="text-xs text-brand-400">For {MONTHS[month-1]} {year} — change the period above before opening this form if needed.</p>
            <div>
              <label className="label">Employee *</label>
              <select {...overtimeForm.register('employeeId', { required: true })} className="input">
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeCode})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Hours *</label>
                <input {...overtimeForm.register('hours', { required: true })} type="number" step="0.5" min="0.5" className="input" />
              </div>
              <div>
                <label className="label">Rate per Hour (₹) *</label>
                <input {...overtimeForm.register('rate', { required: true })} type="number" step="0.01" min="0" className="input" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={overtimeForm.formState.isSubmitting} className="btn-primary">
                {overtimeForm.formState.isSubmitting ? 'Saving...' : 'Record Overtime'}
              </button>
              <button type="button" onClick={() => setShowOvertimeModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
