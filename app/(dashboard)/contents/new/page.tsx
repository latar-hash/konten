import Link from 'next/link'
import { createClient } from '@/app/utils/supabase/server'
import { cookies } from 'next/headers'
import { createContent } from '@/app/lib/actions'

const FIELD =
  'w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500'
const LABEL = 'block text-xs uppercase tracking-wider text-slate-400 mb-1'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: products } = await supabase.from('products').select('id,name,code').eq('is_active', true).order('name')

  return (
    <div className="max-w-2xl">
      <Link href="/contents" className="text-xs text-slate-500 hover:text-indigo-400 transition">
        ← Back to contents
      </Link>
      <h1 className="text-3xl font-extrabold mt-2 mb-1">New Content</h1>
      <p className="text-sm text-slate-400 mb-8">Bikin konten baru.</p>

      <form action={createContent} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <label className={LABEL}>Brand *</label>
          <select name="product_id" required className={FIELD} defaultValue="">
            <option value="" disabled>— pilih brand —</option>
            {(products ?? []).map((p: { id: string; name: string; code: string }) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Skrip Konten *</label>
          <input name="skrip_konten" required className={FIELD} placeholder="judul/identifier skrip" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Tanggal *</label>
            <input type="date" name="tanggal" required className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Format *</label>
            <input name="format" required className={FIELD} placeholder="6:19, LP, ..." />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Script Writer</label>
            <input name="script_writer" className={FIELD} placeholder="WAHYU" />
          </div>
          <div>
            <label className={LABEL}>PIC Name</label>
            <input name="pic_name" className={FIELD} placeholder="OM KRIS" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>PIC Talent</label>
            <select name="pic_talent" className={FIELD} defaultValue="Non Talent">
              <option value="Non Talent">Non Talent</option>
              <option value="Talent">Talent</option>
              <option value="LAINNYA">LAINNYA</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Type Market</label>
            <select name="type_market" className={FIELD} defaultValue="">
              <option value="">—</option>
              <option value="Cold">Cold</option>
              <option value="Warm">Warm</option>
              <option value="Hot">Hot</option>
            </select>
          </div>
        </div>

        <div>
          <label className={LABEL}>Progress</label>
          <select name="progress" className={FIELD} defaultValue="Backlog">
            <option value="Backlog">Backlog</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            Simpan
          </button>
          <Link
            href="/contents"
            className="bg-slate-800 hover:bg-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            Batal
          </Link>
        </div>
      </form>
    </div>
  )
}
