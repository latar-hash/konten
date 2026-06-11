# Konten — Session Recap

> Brief untuk lanjutin development. Paste isi file ini ke chat baru biar agent paham konteks penuh tanpa scroll history.

## Tujuan Project

Internal dashboard buat tim Konten + Advertiser:
- Brief & track produksi konten (PIC, writer, talent, format)
- Upload report iklan Meta CSV → auto-link ke konten via Ad ID / nama
- Reporting performa per konten (CTR, hook, CPL, spend) + Ad Operations dengan conditional formatting (winner / kill candidate)

## Tech Stack

- **Next.js 16.2.7** (App Router, Turbopack). Catatan: middleware sekarang namanya **Proxy** (`proxy.ts` di root). API ada perubahan dari Next.js versi sebelumnya — selalu cek `node_modules/next/dist/docs/` sebelum nulis kode SSR.
- **React 19**
- **Tailwind v4** (PostCSS)
- **Supabase** — Postgres + PostgREST + Auth + SSR helpers (`@supabase/ssr`, `@supabase/supabase-js`)
- **TypeScript 5**

## Supabase Project (Production)

- URL: `https://ixtcqppcjbhwkodgpgaf.supabase.co`
- Key dipakai: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (boleh isi JWT anon legacy atau publishable key `sb_publishable_*` — interchangeable)
- ⚠️ Sempat ada masalah Vercel auto-create project terpisah `wjyargwgobusoqbtbikq` via Supabase integration → di-disconnect, env var di-override manual ke project yang bener

## File Conventions

```
app/
  page.tsx                          # landing publik
  layout.tsx                        # root
  globals.css
  login/page.tsx                    # Google OAuth sign-in
  auth/
    callback/route.ts               # exchange OAuth code → session
    signout/route.ts                # POST sign out
  (dashboard)/                      # route group, semua halaman pakai sidebar
    layout.tsx                      # sidebar nav, user info, signout
    dashboard/page.tsx              # KPI overview (Brands, Contents, Spend, CTR, Hook, Fase)
    projects/page.tsx               # brand cards + content count per brand
    adops/                          # Ad Operations
      page.tsx                      # server fetch
      AdOpsView.tsx                 # client — fase tabs, matrix, conditional formatting
      thresholds.ts                 # standar metric (CTR/Hook/Hold/CPM/CPC/CPL/Leads)
    contents/
      page.tsx                      # list, search, filter Fase/Progress
      ContentsTable.tsx             # client — row klik ke detail
      new/page.tsx                  # form brief baru (server action)
      [id]/page.tsx                 # detail konten: hero, metrics, brief, ad entries
    uploads/
      page.tsx                      # upload CSV performance Meta + history upload_logs
      UploadFlow.tsx                # client — drag-drop, parse, preview, import
      mapping/
        page.tsx                    # register Ad ID → konten
        MappingFlow.tsx             # client — upload, match preview, manual override
  lib/
    actions.ts                      # server actions: createContent, importAdPerformances, registerAdMappings
    auth.ts                         # getCurrentUser, isSuperuser, displayName
    csv-parser.ts                   # Meta CSV parser + 4-tier matcher
  utils/supabase/
    server.ts                       # SSR client (cookies)
    client.ts                       # browser client
    middleware.ts                   # helper (legacy)
  types/database.ts                 # ContentPerformanceSummary, AdPerformanceRow, dll
proxy.ts                            # Next 16 "proxy" (dulu middleware) — refresh session, redirect unauth
```

## Database Schema (highlight)

### Tables
- `products` — id, name, code, is_active
- `contents` — id, no_urut (sequential), content_id_code, tanggal, skrip_konten, product_id, format, script_writer, pic_talent, pic_name, progress, type_market, angle_konten, type_konten, notes, final_link_content, target_publish_date, issue, created_at, updated_at
- `ad_performances` — id, content_id (FK nullable), platform, ad_id_platform, ad_name_raw, reach, impressions, amount_spent, link_clicks, landing_page_views, video_3s_plays, checkouts_initiated, video_play_25..100, reporting_start, reporting_end, upload_log_id
- `upload_logs` — id, platform, filename, rows_total, rows_imported, rows_failed, rows_unmatched, unmatched_ad_names (jsonb), uploaded_at
- `content_ad_links` ← **dibuat di session ini** — mapping Meta Ad ID ke konten:
  ```sql
  create table content_ad_links (
    id uuid primary key default gen_random_uuid(),
    content_id uuid not null references contents(id) on delete cascade,
    platform text not null default 'meta',
    ad_id_platform text not null,
    ad_name_raw text not null,
    campaign_id text,
    account_id text,
    account_name text,
    registered_at timestamptz not null default now(),
    registered_by uuid references auth.users(id),
    unique (platform, ad_id_platform)
  );
  create index on content_ad_links (content_id);
  create index on content_ad_links (ad_id_platform);
  ```

### View
- `content_performance_summary` — gabung contents + aggregated metrics dari ad_performances (CTR, hook_rate_percent, hold_rate_percent, total_spend, total_leads, fase, dll)

## Format Content ID Code

Pattern: `{no_urut}-{product_code}-{format}-{pic_talent}-{script_writer}-{m/d/yyyy}`

Contoh:
- `75-FIM-6 :19-VIKO-WAHYU-5/25/2026`
- `62-FIM-4:5-VIKO-WAHYU-5/23/2026`
- `12-MAD-6 :19-LAINNYA-WAHYU-05/11/2026`

Inconsistencies di data lama:
- Date: kadang leading-zero (`05/11`), kadang nggak (`5/25`)
- Format `6:19` kadang `6 :19` (space sebelum `:`)
- Suffix `- Salin` / `- Salin 2` / `- Salin (3)` dari duplicate di Meta

