export default function StatCard({ label, value, icon: Icon, sub }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-brand-400 font-medium">{label}</p>
          <p className="text-2xl font-semibold text-brand-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-brand-300 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className="p-2.5 rounded bg-brand-50 border border-brand-100">
            <Icon size={20} className="text-brand-600" />
          </div>
        )}
      </div>
    </div>
  )
}
