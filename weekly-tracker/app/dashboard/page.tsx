'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { calculateWeekAndMonth } from '@/lib/utils'
import { Plus, X, LogOut } from 'lucide-react'

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
  
  // User Data
  const [user, setUser] = useState<any>(null)
  const [editorInfo, setEditorInfo] = useState({
    name: '',
    email: '',
    yaas_id: ''
  })

  // General Data
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

  // IP Tabs
  const [activeTab, setActiveTab] = useState(0)
  const [items, setItems] = useState<IPItem[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return router.push('/')
      setUser(authUser)

      // 1. Fetch Profile & Registry Logic
      let { data: prof } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
      
      // Check Registry if YAAS ID missing
      if (prof && !prof.yaas_id) {
        const { data: registryData } = await supabase
          .from('editor_registry').select('*').eq('email', authUser.email || '').single()
        
        if (registryData) {
          const { data: updated } = await supabase
            .from('profiles').update({ yaas_id: registryData.yaas_id, full_name: registryData.name })
            .eq('id', authUser.id).select().single()
          prof = updated
        }
      }

      setEditorInfo({
        name: prof?.full_name || '',
        email: authUser.email || '',
        yaas_id: prof?.yaas_id || ''
      })
      
      // 2. Fetch IPs
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
      reels_delivered: 0, approved_reels: 0, creative_inputs: "",
      has_blockers: "No", blocker_details: "", avg_reiterations: 0,
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
      if(!editorInfo.yaas_id) throw new Error("YAAS ID is missing. Contact Admin.")

      const { error } = await supabase.from('reports').insert({
        user_id: user.id,
        // Storing Editor Details Directly
        editor_name: editorInfo.name,
        editor_email: editorInfo.email,
        yaas_id: editorInfo.yaas_id,
        
        submission_date: date,
        week_label: labels.weekLabel,
        month_label: labels.monthLabel,
        
        hygiene_score: general.hygiene_score,
        mistakes_repeated: general.mistakes_repeated === 'Yes',
        mistake_details: general.mistake_details,
        delays: general.delays === 'Yes',
        delay_reasons: general.delay_reasons,
        general_improvements: general.general_improvements,
        next_week_commitment: general.next_week_commitment,
        areas_improvement: general.areas_improvement,
        overall_feedback: general.overall_feedback,
        
        // Storing IPs as JSON
        ip_data: items
      })

      if (error) throw error

      alert("Report Submitted Successfully!")
      window.location.reload()

    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-10 text-center">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border-t-4 border-blue-600 p-8">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Weekly Performance Report</h1>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="text-sm text-red-500 flex items-center gap-1">
            <LogOut size={14} /> Sign Out
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-semibold mb-1">Editor Name</label>
              <input value={editorInfo.name} disabled className="w-full p-2 border rounded bg-slate-200" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">YAAS ID</label>
              <input value={editorInfo.yaas_id} disabled className="w-full p-2 border rounded bg-slate-200 font-bold text-blue-800" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Email</label>
              <input value={editorInfo.email} disabled className="w-full p-2 border rounded bg-slate-200" />
            </div>
            <div>
               <label className="block text-sm font-semibold mb-1">Select Date</label>
               <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded" />
            </div>
            <div className="md:col-span-2">
               <label className="block text-sm font-semibold mb-1">Period</label>
               <input value={labels.weekLabel} disabled className="w-full p-2 border rounded bg-slate-200 font-medium" />
            </div>
          </div>

          {/* Section 1: General */}
          <h2 className="text-lg font-bold border-b pb-2 mb-4 text-slate-700">1. General Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
               <label className="block text-sm font-semibold">Hygiene Score (0-10)</label>
               <input type="number" min="0" max="10" step="0.5" required 
                 value={general.hygiene_score} 
                 onChange={e => setGeneral({...general, hygiene_score: parseFloat(e.target.value)})}
                 className="w-full p-2 border rounded" />
            </div>
            <div>
               <label className="block text-sm font-semibold">Next Week Commitment</label>
               <input type="number" step="0.5" 
                 value={general.next_week_commitment} 
                 onChange={e => setGeneral({...general, next_week_commitment: parseFloat(e.target.value)})}
                 className="w-full p-2 border rounded" />
            </div>
          </div>
          
          <div className="mb-4">
             <label className="block text-sm font-semibold">Mistakes Repeated?</label>
             <div className="flex gap-4 mt-1">
               {['Yes', 'No'].map(opt => (
                 <label key={opt} className="flex items-center gap-2 cursor-pointer">
                   <input type="radio" name="gen_mistakes" value={opt} 
                     checked={general.mistakes_repeated === opt}
                     onChange={() => setGeneral({...general, mistakes_repeated: opt})} />
                   {opt}
                 </label>
               ))}
             </div>
             {general.mistakes_repeated === 'Yes' && (
               <textarea placeholder="Details..." required className="w-full p-2 border rounded mt-2 text-sm"
                 value={general.mistake_details} onChange={e => setGeneral({...general, mistake_details: e.target.value})} />
             )}
          </div>

          <div className="mb-4">
             <label className="block text-sm font-semibold">Any Delays?</label>
             <div className="flex gap-4 mt-1">
               {['Yes', 'No'].map(opt => (
                 <label key={opt} className="flex items-center gap-2 cursor-pointer">
                   <input type="radio" name="gen_delays" value={opt} 
                     checked={general.delays === opt}
                     onChange={() => setGeneral({...general, delays: opt})} />
                   {opt}
                 </label>
               ))}
             </div>
             {general.delays === 'Yes' && (
               <textarea placeholder="Reason for delays..." required className="w-full p-2 border rounded mt-2 text-sm"
                 value={general.delay_reasons} onChange={e => setGeneral({...general, delay_reasons: e.target.value})} />
             )}
          </div>

          <div className="mb-4">
             <label className="block text-sm font-semibold">Improvements & Feedback</label>
             <textarea placeholder="Improvements from last week..." className="w-full p-2 border rounded mb-2 h-20 text-sm"
               value={general.general_improvements} onChange={e => setGeneral({...general, general_improvements: e.target.value})} />
             <textarea placeholder="Areas for Improvement..." className="w-full p-2 border rounded mb-2 h-20 text-sm"
               value={general.areas_improvement} onChange={e => setGeneral({...general, areas_improvement: e.target.value})} />
             <textarea placeholder="Overall Feedback..." className="w-full p-2 border rounded h-20 text-sm"
               value={general.overall_feedback} onChange={e => setGeneral({...general, overall_feedback: e.target.value})} />
          </div>

          {/* Section 2: IPs */}
          <h2 className="text-lg font-bold border-b pb-2 mb-4 mt-8 text-slate-700">2. IP Related Questions</h2>
          <div className="flex gap-2 border-b overflow-x-auto pb-0 mb-0">
             {items.map((item, idx) => (
               <div key={item.id} onClick={() => setActiveTab(idx)}
                 className={`px-4 py-2 border-t border-x rounded-t-lg cursor-pointer flex items-center gap-2 min-w-fit
                   ${activeTab === idx ? 'bg-white border-blue-600 border-t-2 text-blue-600 font-bold -mb-[1px] z-10' : 'bg-slate-100 text-slate-500'}
                 `}>
                 IP {idx + 1}
                 <span onClick={(e) => removeTab(idx, e)} className="hover:text-red-500 rounded-full p-0.5"><X size={12} /></span>
               </div>
             ))}
             <button type="button" onClick={addTab} className="px-3 py-2 bg-blue-50 text-blue-600 rounded-t-lg font-bold flex items-center gap-1">
               <Plus size={14} /> Add
             </button>
          </div>

          <div className="border p-6 rounded-b-lg rounded-tr-lg bg-white relative z-0">
             {items.map((item, idx) => (
               <div key={item.id} className={activeTab === idx ? 'block' : 'hidden'}>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                   <div>
                     <label className="block text-sm font-semibold">IP Name</label>
                     <select required className="w-full p-2 border rounded"
                       value={item.ip_name} onChange={e => updateItem(idx, 'ip_name', e.target.value)}>
                        <option value="">Select...</option>
                        {ipOptions.map(ip => <option key={ip} value={ip}>{ip}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-sm font-semibold">Lead / Manager</label>
                     <div className="flex gap-2">
                       <input placeholder="Lead Editor" className="w-1/2 p-2 border rounded text-sm" 
                         value={item.lead_editor} onChange={e => updateItem(idx, 'lead_editor', e.target.value)} />
                       <input placeholder="Manager" className="w-1/2 p-2 border rounded text-sm" 
                         value={item.channel_manager} onChange={e => updateItem(idx, 'channel_manager', e.target.value)} />
                     </div>
                   </div>
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500">Delivered</label>
                      <input type="number" className="w-full p-2 border rounded" min="0" required
                        value={item.reels_delivered} onChange={e => updateItem(idx, 'reels_delivered', parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500">Approved</label>
                      <input type="number" className="w-full p-2 border rounded" min="0" required
                        value={item.approved_reels} onChange={e => updateItem(idx, 'approved_reels', parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500">Avg Reiterations</label>
                      <input type="number" className="w-full p-2 border rounded" step="0.1"
                        value={item.avg_reiterations} onChange={e => updateItem(idx, 'avg_reiterations', parseFloat(e.target.value))} />
                    </div>
                 </div>
                 <div className="mb-4">
                   <label className="block text-sm font-semibold">Drive Links</label>
                   <textarea placeholder="Paste links here..." className="w-full p-2 border rounded h-20 text-sm" required
                     value={item.drive_links} onChange={e => updateItem(idx, 'drive_links', e.target.value)} />
                 </div>
                 <div className="mb-4 bg-red-50 p-3 rounded">
                    <label className="block text-sm font-semibold text-red-800">Any Blockers?</label>
                    <div className="flex gap-4">
                       <label><input type="radio" checked={item.has_blockers === 'Yes'} onChange={() => updateItem(idx, 'has_blockers', 'Yes')} /> Yes</label>
                       <label><input type="radio" checked={item.has_blockers === 'No'} onChange={() => updateItem(idx, 'has_blockers', 'No')} /> No</label>
                    </div>
                    {item.has_blockers === 'Yes' && (
                       <textarea className="w-full p-2 border border-red-200 rounded mt-2" placeholder="Details..." required
                         value={item.blocker_details} onChange={e => updateItem(idx, 'blocker_details', e.target.value)} />
                    )}
                 </div>
               </div>
             ))}
          </div>

          <button disabled={submitting} className="w-full mt-8 bg-blue-600 text-white p-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition">
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  )
}