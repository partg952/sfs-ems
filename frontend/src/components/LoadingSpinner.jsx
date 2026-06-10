export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-7 h-7 border-2 border-brand-100 border-t-brand-900 rounded-full animate-spin" />
      <p className="text-brand-400 text-[13px]">{message}</p>
    </div>
  )
}
