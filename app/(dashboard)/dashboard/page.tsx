import { createClient } from '@/app/utils/supabase/server'
import { cookies } from 'next/headers'

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">{label}</div>
      <div className="text-3xl font-bold text-white">{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  )
}

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [{ count: productCount }, { count: contentCount }, { data: summary }] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('contents').select('*', { count: 'exact', head: true }),
    supabase.from('content_performance_summary').select('fase,total_spend,ctr_percent,hook_rate_percent'),
  ])

  const rows = summary ?? []
  const totalSpend = rows.reduce((sum, r: { total_spend?: number }) => sum + (r.total_spend ?? 0), 0)
  const avgCtr = rows.length ? rows.reduce((s, r: { ctr_percent?: number }) => s + (r.ctr_percent ?? 0), 0) / rows.length : 0
  const avgHook = rows.length ? rows.reduce((s, r: { hook_rate_percent?: number }) => s + (r.hook_rate_percent ?? 0), 0) / rows.length : 0

  const byFase = rows.reduce<Record<string, number>>((acc, r: { fase?: string }) => {
    const k = r.fase ?? 'UNKNOWN'
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-extrabold mb-1">Dashboard</h1>
      <p className="text-sm text-slate-400 mb-8">Overview metrik konten & iklan.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Brands" value={String(productCount ?? 0)} />
        <Stat label="Contents" value={String(contentCount ?? 0)} />
        <Stat label="Total Spend" value={`Rp ${totalSpend.toLocaleString('id-ID')}`} />
        <Stat label="Ad Entries" value={String(rows.length)} hint="rows in performance view" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Stat label="Avg CTR" value={`${avgCtr.toFixed(2)}%`} />
        <Stat label="Avg Hook Rate" value={`${avgHook.toFixed(2)}%`} />
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-400 mb-4">
          Contents per Fase
        </h3>
        <div className="space-y-2">
          {Object.entries(byFase).sort((a, b) => b[1] - a[1]).map(([fase, count]) => (
            <div key={fase} className="flex justify-between items-center text-sm">
              <span className="text-slate-300">{fase}</span>
              <span className="font-mono text-indigo-400">{count}</span>
            </div>
          ))}
          {Object.keys(byFase).length === 0 && (
            <p className="text-xs text-slate-500">Belum ada data fase.</p>
          )}
        </div>
      </div>
    </div>
  )
}
