'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { calculateWeekAndMonth } from '@/lib/utils'
import { Calendar, Download, Search, LayoutList, Table2, CheckCircle, XCircle } from 'lucide-react'

export default function AdminDashboard() {
  const supabase = createClient()
  const router = useRouter()
  
  // State
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'tracker' | 'data'>('tracker')
  
  // Data State
  const [registry, setRegistry] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  
  // Filter State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [weekLabel, setWeekLabel] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/')
      
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') return router.push('/dashboard')

      // 1. Get Registry (All Editors)
      const { data: reg } = await supabase.from('editor_registry').select('*').order('yaas_id')
      if (reg) setRegistry(reg)
      
      setLoading(false)
    }
    init()
  }, [])

  // Refetch reports when date changes
  useEffect(() => {
    const fetchReports = async () => {
      const { weekLabel: w } = calculateWeekAndMonth(selectedDate)
      setWeekLabel(w)
      
      // Get Reports for this specific week
      const { data } = await supabase.from('reports').select('*').eq('week_label', w)
      if (data) setReports(data)
    }
    fetchReports()
  }, [selectedDate])

  // --- Process Data for Tracker View ---
  const trackerData = registry.map(editor => {
    const report = reports.find(r => r.editor_email === editor.email) // Match by email
    return {
      ...editor,
      hasSubmitted: !!report,
      submittedAt: report?.created_at
    }
  }).filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.yaas_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // --- Process Data for Excel View (Flattening) ---
  const flatData = reports.flatMap(r => {
    const ips = r.ip_data || []
    if (ips.length === 0) return [r] // Return report even if no IPs (rare)
    return ips.map((ip: any) => ({ ...r, ...ip }))
  })

  if (loading) return <div className="p-10 text-center">Loading Admin Panel...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500">Track submissions and view weekly performance.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-lg border shadow-sm">
           <div className="flex items-center gap-2 px-2">
             <Calendar size={16} className="text-slate-400" />
             <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} 
               className="text-sm font-medium outline-none text-slate-700" />
           </div>
           <div className="h-6 w-[1px] bg-slate-200"></div>
           <span className="text-sm font-bold text-blue-600 px-2">{weekLabel}</span>
        </div>
      </div>

      {/* View Toggle & Search */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex bg-white rounded-lg p-1 border shadow-sm">
          <button onClick={() => setViewMode('tracker')} 
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${viewMode === 'tracker' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <LayoutList size={16} /> Tracker
          </button>
          <button onClick={() => setViewMode('data')} 
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${viewMode === 'data' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Table2 size={16} /> Data Sheet
          </button>
        </div>

        {viewMode === 'tracker' && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input type="text" placeholder="Search editor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 w-64" />
          </div>
        )}
      </div>

      {/* VIEW 1: TRACKER (Who submitted?) */}
      {viewMode === 'tracker' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
            {trackerData.map((editor) => (
              <div key={editor.yaas_id} 
                className={`p-4 rounded-lg border flex items-center justify-between group transition
                  ${editor.hasSubmitted 
                    ? 'bg-white border-slate-200 hover:border-green-300' 
                    : 'bg-red-50 border-red-100 hover:border-red-300'
                  }
                `}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-slate-500">{editor.yaas_id}</span>
                    {editor.hasSubmitted 
                      ? <CheckCircle size={14} className="text-green-500" />
                      : <XCircle size={14} className="text-red-500" />
                    }
                  </div>
                  <h3 className="font-semibold text-sm text-slate-800">{editor.name}</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[150px]">{editor.email}</p>
                </div>
                <div className={`text-xs font-bold px-2 py-1 rounded ${editor.hasSubmitted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {editor.hasSubmitted ? 'Done' : 'Missing'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: DATA SHEET (Excel View) */}
      {viewMode === 'data' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b">
              <tr>
                <th className="p-3 border">Timestamp</th>
                <th className="p-3 border">Name</th>
                <th className="p-3 border">YAAS ID</th>
                <th className="p-3 border">Email</th>
                <th className="p-3 border bg-blue-50">Hygiene</th>
                <th className="p-3 border bg-blue-50">Mistakes?</th>
                <th className="p-3 border bg-blue-50">Mistake Detail</th>
                <th className="p-3 border bg-blue-50">Delays?</th>
                <th className="p-3 border bg-blue-50">Delay Reason</th>
                <th className="p-3 border bg-blue-50">Improvements</th>
                <th className="p-3 border bg-blue-50">Target</th>
                <th className="p-3 border bg-blue-50">Areas Imp.</th>
                <th className="p-3 border bg-blue-50">Feedback</th>
                
                {/* IP Columns */}
                <th className="p-3 border bg-yellow-50">IP Name</th>
                <th className="p-3 border bg-yellow-50">Lead</th>
                <th className="p-3 border bg-yellow-50">Manager</th>
                <th className="p-3 border bg-yellow-50">Delivered</th>
                <th className="p-3 border bg-yellow-50">Approved</th>
                <th className="p-3 border bg-yellow-50">First Pass %</th>
                <th className="p-3 border bg-yellow-50">Creative</th>
                <th className="p-3 border bg-yellow-50">Blockers?</th>
                <th className="p-3 border bg-yellow-50">Blocker Detail</th>
                <th className="p-3 border bg-yellow-50">Avg Iter</th>
                <th className="p-3 border bg-yellow-50">QC Repeat?</th>
                <th className="p-3 border bg-yellow-50">QC Detail</th>
                <th className="p-3 border bg-yellow-50">IP Imp.</th>
                <th className="p-3 border bg-yellow-50">Links</th>
                <th className="p-3 border bg-yellow-50">Mgr Comment</th>
              </tr>
            </thead>
            <tbody>
              {flatData.map((row: any, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-2 border">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="p-2 border font-bold">{row.editor_name}</td>
                  <td className="p-2 border">{row.yaas_id}</td>
                  <td className="p-2 border">{row.editor_email}</td>
                  <td className="p-2 border">{row.hygiene_score}</td>
                  <td className="p-2 border">{row.mistakes_repeated ? 'Yes' : 'No'}</td>
                  <td className="p-2 border max-w-[200px] truncate" title={row.mistake_details}>{row.mistake_details}</td>
                  <td className="p-2 border">{row.delays ? 'Yes' : 'No'}</td>
                  <td className="p-2 border max-w-[200px] truncate" title={row.delay_reasons}>{row.delay_reasons}</td>
                  <td className="p-2 border max-w-[200px] truncate" title={row.general_improvements}>{row.general_improvements}</td>
                  <td className="p-2 border">{row.next_week_commitment}</td>
                  <td className="p-2 border max-w-[200px] truncate" title={row.areas_improvement}>{row.areas_improvement}</td>
                  <td className="p-2 border max-w-[200px] truncate" title={row.overall_feedback}>{row.overall_feedback}</td>
                  
                  {/* IP Data (might be undefined if flattened weirdly, handled by optional chaining) */}
                  <td className="p-2 border font-semibold">{row.ip_name}</td>
                  <td className="p-2 border">{row.lead_editor}</td>
                  <td className="p-2 border">{row.channel_manager}</td>
                  <td className="p-2 border text-center">{row.reels_delivered}</td>
                  <td className="p-2 border text-center">{row.approved_reels}</td>
                  <td className="p-2 border text-center">
                    {row.reels_delivered > 0 ? ((row.approved_reels / row.reels_delivered) * 100).toFixed(0) + '%' : '0%'}
                  </td>
                  <td className="p-2 border max-w-[150px] truncate">{row.creative_inputs}</td>
                  <td className="p-2 border">{row.has_blockers}</td>
                  <td className="p-2 border max-w-[150px] truncate">{row.blocker_details}</td>
                  <td className="p-2 border">{row.avg_reiterations}</td>
                  <td className="p-2 border">{row.has_qc_changes}</td>
                  <td className="p-2 border max-w-[150px] truncate">{row.qc_details}</td>
                  <td className="p-2 border max-w-[150px] truncate">{row.improvements}</td>
                  <td className="p-2 border max-w-[150px] truncate text-blue-600 underline cursor-pointer" title={row.drive_links}>Link</td>
                  <td className="p-2 border max-w-[150px] truncate">{row.manager_comments}</td>
                </tr>
              ))}
              {flatData.length === 0 && (
                <tr>
                  <td colSpan={30} className="p-8 text-center text-slate-500">No reports found for {weekLabel}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}