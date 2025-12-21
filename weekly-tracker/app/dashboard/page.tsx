'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { calculateWeekAndMonth } from '@/lib/utils'
import { Plus, X, LogOut, Calendar, User, Mail, Hash } from 'lucide-react'

// --- Types (Same as before) ---
interface IPItem {
  id: string
  ip_name: string
  lead_editor: string
  channel_manager: string
  reels_delivered: number
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
    hygiene_score: 10,
    mistakes_repeated: "No",
    mistake_details: "",
    delays: "No",
    delay_reasons: "",
    general_improvements: "",
    next_week_commitment: 0,
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
        const { data: registryData } = await supabase.from('editor_registry').select('*').eq('email', authUser.email || '').single()
        if (registryData) {
          const { data: updated } = await supabase.from('profiles').update({ yaas_id: registryData.yaas_id, full_name: registryData.name }).eq('id', authUser.id).select().single()
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

  useEffect(() => { setLabels(calculateWeekAndMonth(date)) }, [date])

  const addTab = () => {
    setItems([...items, {
      id: Math.random().toString(36), ip_name: "", lead_editor: "", channel_manager: "",
      reels_delivered: 0, approved_reels: 0, creative_inputs: "", has_blockers: "No", blocker_details: "",
      avg_reiterations: 0, has_qc_changes: "No", qc_details: "", improvements: "", drive_links: "", manager_comments: ""
    }])
    setActiveTab(items.length)
  }

  const removeTab = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (items.length === 1) return alert("You need at least one IP.")
    if (confirm("Remove this IP tab?")) { setItems(items.filter((_, i) => i !== index)); setActiveTab(0); }
  }

