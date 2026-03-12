import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Loader2, ScanEye, AlertCircle } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

const err = (msg) => (
  <p className="flex items-center gap-1.5 text-red-500 text-xs mt-1">
    <AlertCircle size={12} /> {msg}
  </p>
)

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('login')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const [apiErr, setApiErr] = useState('')

  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', hospital: '', city: ''
  })
  const [fieldErr, setFieldErr] = useState({})

  const set = (k) => (e) => {
    setForm(p => ({ ...p, [k]: e.target.value }))
    setFieldErr(p => ({ ...p, [k]: '' }))
    setApiErr('')
  }

  const validate = () => {
    const e = {}
    if (tab === 'register') {
      if (form.name.trim().length < 3) e.name = 'Min 3 characters'
      if (!form.hospital.trim()) e.hospital = 'Required'
      if (!form.city.trim()) e.city = 'Required'
      if (!/^\d{10}$/.test(form.phone)) e.phone = 'Exactly 10 digits'
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (form.password.length < 6) e.password = 'Min 6 characters'
    return e
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErr(errs); return }
    setBusy(true)
    setApiErr('')
    try {
      const endpoint = tab === 'login' ? '/auth/login' : '/auth/register'
      const { data } = await api.post(endpoint, form)
      login(data.token, data.doctor)
      toast.success(tab === 'login' ? `Welcome back, ${data.doctor.name}!` : 'Account created!')
      navigate('/')
    } catch (ex) {
      setApiErr(ex.response?.data?.detail ?? 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-[42%] bg-[#1a2744] flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center">
            <ScanEye size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg">SmartDR-XAI</span>
        </div>

        <div>
          <h1 className="text-white text-4xl font-bold leading-snug mb-5">
            AI-Powered<br />Retinopathy<br />Grading
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            EfficientNet-B2 model with Grad-CAM++ explainability. Built for ophthalmologists to grade diabetic retinopathy faster and more accurately.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[['0.9079', 'QWK Score'], ['84.58%', 'Accuracy'], ['5', 'DR Grades']].map(([v, l]) => (
              <div key={l} className="bg-white/5 rounded-xl p-4">
                <p className="text-blue-400 font-bold text-xl">{v}</p>
                <p className="text-slate-500 text-xs mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-xs">
          Lloyd Institute of Engineering & Technology · CSE-DS · 2024–25
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-7">
            {['login', 'register'].map(t => (
              <button key={t} onClick={() => { setTab(t); setApiErr(''); setFieldErr({}) }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all
                  ${tab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                {t}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">
              {tab === 'login' ? 'Welcome back' : 'Create account'}
            </h2>

            {apiErr && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                <AlertCircle size={15} className="shrink-0" /> {apiErr}
              </div>
            )}

            {tab === 'register' && (
              <>
                <div>
                  <label className="label">Full Name</label>
                  <input className={`field ${fieldErr.name ? 'field-error' : ''}`} placeholder="Dr. Full Name" value={form.name} onChange={set('name')} />
                  {fieldErr.name && err(fieldErr.name)}
                </div>
                <div>
                  <label className="label">Hospital / Clinic</label>
                  <input className={`field ${fieldErr.hospital ? 'field-error' : ''}`} placeholder="Hospital name" value={form.hospital} onChange={set('hospital')} />
                  {fieldErr.hospital && err(fieldErr.hospital)}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">City</label>
                    <input className={`field ${fieldErr.city ? 'field-error' : ''}`} placeholder="City" value={form.city} onChange={set('city')} />
                    {fieldErr.city && err(fieldErr.city)}
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input className={`field ${fieldErr.phone ? 'field-error' : ''}`} placeholder="10 digits" maxLength={10} value={form.phone} onChange={set('phone')} />
                    {fieldErr.phone && err(fieldErr.phone)}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="label">Email</label>
              <input type="email" className={`field ${fieldErr.email ? 'field-error' : ''}`} placeholder="doctor@hospital.com" value={form.email} onChange={set('email')} />
              {fieldErr.email && err(fieldErr.email)}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className={`field pr-10 ${fieldErr.password ? 'field-error' : ''}`} placeholder="Min 6 characters" value={form.password} onChange={set('password')} />
                <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErr.password && err(fieldErr.password)}
            </div>

            <button type="submit" disabled={busy} className="btn-primary w-full justify-center">
              {busy && <Loader2 size={15} className="animate-spin" />}
              {tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
