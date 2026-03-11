import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Scan from './pages/Scan'
import Records from './pages/Records'
import Analytics from './pages/Analytics'
import Profile from './pages/Profile'

function Guard({ children }) {
  const { doctor, loading } = useAuth()
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return doctor ? children : <Navigate to="/login" replace />
}

function Shell({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6fa]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Guard><Shell><Scan /></Shell></Guard>} />
          <Route path="/records" element={<Guard><Shell><Records /></Shell></Guard>} />
          <Route path="/analytics" element={<Guard><Shell><Analytics /></Shell></Guard>} />
          <Route path="/profile" element={<Guard><Shell><Profile /></Shell></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
