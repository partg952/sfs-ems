import { Inbox } from 'lucide-react'

export default function EmptyState({ title = 'No data found', message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <Inbox size={40} className="text-brand-200" />
      <p className="text-brand-600 font-medium">{title}</p>
      {message && <p className="text-brand-400 text-sm max-w-xs">{message}</p>}
      {action}
    </div>
  )
}
