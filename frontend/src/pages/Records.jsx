import { useState, useEffect } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Search, Trash2, Download, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

const GRADE_BADGE = {
  0:'bg-green-100 text-green-700', 1:'bg-blue-100 text-blue-700',
  2:'bg-amber-100 text-amber-700', 3:'bg-orange-100 text-orange-700', 4:'bg-red-100 text-red-700'
}
const URG_BADGE = {
  LOW:'bg-green-100 text-green-700', MEDIUM:'bg-amber-100 text-amber-700',
  HIGH:'bg-orange-100 text-orange-700', CRITICAL:'bg-red-100 text-red-700'
}

const downloadPdf = async (recordId) => {
  try {
    const res = await api.get(`/records/${recordId}/pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `SmartDR_${recordId}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    toast.error('PDF download failed')
  }
}

export default function Records() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [gradeF, setGradeF] = useState('All')
  const [open, setOpen] = useState(null)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    api.get('/records').then(r => setRows(r.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }, [])

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.patient_name?.toLowerCase().includes(q) || r.patient_id?.toLowerCase().includes(q)
    const matchGrade = gradeF === 'All' || r.grade === parseInt(gradeF)
    return matchSearch && matchGrade
  })

  const handleDelete = async (id) => {
    if (!confirm('Delete this record? This cannot be undone.')) return
    setDeleting(id)
    try {
      await api.delete(`/records/${id}`)
      setRows(p => p.filter(r => r.record_id !== id))
      toast.success('Record deleted')
    } catch { toast.error('Delete failed') }
    finally { setDeleting(null) }
  }

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 size={28} className="animate-spin text-blue-500"/></div>

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="section-title">Patient Records</h1>
        <p className="text-slate-500 text-sm mt-1">{rows.length} records total</p>
      </div>

      <div className="card p-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="field pl-9" placeholder="Search by name or ID..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select className="field w-36" value={gradeF} onChange={e=>setGradeF(e.target.value)}>
          <option value="All">All Grades</option>
          {[0,1,2,3,4].map(g=><option key={g} value={g}>Grade {g}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-16 text-center text-slate-400">
          <p className="font-medium">No records found</p>
          <p className="text-sm mt-1">Try adjusting your search</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.record_id} className="card overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setOpen(open===r.record_id ? null : r.record_id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-semibold text-slate-900">{r.patient_name}</span>
                    <span className="text-xs text-slate-400">#{r.patient_id}</span>
                    <span className={`badge ${GRADE_BADGE[r.grade]}`}>G{r.grade}: {r.grade_name}</span>
                    <span className={`badge ${URG_BADGE[r.urgency]}`}>{r.urgency}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{r.date} · Age {r.patient_age} · {r.patient_gender} · {r.confidence}% confidence</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); downloadPdf(r.record_id) }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Download PDF"
                  >
                    <Download size={15}/>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(r.record_id) }}
                    disabled={deleting===r.record_id}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    {deleting===r.record_id ? <Loader2 size={15} className="animate-spin"/> : <Trash2 size={15}/>}
                  </button>
                  {open===r.record_id ? <ChevronUp size={15} className="text-slate-400"/> : <ChevronDown size={15} className="text-slate-400"/>}
                </div>
              </div>

              {open===r.record_id && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-5 text-sm">
                  <div>
                    <p className="label">Patient Details</p>
                    <div className="space-y-0.5 text-slate-700">
                      <p>Name: {r.patient_name}</p>
                      <p>ID: {r.patient_id}</p>
                      <p>Age: {r.patient_age}</p>
                      <p>Gender: {r.patient_gender}</p>
                    </div>
                  </div>
                  <div>
                    <p className="label">Diagnosis</p>
                    <div className="space-y-0.5 text-slate-700">
                      <p>Grade: {r.grade} — {r.grade_name}</p>
                      <p>Confidence: {r.confidence}%</p>
                      <p>Urgency: {r.urgency}</p>
                      <p className="font-mono text-xs text-slate-400">{r.record_id}</p>
                    </div>
                  </div>
                  <div>
                    <p className="label">Grade Probs</p>
                    <div className="space-y-1.5">
                      {r.probabilities && Object.entries(r.probabilities).map(([g,p])=>(
                        <div key={g} className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-12 shrink-0">{g}</span>
                          <div className="flex-1 bg-slate-200 rounded-full h-1">
                            <div className="h-1 rounded-full bg-blue-500" style={{width:`${p}%`}}/>
                          </div>
                          <span className="text-xs text-slate-600 w-8 text-right">{p}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="label">Notes</p>
                    <p className="text-slate-600 text-xs leading-relaxed">{r.notes || 'No notes.'}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}