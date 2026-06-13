export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-7 pb-5 border-b border-brand-100">
      <div>
        <h1 className="text-[22px] font-semibold text-brand-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-brand-400 text-[13.5px] mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
