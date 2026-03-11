import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts'
import api from '../api/client'
import { Loader2 } from 'lucide-react'

const COLORS = ['#16a34a','#2563eb','#d97706','#ea580c','#dc2626']
const URG_COLOR = { LOW:'#16a34a', MEDIUM:'#d97706', HIGH:'#ea580c', CRITICAL:'#dc2626' }
const GRADE_NAMES = ['No DR','Mild','Moderate','Severe','Proliferative']
const TIP_STYLE = { borderRadius:'12px', border:'1px solid #e2e8f0', fontSize:'13px', fontFamily:'DM Sans, sans-serif' }

function StatBox({ label, value, color }) {
  return (
    <div className="card p-5">
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      <p className="text-slate-500 text-sm mt-1">{label}</p>
    </div>
  )
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/analytics').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 size={28} className="animate-spin text-blue-500"/></div>
  if (!data?.total) return (
    <div className="card p-20 text-center text-slate-400">
      <p className="font-semibold text-lg">No data yet</p>
      <p className="text-sm mt-1">Scan some patients to see analytics</p>
    </div>
  )

  const gradeData = data.grade_dist.map((count, i) => ({
    name: `G${i}`, fullName: GRADE_NAMES[i], count, fill: COLORS[i]
  }))
  const urgData = Object.entries(data.urgency_map).map(([name, count]) => ({
    name, count, fill: URG_COLOR[name]
  }))

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="section-title">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Screening overview for your patients</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Total Scans"    value={data.total}    color="#2563eb" />
        <StatBox label="No DR (Healthy)" value={data.no_dr}   color="#16a34a" />
        <StatBox label="High Urgency"   value={data.high}     color="#ea580c" />
        <StatBox label="Critical"       value={data.critical} color="#dc2626" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <p className="font-semibold text-slate-800 mb-4">Grade Distribution</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={gradeData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize:12, fill:'#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:12, fill:'#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TIP_STYLE} formatter={(v, _, p) => [v, p.payload.fullName]} />
              <Bar dataKey="count" radius={[6,6,0,0]}>
                {gradeData.map((e,i) => <Cell key={i} fill={e.fill}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <p className="font-semibold text-slate-800 mb-4">Grade Split</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={gradeData.filter(d=>d.count>0)} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                paddingAngle={3} dataKey="count"
                label={({name,percent}) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {gradeData.filter(d=>d.count>0).map((e,i)=><Cell key={i} fill={e.fill}/>)}
              </Pie>
              <Tooltip contentStyle={TIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {data.daily_scans?.length > 1 && (
          <div className="card p-5">
            <p className="font-semibold text-slate-800 mb-4">Scans Over Time</p>
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={data.daily_scans}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize:11, fill:'#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:'#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TIP_STYLE} />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r:4, fill:'#2563eb' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card p-5">
          <p className="font-semibold text-slate-800 mb-4">Urgency Breakdown</p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={urgData} layout="vertical" barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:11, fill:'#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:'#64748b' }} axisLine={false} tickLine={false} width={65} />
              <Tooltip contentStyle={TIP_STYLE} />
              <Bar dataKey="count" radius={[0,6,6,0]}>
                {urgData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {data.high_risk?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="font-semibold text-slate-800">High-Risk Patients</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Record','Patient','Grade','Urgency','Confidence','Date'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.high_risk.map(r => (
                  <tr key={r.record_id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{r.record_id}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{r.patient_name}</td>
                    <td className="px-5 py-3"><span className={`badge ${r.grade===4?'bg-red-100 text-red-700':'bg-orange-100 text-orange-700'}`}>G{r.grade}: {r.grade_name}</span></td>
                    <td className="px-5 py-3"><span className="badge bg-red-100 text-red-700">{r.urgency}</span></td>
                    <td className="px-5 py-3 text-slate-600">{r.confidence}%</td>
                    <td className="px-5 py-3 text-slate-400">{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
