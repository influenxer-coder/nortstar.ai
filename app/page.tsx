import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import HeroHeadline from '@/components/HeroHeadline'

const DIVIDER = 'border-t border-[#1a1a1a]'

const STEPS = [
  {
    n: '01',
    title: 'Connect',
    body: 'Point NorthStar at any public URL. Connect your GitHub repo in one OAuth click.',
  },
  {
    n: '02',
    title: 'Select',
    body: 'NorthStar crawls your page and maps every interactive element. You pick the one thing to improve.',
  },
  {
    n: '03',
    title: 'Run',
    body: 'The agent reads behavior signals, forms a hypothesis, ships a code change to 10% of traffic, and measures the outcome — all within 48 hours.',
  },
  {
    n: '04',
    title: 'Compound',
    body: 'Every cycle makes the next hypothesis smarter. The feature gets 1% better every week. Compounding continuously.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-50 overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1a1a1a] bg-[#0A0A0A]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Logo size={28} wordmark color="white" className="shrink-0" />
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-500">
            <a href="#problem" className="hover:text-zinc-100 transition-colors">The problem</a>
            <a href="#how-it-works" className="hover:text-zinc-100 transition-colors">How it works</a>
            <a href="#who-its-for" className="hover:text-zinc-100 transition-colors">Who it&apos;s for</a>
            <a href="#pilot" className="hover:text-zinc-100 transition-colors">Pilot</a>
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

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="pt-36 pb-32 px-6 relative">
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[280px] bg-[#7C3AED]/12 rounded-full blur-[120px]" />
          <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px] bg-[#7C3AED]/18 rounded-full blur-[80px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <p className="inline-flex items-center gap-2 text-[#7C3AED] text-[11px] font-mono uppercase tracking-[0.18em] mb-7">
            <span className="inline-block w-3 h-px bg-[#7C3AED]" />
            Autonomous Feature Improvement
            <span className="inline-block w-3 h-px bg-[#7C3AED]" />
          </p>

          <div className="mb-7">
            <HeroHeadline />
          </div>

          <p className="text-zinc-400 text-lg max-w-[540px] mx-auto mb-10 leading-relaxed">
            NorthStar embeds an autonomous agent on your highest-traffic features. It reads user
            signals, forms hypotheses, ships code changes, and measures outcomes — continuously,
            without a PM.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth/login">
              <Button
                size="lg"
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-11 px-7 text-sm font-medium rounded-lg"
              >
                Request Early Access →
              </Button>
            </Link>
            <a
              href="#how-it-works"
              className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
            >
              See how it works ↓
            </a>
          </div>

          <p className="mt-8 text-xs text-zinc-600 tracking-wide">
            Closed pilot &middot; 5 spots remaining &middot; No credit card required
          </p>
        </div>
      </section>

      <div className={DIVIDER} />

      {/* ── PROBLEM ──────────────────────────────────────── */}
      <section id="problem" className="py-28 px-6">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-zinc-100 mb-6">
            Your best features are frozen.
          </h2>
          <p className="text-zinc-500 text-base leading-relaxed">
            Your checkout flow has 2M visitors a month. It hasn&apos;t meaningfully changed in 6
            months. Not because your team doesn&apos;t care — because every improvement takes 8
            weeks of PM, design, and engineering cycles. Meanwhile your competitors compound.
          </p>
        </div>

        <div className="max-w-3xl mx-auto grid sm:grid-cols-3 gap-px bg-[#1a1a1a] border border-[#1a1a1a] rounded-xl overflow-hidden">
          <div className="bg-[#0A0A0A] p-8 text-center">
            <div className="text-4xl font-bold tracking-tight text-zinc-100 mb-2">8 weeks</div>
            <p className="text-xs text-zinc-600 leading-snug">avg improvement cycle today</p>
          </div>
          <div className="bg-[#0A0A0A] p-8 text-center">
            <div className="text-4xl font-bold tracking-tight text-zinc-100 mb-2">3 features</div>
            <p className="text-xs text-zinc-600 leading-snug">shipped per quarter without NorthStar</p>
          </div>
          <div className="bg-[#0A0A0A] p-8 text-center">
            <div className="text-4xl font-bold tracking-tight text-[#7C3AED] mb-2">1%</div>
            <p className="text-xs text-zinc-600 leading-snug">weekly compounding improvement with NorthStar</p>
          </div>
        </div>
      </section>

      <div className={DIVIDER} />

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section id="how-it-works" className="py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-14">
            <p className="text-[#7C3AED] text-[11px] font-mono uppercase tracking-[0.18em] mb-3">
              The Loop
            </p>
            <h2 className="text-zinc-100">
              Four steps. Runs forever.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-px bg-[#1a1a1a] border border-[#1a1a1a] rounded-xl overflow-hidden">
            {STEPS.map(({ n, title, body }) => (
              <div
                key={n}
                className="bg-[#0A0A0A] p-8 group hover:bg-[#0d0b12] transition-colors duration-200"
              >
                <span className="text-xs font-mono text-zinc-700 group-hover:text-[#7C3AED] transition-colors">
                  {n}
                </span>
                <h3 className="text-base font-semibold text-zinc-100 mt-3 mb-2">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-zinc-700 mt-8 font-mono tracking-wide">
            Cycle time: hours. Not months.
          </p>
        </div>
      </section>

      <div className={DIVIDER} />

      {/* ── THE MATH ─────────────────────────────────────── */}
      <section className="py-32 px-6">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-zinc-100 mb-20">
            Small improvements.<br />Massive revenue impact.
          </h2>

          <div className="space-y-8 mb-12">
            <div>
              <div
                className="font-bold tracking-tight text-[#7C3AED] leading-none"
                style={{ fontSize: 'clamp(80px, 14vw, 120px)' }}
              >
                2%
              </div>
              <p className="text-zinc-600 text-sm mt-3">conversion improvement</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-10 bg-[#1a1a1a]" />
              <span className="text-zinc-700 text-sm font-mono">↓</span>
              <div className="h-px w-10 bg-[#1a1a1a]" />
            </div>
            <div>
              <div
                className="font-bold tracking-tight text-zinc-100 leading-none"
                style={{ fontSize: 'clamp(80px, 14vw, 120px)' }}
              >
                $10M
              </div>
              <p className="text-zinc-600 text-sm mt-3">on a $500M revenue surface</p>
            </div>
          </div>

          <p className="text-zinc-500 text-sm max-w-[400px] mx-auto leading-relaxed">
            NorthStar runs that experiment automatically every 48 hours. Every week the number gets
            bigger. That&apos;s the compounding advantage.
          </p>
        </div>
      </section>

      <div className={DIVIDER} />

      {/* ── WHO IT'S FOR ─────────────────────────────────── */}
      <section id="who-its-for" className="py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-zinc-100 text-center mb-16">
            Built for companies with high-traffic surfaces
            <br className="hidden sm:block" /> and slow improvement cycles.
          </h2>

          <div className="grid md:grid-cols-2 gap-16 md:gap-24">
            <div>
              <p className="text-[11px] font-mono text-zinc-600 uppercase tracking-[0.18em] mb-6">
                Right fit
              </p>
              <ul className="space-y-4">
                {[
                  '500K+ monthly visitors on a key surface',
                  'Improvements currently take 6–12 weeks',
                  'Clear conversion or engagement metric to optimize',
                  'Public-facing pages (landing, pricing, signup, checkout)',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-zinc-400">
                    <span className="text-emerald-500 shrink-0 mt-0.5 font-mono">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-mono text-zinc-600 uppercase tracking-[0.18em] mb-6">
                What you get
              </p>
              <ul className="space-y-4">
                {[
                  'Autonomous agent per feature',
                  'Hypothesis formulated from real user signals',
                  'Code changes shipped via your existing GitHub + CI/CD',
                  'Results reported to Slack within 48 hours',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-zinc-400">
                    <span className="text-[#7C3AED] shrink-0 mt-0.5 font-mono">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className={DIVIDER} />

      {/* ── PILOT CTA ────────────────────────────────────── */}
      <section id="pilot" className="py-28 px-6">
        <div className="max-w-md mx-auto">
          <div
            className="rounded-2xl border border-[#7C3AED]/15 bg-[#0d0b12] p-10 md:p-12 text-center"
            style={{
              boxShadow:
                '0 0 0 1px rgba(124,58,237,0.08), 0 0 60px -10px rgba(124,58,237,0.25)',
            }}
          >
            <p className="text-[#7C3AED] text-[11px] font-mono uppercase tracking-[0.18em] mb-5">
              Closed Pilot
            </p>
            <h2 className="text-zinc-100 mb-5">
              We&apos;re running a closed pilot with 5 companies.
            </h2>
            <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
              You bring a real surface with real traffic. We prove the loop closes — signal in,
              hypothesis formed, change shipped, metric moves. That&apos;s the demo.
            </p>
            <Link href="/auth/login">
              <Button
                size="lg"
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-11 px-8 text-sm font-medium w-full sm:w-auto rounded-lg"
              >
                Request Early Access →
              </Button>
            </Link>
            <p className="mt-5 text-xs text-zinc-600">
              We&apos;ll reach out within 48 hours. No pitch. Just the product.
            </p>
          </div>
        </div>
      </section>

      <div className={DIVIDER} />

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-zinc-500">
            <Logo size={18} className="shrink-0" />
            <span className="text-sm font-medium tracking-wide">NorthStar</span>
          </div>
          <p className="text-xs text-zinc-600 text-center md:text-left max-w-sm leading-relaxed">
            Built by a PM who spent a decade at Snap, Meta, Apple, and Google. This is the tool
            that should have existed the whole time.
          </p>
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
