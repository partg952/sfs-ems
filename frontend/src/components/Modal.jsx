import { X } from '@untitledui/icons'

export default function Modal({ title, onClose, children, size = 'md' }) {
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand-900/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative w-full ${widths[size]} bg-white rounded-xl border border-brand-100 shadow-2xl shadow-black/10 flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-100">
          <h2 className="text-[15px] font-semibold text-brand-900">{title}</h2>
          <button onClick={onClose} className="text-brand-400 hover:text-brand-900 hover:bg-brand-50 rounded-md p-1 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
