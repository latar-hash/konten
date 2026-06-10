// Standar metrik untuk conditional formatting.
// Direction: 'higher' = makin tinggi makin bagus; 'lower' = makin rendah makin bagus.
// Tweak angkanya di sini supaya match standar tim.

export type MetricKey =
  | 'ctr_percent'
  | 'hook_rate_percent'
  | 'hold_rate_percent'
  | 'cpm'
  | 'cpc'
  | 'cpl'
  | 'total_leads'

export type Threshold = {
  label: string
  short: string
  direction: 'higher' | 'lower'
  good: number // >= (higher) atau <= (lower)
  bad: number // <  (higher) atau >  (lower)
  fmt: (v: number) => string
}

const fmtIDR = (n: number) =>
  'Rp ' + (n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })
const fmtPct = (n: number) => `${(n || 0).toFixed(2)}%`
const fmtNum = (n: number) => (n || 0).toLocaleString('id-ID')

export const THRESHOLDS: Record<MetricKey, Threshold> = {
  ctr_percent: { label: 'CTR', short: 'CTR', direction: 'higher', good: 2, bad: 1, fmt: fmtPct },
  hook_rate_percent: {
    label: 'Hook Rate',
    short: 'Hook',
    direction: 'higher',
    good: 25,
    bad: 15,
    fmt: fmtPct,
  },
  hold_rate_percent: {
    label: 'Hold Rate',
    short: 'Hold',
    direction: 'higher',
    good: 50,
    bad: 30,
    fmt: fmtPct,
  },
  cpm: { label: 'CPM', short: 'CPM', direction: 'lower', good: 30000, bad: 60000, fmt: fmtIDR },
  cpc: { label: 'CPC', short: 'CPC', direction: 'lower', good: 2000, bad: 5000, fmt: fmtIDR },
  cpl: { label: 'CPL', short: 'CPL', direction: 'lower', good: 30000, bad: 80000, fmt: fmtIDR },
  total_leads: {
    label: 'Leads',
    short: 'Leads',
    direction: 'higher',
    good: 10,
    bad: 1,
    fmt: fmtNum,
  },
}

export type Verdict = 'good' | 'mid' | 'bad' | 'none'

export function gradeMetric(v: number | null | undefined, t: Threshold): Verdict {
  if (v == null || (typeof v === 'number' && (isNaN(v) || v === 0) && t.direction === 'lower')) {
    return 'none'
  }
  if (t.direction === 'higher') {
    if (v >= t.good) return 'good'
    if (v < t.bad) return 'bad'
    return 'mid'
  }
  // lower
  if (v <= t.good) return 'good'
  if (v > t.bad) return 'bad'
  return 'mid'
}

export const VERDICT_CLASS: Record<Verdict, string> = {
  good: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  mid: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  bad: 'bg-red-500/15 text-red-300 border-red-500/30',
  none: 'bg-slate-800/40 text-slate-600 border-slate-700/40',
}
