import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Printer } from '@untitledui/icons'
import { getPayrollSlip, getPayrollSlipHtml } from '../../api/payroll'
import { getEmployee } from '../../api/employees'
import LoadingSpinner from '../../components/LoadingSpinner'
import Breadcrumbs from '../../components/Breadcrumbs'
import { formatCurrency, formatDate, MONTHS } from '../../utils/format'

function Row({ label, value, bold, isDeduction }) {
  return (
    <div className={`flex justify-between py-1.5 border-b border-brand-50 last:border-0 ${bold ? 'font-semibold' : ''}`}>
      <span className="text-sm text-brand-500">{label}</span>
      <span className={`text-sm ${isDeduction ? 'text-red-600' : 'text-brand-900'} ${bold ? 'font-bold' : ''}`}>{value}</span>
    </div>
  )
}

export default function SalarySlip() {
  const { employeeId, month, year } = useParams()
  const [slip, setSlip] = useState(null)
  const [emp,  setEmp]  = useState(null)
  const [slipHtml, setSlipHtml] = useState(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef()

  useEffect(() => {
    Promise.all([
      getPayrollSlip(Number(employeeId), Number(month), Number(year)),
      getEmployee(employeeId),
      getPayrollSlipHtml(Number(employeeId), Number(month), Number(year)).catch(() => null),
    ]).then(([sR, eR, hR]) => {
      setSlip(sR.data?.data)
      setEmp(eR.data?.data)
      setSlipHtml(hR?.data?.data ?? null)
    }).finally(() => setLoading(false))
  }, [employeeId, month, year])

  const handlePrint = () => {
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Salary Slip</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; padding: 20px; color: #111; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 6px 10px; border: 1px solid #e8e8e8; font-size: 13px; }
        th { background: #f5f5f5; text-align: left; }
        .header { text-align: center; margin-bottom: 20px; }
        .section { margin: 10px 0; }
        .total-row td { font-weight: bold; background: #f5f5f5; }
      </style></head><body>${content}</body></html>
    `)
    win.document.close()
    win.print()
  }

  if (loading) return <LoadingSpinner />
  if (!slip || !emp) return <p className="text-center text-brand-400 mt-20">Slip not found</p>

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Reports', to: '/reports' },
        { label: `${emp.name} - ${MONTHS[slip.payrollMonth - 1]} ${slip.payrollYear}` },
      ]} />
      <div className="flex items-center gap-3 mb-6 no-print">
        <Link to="/reports" className="text-brand-400 hover:text-brand-700"><ArrowLeft size={20}/></Link>
        <h1 className="text-xl font-semibold text-brand-900">Salary Slip</h1>
        <button onClick={handlePrint} className="btn-primary ml-auto">
          <Printer size={16}/> Print Slip
        </button>
      </div>

      {slipHtml ? (
        <div ref={printRef} className="card max-w-2xl mx-auto p-8 slip-template" dangerouslySetInnerHTML={{ __html: slipHtml }} />
      ) : (
        <div ref={printRef} className="card max-w-2xl mx-auto p-8">
          {/* Company header */}
          <div className="text-center border-b border-brand-200 pb-5 mb-5">
            <h1 className="text-xl font-bold text-brand-900">Shreeji Facility Services</h1>
            <p className="text-brand-400 text-sm">Employee Salary Slip</p>
            <p className="text-brand-700 font-semibold mt-1">
              {MONTHS[slip.payrollMonth - 1]} {slip.payrollYear}
            </p>
          </div>

          {/* Employee info */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-6">
            <Row label="Employee Name"  value={emp.name} />
            <Row label="Employee Code"  value={emp.employeeCode} />
            <Row label="Designation"    value={emp.designation} />
            <Row label="Site"           value={emp.siteName} />
            <Row label="ESIC No."       value={emp.esicNumber || '—'} />
            <Row label="EPF No."        value={emp.epfNumber  || '—'} />
            <Row label="Days Worked"    value={`${slip.attendanceDays} / ${slip.totalWorkingDays ?? 26}`} />
          </div>

          {/* Earnings & deductions */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2">Earnings</h3>
              <Row label="Basic / Gross Salary" value={formatCurrency(slip.grossSalary)} />
              {Number(slip.overtimeEarning) > 0 && (
                <Row label="Overtime" value={formatCurrency(slip.overtimeEarning)} />
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2">Deductions</h3>
              <Row label="ESIC"     value={formatCurrency(slip.esicDeduction)}    isDeduction />
              <Row label="EPF"      value={formatCurrency(slip.epfDeduction)}     isDeduction />
              <Row label="Advance"  value={formatCurrency(slip.advanceDeduction)} isDeduction />
              <Row label="Fines"    value={formatCurrency(slip.fineDeduction)}    isDeduction />
              <Row label="Rent"     value={formatCurrency(slip.rentDeduction)}    isDeduction />
              <Row label="Total Deductions" value={formatCurrency(slip.totalDeductions)} bold isDeduction />
            </div>
          </div>

          {/* Net pay */}
          <div className="bg-brand-50 border border-brand-200 rounded p-4 flex justify-between items-center">
            <span className="text-brand-700 font-semibold">Net Pay</span>
            <span className="text-2xl font-bold text-brand-900">{formatCurrency(slip.netSalary)}</span>
          </div>

          {/* Transaction info */}
          <div className="mt-5 pt-4 border-t border-brand-100 text-xs text-brand-400 flex justify-between">
            <span>Transaction ID: {slip.transactionId}</span>
            <span>Generated: {formatDate(new Date())}</span>
          </div>

          {/* Signature line */}
          <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
            <div className="text-center border-t border-brand-300 pt-2">
              <p className="text-brand-400">Employee Signature</p>
            </div>
            <div className="text-center border-t border-brand-300 pt-2">
              <p className="text-brand-400">Authorized Signatory</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
