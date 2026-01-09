'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { calculateWeekAndMonth } from '@/lib/utils'
import { 
  Calendar, Search, LayoutList, Table2, 
  CheckCircle, XCircle, Filter, ArrowUpDown, 
  X, Clock, ChevronRight, ArrowUp, ArrowDown, ExternalLink, RefreshCw
} from 'lucide-react'

// --- Types ---
interface Editor {
  name: string
  email: string
  yaas_id: string
  hasSubmitted: boolean
  submittedAt?: string
}

interface FlatRow {
  uniqueId: string
  reportId: string
  // General Data
  submission_date: string
  editor_name: string
  yaas_id: string
  editor_email: string
  hygiene_score: number
  mistakes_repeated: string
  mistake_details: string
  delays: string
  delay_reasons: string
  general_improvements: string
  next_week_commitment: number
  areas_improvement: string
  overall_feedback: string
  // IP Data
  ip_name: string
  lead_editor: string
  channel_manager: string
  
  // Updated Metrics
  sf_daily: number
  sf_daily_note: string
  lf_daily: number
  lf_daily_note: string
  total_minutes: number
  total_minutes_note: string
  
  approved_reels: number
  creative_inputs: string
  has_blockers: string
  blocker_details: string
  avg_reiterations: number
  has_qc_changes: string
  qc_details: string
  improvements: string
  drive_links: string
  manager_comments: string
}

