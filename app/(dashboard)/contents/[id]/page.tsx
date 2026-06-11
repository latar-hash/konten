import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/server'
import { cookies } from 'next/headers'

const fmtIDR = (n: number | null | undefined) =>
  'Rp ' + (n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })
const fmtNum = (n: number | null | undefined) => (n || 0).toLocaleString('id-ID')
const fmtPct = (n: number | null | undefined) => `${(n || 0).toFixed(2)}%`
const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

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

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-sm text-white mt-1">{value || <span className="text-slate-600">—</span>}</div>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  tone = 'slate',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'slate' | 'indigo' | 'emerald' | 'amber' | 'pink'
}) {
  const tones: Record<string, string> = {
    slate: 'border-slate-800',
    indigo: 'border-indigo-500/30 bg-indigo-500/[0.04]',
    emerald: 'border-emerald-500/30 bg-emerald-500/[0.04]',
    amber: 'border-amber-500/30 bg-amber-500/[0.04]',
    pink: 'border-pink-500/30 bg-pink-500/[0.04]',
  }
  return (
    <div className={`bg-slate-950 border rounded-2xl p-4 ${tones[tone]}`}>
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-xl font-bold text-white mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>}
    </div>
  )
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [{ data: content }, { data: summary }, { data: ads }] = await Promise.all([
    supabase
      .from('contents')
      .select(
        'id,no_urut,content_id_code,tanggal,skrip_konten,format,script_writer,pic_talent,pic_name,progress,type_market,angle_konten,type_konten,notes,final_link_content,target_publish_date,issue,created_at,updated_at,products(name,code)',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.from('content_performance_summary').select('*').eq('content_id', id).maybeSingle(),
    supabase
      .from('ad_performances')
      .select('*')
      .eq('content_id', id)
      .order('reporting_start', { ascending: false }),
  ])

  if (!content) return notFound()

  const rawProducts = (content as { products?: { name: string; code: string } | { name: string; code: string }[] | null }).products
  const product = Array.isArray(rawProducts) ? rawProducts[0] : rawProducts
  const cpl = summary && summary.total_leads > 0 ? summary.total_spend / summary.total_leads : 0
  const adRows = ads || []

  return (
    <div className="max-w-6xl space-y-6">
      <Link href="/contents" className="text-xs text-slate-500 hover:text-indigo-400 transition">
        ← Back to contents
      </Link>

      {/* Hero */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">
              Konten #{content.no_urut}
            </div>
            <div className="font-mono text-base text-white mt-1 break-all">
              {content.content_id_code}
            </div>
            <h1 className="text-3xl font-extrabold mt-3">
              {product?.name || '—'}
              <span className="text-slate-500 text-base font-mono ml-2">({product?.code})</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs px-2.5 py-1 rounded-full border ${faseStyle(summary?.fase || null)}`}
            >
              {summary?.fase || 'NO ADS'}
            </span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 ${
                content.progress === 'Done'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  content.progress === 'Done' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              {content.progress}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 border-t border-slate-800 pt-5">
          <Meta label="Tanggal" value={fmtDate(content.tanggal)} />
          <Meta label="Format" value={content.format} />
          <Meta label="Type Market" value={content.type_market} />
          <Meta label="Target Publish" value={fmtDate(content.target_publish_date)} />
          <Meta label="Script Writer" value={content.script_writer} />
          <Meta label="PIC Name" value={content.pic_name} />
          <Meta label="PIC Talent" value={content.pic_talent} />
          <Meta
            label="Final Link"
            value={
              content.final_link_content ? (
                <a
                  href={content.final_link_content}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline break-all"
                >
                  buka link ↗
                </a>
              ) : null
            }
          />
        </div>
      </div>

      {/* Performance */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-400 mb-3">
          Performance
        </h2>
        {summary ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Spend" value={fmtIDR(summary.total_spend)} tone="indigo" />
              <Stat
                label="Leads"
                value={fmtNum(summary.total_leads)}
                hint={cpl ? `CPL ${fmtIDR(cpl)}` : undefined}
                tone="emerald"
              />
              <Stat
                label="Impressions"
                value={fmtNum(summary.total_impressions)}
                hint={`Reach ${fmtNum(summary.total_reach)}`}
                tone="pink"
              />
              <Stat
                label="Link Clicks"
                value={fmtNum(summary.total_link_clicks)}
                hint={`LP Views ${fmtNum(summary.total_landing_page_views)}`}
                tone="amber"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
              <Stat label="CTR" value={fmtPct(summary.ctr_percent)} />
              <Stat label="Hook Rate" value={fmtPct(summary.hook_rate_percent)} />
              <Stat label="Hold Rate" value={fmtPct(summary.hold_rate_percent)} />
              <Stat label="CPM" value={fmtIDR(summary.cpm)} />
              <Stat label="CPC" value={fmtIDR(summary.cpc)} />
            </div>
          </>
        ) : (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-sm text-slate-500 text-center">
            Belum ada data iklan untuk konten ini.
          </div>
        )}
      </div>

      {/* Brief */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-400 mb-3">
          Brief
        </h2>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Meta label="Angle Konten" value={content.angle_konten} />
            <Meta label="Type Konten" value={content.type_konten} />
          </div>
          <Meta
            label="Skrip Konten"
            value={
              content.skrip_konten ? (
                <p className="whitespace-pre-wrap text-sm text-slate-200">
                  {content.skrip_konten}
                </p>
              ) : null
            }
          />
          {content.notes && (
            <Meta
              label="Notes"
              value={<p className="whitespace-pre-wrap text-sm text-slate-300">{content.notes}</p>}
            />
          )}
          {content.issue && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-widest text-red-300">Issue</div>
              <p className="text-sm text-red-100 mt-1 whitespace-pre-wrap">{content.issue}</p>
            </div>
          )}
        </div>
      </div>

      {/* Ad entries */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-400 mb-3">
          Ad Entries{' '}
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 ml-1">
            {adRows.length}
          </span>
        </h2>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left p-3 font-medium">Ad Name</th>
                <th className="text-left p-3 font-medium">Platform</th>
                <th className="text-left p-3 font-medium">Period</th>
                <th className="text-right p-3 font-medium">Spend</th>
                <th className="text-right p-3 font-medium">Impr</th>
                <th className="text-right p-3 font-medium">Clicks</th>
                <th className="text-right p-3 font-medium">Leads</th>
              </tr>
            </thead>
            <tbody>
              {adRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-sm text-slate-500">
                    Belum ada ad entry yang ter-link ke konten ini.
                  </td>
                </tr>
              ) : (
                adRows.map((a: Record<string, unknown>) => (
                  <tr
                    key={a.id as string}
                    className="border-t border-slate-800 hover:bg-slate-900/50"
                  >
                    <td className="p-3 text-xs text-slate-200 max-w-md truncate">
                      {a.ad_name_raw as string}
                    </td>
                    <td className="p-3 text-xs text-slate-400 uppercase">
                      {a.platform as string}
                    </td>
                    <td className="p-3 text-xs text-slate-400 whitespace-nowrap">
                      {fmtDate(a.reporting_start as string | null)} –{' '}
                      {fmtDate(a.reporting_end as string | null)}
                    </td>
                    <td className="p-3 text-right font-mono text-xs text-slate-300">
                      {fmtIDR(a.amount_spent as number)}
                    </td>
                    <td className="p-3 text-right font-mono text-xs text-slate-400">
                      {fmtNum(a.impressions as number)}
                    </td>
                    <td className="p-3 text-right font-mono text-xs text-slate-400">
                      {fmtNum(a.link_clicks as number)}
                    </td>
                    <td className="p-3 text-right font-mono text-xs text-slate-400">
                      {fmtNum(a.checkouts_initiated as number)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[11px] text-slate-600 flex gap-4">
        <span>Created {fmtDate(content.created_at)}</span>
        <span>Updated {fmtDate(content.updated_at)}</span>
      </div>
    </div>
  )
}
