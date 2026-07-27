import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Printer } from '@untitledui/icons'
import { getMyPayslipHtml } from '../../api/self'
import LoadingSpinner from '../../components/LoadingSpinner'
import Breadcrumbs from '../../components/Breadcrumbs'
import { MONTHS } from '../../utils/format'

export default function SelfSlip() {
  const { month, year } = useParams()
  const [html, setHtml] = useState(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef()

  useEffect(() => {
    getMyPayslipHtml(Number(month), Number(year))
      .then(r => setHtml(r.data?.data ?? null))
      .finally(() => setLoading(false))
  }, [month, year])

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
  if (!html) return <p className="text-center text-brand-400 mt-20">Slip not found</p>

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'My Payslips', to: '/self/payslips' },
        { label: `${MONTHS[Number(month) - 1]} ${year}` },
      ]} />
      <div className="flex items-center gap-3 mb-6 no-print">
        <Link to="/self/payslips" className="text-brand-400 hover:text-brand-700"><ArrowLeft size={20}/></Link>
        <h1 className="text-xl font-semibold text-brand-900">Salary Slip</h1>
        <button onClick={handlePrint} className="btn-primary ml-auto">
          <Printer size={16}/> Print Slip
        </button>
      </div>
      <div ref={printRef} className="card max-w-2xl mx-auto p-8 slip-template" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
