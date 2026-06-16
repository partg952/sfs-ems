const TONES = {
  gray: {
    card: 'border-brand-100 bg-brand-50/60 hover:bg-brand-50',
    iconWrap: 'bg-white border-brand-100',
    icon: 'text-brand-600',
  },
  green: {
    card: 'border-green-100 bg-green-50/50 hover:bg-green-50',
    iconWrap: 'bg-white border-green-200',
    icon: 'text-green-600',
  },
  red: {
    card: 'border-red-100 bg-red-50/50 hover:bg-red-50',
    iconWrap: 'bg-white border-red-200',
    icon: 'text-red-600',
  },
  blue: {
    card: 'border-blue-100 bg-blue-50/50 hover:bg-blue-50',
    iconWrap: 'bg-white border-blue-200',
    icon: 'text-blue-600',
  },
  yellow: {
    card: 'border-amber-100 bg-amber-50/50 hover:bg-amber-50',
    iconWrap: 'bg-white border-amber-200',
    icon: 'text-amber-600',
  },
}

export default function StatCard({ label, value, icon: Icon, sub, tone = 'gray' }) {
  const t = TONES[tone] || TONES.gray
  return (
    <div className={`rounded-2xl border p-5 transition-colors ${t.card}`}>
      <div className="flex items-start justify-between">
        <p className="text-[30px] font-semibold text-brand-900 tracking-tight leading-none">{value}</p>
        {Icon && (
          <div className={`p-2 rounded-full border flex-shrink-0 ${t.iconWrap}`}>
            <Icon size={16} className={t.icon} strokeWidth={2} />
          </div>
        )}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 mt-3">{label}</p>
      {sub && <p className="text-xs text-brand-400 mt-0.5">{sub}</p>}
    </div>
  )
}
