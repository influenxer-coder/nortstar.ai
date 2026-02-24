import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import HeroHeadline from '@/components/HeroHeadline'

const DIVIDER = 'border-t border-[#1a1a1a]'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-50 overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1a1a1a] bg-[#0A0A0A]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={28} className="shrink-0" />
            <span className="font-semibold tracking-tight">NorthStar</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#problem" className="hover:text-zinc-100 transition-colors">The problem</a>
            <a href="#how-it-works" className="hover:text-zinc-100 transition-colors">How it works</a>
            <a href="#who-its-for" className="hover:text-zinc-100 transition-colors">Who it&apos;s for</a>
            <a href="#pilot" className="hover:text-zinc-100 transition-colors">Pilot</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
                Log in
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="sm" className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-4 py-2 rounded-md">
                Request Trial →
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* SECTION 1: HERO */}
      <section className="pt-32 pb-28 px-6 relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#7C3AED]/20 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative">
          <p className="text-[#7C3AED] text-xs font-medium uppercase tracking-widest mb-6">
            AUTONOMOUS FEATURE IMPROVEMENT
          </p>
          <div className="mb-8">
            <HeroHeadline />
          </div>
          <p className="text-zinc-400 text-lg max-w-[600px] mx-auto mb-10 leading-relaxed">
            NorthStar embeds an autonomous agent on your highest-traffic features. It reads user signals, forms hypotheses, ships code changes, and measures outcomes — continuously, without a PM.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/login">
              <Button size="lg" className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-12 px-8 text-base">
                Request Early Access →
              </Button>
            </Link>
            <a href="#how-it-works" className="text-zinc-500 hover:text-zinc-400 text-sm transition-colors">
              See how it works ↓
            </a>
          </div>
          <p className="mt-8 text-sm text-zinc-500">
            Closed pilot. 5 spots remaining. No credit card required.
          </p>
        </div>
      </section>

      <div className={DIVIDER} />

      {/* SECTION 2: THE PROBLEM */}
      <section id="problem" className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-zinc-100 mb-8">
            Your best features are frozen.
          </h2>
          <p className="text-zinc-400 text-base md:text-lg max-w-[580px] mx-auto leading-relaxed mb-16">
            Your checkout flow has 2M visitors a month. It hasn&apos;t meaningfully changed in 6 months. Not because your team doesn&apos;t care — because every improvement takes 8 weeks of PM, design, and engineering cycles. Meanwhile your competitors compound.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="rounded-xl border border-[#1a1a1a] bg-[#0A0A0A] p-6 text-center">
              <div className="font-display text-2xl font-bold text-zinc-100">8 weeks</div>
              <p className="text-sm text-zinc-500 mt-1">avg improvement cycle today</p>
            </div>
            <div className="rounded-xl border border-[#1a1a1a] bg-[#0A0A0A] p-6 text-center">
              <div className="font-display text-2xl font-bold text-zinc-100">3 features</div>
              <p className="text-sm text-zinc-500 mt-1">shipped per quarter without NorthStar</p>
            </div>
            <div className="rounded-xl border border-[#1a1a1a] bg-[#0A0A0A] p-6 text-center">
              <div className="font-display text-2xl font-bold text-[#7C3AED]">1%</div>
              <p className="text-sm text-zinc-500 mt-1">weekly compounding improvement with NorthStar</p>
            </div>
          </div>
        </div>
      </section>

      <div className={DIVIDER} />

      {/* SECTION 3: HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-[#7C3AED] text-xs font-medium uppercase tracking-widest mb-2">The loop</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-zinc-100 mb-16">
            Four steps. Runs forever.
          </h2>
          <div className="grid sm:grid-cols-2 gap-6 mb-12">
            <div className="rounded-xl border border-[#1a1a1a] bg-[#0A0A0A] p-6">
              <span className="text-xs font-mono text-zinc-500">01</span>
              <h3 className="font-display text-lg font-semibold text-zinc-100 mt-2 mb-3">Connect</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Point NorthStar at any public URL. Connect your GitHub repo in one OAuth click.
              </p>
            </div>
            <div className="rounded-xl border border-[#1a1a1a] bg-[#0A0A0A] p-6">
              <span className="text-xs font-mono text-zinc-500">02</span>
              <h3 className="font-display text-lg font-semibold text-zinc-100 mt-2 mb-3">Select</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                NorthStar crawls your page and maps every interactive element. You pick the one thing to improve.
              </p>
            </div>
            <div className="rounded-xl border border-[#1a1a1a] bg-[#0A0A0A] p-6">
              <span className="text-xs font-mono text-zinc-500">03</span>
              <h3 className="font-display text-lg font-semibold text-zinc-100 mt-2 mb-3">Run</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                The agent reads behavior signals, forms a hypothesis, ships a code change to 10% of traffic, and measures the outcome — all within 48 hours.
              </p>
            </div>
            <div className="rounded-xl border border-[#1a1a1a] bg-[#0A0A0A] p-6">
              <span className="text-xs font-mono text-zinc-500">04</span>
              <h3 className="font-display text-lg font-semibold text-zinc-100 mt-2 mb-3">Compound</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Every cycle makes the next hypothesis smarter. The feature gets 1% better every week. Compounding continuously.
              </p>
            </div>
          </div>
          <p className="text-center text-sm text-zinc-500">
            Cycle time: hours. Not months.
          </p>
        </div>
      </section>

      <div className={DIVIDER} />

      {/* SECTION 4: THE MATH */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-zinc-100 mb-16">
            Small improvements. Massive revenue impact.
          </h2>
          <div className="space-y-6 mb-8">
            <div>
              <div className="font-display text-5xl md:text-6xl font-bold text-[#7C3AED]">2%</div>
              <p className="text-zinc-500 mt-1">conversion improvement</p>
            </div>
            <div className="text-zinc-600">↓</div>
            <div>
              <div className="font-display text-5xl md:text-6xl font-bold text-zinc-100">$10M</div>
              <p className="text-zinc-500 mt-1">on a $500M revenue surface</p>
            </div>
          </div>
          <p className="text-zinc-400 text-sm max-w-[500px] mx-auto leading-relaxed">
            NorthStar runs that experiment automatically every 48 hours. Every week the number gets bigger. That&apos;s the compounding advantage.
          </p>
        </div>
      </section>

      <div className={DIVIDER} />

      {/* SECTION 5: WHO IT'S FOR */}
      <section id="who-its-for" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-zinc-100 text-center mb-16">
            Built for companies with high-traffic surfaces<br className="hidden sm:block" /> and slow improvement cycles.
          </h2>
          <div className="grid md:grid-cols-2 gap-12 md:gap-16">
            <div>
              <h3 className="font-display text-lg font-semibold text-zinc-200 mb-4">Right fit</h3>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  500K+ monthly visitors on a key surface
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Improvements currently take 6–12 weeks
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Clear conversion or engagement metric to optimize
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Public-facing pages (landing, pricing, signup, checkout)
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-zinc-200 mb-4">What you get</h3>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="text-[#7C3AED] mt-0.5">→</span>
                  Autonomous agent per feature
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#7C3AED] mt-0.5">→</span>
                  Hypothesis formulated from real user signals
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#7C3AED] mt-0.5">→</span>
                  Code changes shipped via your existing GitHub + CI/CD
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#7C3AED] mt-0.5">→</span>
                  Results reported to Slack within 48 hours
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className={DIVIDER} />

      {/* SECTION 6: CTA / PILOT */}
      <section id="pilot" className="py-24 px-6">
        <div className="max-w-xl mx-auto">
          <div className="rounded-2xl border border-[#7C3AED]/30 bg-[#0A0A0A] p-8 md:p-10 text-center shadow-[0_0_60px_-12px_rgba(124,58,237,0.25)]">
            <p className="text-[#7C3AED] text-xs font-medium uppercase tracking-widest mb-4">Closed pilot</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-zinc-100 mb-6 leading-tight">
              We&apos;re running a closed pilot<br /> with 5 companies.
            </h2>
            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
              You bring a real surface with real traffic. We prove the loop closes — signal in, hypothesis formed, change shipped, metric moves. That&apos;s the demo.
            </p>
            <Link href="/auth/login">
              <Button size="lg" className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-12 px-8 text-base w-full sm:w-auto">
                Request Early Access →
              </Button>
            </Link>
            <p className="mt-6 text-xs text-zinc-500">
              We&apos;ll reach out within 48 hours.<br /> No pitch. Just the product.
            </p>
          </div>
        </div>
      </section>

      <div className={DIVIDER} />

      {/* SECTION 7: FOOTER */}
      <footer className="py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Logo size={20} className="shrink-0" />
            <span className="font-semibold text-zinc-400">NorthStar</span>
          </div>
          <p className="text-xs text-zinc-500 text-center md:text-left max-w-md">
            Built by a PM who spent a decade at Snap, Meta, Apple, and Google. This is the tool that should have existed the whole time.
          </p>
          <div className="flex items-center gap-6 text-xs text-zinc-500">
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
