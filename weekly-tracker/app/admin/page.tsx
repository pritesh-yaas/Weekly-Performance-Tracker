'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { calculateWeekAndMonth, getWeekRangeDisplay, getWeekOptions } from '@/lib/utils'
import { 
  Calendar, Search, LayoutList, Table2, 
  CheckCircle, XCircle, Filter, ArrowUpDown, 
  X, Clock, ArrowUp, ArrowDown, RefreshCw, Download, FileSpreadsheet
} from 'lucide-react'
import * as XLSX from 'xlsx'

// --- Types ---
interface Editor {
  name: string
  email: string
  yaas_id: string
  hasSubmitted: boolean
  submittedAt?: string
  // New: Aggregated score for the dashboard card
  weeklyScore?: number
}

interface FlatRow {
  uniqueId: string
  reportId: string
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
  ip_name: string
  lead_editor: string
  channel_manager: string
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
  
  // --- State ---
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'tracker' | 'data'>('tracker')
  const [registry, setRegistry] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  
  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [weekLabel, setWeekLabel] = useState('')
  const [globalSearch, setGlobalSearch] = useState('')
  const [trackerStatusFilter, setTrackerStatusFilter] = useState<'all' | 'submitted' | 'missing'>('all')
  const [sortConfig, setSortConfig] = useState<{ key: keyof FlatRow; direction: 'asc' | 'desc' }>({ key: 'editor_name', direction: 'asc' })
  const [columnFilters, setColumnFilters] = useState<Partial<Record<keyof FlatRow, string>>>({})

