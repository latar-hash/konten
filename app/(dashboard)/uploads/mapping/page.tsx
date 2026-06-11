import Link from 'next/link'
import { createClient } from '@/app/utils/supabase/server'
import { cookies } from 'next/headers'
import MappingFlow from './MappingFlow'

type LinkRow = {
  id: string
  ad_id_platform: string
  ad_name_raw: string
  campaign_id: string | null
  account_name: string | null
  registered_at: string
  contents: { content_id_code: string } | { content_id_code: string }[] | null
}

const fmt = (s: string) =>
  new Date(s).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: links, error } = await supabase
    .from('content_ad_links')
    .select(
      'id, ad_id_platform, ad_name_raw, campaign_id, account_name, registered_at, contents(content_id_code)',
    )
    .order('registered_at', { ascending: false })
    .limit(100)

  const rows = (links as LinkRow[] | null) ?? []

  return (
    <div className="max-w-7xl space-y-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold mb-1">Register Ad Mapping</h1>
          <p className="text-sm text-slate-400">
            Daftarkan Ad ID dari Meta ke konten supaya performance upload selanjutnya match otomatis lewat ID — bukan parsing nama.
          </p>
        </div>
        <Link
          href="/uploads"
          className="text-xs text-slate-500 hover:text-indigo-400 transition"
        >
          ← Upload Performance
        </Link>
      </div>

      <MappingFlow />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            Mapping Terdaftar
          </h2>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            {rows.length} link (max 100)
          </span>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-300 text-sm mb-4">
            Gagal load: {error.message}
          </div>
        )}

        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left p-3 font-medium">Waktu</th>
                <th className="text-left p-3 font-medium">Konten</th>
                <th className="text-left p-3 font-medium">Ad ID</th>
                <th className="text-left p-3 font-medium">Ad Name</th>
                <th className="text-left p-3 font-medium">Campaign</th>
                <th className="text-left p-3 font-medium">Account</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-slate-500">
                    Belum ada mapping terdaftar.
                  </td>
                </tr>
              ) : (
                rows.map((l) => {
                  const c = Array.isArray(l.contents) ? l.contents[0] : l.contents
                  return (
                    <tr key={l.id} className="border-t border-slate-800 hover:bg-slate-900/50">
                      <td className="p-3 text-xs text-slate-400 whitespace-nowrap">
                        {fmt(l.registered_at)}
                      </td>
                      <td className="p-3 font-mono text-xs text-emerald-300 max-w-xs truncate">
                        {c?.content_id_code || '—'}
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-300">{l.ad_id_platform}</td>
                      <td
                        className="p-3 text-xs text-slate-400 max-w-xs truncate"
                        title={l.ad_name_raw}
                      >
                        {l.ad_name_raw}
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-500">
                        {l.campaign_id || '—'}
                      </td>
                      <td className="p-3 text-xs text-slate-500 max-w-[160px] truncate">
                        {l.account_name || '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
