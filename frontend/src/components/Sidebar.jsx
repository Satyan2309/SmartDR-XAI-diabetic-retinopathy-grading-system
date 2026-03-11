import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ScanEye, FolderOpen, BarChart3, CircleUser, LogOut } from 'lucide-react'

const links = [
  { to: '/', label: 'New Scan', Icon: ScanEye },
  { to: '/records', label: 'Records', Icon: FolderOpen },
  { to: '/analytics', label: 'Analytics', Icon: BarChart3 },
  { to: '/profile', label: 'Profile', Icon: CircleUser }
]

const gradeColor = (g) => ['#16a34a','#2563eb','#d97706','#ea580c','#dc2626'][g] ?? '#64748b'

export default function Sidebar() {
  const { doctor, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside className="w-60 bg-[#1a2744] flex flex-col shrink-0 h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <ScanEye size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-wide">SmartDR-XAI</p>
            <p className="text-slate-500 text-[10px] uppercase tracking-widest">Retinopathy AI</p>
          </div>
        </div>
      </div>

      {/* Doctor card */}
      {doctor && (
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
            <div className="w-9 h-9 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-300 font-bold text-sm shrink-0">
              {doctor.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{doctor.name}</p>
              <p className="text-slate-400 text-xs truncate">{doctor.hospital}</p>
            </div>
          </div>
          {doctor.total_scans > 0 && (
            <p className="text-slate-500 text-xs text-center mt-2">
              {doctor.total_scans} scans completed
            </p>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
              ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Grade legend */}
      <div className="px-4 pb-4">
        <p className="text-slate-600 text-[10px] uppercase tracking-widest mb-2 px-1">DR Grades</p>
        {['No DR','Mild','Moderate','Severe','Proliferative'].map((g, i) => (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: gradeColor(i) }} />
            <span className="text-slate-500 text-xs">G{i} — {g}</span>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  )
}
