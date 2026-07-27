import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="h-screen p-3 flex gap-3 overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main className="flex-1 min-w-0 bg-white rounded-2xl border border-black/5 shadow-sm flex flex-col overflow-hidden">
        <Topbar />
        <div className="px-12 sm:px-14 py-8 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
