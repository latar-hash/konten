import { createClient } from '@/app/utils/supabase/server'
import { cookies } from 'next/headers'
import type { ContentPerformanceSummary } from '@/app/types/database'
import AdOpsView from './AdOpsView'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('content_performance_summary')
    .select('*')

  const rows = (data || []) as ContentPerformanceSummary[]

  return (
    <div className="px-8 py-7 space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ad Operations</h1>
          <p className="text-sm text-slate-400">
            Klik fase → matrix konten di fase itu muncul. Cell di-warnai sesuai standar metric.
          </p>
        </div>
      </header>

      {error && (
        <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-300 text-sm">
          Gagal mengambil data: {error.message}
        </div>
      )}

      <AdOpsView rows={rows} />
    </div>
  )
}
