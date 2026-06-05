// Database types matching Supabase schema

export type UserRole = 'advertiser' | 'content_team' | 'admin'
export type ContentProgress = 'Draft' | 'Done'
export type ContentFormat = '6:19' | '4:5' | 'LP' | 'Carousel' | 'Image'
export type MarketType = 'Cold' | 'Warm' | 'Hot'
export type AdPlatform = 'meta' | 'tiktok' | 'google'
export type FaseType = 'NOT TESTING' | 'FASE 0' | 'FASE 1' | 'FASE 2' | 'FASE 3'
export type ResultType = 'Very Good' | 'Good' | 'Average' | 'Bad'

export interface ContentPerformanceSummary {
  content_id: string
  content_id_code: string
  tanggal: string
  skrip_konten: string | null
  product_name: string
  product_code: string
  format: ContentFormat
  script_writer: string
  pic_talent: string | null
  pic_name: string
  progress: ContentProgress
  type_market: MarketType | null
  angle_konten: string | null
  type_konten: string | null
  total_reach: number
  total_impressions: number
  total_spend: number
  total_link_clicks: number
  total_landing_page_views: number
  total_video_3s: number
  total_leads: number
  total_vp25: number
  total_vp50: number
  total_vp75: number
  total_vp95: number
  total_vp100: number
  cpm: number
  cpc: number
  ctr_percent: number
  hook_rate_percent: number
  hold_rate_percent: number
  fase: FaseType
  ad_entries_count: number
  eval_result: ResultType | null
  eval_feedback: string | null
}

export interface AdPerformanceRow {
  ad_id_platform: string
  ad_name_raw: string
  platform: AdPlatform
  reach: number
  impressions: number
  amount_spent: number
  link_clicks: number
  landing_page_views: number
  video_3s_plays: number
  checkouts_initiated: number
  video_play_25: number
  video_play_50: number
  video_play_75: number
  video_play_95: number
  video_play_100: number
  reporting_start: string
  reporting_end: string
}

// Parsed CSV row before matching
export interface ParsedAdRow extends AdPerformanceRow {
  // Matching info
  matched_content_id: string | null
  matched_content_code: string | null
  clean_ad_name: string // ad_name after stripping suffixes
  match_status: 'matched' | 'unmatched'
}

export interface UploadPreview {
  total_rows: number
  matched_rows: number
  unmatched_rows: number
  rows: ParsedAdRow[]
  platform: AdPlatform
  filename: string
}