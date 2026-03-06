import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { RISING_PRODUCTS } from '@/lib/rising-products-data'

const VERTICAL_COLORS: Record<string, string> = {
  'B2B SaaS': 'border-l-[#3B82F6]',   // blue
  'HR / Ops': 'border-l-emerald-500',  // green
  'Fintech': 'border-l-amber-500',      // orange
}

export default function RisingProductsPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-50 overflow-x-hidden">
      {/* Nav — matches home */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1a1a1a] bg-[#0A0A0A]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="shrink-0">
            <Logo size={28} wordmark color="white" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-500">
            <Link href="/#problem" className="hover:text-zinc-100 transition-colors">The problem</Link>
            <Link href="/#how-it-works" className="hover:text-zinc-100 transition-colors">How it works</Link>
            <Link href="/#who-its-for" className="hover:text-zinc-100 transition-colors">Who it&apos;s for</Link>
            <Link href="/#pilot" className="hover:text-zinc-100 transition-colors">Pilot</Link>
            <Link href="/rising-products" className="text-[#7C3AED] hover:text-violet-400 transition-colors font-medium">
              Rising Products
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-100 text-sm">
                Log in
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="sm" className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm px-4">
                Request Trial →
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="mb-10">
            <p className="text-[#7C3AED] text-[11px] font-mono uppercase tracking-[0.18em] mb-2">
              Live
            </p>
            <h1 className="text-zinc-100 text-2xl md:text-3xl font-semibold tracking-tight">
              Rising Products
            </h1>
            <p className="text-zinc-500 text-sm mt-2 max-w-xl">
              Target prospects — Series B/C B2B SaaS, HR/Ops, Fintech. Bay Area, US. Growth Engineer, Sr. Engineer, Growth PM.
            </p>
            <div className="flex flex-wrap gap-4 mt-4 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> B2B SaaS</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> HR / Ops</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Fintech</span>
            </div>
          </div>

          <div className="border border-[#1a1a1a] rounded-xl overflow-hidden bg-[#0A0A0A]">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-[#0d0d0d] border-b border-[#1a1a1a]">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest w-8 shrink-0">#</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[120px]">Company</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[100px]">Website</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[90px]">Vertical</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[90px]">Stage</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[140px]">Key investors</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[220px]">What they do</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[180px]">Key metric to optimize</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[160px]">Target contact</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[90px]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {RISING_PRODUCTS.map((row, i) => (
                    <tr
                      key={`${row.company}-${i}`}
                      className={`border-b border-[#1a1a1a]/80 last:border-0 hover:bg-[#0d0d0d]/60 transition-colors border-l-4 ${VERTICAL_COLORS[row.vertical] ?? 'border-l-transparent'}`}
                    >
                      <td className="px-4 py-3 text-xs text-zinc-600 font-mono">{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-100">{row.company}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://${row.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#7C3AED] hover:text-violet-400 font-mono"
                        >
                          {row.website}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{row.vertical}</td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{row.stage}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{row.investors}</td>
                      <td className="px-4 py-3 text-xs text-zinc-400 leading-snug max-w-[220px]">{row.whatTheyDo}</td>
                      <td className="px-4 py-3 text-xs text-zinc-400 leading-snug max-w-[180px]">{row.keyMetric}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{row.targetContact}</td>
                      <td className="px-4 py-3 text-xs text-zinc-600">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-6 text-xs text-zinc-600">
            Want your company here?{' '}
            <Link href="/auth/login" className="text-[#7C3AED] hover:text-violet-400 transition-colors">
              Request Early Access →
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
