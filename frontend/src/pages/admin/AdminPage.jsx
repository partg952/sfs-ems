import { useEffect, useState } from 'react'
import { Plus, Toggle01Left, Toggle01Right, Edit01 } from '@untitledui/icons'
import { getUsers, createUser, updateUser, toggleUser, getSlipTemplate, updateSlipTemplate } from '../../api/admin'
import { getEmployees } from '../../api/employees'
import { useForm } from 'react-hook-form'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import { formatDate, roleBadge } from '../../utils/format'
import toast from 'react-hot-toast'

const ROLES = ['SUPER_ADMIN','HR_MANAGER','HR_STAFF','ACCOUNTS','VIEWER','EMPLOYEE']

const SLIP_PLACEHOLDERS = [
  'employeeName', 'employeeCode', 'designation', 'siteName', 'esicNumber', 'epfNumber',
  'monthName', 'month', 'year', 'attendanceDays', 'totalWorkingDays', 'grossSalary',
  'overtimeEarning', 'esicDeduction', 'epfDeduction', 'advanceDeduction', 'fineDeduction',
  'rentDeduction', 'totalDeductions', 'netSalary', 'transactionId',
]

function SlipTemplateEditor() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    getSlipTemplate().then(r => setContent(r.data?.data ?? '')).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSlipTemplate(content)
      toast.success('Salary slip template saved')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-5 mb-6">
      <h3 className="font-semibold text-brand-900 mb-1">Salary Slip Template</h3>
      <p className="text-xs text-brand-400 mb-3">
        Upload/edit the HTML used to generate every employee's salary slip. Use these placeholders — they are
        replaced automatically for each slip: {SLIP_PLACEHOLDERS.map(p => `{{${p}}}`).join(', ')}.
      </p>
      {loading ? <LoadingSpinner /> : (
        <>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="input font-mono text-xs"
            spellCheck={false}
          />
          <div className="flex gap-3 pt-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Template'}
            </button>
            <button onClick={load} className="btn-secondary">Reload</button>
          </div>
        </>
      )}
    </div>
  )
}

export default function AdminPage() {
  const [users,     setUsers]     = useState([])
  const [employees, setEmployees] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm()
  const selectedRole = watch('role')

  const load = () => {
    setLoading(true)
    Promise.all([getUsers(), getEmployees()]).then(([uR, eR]) => {
      setUsers(uR.data?.data ?? [])
      setEmployees(eR.data?.data ?? [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); reset({}); setShowModal(true) }
  const openEdit   = (u)  => {
    setEditing(u)
    reset({ username: u.username, fullName: u.fullName, role: u.role, employeeId: u.employeeId ?? '', password: '' })
    setShowModal(true)
  }

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, employeeId: data.role === 'EMPLOYEE' && data.employeeId ? Number(data.employeeId) : null }
      if (editing) {
        await updateUser(editing.id, payload)
        toast.success('User updated')
      } else {
        await createUser(payload)
        toast.success('User created')
      }
      setShowModal(false)
      load()
    } catch {/* handled */}
  }

  const handleToggle = async (id) => {
    try {
      await toggleUser(id)
      toast.success('User status changed')
      load()
    } catch {/* handled */}
  }

  return (
    <div>
      <PageHeader
        title="System Administration"
        subtitle="Manage user accounts and role-based access"
        action={
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Add User
          </button>
        }
      />

      {/* Role legend */}
      <div className="card p-4 mb-5">
        <p className="text-xs font-semibold text-brand-400 uppercase mb-3">Role Permissions</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { role: 'SUPER_ADMIN', desc: 'Full access including user management' },
            { role: 'HR_MANAGER',  desc: 'All employee data, payroll processing' },
            { role: 'HR_STAFF',    desc: 'Attendance, advances, fines entry' },
            { role: 'ACCOUNTS',    desc: 'View payroll, generate reports' },
            { role: 'VIEWER',      desc: 'Read-only access to employee data' },
            { role: 'EMPLOYEE',    desc: 'Self-service: own payslips, leave, grievances' },
          ].map(({ role, desc }) => (
            <div key={role} className="p-3 bg-brand-50 rounded">
              <span className={`${roleBadge(role)} mb-1`}>{role.replace(/_/g,' ')}</span>
              <p className="text-xs text-brand-400 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <SlipTemplateEditor />

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Username</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-brand-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center text-xs ring-2 ring-white shadow-sm">
                        {u.fullName.charAt(0)}
                      </div>
                      <span className="font-medium text-brand-900">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-brand-500">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className={roleBadge(u.role)}>{u.role?.replace(/_/g,' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={u.isActive ? 'badge-green' : 'badge-red'}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brand-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => openEdit(u)} className="text-brand-600 hover:text-brand-900">
                        <Edit01 size={15} />
                      </button>
                      <button onClick={() => handleToggle(u.id)}
                        className={u.isActive ? 'text-red-500 hover:text-red-700' : 'text-brand-600 hover:text-brand-900'}>
                        {u.isActive ? <Toggle01Right size={18} /> : <Toggle01Left size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit User' : 'Add New User'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Full Name *</label>
              <input {...register('fullName', { required: 'Full name is required' })} className="input" placeholder="Full name" />
              {errors.fullName && <p className="text-red-600 text-xs mt-1">{errors.fullName.message}</p>}
            </div>
            <div>
              <label className="label">Username *</label>
              <input
                {...register('username', { required: 'Username is required' })}
                className="input" placeholder="username"
                disabled={!!editing}
              />
              {errors.username && <p className="text-red-600 text-xs mt-1">{errors.username.message}</p>}
            </div>
            <div>
              <label className="label">{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input
                {...register('password', { required: !editing && 'Password is required' })}
                type="password" className="input" placeholder="••••••••"
              />
              {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="label">Role *</label>
              <select {...register('role', { required: true })} className="input">
                <option value="">Select role</option>
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            {selectedRole === 'EMPLOYEE' && (
              <div>
                <label className="label">Linked Employee *</label>
                <select {...register('employeeId', { required: selectedRole === 'EMPLOYEE' })} className="input">
                  <option value="">Select employee</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.employeeCode})</option>
                  ))}
                </select>
                {errors.employeeId && <p className="text-red-600 text-xs mt-1">Linked employee is required</p>}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Saving...' : editing ? 'Update User' : 'Create User'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
