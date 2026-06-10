import Link from 'next/link'
import { createClient } from '@/app/utils/supabase/server'
import { cookies } from 'next/headers'

type Product = {
  id: string
  name: string
  code: string
  is_active: boolean
}

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [{ data: products }, { data: contents }] = await Promise.all([
    supabase.from('products').select('*').order('name'),
    supabase.from('contents').select('product_id'),
  ])

  const countMap = (contents ?? []).reduce<Record<string, number>>((acc, c: { product_id?: string }) => {
    if (!c.product_id) return acc
    acc[c.product_id] = (acc[c.product_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-extrabold mb-1">Projects</h1>
      <p className="text-sm text-slate-400 mb-8">Daftar brand & jumlah konten masing-masing.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(products as Product[] | null ?? []).map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-2xl p-5 transition group"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition">{p.name}</h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">{p.code}</p>
              </div>
              {p.is_active ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  active
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
                  inactive
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500">
              <span className="text-2xl font-bold text-indigo-400">{countMap[p.id] ?? 0}</span>
              <span className="ml-1">contents</span>
            </div>
          </Link>
        ))}
        {(!products || products.length === 0) && (
          <p className="text-sm text-slate-500 col-span-full">Belum ada products di database.</p>
        )}
      </div>
    </div>
  )
}
