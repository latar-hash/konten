import { createClient } from '@/app/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Mengambil data langsung dari PostgreSQL View yang kamu buat
  const { data: contentsSummary, error } = await supabase
    .from('content_performance_summary')
    .select('*')

  if (error) {
    console.error("Supabase error:", error.message)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {/* Navbar */}
      <header className="container mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-800">
        <div className="text-2xl font-bold tracking-wider text-indigo-400">
          Winning<span className="text-white">Ads</span>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold px-4 py-2 rounded-lg transition">
          Dashboard
        </button>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-6 py-12 text-center max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Database Connection Verified!
        </h1>
        <p className="text-slate-400 text-sm mb-8">
          Berhasil terhubung dengan arsitektur database skema iklan pasar digital.
        </p>

        {/* Kotak Tes Koneksi Data Nyata */}
        <div className="max-w-2xl mx-auto bg-slate-950 p-6 rounded-2xl border border-slate-800 text-left">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
              📊 Data View: content_performance_summary
            </h3>
            <span className="bg-green-500/10 text-green-400 text-xs px-2.5 py-1 rounded-full font-medium border border-green-500/20">
              Active Connection
            </span>
          </div>

          {error ? (
            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
              ❌ Gagal mengambil data View: {error.message}
            </div>
          ) : contentsSummary && contentsSummary.length > 0 ? (
            <div className="space-y-4">
              {contentsSummary.map((item: any) => (
                <div key={item.content_id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-sm space-y-2">
                  <div className="flex justify-between font-mono text-xs text-slate-400">
                    <span>Code: {item.content_id_code}</span>
                    <span className="text-indigo-400 font-bold">{item.fase}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-xs">
                    <div><span className="text-slate-500">Produk:</span> <p className="font-semibold text-white">{item.product_name}</p></div>
                    <div><span className="text-slate-500">Writer:</span> <p className="font-semibold text-white">{item.script_writer}</p></div>
                    <div><span className="text-slate-500">Spend:</span> <p className="font-semibold text-white">Rp {item.total_spend.toLocaleString('id-ID')}</p></div>
                    <div><span className="text-slate-500">Status Konten:</span> <p className="font-semibold text-emerald-400">{item.progress}</p></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-4">
              Koneksi aman ke Supabase, tapi data di tabel contents masih kosong melongpong.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}