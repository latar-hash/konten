'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export type Row = {
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

const FASE_OPTIONS = ['ALL', 'NOT TESTING', 'FASE 0', 'FASE 1', 'FASE 2', 'FASE 3'] as const
const PROGRESS_OPTIONS = ['ALL', 'Backlog', 'In Progress', 'Done', 'Draft'] as const

const faseStyle = (fase: string | null) => {
  switch (fase) {
    case 'FASE 3':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'FASE 2':
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    case 'FASE 1':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'FASE 0':
      return 'bg-slate-500/10 text-slate-300 border-slate-500/20'
    case 'NOT TESTING':
      return 'bg-slate-700/40 text-slate-400 border-slate-600/40'
    default:
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
  }
}

export default function ContentsTable({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [fase, setFase] = useState<(typeof FASE_OPTIONS)[number]>('ALL')
  const [progress, setProgress] = useState<(typeof PROGRESS_OPTIONS)[number]>('ALL')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (fase !== 'ALL' && r.fase !== fase) return false
      if (progress !== 'ALL' && r.progress !== progress) return false
      if (!q) return true
      return (
        r.content_id_code.toLowerCase().includes(q) ||
        (r.product_name || '').toLowerCase().includes(q) ||
        (r.script_writer || '').toLowerCase().includes(q) ||
        (r.format || '').toLowerCase().includes(q)
      )
    })
  }, [rows, search, fase, progress])

  const fieldCls =
    'text-xs px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 outline-none focus:border-indigo-500'

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-slate-400">
          <span className="text-white font-semibold">{filtered.length}</span> / {rows.length} rows
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={fase}
            onChange={(e) => setFase(e.target.value as typeof fase)}
            className={fieldCls}
          >
            {FASE_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f === 'ALL' ? 'All Fase' : f}
              </option>
            ))}
          </select>
          <select
            value={progress}
            onChange={(e) => setProgress(e.target.value as typeof progress)}
            className={fieldCls}
          >
            {PROGRESS_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p === 'ALL' ? 'All Progress' : p}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode / brand / writer / format..."
            className={fieldCls + ' w-64'}
          />
        </div>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-xs uppercase text-slate-500 sticky top-0 z-10">
            <tr>
              <th className="text-left p-3 font-medium">Code</th>
              <th className="text-left p-3 font-medium">Tanggal</th>
              <th className="text-left p-3 font-medium">Brand</th>
              <th className="text-left p-3 font-medium">Format</th>
              <th className="text-left p-3 font-medium">Writer</th>
              <th className="text-left p-3 font-medium">Progress</th>
              <th className="text-left p-3 font-medium">Fase</th>
              <th className="text-right p-3 font-medium">Spend</th>
              <th className="text-right p-3 font-medium">CTR</th>
              <th className="text-right p-3 font-medium">Hook</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.content_id}
                onClick={() => router.push(`/contents/${r.content_id}`)}
                className="border-t border-slate-800 hover:bg-slate-900/50 cursor-pointer"
              >
                <td className="p-3 font-mono text-xs text-slate-300 max-w-xs truncate">
                  {r.content_id_code}
                </td>
                <td className="p-3 text-slate-400 whitespace-nowrap">{r.tanggal ?? '—'}</td>
                <td className="p-3 text-white">{r.product_name ?? '—'}</td>
                <td className="p-3 text-slate-400">{r.format ?? '—'}</td>
                <td className="p-3 text-slate-400">{r.script_writer ?? '—'}</td>
                <td className="p-3 text-xs">
                  <span
                    className={`inline-flex items-center gap-1.5 ${
                      r.progress === 'Done' ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        r.progress === 'Done' ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    {r.progress ?? '—'}
                  </span>
                </td>
                <td className="p-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${faseStyle(r.fase)}`}
                  >
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-sm text-slate-500">
                  {rows.length === 0 ? 'Belum ada content.' : 'Tidak ada hasil cocok dengan filter.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
