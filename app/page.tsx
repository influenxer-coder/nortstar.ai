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
            <div className="flex items-center gap-3">
              <Link
                href="/auth/signin"
                className="text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/auth/login"
                className="bg-white text-[#0a0a0a] text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#0e7c7b] hover:text-white transition-colors"
              >
                Request access →
              </Link>
            </div>
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
            <h1 className="text-4xl md:text-8xl font-bold text-white leading-tight tracking-tight">
              Every product deserves to get 1% better.
              <br />
              Every week.
            </h1>
            <p className="mt-6 text-base md:text-lg text-white/60 tracking-tight">
              Autonomous agent that reads your analytics, forms hypotheses, ships code changes, and closes the loop to revenue — without a meeting.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/login"
                className="inline-block bg-[#0e7c7b] text-white font-medium text-base px-8 py-4 rounded-xl hover:bg-[#0a6b6a] transition-colors"
              >
                Run NorthStar on my product →
              </Link>
              <a
                href="#how-it-works"
                className="inline-block text-sm text-white/70 hover:text-white transition-colors underline-offset-4 hover:underline"
              >
                See how it works ↓
              </a>
            </div>
            <p className="mt-3 text-xs text-white/40">
              We&apos;ll reach out within 24 hours with a hypothesis already formed on your highest-traffic surface.
            </p>
            <div className="mt-10 space-y-3">
              <p className="text-xs text-white/40 text-center">
                Tested by PMs at Meta · Snap · Google · Apple
              </p>
              <p className="text-sm text-white/50 text-center italic">
                &quot;It had already formed three hypotheses by the time I opened Slack.&quot;
              </p>
              <p className="text-xs text-white/30 text-center">— Head of Product, Series C SaaS</p>
            </div>

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
        <section id="how-it-works" className="py-24 border-t border-white/5">
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

        {/* ── REVENUE ATTRIBUTION ─────────────────────────── */}
        <section className="py-24 border-t border-white/5">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-6">
              Every change ships with a revenue number.
            </h2>
            <p className="text-sm md:text-base text-white/60 leading-relaxed mb-4">
              Amplitude shows you the drop-off. Productboard helps you prioritize it. NorthStar fixes it, ships it, and tells you what it was worth — before your next standup.
            </p>
            <p className="text-sm md:text-base text-white/60 leading-relaxed mb-8">
              Most teams can&apos;t answer &quot;what did that feature change deliver?&quot; NorthStar closes that loop automatically. Every hypothesis that ships comes back with attribution attached.
            </p>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 inline-flex items-center justify-between gap-4 text-sm text-white">
              <span className="font-medium">Loop closed in 14 days · $340K ARR attributed</span>
            </div>
          </div>
        </section>

        {/* ── ICP / WHO IT'S FOR ──────────────────────────── */}
        <section className="py-24 border-t border-white/5">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-6">
              Built for VP/Head of Product at Series B–D SaaS companies who are being asked to ship more without adding headcount.
            </h2>
            <ul className="space-y-3 text-sm text-white/60">
              <li>• You have a surface with real traffic and a clear conversion metric</li>
              <li>• Your current improvement cycle takes 6–12 weeks</li>
              <li>• You&apos;re measured on revenue impact, not tickets closed</li>
              <li>• You&apos;re about to hire a PM — or just did</li>
            </ul>
          </div>
        </section>

        {/* ── ZERO MEETINGS CALLOUT ───────────────────────── */}
        <section className="py-16 border-t border-white/5">
          <div className="max-w-3xl mx-auto px-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-6 text-center">
              <p className="text-sm md:text-base text-white/70 leading-relaxed">
                No roadmap meetings. No prioritization debates. No spec reviews.
                <br />
                NorthStar reads the data, makes the call, and ships — while you focus on what only humans can do.
              </p>
            </div>
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
                Run NorthStar on my product →
              </button>
            </form>
            <p className="mt-4 text-xs text-white/20 text-center">No pitch. No credit card.</p>
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────────── */}
        <footer className="py-8 border-t border-white/5">
          <div className="max-w-5xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
            <span className="text-sm font-medium text-white/30">
              NorthStar · Autonomous product improvement · Built in San Francisco
            </span>
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
