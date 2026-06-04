import { createClient } from '@/app/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Ini kodingan bawaanmu buat narik data dari Supabase. 
  // Kita amankan biar gak error kalau tabel 'todos' belum kamu bikin di Supabase.
  const { data: todos } = await supabase.from('todos').select()

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {/* 1. Header / Navbar Mini */}
      <header className="container mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-800">
        <div className="text-2xl font-bold tracking-wider text-indigo-400">
          Winning<span className="text-white">Ads</span>
        </div>
        <nav className="space-x-6 hidden md:block text-sm text-slate-400">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#todos-section" className="hover:text-white transition">Database Test</a>
        </nav>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold px-4 py-2 rounded-lg transition">
          Dashboard
        </button>
      </header>

      {/* 2. Hero Section */}
      <main className="container mx-auto px-6 py-20 text-center max-w-4xl">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Bikin Iklan Konversi Tinggi, Nggak Pake Ribet.
        </h1>
        <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
          Pantau, optimasi, dan menangkan kompetisi pasar digital. Integrasi data marketplace dan performa ads langsung dalam satu dashboard terpusat.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button className="bg-indigo-600 hover:bg-indigo-500 font-medium px-8 py-4 rounded-xl shadow-lg shadow-indigo-600/30 transition">
            Mulai Sekarang (Gratis)
          </button>
          <button className="border border-slate-700 hover:bg-slate-800 font-medium px-8 py-4 rounded-xl transition">
            Pelajari Fitur
          </button>
        </div>
      </main>

      {/* 3. Real-time Data dari Supabase (Pindahan kode bawaanmu) */}
      <section id="todos-section" className="bg-slate-950 py-12 border-t border-b border-slate-800">
        <div className="container mx-auto px-6 max-w-md bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-400 mb-4">
            📡 Data Real-time Supabase
          </h3>
          
          {/* Menguji apakah koneksi berhasil memunculkan data */}
          {todos && todos.length > 0 ? (
            <ul className="text-left space-y-2">
              {todos.map((todo) => (
                <li key={todo.id} className="bg-slate-800 px-4 py-2 rounded-lg text-sm border border-slate-700">
                  ✅ {todo.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              Koneksi aman, tapi belum ada data di tabel &apos;todos&apos; kamu.
            </p>
          )}
        </div>
      </section>

      {/* 4. Feature Highlight Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Kenapa Memilih WinningAds?</h2>
            <p className="text-slate-400">Arsitektur sistem yang didesain khusus untuk efisiensi tim marketing dan akselerasi data.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
              <div className="text-indigo-400 text-3xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-2">Data Terpusat</h3>
              <p className="text-slate-400 text-sm">Satukan metrik performa Meta Ads dan marketplace tanpa perlu buka banyak tab.</p>
            </div>
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
              <div className="text-purple-400 text-3xl mb-4">⚡</div>
              <h3 className="text-xl font-bold mb-2">SOP Otomatis</h3>
              <p className="text-slate-400 text-sm">Sistem framework monitoring terstruktur agar jalannya tim tetap terarah dan terukur.</p>
            </div>
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
              <div className="text-pink-400 text-3xl mb-4">🗄️</div>
              <h3 className="text-xl font-bold mb-2">Supabase Sync</h3>
              <p className="text-slate-400 text-sm">Penyimpanan database data leads aman, super cepat, dan real-time tanpa delay.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}