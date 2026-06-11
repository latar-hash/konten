import Link from 'next/link'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/projects', label: 'Projects', icon: '📁' },
  { href: '/adops', label: 'Ad Ops', icon: '📈' },
  { href: '/contents', label: 'Contents', icon: '🎬' },
  { href: '/contents/new', label: '+ New Content', icon: '✍️' },
  { href: '/uploads', label: 'Upload CSV', icon: '⬆️' },
  { href: '/uploads/mapping', label: '↳ Ad Mapping', icon: '🔗' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex">
      <aside className="w-60 shrink-0 border-r border-slate-800 bg-slate-950 p-6 flex flex-col">
        <Link href="/" className="text-xl font-bold tracking-wider text-indigo-400 mb-8">
          Winning<span className="text-white">Ads</span>
        </Link>
        <nav className="space-y-1 flex-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <Link
          href="/"
          className="text-xs text-slate-500 hover:text-slate-300 transition mt-4"
        >
          ← Back to home
        </Link>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
