'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'
import {
  detectPlatform,
  parseMetaMappingCSV,
  matchMappingRowsToContents,
  type ParsedMappingRow,
  type ContentRef,
} from '@/app/lib/csv-parser'
import { registerAdMappings } from '@/app/lib/actions'

type Step = 'select' | 'preview' | 'registering' | 'done'

export default function MappingFlow() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('select')
  const [rows, setRows] = useState<ParsedMappingRow[]>([])
  const [contents, setContents] = useState<ContentRef[]>([])
  const [filename, setFilename] = useState('')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState<{
    registered: number
    skipped_duplicate: number
    skipped_unmatched: number
    failed: number
    message: string
  } | null>(null)

  const processFile = useCallback(async (file: File) => {
    setError('')
    if (!file.name.endsWith('.csv')) {
      setError('File harus berformat .csv')
      return
    }
    const text = await file.text()
    const detected = detectPlatform(text)
    if (!detected) {
      setError('Format CSV tidak dikenali. Butuh kolom Ad name minimal.')
      return
    }
    if (!text.split('\n')[0].includes('Ad ID')) {
      setError(
        'CSV mapping butuh kolom Ad ID. Re-export dari Meta Ads Manager dan centang kolom Ad ID, Campaign ID, Account ID, Account name.',
      )
      return
    }
    const parsed = parseMetaMappingCSV(text)
    if (parsed.length === 0) {
      setError('CSV kosong atau tidak ada row Ad ID yang valid.')
      return
    }
    const supabase = createClient()
    const { data: existingContents, error: fetchErr } = await supabase
      .from('contents')
      .select('id, content_id_code, no_urut')
    if (fetchErr) {
      setError(`Gagal fetch konten: ${fetchErr.message}`)
      return
    }
    const refs = (existingContents || []) as ContentRef[]
    setContents(refs)
    setRows(matchMappingRowsToContents(parsed, refs))
    setFilename(file.name)
    setStep('preview')
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const overrideMatch = (idx: number, contentId: string) => {
    setRows((prev) => {
      const copy = [...prev]
      if (!contentId) {
        copy[idx] = {
          ...copy[idx],
          matched_content_id: null,
          matched_content_code: null,
          match_status: 'unmatched',
        }
      } else {
        const c = contents.find((x) => x.id === contentId)
        copy[idx] = {
          ...copy[idx],
          matched_content_id: c?.id || null,
          matched_content_code: c?.content_id_code || null,
          match_status: c ? 'matched' : 'unmatched',
        }
      }
      return copy
    })
  }

  const handleRegister = async () => {
    setStep('registering')
    const matched = rows.filter((r) => r.match_status === 'matched' && r.matched_content_id)
    const unmatched = rows.length - matched.length
    const res = await registerAdMappings(
      matched.map((r) => ({
        content_id: r.matched_content_id!,
        ad_id_platform: r.ad_id_platform,
        ad_name_raw: r.ad_name_raw,
        campaign_id: r.campaign_id,
        account_id: r.account_id,
        account_name: r.account_name,
      })),
      unmatched,
    )
    setResult({
      registered: res.registered,
      skipped_duplicate: res.skipped_duplicate,
      skipped_unmatched: res.skipped_unmatched,
      failed: res.failed,
      message: res.message,
    })
    setStep('done')
    router.refresh()
  }

  const handleReset = () => {
    setStep('select')
    setRows([])
    setFilename('')
    setError('')
    setResult(null)
  }

  const matchedCount = rows.filter((r) => r.match_status === 'matched').length
  const unmatchedCount = rows.length - matchedCount

  if (step === 'select') {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
            dragOver
              ? 'border-indigo-400 bg-indigo-400/5'
              : 'border-slate-700 hover:border-slate-500 bg-slate-900/40'
          }`}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="text-3xl mb-3">🔗</div>
          <p className="text-sm font-medium text-slate-300 mb-1">
            Drop file CSV mapping di sini atau klik untuk pilih
          </p>
          <p className="text-xs text-slate-600">
            Kolom wajib: Ad ID, Ad name · Optional: Campaign ID, Account ID, Account name
          </p>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 p-4 bg-slate-900/60 rounded-xl border border-slate-800/40">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Cara Export dari Meta Ads Manager
          </h3>
          <ol className="text-xs text-slate-500 space-y-1.5 list-decimal list-inside">
            <li>Buka Ads Manager → tab <strong>Ads</strong></li>
            <li>
              Customize columns → tambahin: <code className="text-indigo-400">Account ID, Account name, Campaign ID, Ad ID, Ad name</code>
            </li>
            <li>Pilih semua ads yang mau di-register</li>
            <li>Reports → Export → CSV (metric kolom optional, di-skip otomatis)</li>
          </ol>
        </div>
      </div>
    )
  }

  if (step === 'preview') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-slate-500">
            <span className="text-slate-300 font-mono">{filename}</span> · {rows.length} ad
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-slate-700 rounded-lg transition"
            >
              Batal
            </button>
            <button
              onClick={handleRegister}
              disabled={matchedCount === 0}
              className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
            >
              Register {matchedCount} Mapping
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="text-2xl font-bold">{rows.length}</div>
            <div className="text-xs text-slate-500">Total ad</div>
          </div>
          <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-4">
            <div className="text-2xl font-bold text-emerald-400">{matchedCount}</div>
            <div className="text-xs text-emerald-500/70">Matched</div>
          </div>
          <div
            className={`rounded-xl p-4 ${
              unmatchedCount > 0
                ? 'bg-amber-950/30 border border-amber-500/20'
                : 'bg-slate-950 border border-slate-800'
            }`}
          >
            <div
              className={`text-2xl font-bold ${
                unmatchedCount > 0 ? 'text-amber-400' : 'text-slate-500'
              }`}
            >
              {unmatchedCount}
            </div>
            <div className="text-xs text-slate-500">Unmatched (pilih manual)</div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-900 text-slate-400">
              <tr className="text-left">
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Ad ID</th>
                <th className="px-3 py-2.5 font-medium">Ad name</th>
                <th className="px-3 py-2.5 font-medium">Campaign</th>
                <th className="px-3 py-2.5 font-medium">Match Konten</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={`${row.ad_id_platform}-${idx}`}
                  className={`border-t border-slate-800/30 ${
                    row.match_status === 'unmatched' ? 'bg-amber-950/10' : 'hover:bg-slate-900/40'
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        row.match_status === 'matched' ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-300">
                    {row.ad_id_platform.slice(0, 14)}…
                  </td>
                  <td className="px-3 py-2.5 text-slate-300 max-w-[280px] truncate" title={row.ad_name_raw}>
                    {row.ad_name_raw}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-500">
                    {row.campaign_id ? row.campaign_id.slice(0, 14) + '…' : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={row.matched_content_id || ''}
                      onChange={(e) => overrideMatch(idx, e.target.value)}
                      className={`text-xs px-2 py-1 rounded bg-slate-900 border outline-none focus:border-indigo-500 max-w-[260px] ${
                        row.match_status === 'matched'
                          ? 'border-emerald-700 text-emerald-200'
                          : 'border-amber-700 text-amber-200'
                      }`}
                    >
                      <option value="">— belum di-link —</option>
                      {contents
                        .slice()
                        .sort((a, b) => (b.no_urut || 0) - (a.no_urut || 0))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.content_id_code}
                          </option>
                        ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (step === 'registering') {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center">
        <div className="text-4xl mb-4 animate-spin inline-block">⟳</div>
        <h2 className="text-xl font-bold mb-2">Mendaftarkan mapping...</h2>
      </div>
    )
  }

  if (step === 'done' && result) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center">
        <div className="text-5xl mb-4">{result.failed === 0 ? '✓' : '⚠️'}</div>
        <h2 className="text-xl font-bold mb-2">Register Selesai</h2>
        <p className="text-sm text-slate-400 mb-6">{result.message}</p>

        <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto mb-6">
          <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3">
            <div className="text-lg font-bold text-emerald-400">{result.registered}</div>
            <div className="text-xs text-emerald-500/70">Baru</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-3">
            <div className="text-lg font-bold text-slate-400">{result.skipped_duplicate}</div>
            <div className="text-xs text-slate-500">Sudah ada</div>
          </div>
          <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-3">
            <div className="text-lg font-bold text-amber-400">{result.skipped_unmatched}</div>
            <div className="text-xs text-slate-500">Unmatched</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-3">
            <div className="text-lg font-bold text-red-400">{result.failed}</div>
            <div className="text-xs text-slate-500">Failed</div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleReset}
            className="px-5 py-2 text-sm border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition"
          >
            Upload Lagi
          </button>
          <a
            href="/uploads"
            className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
          >
            Ke Upload Performance
          </a>
        </div>
      </div>
    )
  }

  return null
}
