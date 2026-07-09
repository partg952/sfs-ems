import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Edit01, ArrowLeft, Camera01 } from '@untitledui/icons'
import { getEmployee, updateStatus, getStatusHistory, getEmploymentHistory, getTransactionHistory, uploadEmployeePhoto } from '../../api/employees'
import { getRoomByEmployee, getUniformByEmployee } from '../../api/assets'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/PageHeader'
import Breadcrumbs from '../../components/Breadcrumbs'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import { formatDate, formatCurrency, statusBadge } from '../../utils/format'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'

const TRANSACTION_LABELS = { ADVANCE: 'Advance', FINE: 'Fine', PAYROLL: 'Salary Payment' }
const TRANSACTION_BADGES = {
  ADVANCE: 'badge-yellow',
  FINE: 'badge-red',
  PAYROLL: 'badge-green',
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-brand-50 last:border-0">
      <span className="text-sm text-brand-400">{label}</span>
      <span className="text-sm font-medium text-brand-800 text-right max-w-xs">{value || '—'}</span>
    </div>
  )
}

export default function EmployeeProfile() {
  const { id } = useParams()
  const { canWrite } = useAuth()
  const [emp,          setEmp]          = useState(null)
  const [history,      setHistory]      = useState([])
  const [empHistory,   setEmpHistory]   = useState([])
  const [transactions, setTransactions] = useState([])
  const [room,     setRoom]     = useState(null)
  const [uniform,  setUniform]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [showStatus, setShowStatus] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const { register, handleSubmit, formState: { isSubmitting } } = useForm()
  const photoInputRef = useRef()

  const load = () => {
    setLoading(true)
    Promise.all([
      getEmployee(id),
      getStatusHistory(id),
      getEmploymentHistory(id),
      getTransactionHistory(id),
      getRoomByEmployee(id),
      getUniformByEmployee(id),
    ]).then(([eR, hR, ehR, tR, rR, uR]) => {
      setEmp(eR.data?.data)
      setHistory(hR.data?.data ?? [])
      setEmpHistory(ehR.data?.data ?? [])
      setTransactions(tR.data?.data ?? [])
      setRoom(rR.data?.data)
      setUniform(uR.data?.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const onStatusSubmit = async (data) => {
    try {
      await updateStatus(id, data)
      toast.success('Status updated')
      setShowStatus(false)
      load()
    } catch {/* handled */}
  }

  const onPhotoSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      await uploadEmployeePhoto(id, file)
      toast.success('Photo updated')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  if (loading) return <LoadingSpinner />
  if (!emp) return <p className="text-center text-brand-400 mt-20">Employee not found</p>

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Employees', to: '/employees' },
        { label: emp.name },
      ]} />
      <div className="flex items-center gap-3 mb-6">
        <Link to="/employees" className="text-brand-400 hover:text-brand-700">
          <ArrowLeft size={20} />
        </Link>
        <PageHeader
          title={emp.name}
          subtitle={`${emp.employeeCode} - ${emp.designation} - ${emp.siteName}`}
          action={
            <div className="flex gap-2">
              {canWrite() && (
                <>
                  <button onClick={() => setShowStatus(true)} className="btn-secondary">Change Status</button>
                  <Link to={`/employees/${id}/edit`} className="btn-primary"><Edit01 size={16}/>Edit</Link>
                </>
              )}
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="space-y-4">
          {/* Avatar & status */}
          <div className="card p-6 text-center">
            <div className="relative w-20 h-20 mx-auto mb-3">
              {emp.photoUrl ? (
                <img src={emp.photoUrl} alt={emp.name} className="w-20 h-20 rounded-full object-cover ring-4 ring-brand-50 shadow-sm" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-brand-100 text-brand-700 font-semibold text-2xl flex items-center justify-center ring-4 ring-brand-50 shadow-sm">
                  {emp.name.charAt(0)}
                </div>
              )}
              {canWrite() && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  title="Change photo"
                  className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-brand-900 text-white flex items-center justify-center hover:bg-brand-700"
                >
                  <Camera01 size={12} />
                </button>
              )}
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoSelected} />
            </div>
            <h2 className="font-semibold text-brand-900">{emp.name}</h2>
            <p className="text-brand-400 text-sm">{emp.designation}</p>
            <div className="mt-3">
              <span className={statusBadge(emp.status)}>{emp.status}</span>
            </div>
          </div>

          {/* Quick links */}
          <div className="card p-4 space-y-1">
            <Link to="/ledger/advances" className="flex items-center gap-3 p-2 hover:bg-brand-50 rounded text-sm text-brand-700">
              View Advances
            </Link>
            <Link to="/ledger/fines" className="flex items-center gap-3 p-2 hover:bg-brand-50 rounded text-sm text-brand-700">
              View Fines
            </Link>
            <Link to="/assets" className="flex items-center gap-3 p-2 hover:bg-brand-50 rounded text-sm text-brand-700">
              Room and Uniform
            </Link>
          </div>
        </div>

        {/* Right columns */}
        <div className="lg:col-span-2 space-y-4">
          {/* Personal */}
          <div className="card p-5">
            <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-3">Personal Details</h3>
            <InfoRow label="Date of Birth"   value={formatDate(emp.dateOfBirth)} />
            <InfoRow label="Mobile"          value={emp.mobileNumber} />
            <InfoRow label="Address"         value={emp.address} />
          </div>

          {/* Employment */}
          <div className="card p-5">
            <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-3">Employment Details</h3>
            <InfoRow label="Employee Code"  value={emp.employeeCode} />
            <InfoRow label="Site"           value={emp.siteName} />
            <InfoRow label="Designation"    value={emp.designation} />
            <InfoRow label="Daily Wage"     value={formatCurrency(emp.dailyWage)} />
            <InfoRow label="Monthly Wage"   value={formatCurrency(emp.monthlyWage)} />
            <InfoRow label="Joining Date"   value={formatDate(emp.joiningDate)} />
            {emp.leavingDate && <InfoRow label="Leaving Date" value={formatDate(emp.leavingDate)} />}
          </div>

          {/* Compliance */}
          <div className="card p-5">
            <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-3">Compliance</h3>
            <InfoRow label="ESIC Number" value={emp.esicNumber} />
            <InfoRow label="EPF Number"  value={emp.epfNumber} />
          </div>

          {/* Assets */}
          <div className="card p-5">
            <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-3">Assets</h3>
            {room ? (
              <div className="mb-2">
                <InfoRow label="Room" value={`${room.roomNumber || 'Assigned'} - Rs.${room.rentAmount}`} />
                <InfoRow label="Sharing Count" value={room.sharingCount} />
              </div>
            ) : <p className="text-sm text-brand-300 mb-2">No room allotment</p>}
            {uniform ? (
              <InfoRow label="Uniform" value={uniform.isAllotted ? (uniform.isReturned ? 'Returned' : 'Allotted') : 'Not allotted'} />
            ) : <p className="text-sm text-brand-300">No uniform record</p>}
          </div>

          {/* Transaction history */}
          <div className="card p-5">
            <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-3">Transaction History</h3>
            {transactions.length === 0 ? (
              <p className="text-sm text-brand-300">No transactions recorded</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {transactions.map(t => (
                  <div key={t.transactionId} className="flex justify-between items-center text-sm border-b border-brand-50 last:border-0 pb-2 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={TRANSACTION_BADGES[t.type] || 'badge-gray'}>{TRANSACTION_LABELS[t.type] || t.type}</span>
                        <span className="font-mono text-xs text-brand-400">{t.transactionId}</span>
                      </div>
                      {t.remark && <p className="text-xs text-brand-500 mt-1">{t.remark}</p>}
                      <p className="text-xs text-brand-400">{formatDate(t.transactionDate)}</p>
                    </div>
                    <span className="font-medium text-brand-800">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Employment history */}
          {empHistory.length > 0 && (
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-3">Employment History</h3>
              <div className="space-y-3">
                {empHistory.map(h => (
                  <div key={h.id} className="text-sm border-b border-brand-50 last:border-0 pb-2 last:pb-0">
                    <div className="flex justify-between items-center">
                      <span className="text-brand-700">
                        {h.oldDesignation !== h.newDesignation && `${h.oldDesignation || '—'} → ${h.newDesignation || '—'}`}
                        {h.oldDesignation === h.newDesignation && (h.newDesignation || '—')}
                      </span>
                      <span className="text-brand-400 text-xs">{formatDate(h.changedAt)}</span>
                    </div>
                    <p className="text-xs text-brand-500 mt-1">
                      Site: {h.oldSiteId !== h.newSiteId ? `${h.oldSiteName || '—'} → ${h.newSiteName || '—'}` : (h.newSiteName || '—')}
                    </p>
                    {(h.oldDailyWage != null || h.newDailyWage != null) && h.oldDailyWage !== h.newDailyWage && (
                      <p className="text-xs text-brand-500">Daily Wage: {formatCurrency(h.oldDailyWage)} → {formatCurrency(h.newDailyWage)}</p>
                    )}
                    {(h.oldMonthlyWage != null || h.newMonthlyWage != null) && h.oldMonthlyWage !== h.newMonthlyWage && (
                      <p className="text-xs text-brand-500">Monthly Wage: {formatCurrency(h.oldMonthlyWage)} → {formatCurrency(h.newMonthlyWage)}</p>
                    )}
                    {h.changedBy && <p className="text-xs text-brand-300 mt-1">Changed by {h.changedBy}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status history */}
          {history.length > 0 && (
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-3">Status History</h3>
              <div className="space-y-2">
                {history.slice(0, 5).map(h => (
                  <div key={h.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className={statusBadge(h.newStatus)}>{h.newStatus}</span>
                      {h.remark && <span className="ml-2 text-brand-500">{h.remark}</span>}
                    </div>
                    <span className="text-brand-400 text-xs">{formatDate(h.changedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status change modal */}
      {showStatus && (
        <Modal title="Update Employee Status" onClose={() => setShowStatus(false)}>
          <form onSubmit={handleSubmit(onStatusSubmit)} className="space-y-4">
            <div>
              <label className="label">New Status</label>
              <select {...register('status', { required: true })} className="input">
                <option value="ACTIVE">Active</option>
                <option value="LEFT">Left</option>
                <option value="REJOINED">Rejoined</option>
              </select>
            </div>
            <div>
              <label className="label">Remark</label>
              <input {...register('remark')} className="input" placeholder="Reason for status change" />
            </div>
            <div>
              <label className="label">Effective Date</label>
              <input {...register('effectiveDate')} type="date" className="input" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Saving...' : 'Update Status'}
              </button>
              <button type="button" onClick={() => setShowStatus(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
