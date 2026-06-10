import Link from 'next/link'
import { createClient } from '@/app/utils/supabase/server'
import { cookies } from 'next/headers'

type Row = {
  content_id: string
  content_id_code: string
  tanggal: string | null
  product_name: string | null
  format: string | null
  script_writer: string | null
  progress: string | null
  fase: string | null
  total_spend: number | null
  ctr_percent: number | null
  hook_rate_percent: number | null
}

const faseStyle = (fase: string | null) => {
  switch (fase) {
    case 'WINNING':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'TESTING':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'NOT TESTING':
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    default:
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
  }
}

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data } = await supabase
    .from('content_performance_summary')
    .select('content_id,content_id_code,tanggal,product_name,format,script_writer,progress,fase,total_spend,ctr_percent,hook_rate_percent')
    .order('tanggal', { ascending: false })
    .limit(200)

  const rows = (data as Row[] | null) ?? []

  return (
    <div className="max-w-7xl">
      <div className="flex justify-between items-baseline mb-1">
        <h1 className="text-3xl font-extrabold">Contents</h1>
        <Link
          href="/contents/new"
          className="bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          + New Content
        </Link>
      </div>
      <p className="text-sm text-slate-400 mb-8">{rows.length} rows (max 200)</p>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3 font-medium">Code</th>
              <th className="text-left p-3 font-medium">Tanggal</th>
              <th className="text-left p-3 font-medium">Brand</th>
              <th className="text-left p-3 font-medium">Format</th>
              <th className="text-left p-3 font-medium">Writer</th>
              <th className="text-left p-3 font-medium">Fase</th>
              <th className="text-right p-3 font-medium">Spend</th>
              <th className="text-right p-3 font-medium">CTR</th>
              <th className="text-right p-3 font-medium">Hook</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.content_id} className="border-t border-slate-800 hover:bg-slate-900/50">
                <td className="p-3 font-mono text-xs text-slate-300 max-w-xs truncate">{r.content_id_code}</td>
                <td className="p-3 text-slate-400 whitespace-nowrap">{r.tanggal ?? '—'}</td>
                <td className="p-3 text-white">{r.product_name ?? '—'}</td>
                <td className="p-3 text-slate-400">{r.format ?? '—'}</td>
                <td className="p-3 text-slate-400">{r.script_writer ?? '—'}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${faseStyle(r.fase)}`}>
                    {r.fase ?? '—'}
                  </span>
                </td>
                <td className="p-3 text-right font-mono text-xs text-slate-300">
                  {(r.total_spend ?? 0).toLocaleString('id-ID')}
                </td>
                <td className="p-3 text-right font-mono text-xs text-slate-400">
                  {(r.ctr_percent ?? 0).toFixed(2)}%
                </td>
                <td className="p-3 text-right font-mono text-xs text-slate-400">
                  {(r.hook_rate_percent ?? 0).toFixed(2)}%
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-sm text-slate-500">
                  Belum ada content.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
