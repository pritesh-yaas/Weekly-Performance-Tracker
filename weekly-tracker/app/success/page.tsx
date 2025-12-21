'use client'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-10 rounded-2xl shadow-lg text-center max-w-md w-full border border-slate-100">
        <div className="flex justify-center mb-6">
          <CheckCircle className="text-green-500 w-20 h-20" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Report Submitted!</h1>
        <p className="text-slate-500 mb-8">
          Thank you for submitting your weekly performance report. Your data has been recorded securely.
        </p>
        
        <div className="space-y-3">
          <Link href="/dashboard" className="block w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
            Submit Another Report
          </Link>
          <Link href="/" className="block w-full py-3 px-4 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition">
            Sign Out
          </Link>
        </div>
      </div>
    </div>
  )
}