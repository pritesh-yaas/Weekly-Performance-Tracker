import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import nodemailer from 'nodemailer'
import { cookies } from 'next/headers'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

function buildEmailHtml(data: any): string {
  const { editorInfo, date, labels, general, items } = data

  const yesNo = (val: boolean | string) =>
    val === true || val === 'Yes'
      ? '<span style="color:#dc2626;font-weight:bold">Yes</span>'
      : '<span style="color:#16a34a;font-weight:bold">No</span>'

  const row = (label: string, value: any) =>
    value != null && value !== ''
      ? `<tr>
          <td style="padding:6px 12px;color:#64748b;font-size:13px;white-space:nowrap;vertical-align:top">${label}</td>
          <td style="padding:6px 12px;font-size:13px;color:#1e293b">${value}</td>
        </tr>`
      : ''

  const ipSections = items.map((ip: any, i: number) => `
    <div style="margin-top:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <div style="background:#eff6ff;padding:10px 16px;font-weight:bold;color:#1d4ed8;border-bottom:1px solid #bfdbfe">
        IP ${i + 1}: ${ip.ip_name || '—'}
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${row('Lead Editor', ip.lead_editor)}
        ${row('Channel Manager', ip.channel_manager)}
        ${row('SF Reels (week)', ip.sf_daily + (ip.sf_daily_note ? ` — ${ip.sf_daily_note}` : ''))}
        ${row('LF Minutes (week)', ip.lf_daily + (ip.lf_daily_note ? ` — ${ip.lf_daily_note}` : ''))}
        ${row('Total Minutes Edited', ip.total_minutes + (ip.total_minutes_note ? ` — ${ip.total_minutes_note}` : ''))}
        ${row('Total Approved Videos', ip.approved_reels)}
        ${row('Blockers?', yesNo(ip.has_blockers))}
        ${ip.has_blockers === 'Yes' ? row('Blocker Details', ip.blocker_details) : ''}
        ${row('Repeated QC Changes?', yesNo(ip.has_qc_changes))}
        ${ip.has_qc_changes === 'Yes' ? row('QC Details', ip.qc_details) : ''}
        ${row('Avg Reiterations', ip.avg_reiterations)}
        ${row('Creative Inputs', ip.creative_inputs)}
        ${row('Improvements', ip.improvements)}
        ${ip.drive_links ? row('Drive Links', `<a href="${ip.drive_links}" style="color:#2563eb">${ip.drive_links}</a>`) : ''}
        ${row('Manager Comments', ip.manager_comments)}
      </table>
    </div>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
  <div style="max-width:680px;margin:32px auto;background:#fff;border-radius:12px;border-top:4px solid #2563eb;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden">

    <div style="padding:28px 32px;border-bottom:1px solid #e2e8f0">
      <h1 style="margin:0;font-size:22px;color:#1e293b">Weekly Performance Report</h1>
      <p style="margin:4px 0 0;color:#64748b;font-size:14px">Your response has been recorded. Here is a copy for your records.</p>
    </div>

    <div style="padding:20px 32px;background:#f8fafc;border-bottom:1px solid #e2e8f0">
      <table style="border-collapse:collapse">
        <tr>
          <td style="padding:4px 24px 4px 0">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:bold">Name</div>
            <div style="font-size:14px;font-weight:600;color:#1e293b">${editorInfo.name}</div>
          </td>
          <td style="padding:4px 24px 4px 0">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:bold">YAAS ID</div>
            <div style="font-size:14px;font-weight:600;color:#1d4ed8">${editorInfo.yaas_id}</div>
          </td>
          <td style="padding:4px 24px 4px 0">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:bold">Week</div>
            <div style="font-size:14px;font-weight:600;color:#1e293b">${labels.weekLabel}</div>
          </td>
          <td style="padding:4px 0">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:bold">Date</div>
            <div style="font-size:14px;color:#1e293b">${date}</div>
          </td>
        </tr>
      </table>
    </div>

    <div style="padding:24px 32px">
      <h2 style="font-size:16px;color:#1e293b;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #e2e8f0">General Questions</h2>
      <table style="width:100%;border-collapse:collapse">
        ${row('Hygiene Score', general.hygiene_score)}
        ${row('Next Week Commitment', general.next_week_commitment)}
        ${row('Mistakes Repeated?', yesNo(general.mistakes_repeated))}
        ${general.mistakes_repeated === 'Yes' ? row('Mistake Details', general.mistake_details) : ''}
        ${row('Any Delays?', yesNo(general.delays))}
        ${general.delays === 'Yes' ? row('Delay Reasons', general.delay_reasons) : ''}
        ${row('General Improvements', general.general_improvements)}
        ${row('Areas for Improvement', general.areas_improvement)}
        ${row('Overall Feedback', general.overall_feedback)}
      </table>

      <h2 style="font-size:16px;color:#1e293b;margin:24px 0 4px;padding-bottom:8px;border-bottom:1px solid #e2e8f0">Pod (IP) Details</h2>
      ${ipSections}
    </div>

    <div style="padding:16px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;text-align:center">
      <p style="margin:0;font-size:12px;color:#94a3b8">This is an automated copy of your Weekly Performance Report submission.</p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { editorInfo, date, labels, general, items } = body

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Save report to Supabase
    const { error: dbError } = await supabase.from('reports').insert({
      user_id: user.id,
      editor_name: editorInfo.name,
      editor_email: editorInfo.email,
      yaas_id: editorInfo.yaas_id,
      submission_date: date,
      week_label: labels.weekLabel,
      month_label: labels.monthLabel,
      hygiene_score: general.hygiene_score === '' ? 0 : Number(general.hygiene_score),
      mistakes_repeated: general.mistakes_repeated === 'Yes',
      mistake_details: general.mistake_details,
      delays: general.delays === 'Yes',
      delay_reasons: general.delay_reasons,
      general_improvements: general.general_improvements,
      next_week_commitment: general.next_week_commitment === '' ? 0 : Number(general.next_week_commitment),
      areas_improvement: general.areas_improvement,
      overall_feedback: general.overall_feedback,
      ip_data: items,
    })

    if (dbError) throw new Error(dbError.message)

    // Send confirmation email via Gmail
    await transporter.sendMail({
      from: `"Weekly Tracker" <${process.env.GMAIL_USER}>`,
      to: editorInfo.email,
      subject: `Your Weekly Report — ${labels.weekLabel}`,
      html: buildEmailHtml({ editorInfo, date, labels, general, items }),
    }).catch(err => {
      // Log but don't fail — report is already saved
      console.error('Email send failed:', err)
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('submit-report error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
