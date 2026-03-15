import Link from 'next/link'

export const metadata = {
  title: 'Agent NorthStar',
  description: 'Software that gives a damn about your users.',
}

export default function LandingPage() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: "document.documentElement.style.scrollBehavior='smooth'",
        }}
      />
      <div
        className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden"
        style={{
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* ── NAV ─────────────────────────────────────────── */}
        <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-white/[0.08] bg-[#0a0a0a]/90 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-6 h-full flex items-center justify-between">
            <span className="font-medium text-sm text-white tracking-tight">Agent NorthStar</span>
            <Link
              href="/auth/login"
              className="bg-white text-[#0a0a0a] text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#0e7c7b] hover:text-white transition-colors"
            >
              Request access →
            </Link>
          </div>
        </nav>

        {/* ── HERO ─────────────────────────────────────────── */}
        <section
          className="min-h-screen flex items-center justify-center relative pt-14"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
          }}
        >
          <div className="relative z-10 text-center max-w-3xl mx-auto px-6 w-full">
            <p className="text-xs tracking-widest uppercase text-[#0e7c7b] font-medium mb-8">
              Private beta
            </p>
            <h1 className="text-4xl md:text-8xl font-bold text-white leading-none tracking-tight">
              Products are broken.
            </h1>
            <p className="text-4xl md:text-8xl font-bold text-[#0e7c7b] leading-none tracking-tight mt-2 mb-6">
              Agent NorthStar fixes them.
            </p>
            <p className="text-base text-white/40 tracking-wide font-mono mb-10">
              Data → Hypothesis → Spec → Cursor builds → Revenue attributed.
            </p>
            <Link
              href="/auth/login"
              className="inline-block bg-[#0e7c7b] text-white font-medium text-base px-8 py-4 rounded-xl hover:bg-[#0a6b6a] transition-colors"
            >
              Request access →
            </Link>
            <p className="text-xs text-white/30 text-center mt-4">
              Tested by PMs at Meta, Snap, Google.
            </p>

            {/* Product visual — hidden on mobile, visible sm+ */}
            <div className="hidden sm:block max-w-2xl mx-auto mt-20 mb-0 bg-[#111111] rounded-2xl border border-white/[0.08] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>
                <span className="text-xs text-white/20 font-mono">agent-northstar · running</span>
              </div>
              <div className="px-6 py-4 space-y-0">
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#0e7c7b] animate-pulse" />
                    <span className="text-sm font-mono text-white/60">posthog.funnels</span>
                  </div>
                  <span className="text-xs text-[#0e7c7b] bg-[#0e7c7b]/10 px-2 py-1 rounded">
                    67% drop-off detected
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#0e7c7b] animate-pulse" />
                    <span className="text-sm font-mono text-white/60">hypothesis.ranked</span>
                  </div>
                  <span className="text-xs text-white/40">#1 confidence: 0.84</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span className="text-sm font-mono text-white/60">spec.generated</span>
                  </div>
                  <span className="text-xs text-white/40">→ cursor ready</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#0e7c7b]" />
                    <span className="text-sm font-mono text-white/60">pr.merged</span>
                  </div>
                  <span className="text-xs text-white/40">10% rollout active</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#0e7c7b]" />
                    <span className="text-sm font-mono text-white/60">ledger.closed</span>
                  </div>
                  <span className="text-sm font-semibold text-white">$340K ARR attributed</span>
                </div>
              </div>
              <div className="px-6 py-4 bg-white/[0.02] font-mono text-xs text-white/20">
                loop closed in 14 days · next hypothesis queued
              </div>
            </div>
          </div>
        </section>

        {/* ── THREE STATS ─────────────────────────────────── */}
        <section className="py-24 border-t border-white/5">
          <div className="max-w-3xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-white">48h</p>
              <p className="text-sm text-white/40 mt-2">first spec to merged PR</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-white">0</p>
              <p className="text-sm text-white/40 mt-2">meetings required</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-[#0e7c7b]">$30K</p>
              <p className="text-sm text-white/40 mt-2">vs $180K to hire the PM</p>
            </div>
          </div>
        </section>

        {/* ── ONE QUOTE ────────────────────────────────────── */}
        <section className="py-24 border-t border-white/5">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <p className="text-2xl font-light text-white/70 leading-relaxed italic mb-6">
              This is what a great L4 PM does. Except it&apos;s already done it by the time I arrive in the morning.
            </p>
            <p className="text-sm text-white/30">— Senior PM, currently in beta</p>
          </div>
        </section>

        {/* ── CTA BLOCK ─────────────────────────────────────── */}
        <section className="py-32 border-t border-white/5 text-center">
          <div className="max-w-xl mx-auto px-6">
            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
              Software that gives a damn about your users.
            </h2>
            <p className="text-lg text-white/40 mb-10">When everyone else is in a meeting.</p>
            <form
              action="/auth/login"
              method="get"
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <input
                type="text"
                name="metric"
                placeholder="What's broken that nobody has had time to fix?"
                className="bg-white/5 border border-white/10 text-white placeholder:text-white/20 px-5 py-4 rounded-xl text-sm focus:outline-none focus:border-[#0e7c7b] flex-1"
              />
              <button
                type="submit"
                className="bg-[#0e7c7b] text-white text-sm font-medium px-6 py-4 rounded-xl hover:bg-[#0a6b6a] transition-colors whitespace-nowrap"
              >
                Request access →
              </button>
            </form>
            <p className="mt-4 text-xs text-white/20 text-center">No pitch. No credit card.</p>
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────────── */}
        <footer className="py-8 border-t border-white/5">
          <div className="max-w-5xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
            <span className="text-sm font-medium text-white/30">Agent NorthStar</span>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-white/20 hover:text-white/40 transition-colors">
                Privacy
              </a>
              <a href="#" className="text-sm text-white/20 hover:text-white/40 transition-colors">
                Terms
              </a>
              <a href="#" className="text-sm text-white/20 hover:text-white/40 transition-colors">
                Security
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