→ Solusi di matcher: 4 tier prioritas (lihat bawah)

## CSV Matcher Logic (`app/lib/csv-parser.ts`)

`cleanAdName(raw)`:
- Loop sampe stabil, strip suffix `Salin / Copy / Duplicate / Duplikat` (case-insensitive) + variasi `(2)`, `2`, dash variant `-/–/—`

`matchRowsToContents(rows, contents, adIdLinks)` — 4 strategi berurutan:
1. **Lookup Ad ID** di `content_ad_links` (paling robust — bypass ad name parsing)
2. **Exact match** content_id_code == cleanAdName
3. **Prefix match** cleanAdName starts with content_id_code (pilih terpanjang)
4. **Leading no_urut** — parse `^(\d+)-` dari nama, cari `contents.no_urut == N` (jaring pengaman buat ad name yang dirubah tanggalnya)

`parseMetaAdsCSV(text)`:
- Skip baris dengan Ad name kosong (Meta totals row)
- Generate synthetic `ad_id_platform` kalau CSV gak ada kolom Ad ID
- Deteksi platform via `Ad name` + `Amount spent` / `Reporting starts` (gak harus ada `Ad ID`)

`parseMetaMappingCSV(text)`:
- Skip baris dengan Ad ID `"All"` atau kosong (Meta aggregate header)

## Auth Status

**Setup parsial** — kode jadi tapi setup Google Cloud + Supabase provider belum final:
- `proxy.ts` — refresh session, redirect unauth ke `/login` (kecuali `/`, `/login`, `/auth/*`)
- `app/login/page.tsx` — tombol Sign in with Google
- `app/auth/callback/route.ts` — exchange code → session
- `app/auth/signout/route.ts` — POST signout
- `app/lib/auth.ts` — `SUPERUSER_EMAILS = ['umahlatar@gmail.com']`, `isSuperuser()`, `displayName()`
- Sidebar tampilin user info + badge SUPERUSER + signout button

**Yang masih harus diselesaikan user:**
1. Google Cloud Console → bikin OAuth Client (Web), Authorized redirect URI: `https://ixtcqppcjbhwkodgpgaf.supabase.co/auth/v1/callback`
2. Supabase Dashboard → Authentication → Providers → enable Google + paste Client ID + Secret
3. Supabase Dashboard → Authentication → URL Configuration → Site URL `http://localhost:3000`, Redirect URLs: `http://localhost:3000/auth/callback`, `https://winningads.vercel.app/auth/callback`

Sebelum auth siap, **`createContent` action** akan stub `script_writer` ke user.email/displayName. Kalau user belum login, akan return error "Sesi login expired".

## Known Issues / TODO

- [ ] **RLS bikin write block** di table baru (`content_ad_links`, `upload_logs`). Sempat workaround dengan admin client + service_role tapi udah dihapus sebelum commit. Pilihan:
  - (a) `alter table content_ad_links disable row level security;` + `alter table upload_logs disable row level security;` (cepat, ok kalo single-user)
  - (b) Bikin SELECT/INSERT policy yang allow auth.uid() (lebih bener)
- [ ] **PostgREST schema cache** kadang stale di Vercel. Fix: `NOTIFY pgrst, 'reload schema';` di SQL editor + redeploy
- [ ] **Vercel-Supabase integration** harus DI-DISCONNECT — bikin env var dia override-able. Pastiin env `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` di-set manual di Vercel Settings → Environment Variables, point ke project `ixtcqppcjbhwkodgpgaf`
- [ ] Form `createContent` di `app/(dashboard)/contents/new/page.tsx` versi sekarang (di-edit user/linter) belum integrated dengan auth (script_writer masih input manual). Kalau auth jadi, ganti pakai user dari `getCurrentUser()`
- [ ] Ad performance upload belum surface error per row dengan baik
- [ ] Manual link unmatched ad di /uploads belum ada (kalau Step 1 mapping di-skip, ad masuk tanpa content_id)
- [ ] Halaman `/projects/[id]` (detail brand) belum dibuat (di-link dari `/projects`)

## Threshold Conditional Formatting

`app/(dashboard)/adops/thresholds.ts` — tune di sini, gak hardcoded di komponen:

| Metric | Good | Bad | Direction |
|---|---|---|---|
| CTR | ≥ 2% | < 1% | higher |
| Hook Rate | ≥ 25% | < 15% | higher |
| Hold Rate | ≥ 50% | < 30% | higher |
| CPM | ≤ Rp 30k | > Rp 60k | lower |
| CPC | ≤ Rp 2k | > Rp 5k | lower |
| CPL | ≤ Rp 30k | > Rp 80k | lower |
| Leads | ≥ 10 | < 1 | higher |

## Vercel Deployment

- Domain: https://winningads.vercel.app
- Env Production:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://ixtcqppcjbhwkodgpgaf.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_RLuYuAZZs444uGDZNAbcng_DSKo1NiJ
  ```
- Redeploy uncheck "Use existing Build Cache" tiap kali ubah env

## Git

- Repo: https://github.com/latar-hash/konten
- Branch: `main`
- Commit terakhir session ini: `7f01431` — "feat: contents detail, uploads in dashboard, ad mapping flow"

## Cara Lanjut

Mulai chat baru, paste isi file ini, kasih konteks tugas baru. Contoh prompt:

> Ini recap project Konten (lihat MD di atas). Sekarang aku mau:
> - Bikin halaman `/projects/[id]` (detail per brand)
> - Tambahin tombol Edit di halaman detail konten
> - [task baru]
