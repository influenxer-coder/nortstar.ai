'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'

const DIVIDER = 'border-t border-[#1a1a1a]'

/* ─── NorthStar spec card (terminal / Claude Code–ready) ─── */
function SpecCard() {
  return (
    <div
      className="rounded-xl border border-zinc-700/80 overflow-hidden font-mono text-sm max-w-2xl"
      style={{ background: '#0F172A' }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-700/80 bg-zinc-900/50">
        <span className="text-zinc-500">NORTHSTAR SPEC #NS-0047</span>
        <button
          type="button"
          className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Copy spec"
        >
          <Copy className="w-3.5 h-3.5" /> Copy Spec
        </button>
      </div>
      <div className="p-4 space-y-3 text-left">
        <div>
          <span className="text-zinc-500 block mb-0.5">Hypothesis:</span>
          <span className="text-[#22C55E]">Guided first-action prompt reduces session-1 drop-off</span>
        </div>
        <div>
          <span className="text-zinc-500 block mb-1">Evidence:</span>
          <ul className="text-zinc-400 space-y-0.5 text-xs">
            <li>• 67% drop-off at onboarding step 3</li>
            <li>• 4x retention for users who pass this step (PostHog cohort)</li>
            <li>• 23 support tickets, same theme</li>
            <li>• 4 sales losses citing friction</li>
          </ul>
        </div>
        <div>
          <span className="text-zinc-500 block mb-0.5">Success Metric:</span>
          <span className="text-[#22C55E]">Session-1 step-3 completion &gt; 60%</span>
        </div>
        <div>
          <span className="text-zinc-500 block mb-0.5">Test Design:</span>
          <span className="text-zinc-400">10% rollout, 14-day measurement · Holdout group: 10%</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-zinc-500">Effort: <span className="text-[#22C55E]">S (1–3 days)</span></span>
          <span className="text-[10px] text-[#22C55E] font-medium">Ready for Claude Code ✓</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Stat card with scroll-triggered animation ─── */
function StatCard({
  value,
  label,
  delay = 0,
}: {
  value: string
  label: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      className="flex-1 text-center px-6 py-8"
    >
      <div className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-100 mb-2 leading-none">
        {value}
      </div>
      <p className="text-xs text-zinc-500 leading-snug max-w-[140px] mx-auto">{label}</p>
    </motion.div>
  )
}

export default function CaseStudiesPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-50 overflow-x-hidden">

      {/* ── NAV ──────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1a1a1a] bg-[#0A0A0A]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <Logo size={28} wordmark color="white" className="shrink-0" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-500">
            <Link href="/" className="hover:text-zinc-100 transition-colors">Home</Link>
            <Link href="/#how-it-works" className="hover:text-zinc-100 transition-colors">How it works</Link>
            <Link
              href="/case-studies"
              className="text-zinc-100 font-medium transition-colors"
            >
              Case Studies
            </Link>
            <Link href="/newsroom" className="hover:text-zinc-100 transition-colors">Newsroom</Link>
            <Link href="/rising-products" className="hover:text-zinc-100 transition-colors">
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

      {/* ── PAGE HERO ────────────────────────────────────── */}
      <section className="pt-36 pb-20 px-6 relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-[#7C3AED]/10 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative">
          <p className="inline-flex items-center gap-2 text-[#7C3AED] text-[11px] font-mono uppercase tracking-[0.18em] mb-6">
            <span className="inline-block w-3 h-px bg-[#7C3AED]" />
            Customer Stories
            <span className="inline-block w-3 h-px bg-[#7C3AED]" />
          </p>
          <h1 className="text-zinc-100 mb-5">
            Your data → hypothesis → spec → code → test → revenue proof.
          </h1>
          <p className="text-zinc-500 text-base leading-relaxed max-w-xl mx-auto">
            Real teams. Internal data. One loop. These are the stories of companies who connected the dots and closed it.
          </p>
        </div>
      </section>

      <div className={DIVIDER} />

      {/* ══════════════════════════════════════════════════
          CASE STUDY 01 — THE FULL LOOP (definitive)
      ══════════════════════════════════════════════════ */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto mb-10">
          <p className="text-[10px] font-mono text-[#7C3AED] uppercase tracking-[0.18em]">
            Case Study 01 · The Full Loop
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-16">
          {/* Stage 1 — Signal */}
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 mb-2">Stage 1 — Signal</h2>
            <p className="text-zinc-500 text-sm mb-6 max-w-2xl">
              NorthStar ingests four internal data sources. The hypothesis is scored from the convergence of all four.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-[#1a1a1a] bg-[#0d0b12] p-5">
                <span className="text-2xl mb-2 block" aria-hidden>📊</span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">User Analytics</span>
                <p className="text-sm text-zinc-300 mt-2">67% drop-off at step 3 of onboarding (PostHog)</p>
              </div>
              <div className="rounded-xl border border-[#1a1a1a] bg-[#0d0b12] p-5">
                <span className="text-2xl mb-2 block" aria-hidden>🚀</span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Past Launches</span>
                <p className="text-sm text-zinc-300 mt-2">Two prior onboarding attempts shipped — neither measured the right metric</p>
              </div>
              <div className="rounded-xl border border-[#1a1a1a] bg-[#0d0b12] p-5">
                <span className="text-2xl mb-2 block" aria-hidden>💬</span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Customer Feedback</span>
                <p className="text-sm text-zinc-300 mt-2">23 support tickets: &ldquo;I don&apos;t understand what to do first&rdquo;</p>
              </div>
              <div className="rounded-xl border border-[#1a1a1a] bg-[#0d0b12] p-5">
                <span className="text-2xl mb-2 block" aria-hidden>💰</span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Sales Data</span>
                <p className="text-sm text-zinc-300 mt-2">4 closed-lost deals cited &ldquo;hard to get started&rdquo; as reason</p>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              Confidence score: <span className="text-[#22C55E] font-mono font-semibold">0.84</span> (weighted combination of all four signals)
            </p>
          </div>

          {/* Stage 2 — Spec */}
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 mb-2">Stage 2 — Spec</h2>
            <p className="text-zinc-500 text-sm mb-6 max-w-2xl">
              NorthStar converts the top hypothesis into a Claude Code–ready product spec. PM hands it to engineering without rewriting anything.
            </p>
            <SpecCard />
          </div>
        </div>
      </section>

      <div className={DIVIDER} />

      {/* ══════════════════════════════════════════════════
          CASE STUDY 02 — THE PREDICTION STORY
      ══════════════════════════════════════════════════ */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto mb-10">
          <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.18em]">
            Case Study 02 · The Prediction Story
          </p>
        </div>
        <div
          className="max-w-3xl mx-auto rounded-2xl border border-[#7C3AED]/12 overflow-hidden mb-12"
          style={{
            background: 'linear-gradient(135deg, #0d0b12 0%, #0f0a1a 40%, #0a0a10 100%)',
            boxShadow: '0 0 0 1px rgba(124,58,237,0.07), 0 0 80px -20px rgba(124,58,237,0.2)',
          }}
        >
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#7C3AED]/30 to-transparent" />
          <div className="px-8 md:px-12 pt-10 pb-8">
            <div className="w-[72px] h-[72px] rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-4">
              <div className="w-8 h-8 rounded-md bg-zinc-700/50" />
            </div>
            <h2 className="text-zinc-100 leading-tight mb-3">
              Predict which feature will move a metric — before you build it.
            </h2>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-md">
              A PLG company used NorthStar to turn behavioral data and past launch history into a winning bet — and learned why two prior attempts had been inconclusive.
            </p>
          </div>
          <div className="border-t border-[#1a1a1a] grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#1a1a1a]">
            <StatCard value="34%" label="activation lift (session-1 completion)" delay={0} />
            <StatCard value="$340K" label="ARR attributed in the ledger" delay={0.1} />
            <StatCard value="3rd attempt" label="first with a clear success metric" delay={0.2} />
          </div>
        </div>
        <div className="max-w-3xl mx-auto space-y-0">
          <div className="py-10 border-b border-[#1a1a1a]">
            <p className="text-[10px] font-mono text-[#7C3AED] uppercase tracking-[0.18em] mb-4">Challenge</p>
            <h3 className="text-xl font-semibold text-zinc-100 mb-4 leading-snug">
              &ldquo;We&apos;d tried to fix this moment twice. Both times we shipped without a clear success metric.&rdquo;
            </h3>
            <p className="text-zinc-400 text-[15px] leading-relaxed max-w-2xl">
              NorthStar analyzed behavioral data and identified that users who completed a specific onboarding action in session 1 had 4x the 90-day retention rate of users who didn&apos;t. Past launch data showed the company had attempted to improve this moment twice before — both shipped without a clear success metric, both inconclusive. NorthStar surfaced why they were inconclusive: the wrong activation signal was being measured.
            </p>
          </div>
          <div className="py-10 border-b border-[#1a1a1a]">
            <p className="text-[10px] font-mono text-[#7C3AED] uppercase tracking-[0.18em] mb-4">Solution</p>
            <h3 className="text-xl font-semibold text-zinc-100 mb-4 leading-snug">
              &ldquo;Third attempt: NorthStar spec, Claude Code build, 10% rollout, NorthStar tracking.&rdquo;
            </h3>
            <p className="text-zinc-400 text-[15px] leading-relaxed max-w-2xl">
              The PM selected the top hypothesis from the Feature Hit List. NorthStar generated a structured spec with the correct success metric and test design. Engineering built it via Claude Code. The change shipped to 10% of users. NorthStar monitored the behavioral signal and tracked against predicted lift.
            </p>
          </div>
          <div className="py-10 border-b border-[#1a1a1a]">
            <p className="text-[10px] font-mono text-[#7C3AED] uppercase tracking-[0.18em] mb-4">Result</p>
            <h3 className="text-xl font-semibold text-zinc-100 mb-4 leading-snug">
              &ldquo;34% activation lift. $340K ARR impact attributed in the ledger.&rdquo;
            </h3>
            <p className="text-zinc-400 text-[15px] leading-relaxed max-w-2xl">
              When the test closed, NorthStar wrote the result to the attribution ledger: hypothesis → spec → code change → cohort behavior → revenue delta. The prediction wasn&apos;t about competitors — it was about predicting which feature would move the metric before building it, based on the company&apos;s own data.
            </p>
          </div>
        </div>
        <div className="max-w-3xl mx-auto mt-12">
          <div className="rounded-2xl border border-[#7C3AED]/15 bg-[#0d0b12] px-8 md:px-14 py-10 md:py-12 relative overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(124,58,237,0.07), 0 0 60px -15px rgba(124,58,237,0.18)' }}>
            <div className="absolute top-6 left-8 text-[#7C3AED]/10 font-serif leading-none select-none pointer-events-none" style={{ fontSize: '96px' }} aria-hidden>&ldquo;</div>
            <blockquote className="relative">
              <p className="text-zinc-100 text-lg md:text-xl font-medium leading-relaxed mb-6 max-w-xl">
                &ldquo;NorthStar didn&apos;t just tell us what to build. It told us why our last two tries failed — and then gave us a spec and a metric we could actually prove.&rdquo;
              </p>
              <footer className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] shrink-0" />
                <div>
                  <p className="text-sm font-medium text-zinc-300">VP of Product</p>
                  <p className="text-xs text-zinc-600">PLG SaaS · Series B</p>
                </div>
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      <div className={DIVIDER} />

      {/* ══════════════════════════════════════════════════
          CASE STUDY 03 — THE LEVERAGE STORY
      ══════════════════════════════════════════════════ */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto mb-10">
          <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.18em]">
            Case Study 03 · The Leverage Story
          </p>
        </div>
        <div className="max-w-3xl mx-auto rounded-2xl border border-[#1a1a1a] bg-[#0d0b12]/60 p-8 md:p-10 mb-12">
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">One Hit List, four data sources.</h2>
          <p className="text-zinc-500 text-sm mb-6 max-w-2xl">
            The Feature Hit List wasn&apos;t from competitive intel — it came from the team&apos;s own internal data, synthesized in one place for the first time.
          </p>
          <ul className="text-sm text-zinc-400 space-y-2 max-w-xl">
            <li>• <strong className="text-zinc-300">PostHog</strong> behavioral funnels — activation and drop-off patterns</li>
            <li>• <strong className="text-zinc-300">14 months</strong> of past launch data — what shipped, what worked, what didn&apos;t, and why</li>
            <li>• <strong className="text-zinc-300">200+ Zendesk tickets</strong> tagged by theme — same friction surfaced repeatedly</li>
            <li>• <strong className="text-zinc-300">Sales CRM</strong> — 8 closed-lost deals that cited the same missing feature</li>
          </ul>
        </div>
        <div className="max-w-3xl mx-auto space-y-0">
          <div className="py-10 border-b border-[#1a1a1a]">
            <p className="text-[10px] font-mono text-[#7C3AED] uppercase tracking-[0.18em] mb-4">The leverage</p>
            <h3 className="text-xl font-semibold text-zinc-100 mb-4 leading-snug">
              &ldquo;The spec NorthStar generates is Claude Code–ready. PM hands it to engineering without rewriting anything.&rdquo;
            </h3>
            <p className="text-zinc-400 text-[15px] leading-relaxed max-w-2xl">
              A seed-stage B2B SaaS team used NorthStar&apos;s Hit List to pick the right friction point. The output that unlocked a six-figure deal wasn&apos;t just the prioritization — it was the structured spec. Engineering could feed it straight into Claude Code and ship. That&apos;s the leverage: internal data → hypothesis → spec → code, with no handoff friction.
            </p>
          </div>
        </div>
      </section>

      <div className={DIVIDER} />

      {/* ══════════════════════════════════════════════════
          CASE STUDY 04 — THE BOARD STORY
      ══════════════════════════════════════════════════ */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto mb-10">
          <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.18em]">
            Case Study 04 · The Board Story
          </p>
        </div>
        <div className="max-w-3xl mx-auto rounded-2xl border border-[#1a1a1a] bg-[#0d0b12]/60 p-8 md:p-10 mb-12">
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">The attribution ledger is built from internal data loops.</h2>
          <p className="text-zinc-500 text-sm max-w-2xl">
            It doesn&apos;t come from external or competitive signals. It exists because NorthStar tracked every hypothesis from ideation to revenue outcome. It&apos;s a living record of your product decisions and their P&L impact — what was bet, what was built, what worked, and what it was worth.
          </p>
        </div>
        <div className="max-w-3xl mx-auto space-y-0">
          <div className="py-10 border-b border-[#1a1a1a]">
            <p className="text-[10px] font-mono text-[#7C3AED] uppercase tracking-[0.18em] mb-4">Why it matters for the board</p>
            <h3 className="text-xl font-semibold text-zinc-100 mb-4 leading-snug">
              &ldquo;The CPO had a paper trail from product decision to revenue outcome — built automatically.&rdquo;
            </h3>
            <p className="text-zinc-400 text-[15px] leading-relaxed max-w-2xl">
              A Series B CPO used NorthStar&apos;s attribution ledger to show the board exactly which product bets landed and which didn&apos;t — with revenue proof. Every entry in the ledger traces back to the company&apos;s own data: behavioral signals, past launches, sales and support input, then the spec, the test, and the measured delta. That&apos;s the artifact that closes the loop.
            </p>
          </div>
        </div>
      </section>

      <div className={DIVIDER} />

      {/* ── CTA STRIP ────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-[#7C3AED] text-[11px] font-mono uppercase tracking-[0.18em] mb-5">
            Your move
          </p>
          <h2 className="text-zinc-100 mb-5">
            Your data → Hit List → spec → test → revenue proof.
          </h2>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
            Connect your behavioral analytics, launch history, sales data, and feedback. Get a ranked Feature Hit List and close the loop with an attribution ledger.
          </p>
          <Link href="/auth/login">
            <Button
              size="lg"
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-11 px-8 text-sm font-medium rounded-lg"
            >
              Request a demo →
            </Button>
          </Link>
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
            <Link href="/case-studies" className="text-zinc-400">Case Studies</Link>
            <Link href="/rising-products" className="hover:text-zinc-400 transition-colors">Rising Products</Link>
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
