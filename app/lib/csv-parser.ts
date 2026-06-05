import { AdPerformanceRow, ParsedAdRow, AdPlatform } from '@/app/types/database'

// Strip suffixes seperti " - Salin", " - Copy", " - Salin 2", dll
function cleanAdName(raw: string): string {
  return raw.replace(/\s*-\s*(Salin|Copy)(\s*\d*)\s*$/i, '').trim()
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
  'Reach': 'reach',
  'Impressions': 'impressions',
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
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  // Handle BOM
  const headerLine = lines[0].replace(/^\uFEFF/, '')
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

// Detect platform dari CSV headers
export function detectPlatform(text: string): AdPlatform | null {
  const firstLine = text.split('\n')[0].replace(/^\uFEFF/, '')
  if (firstLine.includes('Ad ID') && firstLine.includes('Ad name')) return 'meta'
  // Future: detect TikTok, Google headers
  return null
}

// Parse CSV dan map ke AdPerformanceRow[]
export function parseMetaAdsCSV(text: string): AdPerformanceRow[] {
  const rawRows = parseCSVText(text)
  
  return rawRows.map(raw => {
    const row: Record<string, any> = { platform: 'meta' as AdPlatform }
    
    Object.entries(META_COLUMNS).forEach(([csvCol, dbCol]) => {
      const value = raw[csvCol] || ''
      if (dbCol === 'ad_id_platform' || dbCol === 'ad_name_raw' || dbCol === 'reporting_start' || dbCol === 'reporting_end') {
        row[dbCol] = value
      } else {
        row[dbCol] = parseNum(value)
      }
    })

    return row as AdPerformanceRow
  })
}

// Match parsed rows ke existing contents
export function matchRowsToContents(
  rows: AdPerformanceRow[],
  contents: { id: string; content_id_code: string }[]
): ParsedAdRow[] {
  return rows.map(row => {
    const cleanName = cleanAdName(row.ad_name_raw)

    // Try exact match
    let match = contents.find(c => c.content_id_code === cleanName)

    // Try partial: content_id_code is prefix of cleaned name
    if (!match) {
      match = contents
        .filter(c => cleanName.startsWith(c.content_id_code))
        .sort((a, b) => b.content_id_code.length - a.content_id_code.length)[0]
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