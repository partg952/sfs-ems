import { useState } from 'react'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main className="flex-1 overflow-auto bg-brand-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
