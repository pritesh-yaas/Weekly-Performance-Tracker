'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase' // <--- CHANGED THIS
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const supabase = createClient() // <--- CHANGED THIS
  const router = useRouter()

  useEffect(() => {
    const fetchReports = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/')

      // Check role
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') return router.push('/dashboard')

      // Get Data (Joined)
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          profiles(full_name, email, yaas_id),
          report_items(*)
        `)
        .order('submission_date', { ascending: false })
      
      if(data) setReports(data)
      setLoading(false)
    }
    fetchReports()
  }, [])

  if (loading) return <div className="p-10">Loading Admin...</div>

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex justify-between items-center mb-6">
         <h1 className="text-2xl font-bold">Admin Dashboard</h1>
         <button onClick={() => router.push('/dashboard')} className="text-blue-600 underline">Go to Form</button>
      </div>
      
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 font-bold border-b">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Editor</th>
              <th className="p-3">ID</th>
              <th className="p-3">Hygiene</th>
              <th className="p-3">IPs Worked On</th>
              <th className="p-3">Reels (Del/App)</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{r.submission_date}</td>
                <td className="p-3">{r.profiles?.full_name}</td>
                <td className="p-3">{r.profiles?.yaas_id}</td>
                <td className="p-3">{r.hygiene_score}</td>
                <td className="p-3">
                  {r.report_items.map((i: any) => (
                    <div key={i.id} className="mb-1 bg-blue-50 px-2 py-1 rounded text-xs inline-block mr-1">
                      {i.ip_name}
                    </div>
                  ))}
                </td>
                <td className="p-3">
                  {r.report_items.reduce((acc: number, cur: any) => acc + cur.reels_delivered, 0)} / 
                  {r.report_items.reduce((acc: number, cur: any) => acc + cur.approved_reels, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}