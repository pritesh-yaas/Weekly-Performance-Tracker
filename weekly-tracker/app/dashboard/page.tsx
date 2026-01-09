'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { calculateWeekAndMonth, getWeekRangeDisplay } from '@/lib/utils'
import { Plus, X, LogOut, Info, Calendar } from 'lucide-react'

// --- Types ---
interface IPItem {
  id: string
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

// --- Tooltip Component ---
const Tooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block ml-1.5 align-middle">
    <Info size={14} className="text-slate-400 cursor-help hover:text-blue-500" />
    <div className="invisible group-hover:visible absolute z-50 w-64 p-2.5 mt-2 -ml-32 text-xs leading-relaxed text-white bg-slate-800 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none text-center">
      {text}
      <div className="absolute -top-1 left-1/2 -ml-1 border-4 border-transparent border-b-slate-800"></div>
    </div>
  </div>
)

export default function Dashboard() {
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [ipOptions, setIpOptions] = useState<string[]>([])
  
  const [user, setUser] = useState<any>(null)
  const [editorInfo, setEditorInfo] = useState({ name: '', email: '', yaas_id: '' })

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [labels, setLabels] = useState({ weekLabel: '', monthLabel: '' })
  
  const [general, setGeneral] = useState({
    hygiene_score: "",
    mistakes_repeated: "No",
    mistake_details: "",
    delays: "No",
    delay_reasons: "",
    general_improvements: "",
    next_week_commitment: "",
    areas_improvement: "",
    overall_feedback: ""
  })

  const [activeTab, setActiveTab] = useState(0)
  const [items, setItems] = useState<IPItem[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return router.push('/')
      setUser(authUser)

      let { data: prof } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
      if (prof && !prof.yaas_id) {
        const { data: reg } = await supabase.from('editor_registry').select('*').eq('email', authUser.email || '').single()
        if (reg) {
          const { data: updated } = await supabase.from('profiles').update({ yaas_id: reg.yaas_id, full_name: reg.name }).eq('id', authUser.id).select().single()
          prof = updated
        }
      }
      setEditorInfo({ name: prof?.full_name || '', email: authUser.email || '', yaas_id: prof?.yaas_id || '' })
      
      const { data: ips } = await supabase.from('ips').select('name').eq('active', true).order('name')
      if (ips) setIpOptions(ips.map(i => i.name))
      
      addTab()
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    setLabels(calculateWeekAndMonth(date))
  }, [date])

  const addTab = () => {
    setItems([...items, {
      id: Math.random().toString(36),
      ip_name: "", lead_editor: "", channel_manager: "",
      sf_daily: 0, sf_daily_note: "",
      lf_daily: 0, lf_daily_note: "",
      total_minutes: 0, total_minutes_note: "",
      approved_reels: 0,
      creative_inputs: "", has_blockers: "No", blocker_details: "", avg_reiterations: 0,
      has_qc_changes: "No", qc_details: "", improvements: "",
      drive_links: "", manager_comments: ""
    }])
    setActiveTab(items.length)
  }

  const removeTab = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (items.length === 1) return alert("You need at least one IP.")
    if (confirm("Remove this IP tab?")) {
      setItems(items.filter((_, i) => i !== index))
      setActiveTab(0)
    }
  }

  const updateItem = (index: number, field: keyof IPItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if(!editorInfo.yaas_id) throw new Error("YAAS ID is missing.")

      const { error } = await supabase.from('reports').insert({
        user_id: user.id,
        editor_name: editorInfo.name, editor_email: editorInfo.email, yaas_id: editorInfo.yaas_id,
        submission_date: date, 
        week_label: labels.weekLabel, month_label: labels.monthLabel,
        
        hygiene_score: general.hygiene_score,
        mistakes_repeated: general.mistakes_repeated === 'Yes', mistake_details: general.mistake_details,
        delays: general.delays === 'Yes', delay_reasons: general.delay_reasons,
        general_improvements: general.general_improvements, next_week_commitment: general.next_week_commitment,
        areas_improvement: general.areas_improvement, overall_feedback: general.overall_feedback,
        
        ip_data: items
      })

      if (error) throw error
      router.push('/success')

    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-10 text-center font-sans">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border-t-4 border-blue-600 p-8">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Weekly Performance Report</h1>
            <p className="text-xs text-slate-500 mt-1">Please fill this form accurately for your weekly review.</p>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="text-sm text-red-500 flex items-center gap-1 font-medium hover:text-red-700">
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-1 text-slate-700">YAAS ID</label>
              <input value={editorInfo.yaas_id} disabled className="w-full p-2 border border-slate-300 rounded bg-slate-100 font-bold text-blue-800" />
            </div>
             
             <div>
               <label className="block text-sm font-semibold mb-1 text-slate-700">Select Date</label>
               <div className="relative">
                 <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                 <input type="date" required value={date} onChange={e => setDate(e.target.value)} 
                   className="w-full pl-10 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-medium cursor-pointer" />
               </div>
               <div className="mt-2 text-xs font-bold text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 flex justify-between items-center">
                 <span>{labels.weekLabel}</span>
                 <span className="text-slate-500 font-normal">{getWeekRangeDisplay(date)}</span>
               </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-slate-700">Name</label>
              <input value={editorInfo.name} disabled className="w-full p-2 border border-slate-300 rounded bg-slate-100 text-slate-600" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-slate-700">Email</label>
              <input value={editorInfo.email} disabled className="w-full p-2 border border-slate-300 rounded bg-slate-100 text-slate-600" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold border-b border-slate-200 pb-2 mb-4 text-slate-800">1. General Questions</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1">
                    Hygiene Score <Tooltip text="Rate your file management, naming conventions, and general discipline out of 10."/>
                  </label>
                  <input type="number" min="0" max="10" step="0.5" required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="7.5"
                    value={general.hygiene_score ?? ""} onChange={e => setGeneral({...general, hygiene_score: e.target.value === "" ? "" : parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1">
                    Next Week Commitment <Tooltip text="How many reels/animations do you commit to deliver next week?"/>
                  </label>
                  <input type="number" step="0.5" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="10"
                    value={general.next_week_commitment ?? ""} onChange={e => setGeneral({...general, next_week_commitment: e.target.value === "" ? "" : parseFloat(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>value={general.next_week_commitment}
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Mistakes Repeated?</label>
                    <div className="flex gap-4">
                      {['Yes', 'No'].map(opt => (
                        <label key={opt} className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border cursor-pointer transition ${general.mistakes_repeated === opt ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'hover:bg-slate-50'}`}>
                          <input type="radio" name="gen_mistakes" value={opt} checked={general.mistakes_repeated === opt} onChange={() => setGeneral({...general, mistakes_repeated: opt})} className="hidden" />
                          {opt}
                        </label>
                      ))}
                    </div>
                    {general.mistakes_repeated === 'Yes' && (
                      <textarea required placeholder="Specify repeated mistakes..." className="w-full mt-3 p-3 border border-red-200 bg-red-50 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm min-h-[80px]"
                        value={general.mistake_details} onChange={e => setGeneral({...general, mistake_details: e.target.value})} />
                    )}
                 </div>
                 <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Any Delays?</label>
                    <div className="flex gap-4">
                      {['Yes', 'No'].map(opt => (
                        <label key={opt} className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border cursor-pointer transition ${general.delays === opt ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'hover:bg-slate-50'}`}>
                          <input type="radio" name="gen_delays" value={opt} checked={general.delays === opt} onChange={() => setGeneral({...general, delays: opt})} className="hidden" />
                          {opt}
                        </label>
                      ))}
                    </div>
                    {general.delays === 'Yes' && (
                      <textarea required placeholder="Reasons for delays..." className="w-full mt-3 p-3 border border-red-200 bg-red-50 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm min-h-[80px]"
                        value={general.delay_reasons} onChange={e => setGeneral({...general, delay_reasons: e.target.value})} />
                    )}
                 </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1">General Improvements</label>
                  <textarea className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                    placeholder="Specific skills or processes you've improved..." value={general.general_improvements} onChange={e => setGeneral({...general, general_improvements: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                     <label className="block text-sm font-semibold text-slate-900 mb-1">Areas for Improvement</label>
                     <textarea className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                       placeholder="Where do you need support?" value={general.areas_improvement} onChange={e => setGeneral({...general, areas_improvement: e.target.value})} />
                  </div>
                  <div>
                     <label className="block text-sm font-semibold text-slate-900 mb-1">Overall Feedback</label>
                     <textarea className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                       placeholder="Thoughts on performance, team dynamics..." value={general.overall_feedback} onChange={e => setGeneral({...general, overall_feedback: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold border-b border-slate-200 pb-2 mb-4 mt-10 text-slate-800">2. Pod (IP) Related Questions</h2>
            
            <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-0">
              {items.map((item, idx) => (
                <div key={item.id} onClick={() => setActiveTab(idx)}
                  className={`px-4 py-2.5 rounded-t-lg cursor-pointer flex items-center gap-2 min-w-fit border-t border-x border-transparent transition-all ${activeTab === idx ? 'bg-white border-slate-200 border-t-blue-600 border-t-[3px] text-blue-700 font-bold -mb-[1px] z-10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  IP {idx + 1}
                  {items.length > 1 && <span onClick={(e) => removeTab(idx, e)} className="hover:text-red-500 rounded-full p-0.5"><X size={14} /></span>}
                </div>
              ))}
              <button type="button" onClick={addTab} className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-t-lg font-bold flex items-center gap-1"><Plus size={16} /> Add IP</button>
            </div>

            <div className="border border-slate-200 p-6 rounded-b-lg rounded-tr-lg bg-white relative z-0 shadow-sm">
              {items.map((item, idx) => (
                <div key={item.id} className={activeTab === idx ? 'block space-y-6' : 'hidden'}>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-800">IP Name / Channel</label>
                    <select required className="w-full p-2.5 border border-slate-300 rounded mt-1" value={item.ip_name} onChange={e => updateItem(idx, 'ip_name', e.target.value)}>
                        <option value="" disabled>Select IP...</option>
                        {ipOptions.map(ip => <option key={ip} value={ip}>{ip}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-sm font-semibold text-slate-800">Lead Editor</label><input type="text" className="w-full p-2.5 border rounded" value={item.lead_editor} onChange={e => updateItem(idx, 'lead_editor', e.target.value)} /></div>
                    <div><label className="block text-sm font-semibold text-slate-800">Channel Manager</label><input type="text" className="w-full p-2.5 border rounded" value={item.channel_manager} onChange={e => updateItem(idx, 'channel_manager', e.target.value)} /></div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">Output Metrics</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">
                          SF - Reels per Day <Tooltip text="Average number of short-form reels completed per working day." />
                        </label>
                        <div className="flex gap-2">
                          <input type="number" step="0.5" min="0" placeholder="2" className="w-24 p-2 border border-slate-300 rounded text-center font-bold" 
                            value={item.sf_daily || ''} onChange={e => updateItem(idx, 'sf_daily', parseFloat(e.target.value))} />
                          <input type="text" placeholder="Add note (e.g. 1 complex, 1 simple)" className="flex-1 p-2 border border-slate-300 rounded text-sm"
                            value={item.sf_daily_note} onChange={e => updateItem(idx, 'sf_daily_note', e.target.value)} />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">
                          LF - Minutes per Day <Tooltip text="Average minutes of Long Form content edited per day." />
                        </label>
                        <div className="flex gap-2">
                          <input type="number" step="0.5" min="0" placeholder="1.5" className="w-24 p-2 border border-slate-300 rounded text-center font-bold" 
                            value={item.lf_daily || ''} onChange={e => updateItem(idx, 'lf_daily', parseFloat(e.target.value))} />
                          <input type="text" placeholder="Add note..." className="flex-1 p-2 border border-slate-300 rounded text-sm"
                            value={item.lf_daily_note} onChange={e => updateItem(idx, 'lf_daily_note', e.target.value)} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">
                          Total Minutes Edited <Tooltip text="Total minutes of all videos approved this week." />
                        </label>
                        <div className="flex gap-2">
                          <input type="number" step="0.5" min="0" placeholder="1.2" className="w-24 p-2 border border-slate-300 rounded text-center font-bold" 
                            value={item.total_minutes || ''} onChange={e => updateItem(idx, 'total_minutes', parseFloat(e.target.value))} />
                          <input type="text" placeholder="Context..." className="flex-1 p-2 border border-slate-300 rounded text-sm"
                            value={item.total_minutes_note} onChange={e => updateItem(idx, 'total_minutes_note', e.target.value)} />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1">
                          Total Approved Videos <Tooltip text="Total count of videos/animations (SF + LF) fully approved this week." />
                        </label>
                        <input type="number" min="0" className="w-full p-2 border border-slate-300 rounded" 
                          value={item.approved_reels} onChange={e => updateItem(idx, 'approved_reels', parseInt(e.target.value))} />
                      </div>
                    </div>
                  </div>

                  <div>
                     <label className="block text-sm font-semibold text-slate-900 mb-1">Drive Links</label>
                     <textarea className="w-full p-2.5 border border-slate-300 rounded-lg h-24 font-mono text-sm" placeholder="Paste links here..." value={item.drive_links} onChange={e => updateItem(idx, 'drive_links', e.target.value)} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <label className="block text-sm font-bold text-slate-900 mb-2">Blockers?</label>
                        <div className="flex gap-4 mb-2">
                           <label className="flex items-center gap-2"><input type="radio" checked={item.has_blockers === 'Yes'} onChange={() => updateItem(idx, 'has_blockers', 'Yes')} /> Yes</label>
                           <label className="flex items-center gap-2"><input type="radio" checked={item.has_blockers === 'No'} onChange={() => updateItem(idx, 'has_blockers', 'No')} /> No</label>
                        </div>
                        {item.has_blockers === 'Yes' && <textarea placeholder="Details..." className="w-full p-2 border rounded text-sm" value={item.blocker_details} onChange={e => updateItem(idx, 'blocker_details', e.target.value)} />}
                      </div>

                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <label className="block text-sm font-bold text-slate-900 mb-2">Repeated QC Changes?</label>
                        <div className="flex gap-4 mb-2">
                           <label className="flex items-center gap-2"><input type="radio" checked={item.has_qc_changes === 'Yes'} onChange={() => updateItem(idx, 'has_qc_changes', 'Yes')} /> Yes</label>
                           <label className="flex items-center gap-2"><input type="radio" checked={item.has_qc_changes === 'No'} onChange={() => updateItem(idx, 'has_qc_changes', 'No')} /> No</label>
                        </div>
                        {item.has_qc_changes === 'Yes' && <textarea placeholder="Details..." className="w-full p-2 border rounded text-sm" value={item.qc_details} onChange={e => updateItem(idx, 'qc_details', e.target.value)} />}
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        {/* UPDATED: Tooltip */}
                        <label className="block text-sm font-semibold text-slate-900 mb-1">
                          Creative Inputs 
                          <Tooltip text="Provide inputs on hooks, pacing, or process improvements for this IP (Instagram/YouTube content)." />
                        </label>
                        <textarea className="w-full p-2.5 border border-slate-300 rounded-lg h-24 text-sm" value={item.creative_inputs} onChange={e => updateItem(idx, 'creative_inputs', e.target.value)} />
                      </div>
                      <div>
                        {/* UPDATED: Tooltip */}
                        <label className="block text-sm font-semibold text-slate-900 mb-1">
                          Improvements (This IP)
                          <Tooltip text="Any specific improvement made on this IP (not limited to just editing)." />
                        </label>
                        <textarea className="w-full p-2.5 border border-slate-300 rounded-lg h-24 text-sm" value={item.improvements} onChange={e => updateItem(idx, 'improvements', e.target.value)} />
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                       <label className="block text-sm font-semibold text-slate-900 mb-1">Avg Reiterations <Tooltip text="Average number of revision rounds per video."/></label>
                       <input type="number" step="0.1" className="w-full p-2.5 border border-slate-300 rounded-lg" value={item.avg_reiterations} onChange={e => updateItem(idx, 'avg_reiterations', parseFloat(e.target.value))} />
                     </div>
                     <div>
                       <label className="block text-sm font-semibold text-slate-900 mb-1">Manager Comments <Tooltip text="Feedback on your Channel Manager or Lead Editor."/></label>
                       <textarea className="w-full p-2.5 border border-slate-300 rounded-lg h-12 text-sm" value={item.manager_comments} onChange={e => updateItem(idx, 'manager_comments', e.target.value)} />
                     </div>
                   </div>

                </div>
              ))}
            </div>
          </div>

          <button disabled={submitting} className="w-full py-5 bg-blue-600 text-white rounded-xl font-bold text-xl hover:bg-blue-700 transition shadow-lg disabled:opacity-50">
            {submitting ? 'Processing...' : 'Submit Report'}
          </button>

        </form>
      </div>
    </div>
  )
}