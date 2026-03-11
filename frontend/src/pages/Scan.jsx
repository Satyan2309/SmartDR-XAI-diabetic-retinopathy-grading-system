import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Upload, Loader2, Save, Download, RotateCcw, Activity, CheckCircle2, AlertTriangle } from 'lucide-react'

const GRADE_STYLE = {
  0: 'bg-green-50 border-green-200 text-green-800',
  1: 'bg-blue-50 border-blue-200 text-blue-800',
  2: 'bg-amber-50 border-amber-200 text-amber-800',
  3: 'bg-orange-50 border-orange-200 text-orange-800',
  4: 'bg-red-50 border-red-200 text-red-800'
}


const GRADE_BAR = ['#16a34a','#2563eb','#d97706','#ea580c','#dc2626']

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

export default function Scan() {
  const { refreshDoctor } = useAuth()
  const [patient, setPatient] = useState({ name:'', id:'', age:'45', gender:'Male', notes:'' })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState(null)

  const onDrop = useCallback(files => {
    const f = files[0]
    if (!f) return
    setFile(f); setPreview(URL.createObjectURL(f))
    setResult(null); setSavedId(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.jpg','.jpeg','.png'] }, multiple: false
  })

  const runScan = async () => {
    if (!file) return toast.error('Upload an image first')
    if (!patient.name.trim()) return toast.error('Patient name required')
    if (!patient.id.trim()) return toast.error('Patient ID required')
    setScanning(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const { data } = await api.post('/scan', fd)
      setResult(data); toast.success('Analysis complete!')
    } catch (ex) {
      toast.error(ex.response?.data?.detail ?? 'Scan failed')
    } finally { setScanning(false) }
  }
  
const saveRecord = async () => {
  if (!result) return
  setSaving(true)
  try {
    const fd = new FormData()
    const fields = {
      patient_name: patient.name,
      patient_id: patient.id,
      patient_age: patient.age,
      patient_gender: patient.gender,
      notes: patient.notes,
      grade: result.grade,
      confidence: result.confidence,
      prob_0: result.probabilities['Grade 0'],
      prob_1: result.probabilities['Grade 1'],
      prob_2: result.probabilities['Grade 2'],
      prob_3: result.probabilities['Grade 3'],
      prob_4: result.probabilities['Grade 4'],
      img_original: result.original_img,   // ← add these 3
      img_enhanced: result.enhanced_img,
      img_heatmap:  result.heatmap_img,
    }
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
    const { data } = await api.post('/records/save', fd)
    setSavedId(data.record_id)
    refreshDoctor()
    toast.success(`Saved — ${data.record_id}`)
  } catch (ex) {
    toast.error(ex.response?.data?.detail ?? 'Save failed')
  } finally {
    setSaving(false)
  }
}

  const reset = () => {
    setFile(null); setPreview(null); setResult(null); setSavedId(null)
    setPatient({ name:'', id:'', age:'45', gender:'Male', notes:'' })
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="section-title">New Patient Scan</h1>
        <p className="text-slate-500 text-sm mt-1">Fill in patient info, upload a fundus image, then run AI analysis.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-2 space-y-4">
          <div className="card p-5 space-y-3">
            <p className="font-semibold text-slate-800 text-sm">Patient Information</p>
            {[['name','Patient Name','Full name'],['id','Patient ID','e.g. PT-001']].map(([k,l,ph]) => (
              <div key={k}>
                <label className="label">{l}</label>
                <input className="field" placeholder={ph} value={patient[k]} onChange={e => setPatient(p=>({...p,[k]:e.target.value}))} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Age</label>
                <input type="number" min={1} max={120} className="field" value={patient.age} onChange={e=>setPatient(p=>({...p,age:e.target.value}))} />
              </div>
              <div>
                <label className="label">Gender</label>
                <select className="field" value={patient.gender} onChange={e=>setPatient(p=>({...p,gender:e.target.value}))}>
                  {['Male','Female','Other'].map(g=><option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Clinical Notes</label>
              <textarea rows={2} className="field resize-none" placeholder="HbA1c, BP, duration of diabetes..." value={patient.notes} onChange={e=>setPatient(p=>({...p,notes:e.target.value}))} />
            </div>
          </div>

          <div className="card p-5">
            <p className="font-semibold text-slate-800 text-sm mb-3">Fundus Image</p>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}>
              <input {...getInputProps()} />
              {preview ? (
                <img src={preview} className="w-full h-36 object-cover rounded-lg" alt="preview" />
              ) : (
                <div>
                  <Upload size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">Drop image or <span className="text-blue-600 font-medium">browse</span></p>
                  <p className="text-xs text-slate-400 mt-1">JPG, PNG</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={runScan} disabled={!file||scanning} className="btn-primary flex-1 justify-center">
                {scanning ? (
                  <><Loader2 size={15} className="animate-spin"/>Analyzing...</>
                ) : (
                  <><Activity size={15}/>Run Analysis</>
                )}
              </button>
              <button onClick={reset} className="btn-ghost px-3"><RotateCcw size={15}/></button>
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 space-y-4">
          {!result && !scanning && (
            <div className="card p-10 flex flex-col items-center justify-center text-center h-64">
              <Activity size={40} className="text-slate-200 mb-3" />
              <p className="text-slate-400 font-medium">Results will appear here</p>
              <p className="text-slate-300 text-sm mt-1">Complete the form and upload an image</p>
            </div>
          )}
          {scanning && (
            <div className="card p-10 flex flex-col items-center justify-center h-64">
              <Loader2 size={40} className="text-blue-500 animate-spin mb-3" />
              <p className="text-slate-700 font-semibold">Running AI Analysis...</p>
              <p className="text-slate-400 text-sm mt-1">EfficientNet-B2 + Grad-CAM++</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <p className="font-semibold text-slate-800">Diagnosis Result</p>
                  {result.urgency === 'CRITICAL' && (
                    <span className="badge bg-red-100 text-red-700 animate-pulse gap-1">
                      <AlertTriangle size={11}/> CRITICAL
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className={`rounded-xl border p-4 ${GRADE_STYLE[result.grade]}`}>
                    <p className="text-2xl font-bold">G{result.grade}</p>
                    <p className="text-xs font-semibold mt-0.5">{result.grade_name}</p>
                    <p className="text-xs opacity-70 mt-1">{result.urgency}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4 text-center">
                    <p className="text-3xl font-bold text-slate-900">{result.confidence}%</p>
                    <p className="text-xs text-slate-500 mt-0.5">Confidence</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Action</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{result.action}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {Object.entries(result.probabilities).map(([label, pct], i) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-16 shrink-0">{label}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all" style={{ width:`${pct}%`, background: GRADE_BAR[i] }} />
                      </div>
                      <span className="text-xs text-slate-600 w-10 text-right font-medium">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <p className="font-semibold text-slate-800 mb-3">Grad-CAM++ Heatmap</p>
                <div className="grid grid-cols-3 gap-3">
                  {[['Original',result.original_img],['Enhanced',result.enhanced_img],['Heatmap',result.heatmap_img]].map(([lbl,b64])=>(
                    <div key={lbl}>
                      <img src={`data:image/png;base64,${b64}`} className="w-full rounded-xl aspect-square object-cover" alt={lbl} />
                      <p className="text-xs text-center text-slate-500 mt-1.5 font-medium">{lbl}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 mt-3">
                  🔴 Red zones indicate where the model focused — microaneurysms, hemorrhages, or exudates.
                </p>
              </div>

              <div className="flex gap-3">
                {savedId ? (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm font-medium">
                    <CheckCircle2 size={15}/> Saved as {savedId}
                  </div>
                ) : (
                  <button onClick={saveRecord} disabled={saving} className="btn-primary">
                    {saving ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>}
                    {saving ? 'Saving...' : 'Save Record'}
                  </button>
                )}
                {savedId && (
                  <button onClick={() => downloadPdf(savedId)} className="btn-ghost">
                    <Download size={15}/> PDF
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}