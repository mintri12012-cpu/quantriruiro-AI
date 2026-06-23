import { NavLink } from 'react-router-dom'
import { useState } from 'react'

const links = [
  { to: '/overview', label: 'Tổng quan', icon: '📍' },
  { to: '/approvals', label: 'Phê duyệt HSRR', icon: '✅' },
  { to: '/documents', label: 'Tài liệu', icon: '📁' },
  { to: '/reports', label: 'Báo cáo', icon: '📑' },
  { to: '/compare', label: 'So sánh', icon: '🕸️' },
  { to: '/demo', label: 'Xem demo', icon: '▶' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/portfolio', label: 'Portfolio', icon: '🗂️' },
  { to: '/alerts', label: 'Alerts', icon: '⚠️' },
  { to: '/risk-analytics', label: 'Risk Analytics', icon: '🧪' },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-4 left-4 z-50 bg-navy border border-slate-700 rounded-lg p-2 text-teal"
      >
        ☰
      </button>
      <aside
        className={`fixed md:sticky top-0 h-screen w-60 bg-navy border-r border-slate-800 flex flex-col p-5 gap-2 z-40 transition-transform
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="flex items-center gap-2 mb-8 mt-1">
          <span className="text-2xl">🏦</span>
          <div>
            <div className="text-teal font-bold text-sm leading-tight">PD Scoring</div>
            <div className="text-slate-500 text-[11px]">Quản trị rủi ro AI</div>
          </div>
        </div>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive ? 'bg-teal/15 text-teal' : 'text-slate-400 hover:bg-white/5'
              }`
            }
          >
            <span>{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </aside>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}
