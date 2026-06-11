import { createClient } from '@/app/utils/supabase/server'
import { cookies } from 'next/headers'
import UploadFlow from './UploadFlow'

type UploadLog = {
  id: string
  platform: string
  filename: string
  rows_total: number | null
  rows_imported: number | null
  rows_failed: number | null
  rows_unmatched: number | null
  unmatched_ad_names: { ad_name: string; ad_id: string }[] | null
  uploaded_at: string | null
}

const fmtDate = (s: string | null) =>
  s
    ? new Date(s).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

function Pill({
  value,
  tone,
}: {
  value: number | null
  tone: 'emerald' | 'red' | 'amber' | 'slate'
}) {
  const v = value ?? 0
  const map = {
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    red: v > 0 ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-slate-800 text-slate-500 border-slate-700',
    amber: v > 0 ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-500 border-slate-700',
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
  } as const
  return (
    <span
      className={`inline-flex items-center text-xs font-mono font-semibold px-2 py-0.5 rounded-full border ${map[tone]}`}
    >
      {v}
    </span>
  )
}

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('upload_logs')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .limit(50)

  const logs = (data as UploadLog[] | null) ?? []

  return (
    <div className="max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold mb-1">Upload CSV</h1>
        <p className="text-sm text-slate-400">
          Import data export Meta Ads. Auto-match ke konten via <code className="text-indigo-400">content_id_code</code>.
        </p>
      </div>

      <UploadFlow />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            Riwayat Upload
          </h2>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            {logs.length} log
          </span>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-300 text-sm mb-4">
            Gagal load log: {error.message}
          </div>
        )}

        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left p-3 font-medium">Waktu</th>
                <th className="text-left p-3 font-medium">Platform</th>
                <th className="text-left p-3 font-medium">File</th>
                <th className="text-right p-3 font-medium">Total</th>
                <th className="text-right p-3 font-medium">Imported</th>
                <th className="text-right p-3 font-medium">Failed</th>
                <th className="text-right p-3 font-medium">Unmatched</th>
                <th className="text-left p-3 font-medium">Unmatched Names</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-sm text-slate-500">
                    Belum ada upload tercatat.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="border-t border-slate-800 hover:bg-slate-900/50">
                    <td className="p-3 text-xs text-slate-300 whitespace-nowrap">
                      {fmtDate(l.uploaded_at)}
                    </td>
                    <td className="p-3 text-xs uppercase text-slate-400">{l.platform}</td>
                    <td className="p-3 font-mono text-xs text-slate-300 max-w-xs truncate">
                      {l.filename}
                    </td>
                    <td className="p-3 text-right"><Pill value={l.rows_total} tone="slate" /></td>
                    <td className="p-3 text-right"><Pill value={l.rows_imported} tone="emerald" /></td>
                    <td className="p-3 text-right"><Pill value={l.rows_failed} tone="red" /></td>
                    <td className="p-3 text-right"><Pill value={l.rows_unmatched} tone="amber" /></td>
                    <td className="p-3 text-xs text-slate-500 max-w-xs">
                      {l.unmatched_ad_names && l.unmatched_ad_names.length > 0 ? (
                        <details>
                          <summary className="cursor-pointer text-amber-400 hover:text-amber-300">
                            lihat {l.unmatched_ad_names.length} ad name
                          </summary>
                          <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto font-mono text-[10px] text-slate-400">
                            {l.unmatched_ad_names.map((u, i) => (
                              <li key={i} className="truncate" title={u.ad_name}>
                                {u.ad_name}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
