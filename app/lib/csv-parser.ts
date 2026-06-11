import { AdPerformanceRow, ParsedAdRow, AdPlatform } from '@/app/types/database'

// Strip suffix duplicate seperti:
//   " - Salin", " - Salin 2", " - Salin (3)"
//   " - Copy", " - Copy 4"
//   " - Duplicate" / " - Duplikat"
// Plus handle suffix ganda ("... - Salin - Salin") dengan loop sampai stabil.
const DUP_SUFFIX_RE = /\s*[-–—]\s*(Salin|Copy|Duplicate|Duplikat)(?:\s*[(]?\s*\d+\s*[)]?)?\s*$/i

function cleanAdName(raw: string): string {
  let prev = raw.trim()
  for (let i = 0; i < 5; i++) {
    const next = prev.replace(DUP_SUFFIX_RE, '').trim()
    if (next === prev) return next
    prev = next
  }
  return prev
}

// Parse leading sequence number dari ad name. Contoh: "16-FIM-6 :19-..." → 16
function parseLeadingNo(raw: string): number | null {
  const m = raw.match(/^\s*(\d+)\s*-/)
  return m ? parseInt(m[1], 10) : null
}

// Parse angka dari string CSV (handle comma, empty, dll)
function parseNum(val: string | undefined): number {
  if (!val || val.trim() === '') return 0
  return Number(val.replace(/,/g, '')) || 0
}

// Meta Ads CSV column mapping
const META_COLUMNS: Record<string, string> = {
  'Ad ID': 'ad_id_platform',
  'Ad name': 'ad_name_raw',
  Reach: 'reach',
  Impressions: 'impressions',
  'Amount spent (IDR)': 'amount_spent',
  'Link clicks': 'link_clicks',
  'Landing page views': 'landing_page_views',
  '3-second video plays': 'video_3s_plays',
  'Website checkouts initiated': 'checkouts_initiated',
  'Video plays at 25%': 'video_play_25',
  'Video plays at 50%': 'video_play_50',
  'Video plays at 75%': 'video_play_75',
  'Video plays at 95%': 'video_play_95',
  'Video plays at 100%': 'video_play_100',
  'Reporting starts': 'reporting_start',
  'Reporting ends': 'reporting_end',
}

// Parse CSV text ke array of objects
function parseCSVText(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter((line) => line.trim())
  if (lines.length < 2) return []

  // Handle BOM
  const headerLine = lines[0].replace(/^﻿/, '')
  const headers = parseCSVLine(headerLine)

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim()
    })
    rows.push(row)
  }

  return rows
}

// Parse single CSV line (handle quoted fields)
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

// Detect platform dari CSV headers. Meta exports sering tanpa kolom Ad ID — yang penting ada Ad name + Reporting.
export function detectPlatform(text: string): AdPlatform | null {
  const firstLine = text.split('\n')[0].replace(/^﻿/, '')
  const hasAdName = firstLine.includes('Ad name')
  const hasMetaMetrics =
    firstLine.includes('Amount spent') ||
    firstLine.includes('Reporting starts') ||
    firstLine.includes('Landing page views')
  if (hasAdName && hasMetaMetrics) return 'meta'
  return null
}

// Parse CSV dan map ke AdPerformanceRow[]
// Skip rows tanpa ad_name (biasanya baris total summary Meta).
export function parseMetaAdsCSV(text: string): AdPerformanceRow[] {
  const rawRows = parseCSVText(text)

  const result: AdPerformanceRow[] = []
  for (const raw of rawRows) {
    const adName = (raw['Ad name'] || '').trim()
    if (!adName) continue // skip totals row

    const row: Record<string, unknown> = { platform: 'meta' as AdPlatform }

    Object.entries(META_COLUMNS).forEach(([csvCol, dbCol]) => {
      const value = raw[csvCol] || ''
      if (
        dbCol === 'ad_id_platform' ||
        dbCol === 'ad_name_raw' ||
        dbCol === 'reporting_start' ||
        dbCol === 'reporting_end'
      ) {
        row[dbCol] = value
      } else {
        row[dbCol] = parseNum(value)
      }
    })

    // Kalau Ad ID kosong, generate synthetic ID berdasarkan ad_name + tanggal + spend
    // biar tetap traceable di tabel ad_performances.
    if (!row.ad_id_platform || row.ad_id_platform === '') {
      row.ad_id_platform = `synthetic:${adName}|${raw['Reporting starts'] || ''}|${raw['Reporting ends'] || ''}|${row.amount_spent}`.slice(
        0,
        250,
      )
    }

    result.push(row as unknown as AdPerformanceRow)
  }

  return result
}

