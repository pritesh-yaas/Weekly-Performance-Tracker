'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function MigrationPage() {
  const supabase = createClient()
  const [inputText, setInputText] = useState('')
  const [status, setStatus] = useState('Idle')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (msg: string) => setLogs(prev => [...prev, msg])

  // Helper: Parse CSV/TSV to Array of Objects
  const parseCSV = (text: string) => {
    const lines = text.trim().split(/\r?\n/)
    if (lines.length < 2) throw new Error("Not enough data. Need headers and rows.")
    
    // Detect separator (Tab for Excel paste, Comma for CSV)
    const headerLine = lines[0]
    const separator = headerLine.includes('\t') ? '\t' : ','
    
    const headers = headerLine.split(separator).map(h => h.trim().replace(/^"|"$/g, ''))
    
    return lines.slice(1).map((line, idx) => {
      const values = line.split(separator).map(v => v.trim().replace(/^"|"$/g, '')) // Basic clean
      const row: any = {}
      headers.forEach((h, i) => {
        row[h] = values[i] || ''
      })
      return row
    })
  }

  const handleImport = async () => {
    try {
      setStatus('Processing...')
      setLogs([])
      
      // 1. Parse Data
      let rawData = []
      try {
        // Try parsing as JSON first (in case you really want to use JSON)
        rawData = JSON.parse(inputText)
        if (!Array.isArray(rawData)) throw new Error("JSON is not an array")
      } catch {
        // Fallback to CSV/Excel parsing
        addLog("Input is not JSON. Attempting to parse as CSV/Excel...")
        rawData = parseCSV(inputText)
      }

      addLog(`Loaded ${rawData.length} rows. Grouping by Week + Email...`)

      // 2. GROUPING LOGIC
      const groupedReports: Record<string, any> = {}

      rawData.forEach((row: any) => {
        // handle empty rows
        if (!row['Email'] && !row['Name']) return

        const key = `${row['Email']}-${row['Week']}`

        if (!groupedReports[key]) {
          // Initialize Report
          groupedReports[key] = {
            editor_name: row['Name'],
            editor_email: row['Email'],
            yaas_id: row['YAAS ID'],
            submission_date: parseDate(row['Timestamp']),
            week_label: row['Week'],
            month_label: row['Month'],
            
            // Map General Questions
            hygiene_score: parseNum(row['Hygiene Score']),
            mistakes_repeated: isYes(row['Mistakes Repeated?']),
            mistake_details: row['Mistake Details'] || '',
            delays: isYes(row['Delays?']),
            delay_reasons: row['Delay Reasons'] || '',
            general_improvements: row['General Improvements'] || '',
            // Mapping the specific header from your schema
            next_week_commitment: parseNum(row['Next Week Target (Reels/Animations)']),
            areas_improvement: row['Areas for Improvement'] || '',
            overall_feedback: row['Self Reflection'] || '',
            
            ip_data: []
          }
        }

        // Add IP Data
        groupedReports[key].ip_data.push({
          ip_name: row['IP Name'],
          lead_editor: row['Lead Editor'],
          channel_manager: row['Channel Manager'],
          reels_delivered: parseNum(row['Reels/Animations Delivered']),
          approved_reels: parseNum(row['Approved']),
          creative_inputs: row['Creative Inputs'],
          has_blockers: isYes(row['Blockers?']) ? 'Yes' : 'No',
          blocker_details: row['Blocker Details'],
          avg_reiterations: parseNum(row['Avg Reiterations']),
          has_qc_changes: isYes(row['QC Changes Repeated?']) ? 'Yes' : 'No',
          qc_details: row['QC Details'],
          improvements: row['IP Improvements'],
          drive_links: row['Work Links'],
          manager_comments: row['IP Manager Comments']
        })
      })

      const finalReports = Object.values(groupedReports)
      addLog(`Grouped into ${finalReports.length} unique reports. Uploading...`)

      // 3. UPLOAD LOGIC
      let successCount = 0
      let errorCount = 0

      for (const report of finalReports) {
        // Link to user_id if exists
        const { data: userProfile } = await supabase.from('profiles').select('id').eq('email', report.editor_email).single()

        const payload = {
          ...report,
          user_id: userProfile?.id || null 
        }

        const { error } = await supabase.from('reports').insert(payload)

        if (error) {
          console.error(error)
          addLog(`❌ Error (${report.editor_name}): ${error.message}`)
          errorCount++
        } else {
          successCount++
        }
      }

      addLog(`✅ DONE! Imported: ${successCount}, Failed: ${errorCount}`)
      setStatus('Finished')

    } catch (err: any) {
      addLog(`CRITICAL ERROR: ${err.message}`)
      setStatus('Error')
    }
  }

  // --- Helpers ---
  const parseDate = (d: string) => {
    try {
      if(!d) return new Date().toISOString()
      return new Date(d).toISOString()
    } catch { return new Date().toISOString() }
  }
  const parseNum = (v: any) => parseFloat(v) || 0
  const isYes = (v: string) => v?.toString().toLowerCase().includes('yes')

  return (
    <div className="p-10 max-w-4xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-4">Import Data</h1>
      <p className="mb-4 text-sm text-gray-600">
        <b>Copy your entire Excel/Sheet data (including headers) and paste it below.</b><br/>
        This tool handles the grouping automatically.
      </p>
      
      <textarea 
        className="w-full h-64 p-4 border rounded font-mono text-xs whitespace-pre"
        placeholder="Paste Excel data here (Timestamp, Name, YAAS ID...)"
        value={inputText}
        onChange={e => setInputText(e.target.value)}
      />

      <div className="mt-4 flex gap-4 items-center">
        <button 
          onClick={handleImport}
          disabled={status === 'Processing...'}
          className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          {status === 'Idle' || status === 'Error' || status === 'Finished' ? 'Start Import' : 'Processing...'}
        </button>
        <span className="font-bold">{status}</span>
      </div>

      <div className="mt-6 bg-gray-100 p-4 rounded h-64 overflow-y-auto border">
        {logs.map((l, i) => <div key={i} className="text-xs font-mono mb-1">{l}</div>)}
      </div>
    </div>
  )
}