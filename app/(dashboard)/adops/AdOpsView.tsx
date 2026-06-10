'use client'

import { useMemo, useState } from 'react'
import type { ContentPerformanceSummary } from '@/app/types/database'
import {
  THRESHOLDS,
  VERDICT_CLASS,
  gradeMetric,
  type MetricKey,
  type Verdict,
} from './thresholds'

const FASES = ['FASE 0', 'FASE 1', 'FASE 2', 'FASE 3', 'NOT TESTING'] as const
type Fase = (typeof FASES)[number]

const METRIC_ORDER: MetricKey[] = [
  'ctr_percent',
  'hook_rate_percent',
  'hold_rate_percent',
  'cpm',
  'cpc',
  'cpl',
  'total_leads',
]

const fmtIDR = (n: number) =>
  'Rp ' + (n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })

type EnrichedRow = ContentPerformanceSummary & { cpl: number; badCount: number }

function enrich(r: ContentPerformanceSummary): EnrichedRow {
  const cpl = r.total_leads > 0 ? r.total_spend / r.total_leads : 0
  let badCount = 0
  for (const k of METRIC_ORDER) {
    const v = k === 'cpl' ? cpl : (r[k as keyof ContentPerformanceSummary] as number)
    if (gradeMetric(v, THRESHOLDS[k]) === 'bad') badCount++
  }
  return { ...r, cpl, badCount }
}

