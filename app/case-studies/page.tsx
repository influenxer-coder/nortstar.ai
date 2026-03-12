'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'

const DIVIDER = 'border-t border-[#1a1a1a]'

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

/* ─── Coming-soon placeholder card ─── */
function PlaceholderCase({
  number,
  title,
  teaser,
}: {
  number: string
  title: string
  teaser: string
}) {
  return (
    <div className="max-w-3xl mx-auto px-6">
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0d0b12]/60 p-10 md:p-14 flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex-1">
          <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.18em] mb-2">
            Case Study {number}
          </p>
          <h3 className="text-xl font-semibold text-zinc-300 mb-2">{title}</h3>
          <p className="text-sm text-zinc-600 leading-relaxed max-w-sm">{teaser}</p>
        </div>
        <div className="shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] font-mono text-zinc-500 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            Coming Soon
          </span>
        </div>
      </div>
    </div>
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
        {/* Background glow */}
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
            What happens when you<br className="hidden sm:block" /> see it before they ship it.
          </h1>
          <p className="text-zinc-500 text-base leading-relaxed max-w-xl mx-auto">
            Real teams. Real signals. Real outcomes.
            These are the stories of companies who moved first.
          </p>
        </div>
      </section>

      <div className={DIVIDER} />

      {/* ══════════════════════════════════════════════════
          CASE STUDY #1
      ══════════════════════════════════════════════════ */}
      <section className="py-20 px-6">

        {/* ── Case number label ── */}
        <div className="max-w-3xl mx-auto mb-10">
          <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.18em]">
            Case Study 01
          </p>
        </div>

        {/* ── Hero banner ── */}
        <div
          className="max-w-3xl mx-auto rounded-2xl border border-[#7C3AED]/12 overflow-hidden mb-12"
          style={{
            background:
              'linear-gradient(135deg, #0d0b12 0%, #0f0a1a 40%, #0a0a10 100%)',
            boxShadow:
              '0 0 0 1px rgba(124,58,237,0.07), 0 0 80px -20px rgba(124,58,237,0.2)',
          }}
        >
          {/* Subtle top-edge glow strip */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#7C3AED]/30 to-transparent" />

          <div className="px-8 md:px-12 pt-10 pb-8 flex flex-col sm:flex-row sm:items-start gap-8">
            {/* Company logo placeholder */}
            <div className="shrink-0 flex flex-col gap-2">
              <div className="w-[72px] h-[72px] rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
                <div className="w-8 h-8 rounded-md bg-zinc-700/50" />
              </div>
              <span className="text-[10px] font-mono text-zinc-600 leading-tight max-w-[80px]">
                Series B · HR Tech · Bay Area
              </span>
            </div>

            {/* Headline */}
            <div className="flex-1">
              <h2 className="text-zinc-100 leading-tight mb-3">
                They shipped first.<br />
                Their competitor announced five weeks later.
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed max-w-md">
                A 40-person PLG HR tech company on a post-AI velocity surge — racing two
                Tier-1 competitors to the same activation feature without knowing it.
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="border-t border-[#1a1a1a] grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#1a1a1a]">
            <StatCard value="6 weeks" label="before competitor shipped same feature" delay={0} />
            <StatCard value="$340K" label="ARR directly attributed to the win" delay={0.1} />
            <StatCard value="2 deals" label="cited NorthStar insight as deciding factor" delay={0.2} />
          </div>
        </div>

        {/* ── Content sections ── */}
        <div className="max-w-3xl mx-auto space-y-0">

          {/* CHALLENGE */}
          <div className="py-10 border-b border-[#1a1a1a]">
            <p className="text-[10px] font-mono text-[#7C3AED] uppercase tracking-[0.18em] mb-4">
              Challenge
            </p>
            <h3 className="text-xl font-semibold text-zinc-100 mb-4 leading-snug">
              &ldquo;They were about to build the wrong thing — again&rdquo;
            </h3>
            <p className="text-zinc-400 text-[15px] leading-relaxed max-w-2xl">
              A 40-person PLG HR tech company had strong engineering velocity post-AI mandate. Their
              PM was executing a roadmap built on quarterly planning assumptions — no real-time
              competitive signal. Two direct competitors were quietly converging on the same
              activation feature. Without NorthStar, they would have learned about it the day it
              shipped.
            </p>
          </div>

          {/* SOLUTION */}
          <div className="py-10 border-b border-[#1a1a1a]">
            <p className="text-[10px] font-mono text-[#7C3AED] uppercase tracking-[0.18em] mb-4">
              Solution
            </p>
            <h3 className="text-xl font-semibold text-zinc-100 mb-4 leading-snug">
              &ldquo;NorthStar flagged the competitive signal before it became a threat&rdquo;
            </h3>
            <p className="text-zinc-400 text-[15px] leading-relaxed max-w-2xl">
              NorthStar&apos;s competitive intelligence layer — pulling from public product
              changelogs, job postings, and behavioral patterns — identified that two Tier-1
              competitors were building toward the same onboarding activation feature. The PM
              received a ranked Feature Hit List with the signal surfaced at the top, complete with
              confidence score and data provenance. They reprioritized within 48 hours.
            </p>
          </div>

          {/* RESULT */}
          <div className="py-10 border-b border-[#1a1a1a]">
            <p className="text-[10px] font-mono text-[#7C3AED] uppercase tracking-[0.18em] mb-4">
              Result
            </p>
            <h3 className="text-xl font-semibold text-zinc-100 mb-4 leading-snug">
              &ldquo;They shipped first. Their competitor announced five weeks later.&rdquo;
            </h3>
            <p className="text-zinc-400 text-[15px] leading-relaxed max-w-2xl">
              The company shipped the feature three weeks ahead of the nearest competitor. Two
              enterprise deals that quarter listed &ldquo;feature parity with [competitor]&rdquo; as
              a previous objection — now resolved before the competitor even announced. Combined ACV:
              $340K.
            </p>
          </div>

        </div>

        {/* ── Pull quote ── */}
        <div className="max-w-3xl mx-auto mt-12">
          <div
            className="rounded-2xl border border-[#7C3AED]/15 bg-[#0d0b12] px-8 md:px-14 py-10 md:py-12 relative overflow-hidden"
            style={{
              boxShadow: '0 0 0 1px rgba(124,58,237,0.07), 0 0 60px -15px rgba(124,58,237,0.18)',
            }}
          >
            {/* Decorative quote mark */}
            <div
              className="absolute top-6 left-8 text-[#7C3AED]/10 font-serif leading-none select-none pointer-events-none"
              style={{ fontSize: '96px' }}
              aria-hidden
            >
              &ldquo;
            </div>

            <blockquote className="relative">
              <p className="text-zinc-100 text-lg md:text-xl font-medium leading-relaxed mb-6 max-w-xl">
                &ldquo;I&apos;ve never had a tool tell me what a competitor was building before they
                announced it. NorthStar didn&apos;t just save us from losing — it let us win.&rdquo;
              </p>
              <footer className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] shrink-0" />
                <div>
                  <p className="text-sm font-medium text-zinc-300">VP of Product</p>
                  <p className="text-xs text-zinc-600">Series B HR Tech · Bay Area</p>
                </div>
              </footer>
            </blockquote>
          </div>
        </div>

      </section>

      <div className={DIVIDER} />

      {/* ── CASE STUDY #2 placeholder ── */}
      <section className="py-16">
        <PlaceholderCase
          number="02"
          title="The Leverage Story"
          teaser="How a seed-stage B2B SaaS team used NorthStar's Feature Hit List to unlock a six-figure deal by solving the right friction point at exactly the right moment."
        />
      </section>

      <div className={DIVIDER} />

      {/* ── CASE STUDY #3 placeholder ── */}
      <section className="py-16">
        <PlaceholderCase
          number="03"
          title="The Board Story"
          teaser="A Series C CPO walks into a board meeting with a live competitive map — surfaced by NorthStar 72 hours before the deck was due. Here's what changed."
        />
      </section>

      <div className={DIVIDER} />

      {/* ── CTA STRIP ────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-[#7C3AED] text-[11px] font-mono uppercase tracking-[0.18em] mb-5">
            Your move
          </p>
          <h2 className="text-zinc-100 mb-5">
            See what NorthStar knows about<br className="hidden sm:block" /> your competitive
            landscape
          </h2>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
            We&apos;ll pull a live Feature Hit List from your market — no setup, no credit card. Just
            signal.
          </p>
          <Link href="/auth/login">
            <Button
              size="lg"
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-11 px-8 text-sm font-medium rounded-lg"
            >
              Get Your Free Feature Hit List →
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
