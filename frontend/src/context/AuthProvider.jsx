import { useState, useEffect } from 'react'
import { AuthContext } from './AuthContext'
import api from '../api/client'

export function AuthProvider({ children }) {
  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem('sdr_token')
    if (!token) { setLoading(false); return }

    api.get('/doctor/me')
      .then(r => setDoctor(r.data))
      .catch(() => sessionStorage.removeItem('sdr_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = (token, data) => {
    sessionStorage.setItem('sdr_token', token)
    setDoctor(data)
  }

  const logout = () => {
    sessionStorage.removeItem('sdr_token')
    setDoctor(null)
  }

  const refreshDoctor = () =>
    api.get('/doctor/me').then(r => { setDoctor(r.data); return r.data })

  return (
    <AuthContext.Provider value={{ doctor, loading, login, logout, refreshDoctor }}>
      {children}
    </AuthContext.Provider>
  )
}