function FaseTab({
  fase,
  active,
  count,
  spend,
  onClick,
}: {
  fase: Fase
  active: boolean
  count: number
  spend: number
  onClick: () => void
}) {
  const accent: Record<Fase, string> = {
    'FASE 0': 'border-slate-500/40',
    'FASE 1': 'border-amber-500/40',
    'FASE 2': 'border-indigo-500/40',
    'FASE 3': 'border-emerald-500/40',
    'NOT TESTING': 'border-slate-700/40',
  }
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border-l-4 ${accent[fase]} px-4 py-3 transition flex-1 min-w-[150px] ${
        active
          ? 'bg-indigo-600/15 border border-indigo-500/40 ring-1 ring-indigo-500/40'
          : 'bg-slate-900/40 border border-slate-800 hover:bg-slate-800/40'
      }`}
    >
      <div className="text-[11px] uppercase tracking-widest text-slate-500">{fase}</div>
      <div className="text-xl font-bold text-white tabular-nums mt-1">{count}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{fmtIDR(spend)}</div>
    </button>
  )
}

function VerdictCell({
  value,
  metric,
}: {
  value: number | null | undefined
  metric: MetricKey
}) {
  const t = THRESHOLDS[metric]
  const verdict = gradeMetric(value as number, t)
  return (
    <td className="px-2 py-1.5">
      <div
        className={`text-[11px] font-semibold tabular-nums rounded-md px-2 py-1 border text-center ${VERDICT_CLASS[verdict]}`}
        title={`${t.label}: ${t.direction === 'higher' ? `≥${t.good} good · <${t.bad} bad` : `≤${t.good} good · >${t.bad} bad`}`}
      >
        {value == null || (value === 0 && t.direction === 'lower') ? '—' : t.fmt(value as number)}
      </div>
    </td>
  )
}

export default function AdOpsView({ rows }: { rows: ContentPerformanceSummary[] }) {
  const enriched = useMemo(() => rows.map(enrich), [rows])
  const [activeFase, setActiveFase] = useState<Fase>('FASE 1')
  const [sortKey, setSortKey] = useState<MetricKey | 'badCount' | 'total_spend'>('badCount')
  const [showBadOnly, setShowBadOnly] = useState(false)

  const stats = useMemo(() => {
    const m: Record<Fase, { count: number; spend: number }> = {
      'FASE 0': { count: 0, spend: 0 },
      'FASE 1': { count: 0, spend: 0 },
      'FASE 2': { count: 0, spend: 0 },
      'FASE 3': { count: 0, spend: 0 },
      'NOT TESTING': { count: 0, spend: 0 },
    }
    for (const r of enriched) {
      const f = (FASES as readonly string[]).includes(r.fase) ? (r.fase as Fase) : 'NOT TESTING'
      m[f].count++
      m[f].spend += r.total_spend || 0
    }
    return m
  }, [enriched])

  const visible = useMemo(() => {
    let list = enriched.filter((r) => r.fase === activeFase)
    if (showBadOnly) list = list.filter((r) => r.badCount > 0)
    list = list.slice().sort((a, b) => {
      if (sortKey === 'badCount') return b.badCount - a.badCount
      if (sortKey === 'total_spend') return (b.total_spend || 0) - (a.total_spend || 0)
      const t = THRESHOLDS[sortKey]
      const va = (sortKey === 'cpl' ? a.cpl : (a[sortKey as keyof EnrichedRow] as number)) || 0
      const vb = (sortKey === 'cpl' ? b.cpl : (b[sortKey as keyof EnrichedRow] as number)) || 0
      return t.direction === 'higher' ? vb - va : va - vb
    })
    return list
  }, [enriched, activeFase, showBadOnly, sortKey])

  const activeStat = stats[activeFase]
  const badInFase = enriched.filter((r) => r.fase === activeFase && r.badCount > 0).length

  return (
    <div className="space-y-6">
      {/* Fase tabs */}
      <div className="flex flex-wrap gap-3">
        {FASES.map((f) => (
          <FaseTab
            key={f}
            fase={f}
            active={activeFase === f}
            count={stats[f].count}
            spend={stats[f].spend}
            onClick={() => setActiveFase(f)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-5 py-3 flex flex-wrap items-center gap-3 text-[11px]">
        <span className="uppercase tracking-widest text-slate-500">Standar</span>
        {METRIC_ORDER.map((k) => {
          const t = THRESHOLDS[k]
          return (
            <span key={k} className="text-slate-400">
              <span className="text-slate-200 font-semibold">{t.short}</span>{' '}
              {t.direction === 'higher' ? '≥' : '≤'}
              <span className="text-emerald-300">{t.fmt(t.good).replace('Rp ', '')}</span>
              <span className="mx-1 text-slate-600">·</span>
              {t.direction === 'higher' ? '<' : '>'}
              <span className="text-red-300">{t.fmt(t.bad).replace('Rp ', '')}</span>
            </span>
          )
        })}
      </div>

      {/* Matrix */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-300">
              Konten Matrix · {activeFase}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {visible.length} dari {activeStat.count} konten · {badInFase} di bawah standar ·{' '}
              {fmtIDR(activeStat.spend)} total spend
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBadOnly((v) => !v)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition ${
                showBadOnly
                  ? 'bg-red-600/30 border-red-500/50 text-red-100'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              {showBadOnly ? '✓ Hanya yang Bermasalah' : 'Hanya yang Bermasalah'}
            </button>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
              className="text-xs px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="badCount">Sort: Paling Bermasalah</option>
              <option value="total_spend">Sort: Spend tertinggi</option>
              {METRIC_ORDER.map((k) => (
                <option key={k} value={k}>
                  Sort: {THRESHOLDS[k].label} (terbaik dulu)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[65vh] overflow-y-auto rounded-lg border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-900 z-10">
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="px-3 py-2 font-medium sticky left-0 bg-slate-900">Konten</th>
                <th className="px-3 py-2 font-medium text-right">Spend</th>
                {METRIC_ORDER.map((k) => (
                  <th key={k} className="px-2 py-2 font-medium text-center">
                    {THRESHOLDS[k].short}
                  </th>
                ))}
                <th className="px-3 py-2 font-medium text-center">Bad</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={METRIC_ORDER.length + 3}
                    className="px-3 py-10 text-center text-slate-500 text-xs"
                  >
                    {showBadOnly
                      ? 'Semua konten di fase ini sudah memenuhi standar 🎉'
                      : 'Belum ada konten di fase ini.'}
                  </td>
                </tr>
              ) : (
                visible.map((r) => {
                  const badRow = r.badCount >= 3
                  return (
                    <tr
                      key={r.content_id}
                      className={`border-b border-slate-800/60 hover:bg-slate-800/30 ${
                        badRow ? 'bg-red-500/[0.04]' : ''
                      }`}
                    >
                      <td className="px-3 py-2 sticky left-0 bg-slate-900/95 min-w-[200px]">
                        <div
                          className="font-mono text-xs text-slate-200"
                          title={`${r.product_name} · ${r.format} · ${r.script_writer}`}
                        >
                          {r.content_id_code}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs text-slate-300">
                        {fmtIDR(r.total_spend)}
                      </td>
                      {METRIC_ORDER.map((k) => {
                        const value = k === 'cpl' ? r.cpl : (r[k as keyof EnrichedRow] as number)
                        return <VerdictCell key={k} value={value} metric={k} />
                      })}
                      <td className="px-3 py-2 text-center">
                        {r.badCount > 0 ? (
                          <span
                            className={`text-[11px] font-bold px-2 py-1 rounded-full border ${
                              r.badCount >= 3
                                ? 'bg-red-500/20 text-red-200 border-red-500/40'
                                : 'bg-amber-500/15 text-amber-200 border-amber-500/30'
                            }`}
                          >
                            {r.badCount}
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-400">✓</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-slate-500 mt-3">
          Hijau = di atas standar · Kuning = borderline · Merah = di bawah standar · Strip = belum
          ada data. Threshold di-tune di{' '}
          <code className="text-indigo-300">app/(dashboard)/adops/thresholds.ts</code>.
        </p>
      </div>
    </div>
  )
}
