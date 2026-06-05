'use server'

import { createClient } from '@/app/utils/supabase/server'
import { cookies } from 'next/headers'
import { ParsedAdRow, AdPlatform } from '@/app/types/database'

interface UploadResult {
  success: boolean
  message: string
  imported: number
  failed: number
  unmatched: number
  upload_log_id?: string
}

export async function importAdPerformances(
  rows: ParsedAdRow[],
  platform: AdPlatform,
  filename: string
): Promise<UploadResult> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let imported = 0
  let failed = 0
  const unmatchedNames: { ad_name: string; ad_id: string }[] = []

  // 1. Create upload log
  const { data: logData, error: logError } = await supabase
    .from('upload_logs')
    .insert({
      platform,
      filename,
      rows_total: rows.length,
    })
    .select('id')
    .single()

  if (logError) {
    return {
      success: false,
      message: `Gagal buat upload log: ${logError.message}`,
      imported: 0,
      failed: 0,
      unmatched: 0,
    }
  }

  const uploadLogId = logData.id

  // 2. Insert ad performances
  for (const row of rows) {
    const { data, error } = await supabase.from('ad_performances').insert({
      content_id: row.matched_content_id,
      platform: row.platform,
      ad_id_platform: row.ad_id_platform,
      ad_name_raw: row.ad_name_raw,
      reach: row.reach,
      impressions: row.impressions,
      amount_spent: row.amount_spent,
      link_clicks: row.link_clicks,
      landing_page_views: row.landing_page_views,
      video_3s_plays: row.video_3s_plays,
      checkouts_initiated: row.checkouts_initiated,
      video_play_25: row.video_play_25,
      video_play_50: row.video_play_50,
      video_play_75: row.video_play_75,
      video_play_95: row.video_play_95,
      video_play_100: row.video_play_100,
      reporting_start: row.reporting_start || null,
      reporting_end: row.reporting_end || null,
      upload_log_id: uploadLogId,
    })

    if (error) {
      failed++
    } else {
      imported++
      if (row.match_status === 'unmatched') {
        unmatchedNames.push({
          ad_name: row.ad_name_raw,
          ad_id: row.ad_id_platform,
        })
      }
    }
  }

  // 3. Update upload log with results
  await supabase
    .from('upload_logs')
    .update({
      rows_imported: imported,
      rows_failed: failed,
      rows_unmatched: unmatchedNames.length,
      unmatched_ad_names: unmatchedNames.length > 0 ? unmatchedNames : null,
    })
    .eq('id', uploadLogId)

  return {
    success: true,
    message: `Import selesai: ${imported} berhasil, ${failed} gagal, ${unmatchedNames.length} unmatched.`,
    imported,
    failed,
    unmatched: unmatchedNames.length,
    upload_log_id: uploadLogId,
  }
}