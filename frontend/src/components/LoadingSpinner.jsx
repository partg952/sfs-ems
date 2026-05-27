export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-900 rounded-full animate-spin" />
      <p className="text-brand-400 text-sm">{message}</p>
    </div>
  )
}