  const updateItem = (index: number, field: keyof IPItem, value: any) => {
    const newItems = [...items]
    if (field === 'approved_reels') {
      const delivered = newItems[index].reels_delivered || 0
      if (value > delivered) return alert("Approved reels cannot be higher than Delivered reels")
    }
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if(!editorInfo.yaas_id) throw new Error("YAAS ID is missing.")
      const { error } = await supabase.from('reports').insert({
        user_id: user.id, editor_name: editorInfo.name, editor_email: editorInfo.email, yaas_id: editorInfo.yaas_id,
        submission_date: date, week_label: labels.weekLabel, month_label: labels.monthLabel,
        hygiene_score: general.hygiene_score, mistakes_repeated: general.mistakes_repeated === 'Yes', mistake_details: general.mistake_details,
        delays: general.delays === 'Yes', delay_reasons: general.delay_reasons, general_improvements: general.general_improvements,
        next_week_commitment: general.next_week_commitment, areas_improvement: general.areas_improvement, overall_feedback: general.overall_feedback,
        ip_data: items
      })
      if (error) throw error
      router.push('/success') // <--- REDIRECTS HERE
    } catch (err: any) { alert("Error: " + err.message); setSubmitting(false); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto">
        
        {/* Top Navigation */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Weekly Performance Report</h1>
            <p className="text-slate-500 mt-1">Please fill out your performance metrics for the week.</p>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition shadow-sm">
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Card: Identity & Date */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <User size={18} className="text-blue-600" /> Editor Details
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
               <div className="md:col-span-1">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">YAAS ID</label>
                 <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 p-2.5 rounded-lg text-blue-800 font-mono font-bold">
                   <Hash size={14} /> {editorInfo.yaas_id}
                 </div>
               </div>
               <div className="md:col-span-1">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Name</label>
                 <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">{editorInfo.name}</div>
               </div>
               <div className="md:col-span-2">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Email</label>
                 <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                   <Mail size={14} /> {editorInfo.email}
                 </div>
               </div>
               
               <div className="md:col-span-1">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Submission Date</label>
                 <div className="relative">
                   <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                   <input type="date" required value={date} onChange={e => setDate(e.target.value)} 
                     className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium" />
                 </div>
               </div>
               <div className="md:col-span-3">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Reporting Period</label>
                 <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">{labels.weekLabel}</div>
               </div>
            </div>
          </div>

          {/* Card: General Questions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">1. General Questions</h2>
            </div>
            <div className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1">Hygiene Score</label>
                  <input type="number" min="0" max="10" step="0.5" required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0-10"
                    value={general.hygiene_score} onChange={e => setGeneral({...general, hygiene_score: parseFloat(e.target.value)})} />
                  <p className="text-xs text-slate-500 mt-1">Self-Assessment score out of 10.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1">Next Week Commitment</label>
                  <input type="number" step="0.5" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={general.next_week_commitment} onChange={e => setGeneral({...general, next_week_commitment: parseFloat(e.target.value)})} />
                   <p className="text-xs text-slate-500 mt-1">Expected Reels / Animations per day.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
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

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1">General Improvements</label>
                <textarea className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                  placeholder="Specific skills or processes you've improved..." value={general.general_improvements} onChange={e => setGeneral({...general, general_improvements: e.target.value})} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="block text-sm font-semibold text-slate-900 mb-1">Areas for Improvement</label>
                   <textarea className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
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

          {/* Card: IPs */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800">2. IP Specifics</h2>
              <button type="button" onClick={addTab} className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition shadow-sm font-medium">
                <Plus size={16} /> Add IP
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex overflow-x-auto bg-white border-b border-slate-100">
              {items.map((item, idx) => (
                <button type="button" key={item.id} onClick={() => setActiveTab(idx)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-2
                    ${activeTab === idx ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                  IP {idx + 1}
                  {items.length > 1 && (
                    <span onClick={(e) => removeTab(idx, e)} className="text-slate-400 hover:text-red-500 rounded-full p-0.5"><X size={14} /></span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-6">
              {items.map((item, idx) => (
                <div key={item.id} className={activeTab === idx ? 'block space-y-6' : 'hidden'}>
                   {/* IP Fields - Same logic as before but styled */}
                   <div>
                     <label className="block text-sm font-semibold text-slate-900 mb-1">IP Name</label>
                     <select required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                       value={item.ip_name} onChange={e => updateItem(idx, 'ip_name', e.target.value)}>
                        <option value="" disabled>Select IP...</option>
                        {ipOptions.map(ip => <option key={ip} value={ip}>{ip}</option>)}
                     </select>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                       <label className="block text-sm font-semibold text-slate-900 mb-1">Lead Editor</label>
                       <input className="w-full p-2.5 border border-slate-300 rounded-lg" value={item.lead_editor} onChange={e => updateItem(idx, 'lead_editor', e.target.value)} />
                     </div>
                     <div>
                       <label className="block text-sm font-semibold text-slate-900 mb-1">Channel Manager</label>
                       <input className="w-full p-2.5 border border-slate-300 rounded-lg" value={item.channel_manager} onChange={e => updateItem(idx, 'channel_manager', e.target.value)} />
                     </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div><label className="block text-sm font-semibold text-slate-900 mb-1">Delivered</label><input type="number" min="0" required className="w-full p-2.5 border border-slate-300 rounded-lg" value={item.reels_delivered} onChange={e => updateItem(idx, 'reels_delivered', parseInt(e.target.value) || 0)} /></div>
                      <div><label className="block text-sm font-semibold text-slate-900 mb-1">Approved</label><input type="number" min="0" required className="w-full p-2.5 border border-slate-300 rounded-lg" value={item.approved_reels} onChange={e => updateItem(idx, 'approved_reels', parseInt(e.target.value) || 0)} /></div>
                      <div><label className="block text-sm font-semibold text-slate-900 mb-1">Avg Iterations</label><input type="number" step="0.1" className="w-full p-2.5 border border-slate-300 rounded-lg" value={item.avg_reiterations} onChange={e => updateItem(idx, 'avg_reiterations', parseFloat(e.target.value))} /></div>
                   </div>

                   <div>
                     <label className="block text-sm font-semibold text-slate-900 mb-1">Drive Links</label>
                     <textarea required className="w-full p-2.5 border border-slate-300 rounded-lg h-24 font-mono text-sm" placeholder="Paste links..." value={item.drive_links} onChange={e => updateItem(idx, 'drive_links', e.target.value)} />
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Blockers Radio + Text */}
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <label className="block text-sm font-bold text-slate-900 mb-2">Blockers?</label>
                        <div className="flex gap-4 mb-2">
                           <label className="flex items-center gap-2"><input type="radio" checked={item.has_blockers === 'Yes'} onChange={() => updateItem(idx, 'has_blockers', 'Yes')} /> Yes</label>
                           <label className="flex items-center gap-2"><input type="radio" checked={item.has_blockers === 'No'} onChange={() => updateItem(idx, 'has_blockers', 'No')} /> No</label>
                        </div>
                        {item.has_blockers === 'Yes' && <textarea placeholder="Details..." className="w-full p-2 border rounded text-sm" value={item.blocker_details} onChange={e => updateItem(idx, 'blocker_details', e.target.value)} />}
                      </div>

                      {/* QC Radio + Text */}
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
                        <label className="block text-sm font-semibold text-slate-900 mb-1">Creative Inputs</label>
                        <textarea className="w-full p-2.5 border border-slate-300 rounded-lg h-24 text-sm" value={item.creative_inputs} onChange={e => updateItem(idx, 'creative_inputs', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-1">Improvements (This IP)</label>
                        <textarea className="w-full p-2.5 border border-slate-300 rounded-lg h-24 text-sm" value={item.improvements} onChange={e => updateItem(idx, 'improvements', e.target.value)} />
                      </div>
                   </div>
                   
                   <div>
                     <label className="block text-sm font-semibold text-slate-900 mb-1">Manager Comments</label>
                     <textarea className="w-full p-2.5 border border-slate-300 rounded-lg h-20 text-sm" value={item.manager_comments} onChange={e => updateItem(idx, 'manager_comments', e.target.value)} />
                   </div>

                </div>
              ))}
            </div>
          </div>

          <button disabled={submitting} className="w-full py-5 bg-blue-600 text-white rounded-xl font-bold text-xl hover:bg-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-wait">
            {submitting ? 'Processing Report...' : 'Submit Final Report'}
          </button>

        </form>
      </div>
    </div>
  )
}