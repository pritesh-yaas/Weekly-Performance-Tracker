'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { calculateWeekAndMonth } from '@/lib/utils'
import { 
  Calendar, Search, LayoutList, Table2, 
  CheckCircle, XCircle, Filter, ArrowUpDown, 
  X, Clock, ChevronRight, FileText, ExternalLink 
} from 'lucide-react'

// --- Types ---
interface Editor {
  name: string
  email: string
  yaas_id: string
  hasSubmitted: boolean
  submittedAt?: string
  currentReport?: any
}

export default function AdminDashboard() {
  const supabase = createClient()
  const router = useRouter()
  
  // --- Global State ---
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'tracker' | 'data'>('tracker')
  
  // --- Data State ---
  const [registry, setRegistry] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([]) // Reports for SELECTED week
  
  // --- Filters & Sort State ---
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [weekLabel, setWeekLabel] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'missing'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'id'>('name')

  // --- Modal State (Editor History) ---
  const [selectedEditor, setSelectedEditor] = useState<Editor | null>(null)
  const [historyReports, setHistoryReports] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // --- 1. Init: Load Registry ---
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/')
      
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') return router.push('/dashboard')

      // Get All Editors
      const { data: reg } = await supabase.from('editor_registry').select('*').order('name')
      if (reg) setRegistry(reg)
      
      setLoading(false)
    }
    init()
  }, [])

  // --- 2. Fetch Reports when Date Changes ---
  useEffect(() => {
    const fetchReports = async () => {
      const { weekLabel: w } = calculateWeekAndMonth(selectedDate)
      setWeekLabel(w)
      
      // Get Reports ONLY for this week
      const { data } = await supabase.from('reports').select('*').eq('week_label', w)
      if (data) setReports(data)
    }
    fetchReports()
  }, [selectedDate])

  // --- 3. Process Data (Filter & Sort) ---
  const trackerData = registry.map(editor => {
    const report = reports.find(r => r.editor_email === editor.email)
    return {
      ...editor,
      hasSubmitted: !!report,
      submittedAt: report?.created_at,
      currentReport: report
    }
  }).filter((editor: Editor) => {
    // 1. Search Filter
    const matchesSearch = 
      editor.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      editor.yaas_id.toLowerCase().includes(searchTerm.toLowerCase())
    
    // 2. Status Filter
    const matchesStatus = 
      filterStatus === 'all' ? true :
      filterStatus === 'submitted' ? editor.hasSubmitted :
      !editor.hasSubmitted

    return matchesSearch && matchesStatus
  }).sort((a: Editor, b: Editor) => {
    // 3. Sorting
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'id') return a.yaas_id.localeCompare(b.yaas_id)
    return 0
  })

  // --- 4. Handle Card Click (Load History) ---
  const openEditorHistory = async (editor: Editor) => {
    setSelectedEditor(editor)
    setLoadingHistory(true)
    // Fetch ALL reports for this user, ordered by newest first
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('editor_email', editor.email)
      .order('submission_date', { ascending: false })
    
    setHistoryReports(data || [])
    setLoadingHistory(false)
  }

  // --- Flatten Data for Data Sheet View ---
  const flatData = reports.flatMap(r => {
    const ips = r.ip_data || []
    if (ips.length === 0) return [r]
    return ips.map((ip: any) => ({ ...r, ...ip }))
  })

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading Dashboard...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-slate-500">Overview of {weekLabel}</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-xl border shadow-sm">
           <div className="flex items-center gap-2 px-2">
             <Calendar size={18} className="text-blue-600" />
             <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} 
               className="text-sm font-medium outline-none text-slate-700 bg-transparent cursor-pointer" />
           </div>
        </div>
      </div>

      {/* --- CONTROLS TOOLBAR --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        
        {/* View Switcher */}
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button onClick={() => setViewMode('tracker')} 
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${viewMode === 'tracker' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <LayoutList size={16} /> Tracker
          </button>
          <button onClick={() => setViewMode('data')} 
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${viewMode === 'data' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Table2 size={16} /> Data Sheet
          </button>
        </div>

        {/* Filters & Sort (Only for Tracker) */}
        {viewMode === 'tracker' && (
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:flex-none">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input type="text" placeholder="Search name or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-56" />
            </div>

            {/* Filter Dropdown */}
            <div className="relative group">
              <div className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-slate-600 cursor-pointer hover:bg-slate-50">
                <Filter size={14} />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} 
                  className="bg-transparent outline-none cursor-pointer appearance-none pr-4">
                  <option value="all">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="missing">Missing</option>
                </select>
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <div className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-slate-600 cursor-pointer hover:bg-slate-50">
                <ArrowUpDown size={14} />
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} 
                  className="bg-transparent outline-none cursor-pointer appearance-none pr-4">
                  <option value="name">Name (A-Z)</option>
                  <option value="id">YAAS ID</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- VIEW 1: TRACKER GRID --- */}
      {viewMode === 'tracker' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {trackerData.map((editor) => (
            <div key={editor.yaas_id} onClick={() => openEditorHistory(editor)}
              className={`p-4 rounded-xl border relative group cursor-pointer transition-all hover:shadow-md
                ${editor.hasSubmitted ? 'bg-white border-slate-200' : 'bg-red-50/50 border-red-100'}
              `}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {editor.yaas_id}
                </span>
                {editor.hasSubmitted 
                  ? <CheckCircle size={18} className="text-green-500" />
                  : <XCircle size={18} className="text-red-400 opacity-50" />
                }
              </div>
              
              <h3 className="font-bold text-slate-800 truncate">{editor.name}</h3>
              <p className="text-xs text-slate-500 truncate mb-3">{editor.email}</p>
              
              <div className="flex items-center justify-between mt-4">
                <div className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1
                  ${editor.hasSubmitted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {editor.hasSubmitted ? 'Submitted' : 'Pending'}
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition" />
              </div>
            </div>
          ))}
          {trackerData.length === 0 && (
             <div className="col-span-full py-12 text-center text-slate-500">
                No editors found matching your filters.
             </div>
          )}
        </div>
      )}

      {/* --- VIEW 2: DATA SHEET (Excel Style) --- */}
      {viewMode === 'data' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b">
              <tr>
                <th className="p-3 border sticky left-0 bg-slate-50 z-10">Name</th>
                <th className="p-3 border">YAAS ID</th>
                <th className="p-3 border">Hygiene</th>
                <th className="p-3 border">IP Name</th>
                <th className="p-3 border">Delivered</th>
                <th className="p-3 border">Approved</th>
                <th className="p-3 border">Pass %</th>
                <th className="p-3 border max-w-xs">Improvements</th>
                <th className="p-3 border max-w-xs">Links</th>
              </tr>
            </thead>
            <tbody>
              {flatData.map((row: any, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-2 border font-bold sticky left-0 bg-white">{row.editor_name}</td>
                  <td className="p-2 border">{row.yaas_id}</td>
                  <td className="p-2 border">{row.hygiene_score}</td>
                  <td className="p-2 border font-medium text-blue-700">{row.ip_name}</td>
                  <td className="p-2 border text-center">{row.reels_delivered}</td>
                  <td className="p-2 border text-center">{row.approved_reels}</td>
                  <td className="p-2 border text-center">
                    {row.reels_delivered > 0 ? ((row.approved_reels / row.reels_delivered) * 100).toFixed(0) + '%' : '-'}
                  </td>
                  <td className="p-2 border truncate max-w-[200px]" title={row.improvements}>{row.improvements}</td>
                  <td className="p-2 border truncate max-w-[150px]">
                    {row.drive_links && <a href="#" className="text-blue-600 underline">View Links</a>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- MODAL: EDITOR HISTORY --- */}
      {selectedEditor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end transition-opacity" onClick={() => setSelectedEditor(null)}>
          <div className="bg-slate-50 w-full max-w-2xl h-full shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="bg-white sticky top-0 z-10 border-b p-6 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedEditor.name}</h2>
                <div className="flex gap-3 text-sm text-slate-500 mt-1">
                  <span className="font-mono bg-slate-100 px-1 rounded">{selectedEditor.yaas_id}</span>
                  <span>{selectedEditor.email}</span>
                </div>
              </div>
              <button onClick={() => setSelectedEditor(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Clock size={16} /> Submission History
              </h3>

              {loadingHistory ? (
                <div className="text-center py-10 text-slate-500">Loading history...</div>
              ) : historyReports.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                  No reports submitted yet.
                </div>
              ) : (
                historyReports.map((report) => (
                  <div key={report.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    {/* Report Header */}
                    <div className="bg-blue-50/50 p-4 border-b flex justify-between items-center">
                      <span className="font-bold text-blue-800 text-sm">{report.week_label}</span>
                      <span className="text-xs text-slate-500">{new Date(report.submission_date).toLocaleDateString()}</span>
                    </div>
                    
                    {/* General Stats */}
                    <div className="p-4 grid grid-cols-2 gap-4 text-sm border-b border-slate-50">
                      <div>
                        <span className="text-slate-500 block text-xs uppercase font-bold">Hygiene</span>
                        <span className="font-medium text-slate-800">{report.hygiene_score}/10</span>
                      </div>
                      <div>
                         <span className="text-slate-500 block text-xs uppercase font-bold">Commitment</span>
                         <span className="font-medium text-slate-800">{report.next_week_commitment} Reels</span>
                      </div>
                    </div>

                    {/* IPs List */}
                    <div className="p-4 bg-slate-50/30">
                      <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">IPs Worked On</span>
                      <div className="space-y-2">
                        {report.ip_data && report.ip_data.map((ip: any, idx: number) => (
                           <div key={idx} className="bg-white p-3 rounded border text-sm flex justify-between items-center">
                              <span className="font-medium text-slate-700">{ip.ip_name}</span>
                              <div className="flex gap-3 text-xs">
                                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100">
                                  {ip.reels_delivered} Del
                                </span>
                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                                  {ip.approved_reels} App
                                </span>
                              </div>
                           </div>
                        ))}
                      </div>
                    </div>

                    {/* Feedback (Collapsible-ish feel) */}
                    {(report.overall_feedback || report.general_improvements) && (
                      <div className="p-4 text-xs text-slate-600 border-t">
                        <p className="line-clamp-2"><strong>Feedback:</strong> {report.overall_feedback || "No feedback provided."}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  )
}