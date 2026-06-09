import { Inbox01 } from '@untitledui/icons'

export default function EmptyState({ title = 'No data found', message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="p-3 rounded-full bg-brand-50 border border-brand-100">
        <Inbox01 className="size-7 text-brand-300" strokeWidth={1.75} />
      </div>
      <p className="text-brand-700 font-medium text-sm mt-1">{title}</p>
      {message && <p className="text-brand-400 text-[13px] max-w-xs leading-relaxed">{message}</p>}
      {action}
    </div>
  )
}