export type ContentRef = { id: string; content_id_code: string; no_urut?: number | null }

// ---------- Mapping CSV (Ad ID registration) ----------

export interface MappingRow {
  ad_id_platform: string
  ad_name_raw: string
  campaign_id: string | null
  account_id: string | null
  account_name: string | null
}

export interface ParsedMappingRow extends MappingRow {
  clean_ad_name: string
  matched_content_id: string | null
  matched_content_code: string | null
  match_status: 'matched' | 'unmatched'
}

// Parse CSV mapping dari Meta Ads Manager (Ads view + Ad ID, Ad name, Campaign ID, Account ID/name).
// Skip rows tanpa Ad ID (header summary "All" / total).
export function parseMetaMappingCSV(text: string): MappingRow[] {
  const rawRows = parseCSVText(text)
  const out: MappingRow[] = []

  for (const raw of rawRows) {
    const adId = (raw['Ad ID'] || '').trim()
    const adName = (raw['Ad name'] || '').trim()

    // Skip summary/aggregate rows ("All" placeholder atau kosong)
    if (!adId || adId.toLowerCase() === 'all') continue
    if (!adName || adName.toLowerCase() === 'all') continue

    out.push({
      ad_id_platform: adId,
      ad_name_raw: adName,
      campaign_id: (raw['Campaign ID'] || '').trim() || null,
      account_id: (raw['Account ID'] || '').trim() || null,
      account_name: (raw['Account name'] || '').trim() || null,
    })
  }
  return out
}

export function matchMappingRowsToContents(
  rows: MappingRow[],
  contents: ContentRef[],
): ParsedMappingRow[] {
  return rows.map((row) => {
    const cleanName = cleanAdName(row.ad_name_raw)

    let match: ContentRef | undefined = contents.find((c) => c.content_id_code === cleanName)

    if (!match) {
      match = contents
        .filter((c) => cleanName.startsWith(c.content_id_code))
        .sort((a, b) => b.content_id_code.length - a.content_id_code.length)[0]
    }

    if (!match) {
      const no = parseLeadingNo(cleanName)
      if (no != null) match = contents.find((c) => c.no_urut === no)
    }

    return {
      ...row,
      clean_ad_name: cleanName,
      matched_content_id: match?.id || null,
      matched_content_code: match?.content_id_code || null,
      match_status: match ? 'matched' : 'unmatched',
    }
  })
}

// Match parsed rows ke existing contents.
// Strategy (urutan prioritas):
//  1. Exact: content_id_code === cleanAdName
//  2. Prefix: cleanAdName.startsWith(content_id_code) — pilih yang terpanjang
//  3. Leading number: ad name "16-FIM-..." → cari content dengan no_urut = 16
export type AdIdLinkMap = Map<string, { content_id: string; content_id_code: string }>

export function matchRowsToContents(
  rows: AdPerformanceRow[],
  contents: ContentRef[],
  adIdLinks: AdIdLinkMap = new Map(),
): ParsedAdRow[] {
  return rows.map((row) => {
    const cleanName = cleanAdName(row.ad_name_raw)

    // 0. PRIORITY: lookup by Ad ID via content_ad_links (paling robust)
    let match:
      | ContentRef
      | { id: string; content_id_code: string; no_urut?: number | null }
      | undefined
    if (row.ad_id_platform) {
      const link = adIdLinks.get(row.ad_id_platform)
      if (link) {
        match = { id: link.content_id, content_id_code: link.content_id_code }
      }
    }

    // 1. exact match by content_id_code
    if (!match) match = contents.find((c) => c.content_id_code === cleanName)

    // 2. prefix match
    if (!match) {
      match = contents
        .filter((c) => cleanName.startsWith(c.content_id_code))
        .sort((a, b) => b.content_id_code.length - a.content_id_code.length)[0]
    }

    // 3. leading no_urut match — fallback paling lemah
    if (!match) {
      const no = parseLeadingNo(cleanName)
      if (no != null) match = contents.find((c) => c.no_urut === no)
    }

    return {
      ...row,
      clean_ad_name: cleanName,
      matched_content_id: match?.id || null,
      matched_content_code: match?.content_id_code || null,
      match_status: match ? 'matched' : 'unmatched',
    }
  })
}
