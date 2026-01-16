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
  // Use Date Picker instead of Dropdown
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
      let weeklyScore = 0
      if (report && report.ip_data) {
        weeklyScore = report.ip_data.reduce((sum: number, ip: any) => {
          const sf = ip.sf_daily || ip.reels_delivered || 0
          const lf = ip.lf_daily || 0
          return sum + sf + lf
        }, 0)
      }
      return { ...editor, hasSubmitted: !!report, weeklyScore }
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
    if (globalSearch) {
      const lower = globalSearch.toLowerCase()
      data = data.filter(row => row.editor_name.toLowerCase().includes(lower) || row.yaas_id.toLowerCase().includes(lower) || row.ip_name.toLowerCase().includes(lower))
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

  // --- Instant Export Logic ---
  const handleExport = () => {
    if (rawFlatData.length === 0) return alert("No data available to export for this week.")

    const exportRows = rawFlatData.map(r => ({
      Timestamp: r.submission_date,
      Name: r.editor_name,
      'YAAS ID': r.yaas_id,
      Email: r.editor_email,
      Hygiene: r.hygiene_score,
      Mistakes: r.mistakes_repeated === 'Yes' ? 'Yes' : 'No',
      'Mistake Details': r.mistake_details || '', // Force empty string if null
      Delays: r.delays === 'Yes' ? 'Yes' : 'No',
      'Delay Reasons': r.delay_reasons || '',
      Improvements: r.general_improvements,
      Target: r.next_week_commitment,
      'Areas Imp': r.areas_improvement,
      Feedback: r.overall_feedback,
      
      IP: r.ip_name,
      Lead: r.lead_editor,
      Manager: r.channel_manager,
      'SF (Week)': r.sf_daily, // Changed from 'SF Daily'
      'SF Note': r.sf_daily_note,
      'LF (Week)': r.lf_daily, // Changed from 'LF Daily'
      'LF Note': r.lf_daily_note,
      'Total Mins': r.total_minutes,
      'Total Note': r.total_minutes_note,
      Approved: r.approved_reels,
      'Creative Inputs': r.creative_inputs,
      
      // Ensure "Blocker" details are exported even if column looks empty in UI
      Blockers: r.has_blockers === 'Yes' ? 'Yes' : 'No',
      'Blocker Detail': r.blocker_details || '', 
      
      'Avg Iter': r.avg_reiterations,
      
      'QC Repeat': r.has_qc_changes === 'Yes' ? 'Yes' : 'No',
      'QC Detail': r.qc_details || '',
      
      'IP Imp': r.improvements,
      Links: r.drive_links,
      'Mgr Comment': r.manager_comments
    }))

    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Report")
    
    // Create clean filename based on selected week
    const safeName = weekLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    XLSX.writeFile(wb, `report_${safeName}.xlsx`)
  }

  // --- Render Header (Filter Logic) ---
  const getUniqueValues = (key: keyof FlatRow) => {
    const values = new Set(rawFlatData.map(r => String(r[key] || '')))
    return Array.from(values).sort().filter(v => v !== '')
  }

  const renderHeader = (label: string, key: keyof FlatRow, width: string = 'min-w-[120px]') => {
    const uniqueVals = getUniqueValues(key)
    const showDropdown = uniqueVals.length <= 50 

    return (
      <th className={`p-3 border text-xs font-bold text-slate-700 bg-slate-50 sticky top-0 z-10 select-none group ${width}`}>
        <div className="flex items-center gap-1 cursor-pointer hover:text-blue-600 mb-2" onClick={() => setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
          {label}
          {sortConfig.key === key && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
        </div>
        
        {viewMode === 'data' && (
           <div className="relative w-full">
             {showDropdown ? (
               <select 
                 className="w-full text-[10px] p-1 border rounded outline-none focus:border-blue-500 bg-white cursor-pointer"
                 value={columnFilters[key] || ''}
                 onChange={(e) => setColumnFilters(prev => ({ ...prev, [key]: e.target.value }))}
                 onClick={(e) => e.stopPropagation()}
               >
                 <option value="">All</option>
                 {uniqueVals.map(v => <option key={v} value={v}>{v.substring(0, 25)}</option>)}
               </select>
             ) : (
               <div className="relative">
                 <input type="text" placeholder="Search..." className="w-full text-[10px] p-1 pr-4 border rounded outline-none"
                   value={columnFilters[key] || ''}
                   onChange={(e) => setColumnFilters(prev => ({ ...prev, [key]: e.target.value }))}
                   onClick={(e) => e.stopPropagation()}
                 />
               </div>
             )}
             
             {columnFilters[key] && (
               <button className="absolute right-1 top-1.5 text-slate-400 hover:text-red-500" 
                  onClick={(e) => { e.stopPropagation(); setColumnFilters(prev => ({ ...prev, [key]: '' })) }}>
                  <X size={10} />
               </button>
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
    
    // 1. Name Click -> History
    if (key === 'editor_name') {
      return (
        <button onClick={() => openEditorHistory(row.editor_email, row.editor_name, row.yaas_id)} 
          className="font-bold text-slate-800 hover:text-blue-600 hover:underline text-left">
          {val}
        </button>
      )
    }
    
    // 2. IP Click -> Filter
    if (key === 'ip_name') {
      return (
        <button onClick={() => setColumnFilters(prev => ({...prev, ip_name: String(val)}))} 
          className="font-medium text-blue-700 hover:underline text-left">
          {val}
        </button>
      )
    }
    
    // 3. FIX: Link Parsing Logic
    if (key === 'drive_links' && val) {
      // Regex to find http/https links
      const links = String(val).match(/\bhttps?:\/\/\S+/gi);
      
      if (links && links.length > 0) {
         return (
           <div className="flex flex-col gap-1">
             {links.map((link, i) => (
               <a 
                 key={i} 
                 href={link} 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="text-blue-600 underline text-[10px] block truncate max-w-[100px] hover:text-blue-800" 
                 onClick={e => e.stopPropagation()} // Prevent row click
                 title={link} // Show full link on hover
               >
                 Link {i+1}
               </a>
             ))}
           </div>
         )
      }
      return <span className="text-slate-400 text-[10px] italic">No Links</span>
    }

    // 4. Number + Note Fields
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

    // Default Text
    return <div className="min-w-[100px] max-w-[250px] break-words text-xs whitespace-normal">{val}</div>
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
           {/* REPLACED DROPDOWN WITH CALENDAR PICKER */}
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
           
           {/* ONE CLICK DOWNLOAD BUTTON */}
           <button onClick={handleExport} className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition" title="Download Excel for this Week">
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
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50">
                 <tr>
                    {renderHeader('Timestamp', 'submission_date')}
                    {renderHeader('Name', 'editor_name')}
                    {renderHeader('ID', 'yaas_id')}
                    {renderHeader('Email', 'editor_email')}
                    {renderHeader('Hygiene', 'hygiene_score')}
                    {renderHeader('Mistakes?', 'mistakes_repeated')}
                    {renderHeader('Mistake Details', 'mistake_details', 'min-w-[200px]')}
                    {renderHeader('Delays?', 'delays')}
                    {renderHeader('Delay Reason', 'delay_reasons', 'min-w-[200px]')}
                    {renderHeader('Gen. Improvements', 'general_improvements', 'min-w-[200px]')}
                    {renderHeader('Target', 'next_week_commitment')}
                    {renderHeader('Areas Imp.', 'areas_improvement', 'min-w-[200px]')}
                    {renderHeader('Reflection', 'overall_feedback', 'min-w-[200px]')}
                    <th className="border p-2 bg-blue-50 w-2"></th> 
                    {renderHeader('IP Name', 'ip_name', 'bg-blue-50 text-blue-900')}
                    {renderHeader('Lead', 'lead_editor', 'bg-blue-50 text-blue-900')}
                    {renderHeader('Manager', 'channel_manager', 'bg-blue-50 text-blue-900')}
                    {renderHeader('SF (Week)', 'sf_daily', 'bg-blue-50 text-blue-900')}
                    {renderHeader('LF (Week)', 'lf_daily', 'bg-blue-50 text-blue-900')}
                    {renderHeader('Total Mins', 'total_minutes', 'bg-blue-50 text-blue-900')}
                    {renderHeader('Approved', 'approved_reels', 'bg-blue-50 text-blue-900')}
                    {renderHeader('Creative', 'creative_inputs', 'bg-blue-50 text-blue-900 min-w-[200px]')}
                    {renderHeader('Blockers?', 'has_blockers', 'bg-blue-50 text-blue-900')}
                    {renderHeader('Blocker Det', 'blocker_details', 'bg-blue-50 text-blue-900 min-w-[200px]')}
                    {renderHeader('Avg Iter', 'avg_reiterations', 'bg-blue-50 text-blue-900')}
                    {renderHeader('QC Repeat?', 'has_qc_changes', 'bg-blue-50 text-blue-900')}
                    {renderHeader('QC Detail', 'qc_details', 'bg-blue-50 text-blue-900 min-w-[200px]')}
                    {renderHeader('IP Imp.', 'improvements', 'bg-blue-50 text-blue-900 min-w-[200px]')}
                    {renderHeader('Links', 'drive_links', 'bg-blue-50 text-blue-900')}
                    {renderHeader('Mgr Comment', 'manager_comments', 'bg-blue-50 text-blue-900 min-w-[200px]')}
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
                             // Backward Compatibility Logic
                             const sf = ip.sf_daily !== undefined ? ip.sf_daily : (ip.reels_delivered || 0)
                             const sfNote = ip.sf_daily_note || (ip.reels_delivered !== undefined ? '(Legacy)' : '')
                             const lf = ip.lf_daily || 0
                             const lfNote = ip.lf_daily_note || ''
                             const totalMins = ip.total_minutes || 0
                             const totalNote = ip.total_minutes_note || ''

                             return (
                               <div key={i} className="bg-slate-50 p-3 rounded border text-xs flex flex-col gap-2">
                                  <div className="font-bold text-slate-800 text-sm">{ip.ip_name}</div>
                                  <div className="flex flex-wrap gap-2">
                                    {/* SF Badge */}
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium border border-blue-200" title={sfNote}>
                                      SF (Week): {sf} {sfNote && '*'}
                                    </span>
                                    
                                    {/* LF Badge */}
                                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded font-medium border border-purple-200" title={lfNote}>
                                      LF (Week): {lf} {lfNote && '*'}
                                    </span>
                                    
                                    {/* Total Mins Badge */}
                                    {totalMins > 0 && (
                                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded font-medium border border-orange-200" title={totalNote}>
                                        Total: {totalMins}m {totalNote && '*'}
                                      </span>
                                    )}
                                    
                                    {/* Approved Badge */}
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-medium border border-green-200">
                                      Appr: {ip.approved_reels || 0}
                                    </span>
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

    </div>
  )
}