export default function AdminDashboard() {
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'tracker' | 'data'>('tracker')
  const [registry, setRegistry] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [weekLabel, setWeekLabel] = useState('')
  const [globalSearch, setGlobalSearch] = useState('')
  const [trackerStatusFilter, setTrackerStatusFilter] = useState<'all' | 'submitted' | 'missing'>('all')

  const [sortConfig, setSortConfig] = useState<{ key: keyof FlatRow; direction: 'asc' | 'desc' }>({ key: 'editor_name', direction: 'asc' })
  const [columnFilters, setColumnFilters] = useState<Partial<Record<keyof FlatRow, string>>>({})

  const [selectedEditor, setSelectedEditor] = useState<Editor | null>(null)
  const [historyReports, setHistoryReports] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyDateRange, setHistoryDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/')
      
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') return router.push('/dashboard')

      const { data: reg } = await supabase.from('editor_registry').select('*').order('name')
      if (reg) setRegistry(reg)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    const fetchReports = async () => {
      const { weekLabel: w } = calculateWeekAndMonth(selectedDate)
      setWeekLabel(w)
      const { data } = await supabase.from('reports').select('*').eq('week_label', w)
      if (data) setReports(data)
    }
    fetchReports()
  }, [selectedDate])

  const trackerData = useMemo(() => {
    return registry.map(editor => {
      const report = reports.find(r => r.editor_email === editor.email)
      return { ...editor, hasSubmitted: !!report }
    }).filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(globalSearch.toLowerCase()) || 
                            e.yaas_id.toLowerCase().includes(globalSearch.toLowerCase())
      const matchesStatus = trackerStatusFilter === 'all' ? true :
                            trackerStatusFilter === 'submitted' ? e.hasSubmitted : !e.hasSubmitted
      return matchesSearch && matchesStatus
    })
  }, [registry, reports, globalSearch, trackerStatusFilter])

  const rawFlatData: FlatRow[] = useMemo(() => {
    return reports.flatMap(r => {
      const ips = r.ip_data || []
      if (ips.length === 0) {
        return [{
          uniqueId: r.id + '_0', reportId: r.id,
          submission_date: r.submission_date, editor_name: r.editor_name, yaas_id: r.yaas_id, editor_email: r.editor_email,
          hygiene_score: r.hygiene_score, mistakes_repeated: r.mistakes_repeated ? 'Yes' : 'No', mistake_details: r.mistake_details,
          delays: r.delays ? 'Yes' : 'No', delay_reasons: r.delay_reasons, general_improvements: r.general_improvements,
          next_week_commitment: r.next_week_commitment, areas_improvement: r.areas_improvement, overall_feedback: r.overall_feedback,
          ip_name: '-', lead_editor: '-', channel_manager: '-', 
          sf_daily: 0, sf_daily_note: '', lf_daily: 0, lf_daily_note: '', total_minutes: 0, total_minutes_note: '', approved_reels: 0,
          creative_inputs: '-', has_blockers: '-', blocker_details: '-', avg_reiterations: 0,
          has_qc_changes: '-', qc_details: '-', improvements: '-', drive_links: '', manager_comments: '-'
        }]
      }
      return ips.map((ip: any, idx: number) => ({
        uniqueId: r.id + '_' + idx, reportId: r.id,
        submission_date: r.submission_date, editor_name: r.editor_name, yaas_id: r.yaas_id, editor_email: r.editor_email,
        hygiene_score: r.hygiene_score, mistakes_repeated: r.mistakes_repeated ? 'Yes' : 'No', mistake_details: r.mistake_details,
        delays: r.delays ? 'Yes' : 'No', delay_reasons: r.delay_reasons, general_improvements: r.general_improvements,
        next_week_commitment: r.next_week_commitment, areas_improvement: r.areas_improvement, overall_feedback: r.overall_feedback,
        
        ip_name: ip.ip_name, lead_editor: ip.lead_editor, channel_manager: ip.channel_manager,
        
        sf_daily: ip.sf_daily || 0,
        sf_daily_note: ip.sf_daily_note || '',
        lf_daily: ip.lf_daily || 0,
        lf_daily_note: ip.lf_daily_note || '',
        total_minutes: ip.total_minutes || 0,
        total_minutes_note: ip.total_minutes_note || '',
        
        approved_reels: ip.approved_reels || 0,
        creative_inputs: ip.creative_inputs, has_blockers: ip.has_blockers, blocker_details: ip.blocker_details,
        avg_reiterations: ip.avg_reiterations || 0, has_qc_changes: ip.has_qc_changes, qc_details: ip.qc_details,
        improvements: ip.improvements, drive_links: ip.drive_links, manager_comments: ip.manager_comments
      }))
    })
  }, [reports])

  const processedTableData = useMemo(() => {
    let data = [...rawFlatData]
    if (globalSearch) {
      const lower = globalSearch.toLowerCase()
      data = data.filter(row => 
        row.editor_name.toLowerCase().includes(lower) || 
        row.yaas_id.toLowerCase().includes(lower) ||
        row.ip_name.toLowerCase().includes(lower)
      )
    }
    Object.keys(columnFilters).forEach((key) => {
      const filterVal = columnFilters[key as keyof FlatRow]?.toLowerCase()
      if (filterVal) {
        data = data.filter(row => String(row[key as keyof FlatRow]).toLowerCase().includes(filterVal))
      }
    })
    data.sort((a, b) => {
      const valA = a[sortConfig.key]; const valB = b[sortConfig.key]
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return data
  }, [rawFlatData, globalSearch, sortConfig, columnFilters])

  const isGrouped = ['editor_name', 'yaas_id', 'submission_date'].includes(sortConfig.key)
  const getRowSpan = (row: FlatRow, index: number, data: FlatRow[]) => {
    if (!isGrouped) return 1
    if (index === 0 || row.reportId !== data[index - 1].reportId) {
      let span = 1
      for (let i = index + 1; i < data.length; i++) {
        if (data[i].reportId === row.reportId) span++
        else break
      }
      return span
    }
    return 0
  }

  const handleSort = (key: keyof FlatRow) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }))
  }
  const clearFilters = () => {
    setGlobalSearch('')
    setColumnFilters({})
    setTrackerStatusFilter('all')
    setSortConfig({ key: 'editor_name', direction: 'asc' })
  }

  const openEditorHistory = async (editorEmail: string, editorName: string, editorId: string) => {
    setSelectedEditor({ name: editorName, email: editorEmail, yaas_id: editorId, hasSubmitted: true })
    setLoadingHistory(true)
    let query = supabase.from('reports').select('*').eq('editor_email', editorEmail).order('submission_date', { ascending: false })
    if (historyDateRange.start) query = query.gte('submission_date', historyDateRange.start)
    if (historyDateRange.end) query = query.lte('submission_date', historyDateRange.end)
    const { data } = await query
    setHistoryReports(data || [])
    setLoadingHistory(false)
  }

  useEffect(() => {
    if (selectedEditor) openEditorHistory(selectedEditor.email, selectedEditor.name, selectedEditor.yaas_id)
  }, [historyDateRange])

  const renderHeader = (label: string, key: keyof FlatRow, width: string = 'w-auto') => (
    <th className={`p-3 border text-xs font-bold text-slate-700 bg-slate-50 sticky top-0 z-10 select-none group ${width}`}>
      <div className="flex items-center gap-1 cursor-pointer hover:text-blue-600" onClick={() => handleSort(key)}>
        {label}
        {sortConfig.key === key && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </div>
      {viewMode === 'data' && (
         <div className="mt-1 relative">
           <input type="text" placeholder="Filter..." className="w-full text-[10px] p-1 border rounded font-normal outline-none focus:border-blue-500"
             value={columnFilters[key] || ''}
             onChange={(e) => setColumnFilters(prev => ({ ...prev, [key]: e.target.value }))}
             onClick={(e) => e.stopPropagation()}
           />
           {columnFilters[key] && (
             <X size={10} className="absolute right-1 top-1.5 cursor-pointer text-slate-400 hover:text-red-500" 
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); setColumnFilters(prev => ({ ...prev, [key]: '' })) }} />
           )}
         </div>
      )}
    </th>
  )

  const renderCell = (row: FlatRow, index: number, key: keyof FlatRow, data: FlatRow[], isGeneral: boolean) => {
    if (isGeneral && isGrouped) {
      const span = getRowSpan(row, index, data)
      if (span === 0) return null
      return <td rowSpan={span} className="p-2 border align-top bg-white group-hover:bg-slate-50/50">{renderCellValue(row, key)}</td>
    }
    return <td className={`p-2 border align-top ${isGeneral ? 'bg-white' : 'bg-blue-50/10'}`}>{renderCellValue(row, key)}</td>
  }

  const renderCellValue = (row: FlatRow, key: keyof FlatRow) => {
    const val = row[key]
    if (key === 'editor_name') return <button onClick={() => openEditorHistory(row.editor_email, row.editor_name, row.yaas_id)} className="font-bold text-slate-800 hover:text-blue-600 hover:underline text-left">{val}</button>
    if (key === 'ip_name') return <button onClick={() => setColumnFilters(prev => ({...prev, ip_name: String(val)}))} className="font-medium text-blue-700 hover:underline text-left">{val}</button>
    
    // Parse Links
    if (key === 'drive_links' && val) {
      const links = String(val).match(/\bhttps?:\/\/\S+/gi);
      if (links && links.length > 0) {
         return (
           <div className="flex flex-col gap-1">
             {links.map((link, i) => (
               <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-[10px] block truncate max-w-[100px]" onClick={e => e.stopPropagation()}>
                 Link {i+1}
               </a>
             ))}
           </div>
         )
      }
      return <span className="text-slate-400 text-[10px] italic">No Links</span>
    }

    // Number + Note Fields
    if (['sf_daily', 'lf_daily', 'total_minutes'].includes(key as string)) {
        const noteKey = key + '_note'
        const note = (row as any)[noteKey]
        return (
          <div>
            <span className="font-bold">{val}</span>
            {note && <span className="block text-[9px] text-slate-500 bg-yellow-50 p-0.5 rounded truncate max-w-[80px]" title={note}>{note}</span>}
          </div>
        )
    }

    return <span className="truncate block max-w-[200px]" title={String(val)}>{val}</span>
  }

  if (loading) return <div className="p-10 text-center">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
            <Clock size={12}/> {weekLabel} 
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center bg-white p-2 rounded-xl shadow-sm border">
           {/* Date Picker */}
           <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg border">
             <Calendar size={16} className="text-blue-600"/>
             <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-transparent outline-none text-sm font-medium"/>
           </div>

           <div className="w-[1px] h-6 bg-slate-200 hidden md:block"></div>

           {/* View Mode */}
           <div className="flex bg-slate-100 rounded-lg p-1">
              <button onClick={() => setViewMode('tracker')} className={`px-3 py-1.5 text-xs font-bold rounded ${viewMode === 'tracker' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Tracker</button>
              <button onClick={() => setViewMode('data')} className={`px-3 py-1.5 text-xs font-bold rounded ${viewMode === 'data' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Data Sheet</button>
           </div>

           {/* STATUS FILTER (Only visible in Tracker mode) */}
           {viewMode === 'tracker' && (
             <div className="relative group">
               <div className="flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50">
                 <Filter size={14} />
                 <select value={trackerStatusFilter} onChange={e => setTrackerStatusFilter(e.target.value as any)} 
                   className="bg-transparent outline-none cursor-pointer appearance-none pr-4">
                   <option value="all">All Status</option>
                   <option value="submitted">Submitted</option>
                   <option value="missing">Missing</option>
                 </select>
               </div>
             </div>
           )}

           {/* Search & Reset */}
           <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400"/>
              <input type="text" placeholder="Global Search..." value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}
                className="pl-8 pr-2 py-1.5 text-sm border rounded-lg w-40 focus:w-56 transition-all outline-none focus:ring-2 focus:ring-blue-500"/>
           </div>
           
           <button onClick={clearFilters} title="Clear All Filters" className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition">
             <RefreshCw size={16} />
           </button>
        </div>
      </div>

      {/* === VIEW 1: TRACKER === */}
      {viewMode === 'tracker' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {trackerData.map((editor: any) => (
             <div key={editor.yaas_id} onClick={() => openEditorHistory(editor.email, editor.name, editor.yaas_id)}
                className={`p-4 rounded-xl border cursor-pointer hover:shadow-md transition bg-white
                  ${editor.hasSubmitted ? 'border-green-200' : 'border-red-200'}
                `}>
                <div className="flex justify-between mb-2">
                   <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{editor.yaas_id}</span>
                   {editor.hasSubmitted ? <CheckCircle size={16} className="text-green-500"/> : <XCircle size={16} className="text-red-400"/>}
                </div>
                <div className="font-bold text-sm truncate">{editor.name}</div>
                <div className={`mt-3 text-xs text-center py-1 rounded font-bold ${editor.hasSubmitted ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                   {editor.hasSubmitted ? 'Submitted' : 'Missing'}
                </div>
             </div>
          ))}
          {trackerData.length === 0 && (
             <div className="col-span-full py-10 text-center text-slate-500">
               No editors found matching filters.
             </div>
          )}
        </div>
      )}

      {/* === VIEW 2: DATA SHEET === */}
      {viewMode === 'data' && (
        <div className="bg-white rounded-xl shadow border overflow-hidden flex flex-col h-[80vh]">
          <div className="overflow-auto flex-1">
            <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
              <thead className="bg-slate-50">
                 <tr>
                    {renderHeader('Timestamp', 'submission_date')}
                    {renderHeader('Name', 'editor_name')}
                    {renderHeader('ID', 'yaas_id')}
                    {renderHeader('Email', 'editor_email')}
                    {renderHeader('Hygiene', 'hygiene_score')}
                    {renderHeader('Mistakes?', 'mistakes_repeated')}
                    {renderHeader('Mistake Details', 'mistake_details', 'min-w-[150px]')}
                    {renderHeader('Delays?', 'delays')}
                    {renderHeader('Delay Reason', 'delay_reasons', 'min-w-[150px]')}
                    {renderHeader('Gen. Improvements', 'general_improvements', 'min-w-[150px]')}
                    {renderHeader('Target', 'next_week_commitment')}
                    {renderHeader('Areas Imp.', 'areas_improvement', 'min-w-[150px]')}
                    {renderHeader('Reflection', 'overall_feedback', 'min-w-[150px]')}
                    <th className="border p-2 bg-blue-50 w-2"></th> 
                    {renderHeader('IP Name', 'ip_name', 'bg-blue-50 text-blue-900')}
                    {renderHeader('Lead', 'lead_editor', 'bg-blue-50 text-blue-900')}
                    {renderHeader('Manager', 'channel_manager', 'bg-blue-50 text-blue-900')}
                    
                    {/* NEW HEADERS */}
                    {renderHeader('SF Daily', 'sf_daily', 'bg-blue-50 text-blue-900')}
                    {renderHeader('LF Daily', 'lf_daily', 'bg-blue-50 text-blue-900')}
                    {renderHeader('Total Mins', 'total_minutes', 'bg-blue-50 text-blue-900')}
                    
                    {renderHeader('Approved', 'approved_reels', 'bg-blue-50 text-blue-900')}
                    {renderHeader('Creative', 'creative_inputs', 'bg-blue-50 text-blue-900 min-w-[150px]')}
                    {renderHeader('Blockers?', 'has_blockers', 'bg-blue-50 text-blue-900')}
                    {renderHeader('Blocker Det', 'blocker_details', 'bg-blue-50 text-blue-900 min-w-[150px]')}
                    {renderHeader('Avg Iter', 'avg_reiterations', 'bg-blue-50 text-blue-900')}
                    {renderHeader('QC Repeat?', 'has_qc_changes', 'bg-blue-50 text-blue-900')}
                    {renderHeader('QC Detail', 'qc_details', 'bg-blue-50 text-blue-900 min-w-[150px]')}
                    {renderHeader('IP Imp.', 'improvements', 'bg-blue-50 text-blue-900 min-w-[150px]')}
                    {renderHeader('Links', 'drive_links', 'bg-blue-50 text-blue-900')}
                    {renderHeader('Mgr Comment', 'manager_comments', 'bg-blue-50 text-blue-900 min-w-[150px]')}
                 </tr>
              </thead>
              <tbody>
                {processedTableData.length > 0 ? processedTableData.map((row, i) => (
                  <tr key={row.uniqueId} className="hover:bg-slate-50 group">
                    {renderCell(row, i, 'submission_date', processedTableData, true)}
                    {renderCell(row, i, 'editor_name', processedTableData, true)}
                    {renderCell(row, i, 'yaas_id', processedTableData, true)}
                    {renderCell(row, i, 'editor_email', processedTableData, true)}
                    {renderCell(row, i, 'hygiene_score', processedTableData, true)}
                    {renderCell(row, i, 'mistakes_repeated', processedTableData, true)}
                    {renderCell(row, i, 'mistake_details', processedTableData, true)}
                    {renderCell(row, i, 'delays', processedTableData, true)}
                    {renderCell(row, i, 'delay_reasons', processedTableData, true)}
                    {renderCell(row, i, 'general_improvements', processedTableData, true)}
                    {renderCell(row, i, 'next_week_commitment', processedTableData, true)}
                    {renderCell(row, i, 'areas_improvement', processedTableData, true)}
                    {renderCell(row, i, 'overall_feedback', processedTableData, true)}
                    <td className="bg-blue-50/20 border-x w-2"></td>
                    {renderCell(row, i, 'ip_name', processedTableData, false)}
                    {renderCell(row, i, 'lead_editor', processedTableData, false)}
                    {renderCell(row, i, 'channel_manager', processedTableData, false)}
                    
                    {/* NEW CELLS */}
                    {renderCell(row, i, 'sf_daily', processedTableData, false)}
                    {renderCell(row, i, 'lf_daily', processedTableData, false)}
                    {renderCell(row, i, 'total_minutes', processedTableData, false)}
                    
                    {renderCell(row, i, 'approved_reels', processedTableData, false)}
                    {renderCell(row, i, 'creative_inputs', processedTableData, false)}
                    {renderCell(row, i, 'has_blockers', processedTableData, false)}
                    {renderCell(row, i, 'blocker_details', processedTableData, false)}
                    {renderCell(row, i, 'avg_reiterations', processedTableData, false)}
                    {renderCell(row, i, 'has_qc_changes', processedTableData, false)}
                    {renderCell(row, i, 'qc_details', processedTableData, false)}
                    {renderCell(row, i, 'improvements', processedTableData, false)}
                    {renderCell(row, i, 'drive_links', processedTableData, false)}
                    {renderCell(row, i, 'manager_comments', processedTableData, false)}
                  </tr>
                )) : (
                  <tr><td colSpan={30} className="p-10 text-center text-slate-500">No records found matching filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- HISTORY MODAL --- */}
      {selectedEditor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setSelectedEditor(null)}>
           <div className="bg-slate-50 w-full max-w-3xl h-full shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="bg-white p-6 border-b">
                 <div className="flex justify-between items-start">
                    <div>
                       <h2 className="text-xl font-bold">{selectedEditor.name}</h2>
                       <div className="text-slate-500 text-sm mt-1">{selectedEditor.email} • {selectedEditor.yaas_id}</div>
                    </div>
                    <button onClick={() => setSelectedEditor(null)}><X size={20}/></button>
                 </div>
                 <div className="mt-6 flex items-center gap-2 text-sm bg-slate-50 p-3 rounded-lg border">
                    <span className="font-bold text-slate-600">Filter History:</span>
                    <input type="date" className="border rounded px-2 py-1" 
                      onChange={e => setHistoryDateRange(p => ({...p, start: e.target.value}))}/>
                    <span>to</span>
                    <input type="date" className="border rounded px-2 py-1"
                      onChange={e => setHistoryDateRange(p => ({...p, end: e.target.value}))}/>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                 {loadingHistory ? (
                   <div className="text-center py-10">Loading...</div>
                 ) : historyReports.length === 0 ? (
                   <div className="text-center py-10 text-slate-400">No reports found in this range.</div>
                 ) : (
                   historyReports.map(r => (
                      <div key={r.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                         <div className="bg-blue-50/50 p-3 border-b flex justify-between font-bold text-sm text-blue-900">
                            <span>{r.week_label}</span>
                            <span>{new Date(r.submission_date).toLocaleDateString()}</span>
                         </div>
                         <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                            <div><span className="block text-xs font-bold text-slate-400">HYGIENE</span> {r.hygiene_score}</div>
                            <div><span className="block text-xs font-bold text-slate-400">TARGET</span> {r.next_week_commitment}</div>
                            <div className="col-span-2">
                               <span className="block text-xs font-bold text-slate-400 mb-1">IPS WORKED ON</span>
                               <div className="flex flex-wrap gap-2">
                                  {r.ip_data && r.ip_data.map((ip: any, i: number) => (
                                     <span key={i} className="bg-slate-100 px-2 py-1 rounded text-xs border">
                                        {ip.ip_name}
                                     </span>
                                  ))}
                               </div>
                            </div>
                         </div>
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