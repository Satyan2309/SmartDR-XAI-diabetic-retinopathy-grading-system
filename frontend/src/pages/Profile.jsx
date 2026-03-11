import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Save, Lock, Loader2, AlertCircle } from 'lucide-react'

const SPECS = ['Ophthalmology','General Medicine','Diabetology','Endocrinology','Other']

function FieldError({ msg }) {
  return msg
    ? <p className="flex items-center gap-1 text-red-500 text-xs mt-1"><AlertCircle size={11}/>{msg}</p>
    : null
}

export default function Profile() {
  const { doctor, refreshDoctor } = useAuth()
  const [tab, setTab] = useState('info')

  const [form, setForm] = useState({
    name: doctor?.name ?? '',
    hospital: doctor?.hospital ?? '',
    specialization: doctor?.specialization ?? 'Ophthalmology',
    phone: doctor?.phone ?? '',
    city: doctor?.city ?? ''
  })
  const [fErr, setFErr] = useState({})
  const [saving, setSaving] = useState(false)

  const [pass, setPass] = useState({ old_password:'', new_password:'', confirm:'' })
  const [pErr, setPErr] = useState({})
  const [pSaving, setPSaving] = useState(false)

  const set = (k) => (e) => { setForm(p=>({...p,[k]:e.target.value})); setFErr(p=>({...p,[k]:''})) }

  const validateInfo = () => {
    const e = {}
    if (form.name.trim().length < 3) e.name = 'Min 3 characters'
    if (!form.hospital.trim()) e.hospital = 'Required'
    if (!form.city.trim()) e.city = 'Required'
    if (!/^\d{10}$/.test(form.phone)) e.phone = 'Must be 10 digits'
    return e
  }

  const saveInfo = async (e) => {
    e.preventDefault()
    const errs = validateInfo()
    if (Object.keys(errs).length) { setFErr(errs); return }
    setSaving(true)
    try {
      await api.put('/doctor/update', form)
      await refreshDoctor()
      toast.success('Profile updated!')
    } catch (ex) { toast.error(ex.response?.data?.detail ?? 'Update failed') }
    finally { setSaving(false) }
  }

  const changePass = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!pass.old_password) errs.old = 'Required'
    if (pass.new_password.length < 6) errs.new = 'Min 6 characters'
    if (pass.new_password !== pass.confirm) errs.confirm = 'Passwords do not match'
    if (pass.new_password && pass.new_password === pass.old_password) errs.new = 'Must differ from current'
    if (Object.keys(errs).length) { setPErr(errs); return }
    setPSaving(true)
    try {
      await api.put('/doctor/password', { old_password: pass.old_password, new_password: pass.new_password })
      setPass({ old_password:'', new_password:'', confirm:'' })
      toast.success('Password changed!')
    } catch (ex) { setPErr({ old: ex.response?.data?.detail ?? 'Incorrect password' }) }
    finally { setPSaving(false) }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="section-title">My Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Info card */}
        <div className="card p-5 text-center">
          <div className="w-18 h-18 w-[72px] h-[72px] bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
            {doctor?.name?.[0]?.toUpperCase()}
          </div>
          <p className="font-bold text-slate-900">{doctor?.name}</p>
          <p className="text-slate-500 text-sm">{doctor?.specialization}</p>
          <p className="text-slate-400 text-xs mt-0.5">{doctor?.hospital}</p>

          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5 text-left">
            {[
              ['Doctor ID', doctor?.doctor_id],
              ['Email', doctor?.email],
              ['Phone', doctor?.phone || '—'],
              ['City', doctor?.city || '—'],
              ['Joined', doctor?.joined],
              ['Total Scans', doctor?.total_scans ?? 0]
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between gap-3">
                <span className="text-xs text-slate-400">{l}</span>
                <span className="text-xs text-slate-700 font-medium text-right truncate max-w-[140px]">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Forms */}
        <div className="lg:col-span-2">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
            {[['info','Edit Profile'],['pass','Change Password']].map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all
                  ${tab===k ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                {l}
              </button>
            ))}
          </div>

          {tab === 'info' && (
            <form onSubmit={saveInfo} className="card p-5 space-y-4">
              <p className="font-semibold text-slate-800">Update Information</p>
              {[
                { k:'name',     l:'Full Name',        ph:'Dr. Full Name' },
                { k:'hospital', l:'Hospital / Clinic', ph:'Hospital name' },
                { k:'city',     l:'City',             ph:'Your city'     }
              ].map(({ k, l, ph }) => (
                <div key={k}>
                  <label className="label">{l}</label>
                  <input className={`field ${fErr[k]?'field-error':''}`} placeholder={ph} value={form[k]} onChange={set(k)} />
                  <FieldError msg={fErr[k]} />
                </div>
              ))}

              <div>
                <label className="label">Phone (10 digits)</label>
                <input className={`field ${fErr.phone?'field-error':''}`} placeholder="9876543210" maxLength={10} value={form.phone} onChange={set('phone')} />
                {form.phone && <p className={`text-xs mt-1 ${form.phone.length===10?'text-green-600':'text-slate-400'}`}>{form.phone.length}/10</p>}
                <FieldError msg={fErr.phone} />
              </div>

              <div>
                <label className="label">Specialization</label>
                <select className="field" value={form.specialization} onChange={set('specialization')}>
                  {SPECS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}

          {tab === 'pass' && (
            <form onSubmit={changePass} className="card p-5 space-y-4">
              <p className="font-semibold text-slate-800">Change Password</p>
              {[
                { k:'old_password', l:'Current Password', ek:'old' },
                { k:'new_password', l:'New Password',     ek:'new' },
                { k:'confirm',      l:'Confirm Password', ek:'confirm' }
              ].map(({ k, l, ek }) => (
                <div key={k}>
                  <label className="label">{l}</label>
                  <input type="password" className={`field ${pErr[ek]?'field-error':''}`} placeholder="••••••••"
                    value={pass[k]} onChange={e => { setPass(p=>({...p,[k]:e.target.value})); setPErr(p=>({...p,[ek]:''})) }} />
                  <FieldError msg={pErr[ek]} />
                </div>
              ))}
              <button type="submit" disabled={pSaving} className="btn-primary">
                {pSaving ? <Loader2 size={15} className="animate-spin"/> : <Lock size={15}/>}
                {pSaving ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
