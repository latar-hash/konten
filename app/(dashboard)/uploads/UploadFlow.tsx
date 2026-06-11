'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { parseMetaAdsCSV, matchRowsToContents, detectPlatform } from '@/app/lib/csv-parser'
import { importAdPerformances } from '@/app/lib/actions'
import { ParsedAdRow, AdPlatform } from '@/app/types/database'

type UploadStep = 'select' | 'preview' | 'importing' | 'done'

export default function UploadFlow() {
  const router = useRouter()
  const [step, setStep] = useState<UploadStep>('select')
  const [rows, setRows] = useState<ParsedAdRow[]>([])
  const [platform, setPlatform] = useState<AdPlatform>('meta')
  const [filename, setFilename] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    imported: number
    failed: number
    unmatched: number
    message: string
  } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const processFile = useCallback(async (file: File) => {
    setError('')
    if (!file.name.endsWith('.csv')) {
      setError('File harus berformat .csv')
      return
    }
    const text = await file.text()
    const detected = detectPlatform(text)
    if (!detected) {
      setError(
        'Format CSV tidak dikenali. Pastikan ini export Meta Ads dengan kolom Ad ID dan Ad name.',
      )
      return
    }
    setPlatform(detected)
    setFilename(file.name)
    const parsed = parseMetaAdsCSV(text)
    if (parsed.length === 0) {
      setError('CSV kosong atau tidak ada data valid.')
      return
    }
    const supabase = createClient()
    const [{ data: contents, error: fetchErr }, { data: links, error: linksErr }] =
      await Promise.all([
        supabase.from('contents').select('id, content_id_code, no_urut'),
        supabase
          .from('content_ad_links')
          .select('ad_id_platform, content_id, contents(content_id_code)'),
      ])
    if (fetchErr) {
      setError(`Gagal fetch data konten: ${fetchErr.message}`)
      return
    }
    if (linksErr) {
      setError(`Gagal fetch mapping Ad ID: ${linksErr.message}`)
      return
    }
    const adIdMap = new Map<string, { content_id: string; content_id_code: string }>()
    for (const l of (links || []) as Array<{
      ad_id_platform: string
      content_id: string
      contents: { content_id_code: string } | { content_id_code: string }[] | null
    }>) {
      const c = Array.isArray(l.contents) ? l.contents[0] : l.contents
      adIdMap.set(l.ad_id_platform, {
        content_id: l.content_id,
        content_id_code: c?.content_id_code || '',
      })
    }
    setRows(matchRowsToContents(parsed, contents || [], adIdMap))
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
  const handleImport = async () => {
    setStep('importing')
    const res = await importAdPerformances(rows, platform, filename)
    setResult({
      imported: res.imported,
      failed: res.failed,
      unmatched: res.unmatched,
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
  const unmatchedCount = rows.filter((r) => r.match_status === 'unmatched').length

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
          <div className="text-3xl mb-3">📄</div>
          <p className="text-sm font-medium text-slate-300 mb-1">
            Drop file CSV di sini atau klik untuk pilih
          </p>
          <p className="text-xs text-slate-600">Support: Meta Ads export (.csv)</p>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 p-4 bg-slate-900/60 rounded-xl border border-slate-800/40">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Cara Export dari Meta Ads
          </h3>
          <ol className="text-xs text-slate-500 space-y-1.5 list-decimal list-inside">
            <li>Buka Meta Ads Manager → Ads tab</li>
            <li>
              Set kolom: Ad ID, Ad name, Reach, Impressions, Amount spent, Link clicks, Landing
              page views, 3-second video plays, Checkouts initiated, Video plays (25%–100%)
            </li>
            <li>Set date range sesuai periode yang mau diimport</li>
            <li>Klik Export → Download .csv</li>
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
            <span className="text-slate-300 font-mono">{filename}</span>
            {' · '}
            {rows.length} baris · <span className="capitalize">{platform}</span> Ads
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-slate-700 rounded-lg transition"
            >
              Batal
            </button>
            <button
              onClick={handleImport}
              className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
            >
              Import {rows.length} Baris
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="text-2xl font-bold">{rows.length}</div>
            <div className="text-xs text-slate-500">Total baris</div>
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
            <div className="text-xs text-slate-500">Unmatched</div>
          </div>
        </div>

        {unmatchedCount > 0 && (
          <div className="p-3 bg-amber-900/15 border border-amber-500/20 rounded-xl text-amber-400 text-xs">
            ⚠️ {unmatchedCount} baris tidak match dengan data konten. Data tetap di-import tapi
            tanpa relasi ke konten — bisa di-link manual nanti.
          </div>
        )}

        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-900 text-slate-400">
              <tr className="text-left">
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Ad Name</th>
                <th className="px-3 py-2.5 font-medium">Match</th>
                <th className="px-3 py-2.5 font-medium text-right">Spend</th>
                <th className="px-3 py-2.5 font-medium text-right">Reach</th>
                <th className="px-3 py-2.5 font-medium text-right">Clicks</th>
                <th className="px-3 py-2.5 font-medium text-right">3s</th>
                <th className="px-3 py-2.5 font-medium text-right">Checkouts</th>
                <th className="px-3 py-2.5 font-medium">Period</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={idx}
                  className={`border-t border-slate-800/30 ${
                    row.match_status === 'unmatched'
                      ? 'bg-amber-950/10'
                      : 'hover:bg-slate-900/40'
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        row.match_status === 'matched' ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-300 max-w-[280px] truncate">
                    {row.ad_name_raw}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 max-w-[200px] truncate">
                    {row.matched_content_code || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-300">
                    {row.amount_spent.toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-400">
                    {row.reach.toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-400">{row.link_clicks}</td>
                  <td className="px-3 py-2.5 text-right text-slate-400">{row.video_3s_plays}</td>
                  <td className="px-3 py-2.5 text-right text-slate-400">
                    {row.checkouts_initiated}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                    {row.reporting_start}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (step === 'importing') {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center">
        <div className="text-4xl mb-4 animate-spin inline-block">⟳</div>
        <h2 className="text-xl font-bold mb-2">Mengimport data...</h2>
        <p className="text-sm text-slate-500">{rows.length} baris sedang diproses ke Supabase</p>
      </div>
    )
  }

  if (step === 'done' && result) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center">
        <div className="text-5xl mb-4">{result.failed === 0 ? '✓' : '⚠️'}</div>
        <h2 className="text-xl font-bold mb-2">Import Selesai</h2>
        <p className="text-sm text-slate-400 mb-6">{result.message}</p>

        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-6">
          <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3">
            <div className="text-lg font-bold text-emerald-400">{result.imported}</div>
            <div className="text-xs text-emerald-500/70">Imported</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-3">
            <div className="text-lg font-bold text-red-400">{result.failed}</div>
            <div className="text-xs text-slate-500">Failed</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-3">
            <div className="text-lg font-bold text-amber-400">{result.unmatched}</div>
            <div className="text-xs text-slate-500">Unmatched</div>
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
            href="/dashboard"
            className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
          >
            Lihat Dashboard
          </a>
        </div>
      </div>
    )
  }

  return null
}