  // Modals
  const [selectedEditor, setSelectedEditor] = useState<Editor | null>(null)
  const [historyReports, setHistoryReports] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyDateRange, setHistoryDateRange] = useState({ start: '', end: '' })
  
  // Export State
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportWeeks, setExportWeeks] = useState<string[]>([])
  const availableWeeks = getWeekOptions()

  // --- 1. Init ---
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

  // --- 2. Fetch Reports ---
  useEffect(() => {
    const fetchReports = async () => {
      const { weekLabel: w } = calculateWeekAndMonth(selectedDate)
      setWeekLabel(w)
      const { data } = await supabase.from('reports').select('*').eq('week_label', w)
      if (data) setReports(data)
    }
    fetchReports()
  }, [selectedDate])

  // --- 3. Process Data ---
  const trackerData = useMemo(() => {
    return registry.map(editor => {
      const report = reports.find(r => r.editor_email === editor.email)
      
      // Calculate Aggregated Score (Total Output for the week)
      let weeklyScore = 0
      if (report && report.ip_data) {
        weeklyScore = report.ip_data.reduce((sum: number, ip: any) => {
          // Fallback to legacy fields if necessary
          const sf = ip.sf_daily || ip.reels_delivered || 0
          const lf = ip.lf_daily || 0
          return sum + sf + lf
        }, 0)
      }

      return { 
        ...editor, 
        hasSubmitted: !!report, 
        weeklyScore 
      }
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
      return ips.map((ip: any, idx: number) => {
        const effectiveSF = ip.sf_daily !== undefined ? ip.sf_daily : (ip.reels_delivered || 0)
        const effectiveSFNote = ip.sf_daily_note || (ip.reels_delivered !== undefined ? '(Legacy)' : '')
        return {
          uniqueId: r.id + '_' + idx, reportId: r.id,
          submission_date: r.submission_date, editor_name: r.editor_name, yaas_id: r.yaas_id, editor_email: r.editor_email,
          hygiene_score: r.hygiene_score, mistakes_repeated: r.mistakes_repeated ? 'Yes' : 'No', mistake_details: r.mistake_details,
          delays: r.delays ? 'Yes' : 'No', delay_reasons: r.delay_reasons, general_improvements: r.general_improvements,
          next_week_commitment: r.next_week_commitment, areas_improvement: r.areas_improvement, overall_feedback: r.overall_feedback,
          ip_name: ip.ip_name, lead_editor: ip.lead_editor, channel_manager: ip.channel_manager,
          sf_daily: effectiveSF, sf_daily_note: effectiveSFNote,
          lf_daily: ip.lf_daily || 0, lf_daily_note: ip.lf_daily_note || '',
          total_minutes: ip.total_minutes || 0, total_minutes_note: ip.total_minutes_note || '',
          approved_reels: ip.approved_reels || 0,
          creative_inputs: ip.creative_inputs, has_blockers: ip.has_blockers, blocker_details: ip.blocker_details,
          avg_reiterations: ip.avg_reiterations || 0, has_qc_changes: ip.has_qc_changes, qc_details: ip.qc_details,
          improvements: ip.improvements, drive_links: ip.drive_links, manager_comments: ip.manager_comments
        }
      })
    })
  }, [reports])

  const processedTableData = useMemo(() => {
    let data = [...rawFlatData]
    // Global Search
    if (globalSearch) {
      const lower = globalSearch.toLowerCase()
      data = data.filter(row => row.editor_name.toLowerCase().includes(lower) || row.yaas_id.toLowerCase().includes(lower) || row.ip_name.toLowerCase().includes(lower))
    }
    // Column Filters
    Object.keys(columnFilters).forEach((key) => {
      const filterVal = columnFilters[key as keyof FlatRow]?.toLowerCase()
      if (filterVal) {
        data = data.filter(row => String(row[key as keyof FlatRow]).toLowerCase().includes(filterVal))
      }
    })
    // Sort
    data.sort((a, b) => {
      const valA = a[sortConfig.key]; const valB = b[sortConfig.key]
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return data
  }, [rawFlatData, globalSearch, sortConfig, columnFilters])

  // --- Logic ---
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

  // --- Export Logic ---
  const handleExport = async () => {
    let allData: any[] = []
    
    // 1. Fetch Data for selected weeks
    for (const week of exportWeeks) {
      const { data } = await supabase.from('reports').select('*').eq('week_label', week)
      if (data) allData = [...allData, ...data]
    }

    if (allData.length === 0) return alert("No data found for selected weeks.")

    // 2. Flatten Data (Same logic as Data Sheet)
    const exportRows = allData.flatMap(r => {
      const ips = r.ip_data || []
      const base = {
        Timestamp: r.submission_date, Name: r.editor_name, ID: r.yaas_id, Email: r.editor_email,
        Hygiene: r.hygiene_score, Mistakes: r.mistakes_repeated ? 'Yes' : 'No', 'Mistake Details': r.mistake_details,
        Delays: r.delays ? 'Yes' : 'No', 'Delay Reasons': r.delay_reasons, Improvements: r.general_improvements,
        Target: r.next_week_commitment, 'Areas Imp': r.areas_improvement, Feedback: r.overall_feedback
      }
      if (ips.length === 0) return [base]
      return ips.map((ip: any) => ({
        ...base,
        IP: ip.ip_name, Lead: ip.lead_editor, Manager: ip.channel_manager,
        'SF Daily': ip.sf_daily || 0, 'SF Note': ip.sf_daily_note,
        'LF Daily': ip.lf_daily || 0, 'LF Note': ip.lf_daily_note,
        'Total Mins': ip.total_minutes || 0, 'Approved': ip.approved_reels,
        'Blockers': ip.has_blockers, 'QC Repeat': ip.has_qc_changes, Links: ip.drive_links
      }))
    })

    // 3. Create Excel
    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Reports")
    XLSX.writeFile(wb, "Weekly_Performance_Report.xlsx")
    setShowExportModal(false)
  }

  // --- Helpers ---
  const getUniqueValues = (key: keyof FlatRow) => {
    const values = new Set(rawFlatData.map(r => String(r[key] || '')))
    return Array.from(values).sort().filter(v => v !== '')
  }

  // --- Render Header (Filter Logic) ---
  const renderHeader = (label: string, key: keyof FlatRow, width: string = 'w-auto') => {
    const uniqueVals = getUniqueValues(key)
    const showDropdown = uniqueVals.length <= 50 // Show dropdown if manageable size

    return (
      <th className={`p-3 border text-xs font-bold text-slate-700 bg-slate-50 sticky top-0 z-10 select-none group ${width}`}>
        <div className="flex items-center gap-1 cursor-pointer hover:text-blue-600" onClick={() => setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
          {label}
          {sortConfig.key === key && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
        </div>
        
        {viewMode === 'data' && (
           <div className="mt-1 relative">
             {showDropdown ? (
               <select 
                 className="w-full text-[10px] p-1 border rounded font-normal outline-none focus:border-blue-500 bg-white"
                 value={columnFilters[key] || ''}
                 onChange={(e) => setColumnFilters(prev => ({ ...prev, [key]: e.target.value }))}
                 onClick={(e) => e.stopPropagation()}
               >
                 <option value="">All</option>
                 {uniqueVals.map(v => <option key={v} value={v}>{v.substring(0, 20)}</option>)}
               </select>
             ) : (
               <input type="text" placeholder="Filter..." className="w-full text-[10px] p-1 border rounded"
                 value={columnFilters[key] || ''}
                 onChange={(e) => setColumnFilters(prev => ({ ...prev, [key]: e.target.value }))}
                 onClick={(e) => e.stopPropagation()}
               />
             )}
             
             {columnFilters[key] && (
               <X size={10} className="absolute right-1 top-1.5 cursor-pointer text-slate-400 hover:text-red-500" 
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); setColumnFilters(prev => ({ ...prev, [key]: '' })) }} />
             )}
           </div>
        )}
      </th>
    )
  }

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
    if (key === 'drive_links' && val) return <span title={String(val)} className="text-blue-500 cursor-pointer text-[10px]">Links</span>
    
    if (['sf_daily', 'lf_daily', 'total_minutes'].includes(key as string)) {
        const noteKey = key + '_note'
        const note = (row as any)[noteKey]
        return <div><span className="font-bold">{val}</span>{note && <span className="block text-[9px] text-slate-500" title={note}>*</span>}</div>
    }
    return <span className="truncate block max-w-[200px]" title={String(val)}>{val}</span>
  }

  // --- Aggregate Stats for Modal ---
  const lifetimeStats = useMemo(() => {
    if(!historyReports.length) return null
    
    const totalReports = historyReports.length
    const avgHygiene = (historyReports.reduce((acc, r) => acc + (r.hygiene_score || 0), 0) / totalReports).toFixed(1)
    
    let totalSF = 0, totalLF = 0, totalMins = 0, totalApproved = 0
    historyReports.forEach(r => {
      r.ip_data?.forEach((ip: any) => {
        totalSF += (ip.sf_daily || ip.reels_delivered || 0)
        totalLF += (ip.lf_daily || 0)
        totalMins += (ip.total_minutes || 0)
        totalApproved += (ip.approved_reels || 0)
      })
    })

    return { totalReports, avgHygiene, totalSF, totalLF, totalMins, totalApproved }
  }, [historyReports])

  if (loading) return <div className="p-10 text-center">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-xs text-slate-500 flex items-center gap-2 mt-1"><Clock size={12}/> {weekLabel}</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center bg-white p-2 rounded-xl shadow-sm border">
           <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg border">
             <Calendar size={16} className="text-blue-600"/>
             <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} 
               className="bg-transparent outline-none text-sm font-medium cursor-pointer" />
             <div className="h-4 w-[1px] bg-slate-300 mx-1"></div>
             <span className="text-xs font-bold text-slate-600 whitespace-nowrap">{getWeekRangeDisplay(selectedDate)}</span>
           </div>

           <div className="flex bg-slate-100 rounded-lg p-1">
              <button onClick={() => setViewMode('tracker')} className={`px-3 py-1.5 text-xs font-bold rounded ${viewMode === 'tracker' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Tracker</button>
              <button onClick={() => setViewMode('data')} className={`px-3 py-1.5 text-xs font-bold rounded ${viewMode === 'data' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Data Sheet</button>
           </div>

           {viewMode === 'tracker' && (
             <div className="relative group">
               <div className="flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50">
                 <Filter size={14} />
                 <select value={trackerStatusFilter} onChange={e => setTrackerStatusFilter(e.target.value as any)} className="bg-transparent outline-none cursor-pointer appearance-none pr-4">
                   <option value="all">All</option><option value="submitted">Submitted</option><option value="missing">Missing</option>
                 </select>
               </div>
             </div>
           )}

           <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400"/>
              <input type="text" placeholder="Global Search..." value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}
                className="pl-8 pr-2 py-1.5 text-sm border rounded-lg w-40 focus:w-56 transition-all outline-none focus:ring-2 focus:ring-blue-500"/>
           </div>
           
           <button onClick={() => setShowExportModal(true)} className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition" title="Export Excel">
             <Download size={16} />
           </button>
           <button onClick={() => {setGlobalSearch(''); setColumnFilters({}); setSortConfig({key:'editor_name',direction:'asc'})}} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition">
             <RefreshCw size={16} />
           </button>
        </div>
      </div>

      {/* TRACKER VIEW */}
      {viewMode === 'tracker' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {trackerData.map((editor: any) => (
             <div key={editor.yaas_id} onClick={() => openEditorHistory(editor.email, editor.name, editor.yaas_id)}
                className={`p-4 rounded-xl border cursor-pointer hover:shadow-md transition bg-white ${editor.hasSubmitted ? 'border-green-200' : 'border-red-200'}`}>
                <div className="flex justify-between mb-2">
                   <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{editor.yaas_id}</span>
                   {editor.hasSubmitted ? <CheckCircle size={16} className="text-green-500"/> : <XCircle size={16} className="text-red-400"/>}
                </div>
                <div className="font-bold text-sm truncate">{editor.name}</div>
                
                {/* Aggregated Score Badge */}
                <div className="mt-3 flex justify-between items-center">
                   <div className={`text-xs text-center px-2 py-1 rounded font-bold ${editor.hasSubmitted ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {editor.hasSubmitted ? 'Submitted' : 'Missing'}
                   </div>
                   {editor.hasSubmitted && (
                     <div className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                        Output: {editor.weeklyScore}
                     </div>
                   )}
                </div>
             </div>
          ))}
        </div>
      )}

      {/* DATA VIEW */}
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
                {processedTableData.map((row, i) => (
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
                ))}
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
                 
                 {/* AGGREGATED STATS CARD */}
                 {lifetimeStats && (
                   <div className="mt-6 grid grid-cols-4 gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <div><div className="text-xs text-blue-500 uppercase font-bold">Reports</div><div className="text-xl font-bold text-slate-800">{lifetimeStats.totalReports}</div></div>
                      <div><div className="text-xs text-blue-500 uppercase font-bold">Avg Hygiene</div><div className="text-xl font-bold text-slate-800">{lifetimeStats.avgHygiene}</div></div>
                      <div><div className="text-xs text-blue-500 uppercase font-bold">Total SF</div><div className="text-xl font-bold text-slate-800">{lifetimeStats.totalSF}</div></div>
                      <div><div className="text-xs text-blue-500 uppercase font-bold">Total LF</div><div className="text-xl font-bold text-slate-800">{lifetimeStats.totalLF}</div></div>
                   </div>
                 )}
              </div>
              
              {/* Reports List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                 {loadingHistory ? <div className="text-center py-10">Loading...</div> : historyReports.map(r => (
                    <div key={r.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                       <div className="bg-slate-50 p-3 border-b flex justify-between font-bold text-sm text-slate-700">
                          <span>{r.week_label}</span><span>{new Date(r.submission_date).toLocaleDateString()}</span>
                       </div>
                       <div className="p-4 space-y-3">
                          {r.ip_data && r.ip_data.map((ip: any, i: number) => {
                             const sf = ip.sf_daily || ip.reels_delivered || 0
                             const lf = ip.lf_daily || 0
                             return (
                               <div key={i} className="flex justify-between items-center text-xs border-b pb-2 last:border-0 last:pb-0">
                                  <span className="font-bold w-1/3">{ip.ip_name}</span>
                                  <div className="flex gap-2">
                                    {sf > 0 && <span className="bg-blue-100 px-2 py-0.5 rounded text-blue-800">SF: {sf}</span>}
                                    {lf > 0 && <span className="bg-purple-100 px-2 py-0.5 rounded text-purple-800">LF: {lf}</span>}
                                    <span className="bg-green-100 px-2 py-0.5 rounded text-green-800">Appr: {ip.approved_reels || 0}</span>
                                  </div>
                               </div>
                             )
                          })}
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* --- EXPORT MODAL --- */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FileSpreadsheet className="text-green-600"/> Export Data</h2>
            <p className="text-sm text-slate-500 mb-4">Select weeks to include in the Excel report.</p>
            
            <div className="max-h-60 overflow-y-auto border rounded-lg p-2 mb-4">
              <label className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer border-b">
                <input type="checkbox" 
                  checked={exportWeeks.length === availableWeeks.length}
                  onChange={(e) => setExportWeeks(e.target.checked ? availableWeeks.map(w => w.label) : [])} 
                />
                <span className="font-bold text-sm">Select All Weeks</span>
              </label>
              {availableWeeks.map(w => (
                <label key={w.label} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" 
                    checked={exportWeeks.includes(w.label)}
                    onChange={(e) => {
                      if(e.target.checked) setExportWeeks([...exportWeeks, w.label])
                      else setExportWeeks(exportWeeks.filter(x => x !== w.label))
                    }} 
                  />
                  <span className="text-sm">{w.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleExport} disabled={exportWeeks.length === 0} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50">
                Download Excel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}