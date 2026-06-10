import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/server'
import { cookies } from 'next/headers'

type ContentRow = {
  id: string
  content_id_code: string
  tanggal: string | null
  format: string | null
  script_writer: string | null
  progress: string | null
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: product } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
  if (!product) notFound()

  const { data: contents } = await supabase
    .from('contents')
    .select('id,content_id_code,tanggal,format,script_writer,progress')
    .eq('product_id', id)
    .order('tanggal', { ascending: false })

  const rows = (contents as ContentRow[] | null) ?? []

  return (
    <div className="max-w-6xl">
      <Link href="/projects" className="text-xs text-slate-500 hover:text-indigo-400 transition">
        ← Back to projects
      </Link>
      <div className="flex items-baseline gap-3 mt-2 mb-1">
        <h1 className="text-3xl font-extrabold">{product.name}</h1>
        <span className="font-mono text-sm text-slate-500">{product.code}</span>
      </div>
      <p className="text-sm text-slate-400 mb-8">{rows.length} content total</p>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3 font-medium">Code</th>
              <th className="text-left p-3 font-medium">Tanggal</th>
              <th className="text-left p-3 font-medium">Format</th>
              <th className="text-left p-3 font-medium">Writer</th>
              <th className="text-left p-3 font-medium">Progress</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-800 hover:bg-slate-900/50">
                <td className="p-3 font-mono text-xs text-slate-300">{r.content_id_code}</td>
                <td className="p-3 text-slate-400">{r.tanggal ?? '—'}</td>
                <td className="p-3 text-slate-400">{r.format ?? '—'}</td>
                <td className="p-3 text-slate-400">{r.script_writer ?? '—'}</td>
                <td className="p-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {r.progress ?? '—'}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm text-slate-500">
                  Belum ada content untuk brand ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
