'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const supabase = createClient()
  const router = useRouter()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/')

      // Check role
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') return router.push('/dashboard')

      // Get Data from Single Table
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('submission_date', { ascending: false })
      
      if(data) setReports(data)
      setLoading(false)
    }
    fetchReports()
  }, [])

  if (loading) return <div className="p-10">Loading Admin...</div>

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans text-slate-800">
      <div className="flex justify-between items-center mb-6">
         <h1 className="text-2xl font-bold">Admin Dashboard</h1>
         <button onClick={() => router.push('/dashboard')} className="text-blue-600 underline">Go to Form</button>
      </div>
      
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="bg-gray-50 text-gray-700 font-bold border-b">
            <tr>
              <th className="p-3 border">Date</th>
              <th className="p-3 border">YAAS ID</th>
              <th className="p-3 border">Editor</th>
              <th className="p-3 border">Email</th>
              <th className="p-3 border">Hygiene</th>
              <th className="p-3 border">IPs Summary</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => {
              // Calculate totals from JSON Data
              const ips = r.ip_data || []
              const totalDelivered = ips.reduce((acc: number, i: any) => acc + (i.reels_delivered || 0), 0)
              const totalApproved = ips.reduce((acc: number, i: any) => acc + (i.approved_reels || 0), 0)

              return (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 border">{r.submission_date}</td>
                  <td className="p-3 border font-mono text-xs">{r.yaas_id}</td>
                  <td className="p-3 border">{r.editor_name}</td>
                  <td className="p-3 border text-xs text-gray-500">{r.editor_email}</td>
                  <td className="p-3 border">{r.hygiene_score}</td>
                  <td className="p-3 border">
                    <div className="flex flex-wrap gap-1 mb-1">
                      {ips.map((i: any, idx: number) => (
                        <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                          {i.ip_name}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-600">
                      <strong>Total:</strong> {totalDelivered} Delivered / {totalApproved} Approved
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}