import Link from 'next/link'
import { createClient } from '@/app/utils/supabase/server'
import { cookies } from 'next/headers'
import ContentsTable, { type Row } from './ContentsTable'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data } = await supabase
    .from('content_performance_summary')
    .select(
      'content_id,content_id_code,tanggal,product_name,format,script_writer,progress,fase,total_spend,ctr_percent,hook_rate_percent',
    )
    .order('tanggal', { ascending: false })

  const rows = (data as Row[] | null) ?? []

  return (
    <div className="max-w-7xl">
      <div className="flex justify-between items-baseline mb-8">
        <h1 className="text-3xl font-extrabold">Contents</h1>
        <Link
          href="/contents/new"
          className="bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          + New Content
        </Link>
      </div>

      <ContentsTable rows={rows} />
    </div>
  )
}
