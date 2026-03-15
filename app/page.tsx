import Link from 'next/link'

export const metadata = {
  title: 'Agent NorthStar — Your L4 Growth PM',
  description:
    'Agent NorthStar is an AI assistant for senior PMs and growth leaders. It reads your PostHog data, drafts ranked hypotheses, writes Claude Code-ready specs, and closes the loop with revenue attribution. In private beta.',
}

const STEPS = [
  {
    label: 'RESEARCH',
    title: 'Connects to your stack',
    body: 'PostHog, GitHub, Salesforce, Zendesk. OAuth connections, no implementation project. Reads your behavioral funnels, launch history, close/lost signals, and customer feedback. 20 minutes.',
  },
  {
    label: 'HYPOTHESIS DRAFTING',
    title: 'Surfaces the Feature Hit List',
    body: 'Ranked hypotheses with confidence scores, specific behavioral evidence, predicted lift range, and an explicit connection to your board metric. You get the brief — not the raw data.',
  },
  {
    label: 'SPEC WRITING',
    title: 'You approve. The spec is written.',
    body: 'Agent NorthStar generates a complete product spec: problem statement, success metric, acceptance criteria, test design, effort tier. Formatted for Cursor and Claude Code. Your engineer picks it up without a single clarifying question.',
  },
  {
    label: 'THE BUILD',
    title: 'Cursor or Claude Code builds it',
    body: 'The spec goes directly to your coding agent. No PM rewriting in Confluence. No engineer asking what success looks like. You review the PR. That\'s your only job in this step.',
  },
  {
    label: 'RESULTS REPORTING',
    title: 'The loop closes with a revenue number',
    body: 'Staged rollout to 10% of users. Agent NorthStar monitors signal vs predicted lift. When the test closes — ledger entry written: hypothesis, spec, result, revenue delta. That\'s your board artifact.',
  },
]

export default function LandingPage() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: "document.documentElement.style.scrollBehavior='smooth'",
        }}
      />
      <div className="min-h-screen bg-white text-[#1a1a2e] overflow-x-hidden">
        {/* ── NAV ─────────────────────────────────────────── */}
        <nav className="sticky top-0 left-0 right-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <span className="font-bold text-lg text-[#0a2342]">Agent NorthStar</span>
            <div className="hidden md:flex items-center gap-8 text-sm text-[#4a4a6a]">
              <a href="#how-it-works" className="hover:text-[#0a2342] transition-colors">
                How it works
              </a>
              <a href="#who-its-for" className="hover:text-[#0a2342] transition-colors">
                Who it&apos;s for
              </a>
              <a href="#early-access" className="hover:text-[#0a2342] transition-colors">
                Early access
              </a>
            </div>
            <Link
              href="#early-access"
              className="bg-[#0a2342] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#0e7c7b] transition"
            >
              Request access →
            </Link>
          </div>
        </nav>

        {/* ── HERO ─────────────────────────────────────────── */}
        <section className="py-32 px-6 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-[#e8f5f5] text-[#0e7c7b] text-xs font-medium tracking-widest uppercase px-4 py-2 rounded-full border border-[#0e7c7b]/20 mb-8">
              IN BETA · TESTED BY PMS AT META, SNAP & GOOGLE
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-[#0a2342] leading-tight text-center">
              Meet your L4 Growth PM.
              <br />
              Knows your data. Writes the spec.
              <br />
              Hands it to Cursor. Shows your board the number.
            </h1>
            <p className="text-xl text-[#4a4a6a] max-w-2xl mx-auto mt-8 leading-relaxed text-center">
              Agent NorthStar does the research legwork a great L4 would do — reads your PostHog funnels, drafts ranked hypotheses, writes Claude Code and Cursor-ready specs, and reports results back to you. You stay the strategist. It handles the execution work.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
              <Link
                href="#early-access"
                className="bg-[#0a2342] text-white px-8 py-4 rounded-xl text-base font-medium hover:bg-[#0e7c7b] transition inline-block text-center"
              >
                Request early access →
              </Link>
              <a
                href="#how-it-works"
                className="text-[#0a2342] border border-[#0a2342]/20 px-8 py-4 rounded-xl text-base font-medium hover:border-[#0e7c7b] hover:text-[#0e7c7b] transition inline-block text-center"
              >
                See what it does in a day ↓
              </a>
            </div>
            <p className="mt-6 text-sm text-[#4a4a6a] text-center">
              Private beta · We review every request personally.
            </p>
          </div>
        </section>

        {/* ── THE MATH ─────────────────────────────────────── */}
        <section id="the-math" className="py-24 px-6 bg-[#f4f6f8]">
          <h2 className="text-3xl font-bold text-[#0a2342] text-center mb-16">
            The hiring decision you&apos;ve been avoiding
          </h2>
          <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <h3 className="text-lg font-semibold text-[#4a4a6a] mb-6">A great L4 Growth PM</h3>
              <ul className="space-y-4">
                {[
                  '$150–180K/year total comp',
                  '3 months to hire',
                  '3 months to fully onboard',
                  'Manages their own priorities',
                  'Leaves when a better offer comes',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                    <span className="text-[#4a4a6a] text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#0a2342] rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-white/70 mb-6">Agent NorthStar</h3>
              <ul className="space-y-4">
                {[
                  '$30K/year',
                  'Connected in 20 minutes',
                  'First Hit List same day',
                  'Executes what you direct',
                  'Gets smarter every loop',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#0e7c7b] shrink-0" />
                    <span className="text-white text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-xl font-semibold text-[#0a2342] text-center mt-12">
            Same output. A fraction of the cost. Available today.
          </p>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────── */}
        <section id="how-it-works" className="py-24 px-6 bg-white">
          <p className="text-xs tracking-widest uppercase text-[#0e7c7b] text-center mb-4">
            WHAT YOUR L4 HANDLES
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0a2342] text-center mb-4">
            From your data to your board&apos;s revenue number.
          </h2>
          <p className="text-lg text-[#4a4a6a] text-center mb-16">
            Five steps. You make two decisions. Agent NorthStar handles the rest.
          </p>
          <div className="max-w-2xl mx-auto relative">
            <div className="absolute left-6 top-6 bottom-0 w-px bg-[#e5e7eb]" aria-hidden />
            {STEPS.map((step, i) => (
              <div key={step.label} className="flex gap-6 items-start pb-12 last:pb-0">
                <div className="w-12 h-12 rounded-full bg-[#0a2342] text-white flex items-center justify-center text-sm font-bold shrink-0 relative z-10">
                  {i + 1}
                </div>
                <div>
                  <p className="text-xs tracking-widest uppercase text-[#0e7c7b] mb-1">{step.label}</p>
                  <h3 className="text-xl font-bold text-[#0a2342] mb-2">{step.title}</h3>
                  <p className="text-[#4a4a6a] leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-[#f4f6f8] rounded-xl p-6 max-w-2xl mx-auto">
            <p className="text-sm text-[#4a4a6a] text-center italic">
              Steps 1–3 are fully live in beta. Steps 4–5 are in active development with our beta cohort.
            </p>
          </div>
        </section>

        {/* ── CURSOR + CLAUDE CODE ─────────────────────────── */}
        <section className="py-16 px-6 bg-[#0a2342]">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-2xl md:text-3xl font-bold text-white leading-relaxed">
              Cursor builds what you tell it to build. Agent NorthStar figures out what to build. Then tells Cursor.
            </p>
            <p className="text-lg text-white/70 max-w-xl mx-auto mt-8">
              When you approve a spec, Agent NorthStar hands it directly to your coding agent — formatted and ready. You review the PR. You approve the rollout. You read the number. Everything between those decisions runs automatically.
            </p>
            <div className="mt-12 flex items-center justify-center gap-8 flex-wrap">
              <span className="font-bold text-white/60 text-xl">Cursor</span>
              <span className="text-white/30 text-xl">+</span>
              <span className="font-bold text-white/60 text-xl">Claude Code</span>
            </div>
          </div>
        </section>

        {/* ── WHO&apos;S TESTING IT ───────────────────────────── */}
        <section id="who-its-for" className="py-24 px-6 bg-white">
          <p className="text-xs tracking-widest uppercase text-[#0e7c7b] text-center mb-4">
            WHO&apos;S TESTING IT
          </p>
          <h2 className="text-3xl font-bold text-[#0a2342] text-center max-w-2xl mx-auto mb-16">
            Built for senior PMs who know exactly what needs to happen — and don&apos;t have enough hours to make it happen.
          </h2>
          <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-8">
            <div className="bg-[#f4f6f8] rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-[#0a2342] mb-6">Right fit</h3>
              <ul className="space-y-3">
                {[
                  'Head of Growth or VP Product',
                  'Series B or C B2B SaaS',
                  'Joined in the last 12 months',
                  'Board metric to move this quarter',
                  'Not enough hours to do the research yourself',
                  'Team using Cursor or Claude Code',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="text-[#0e7c7b] font-bold shrink-0">✓</span>
                    <span className="text-[#1a1a2e]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <h3 className="text-lg font-semibold text-[#0a2342] mb-6">What beta testers are saying</h3>
              <p className="text-lg text-[#1a1a2e] leading-relaxed italic mb-6">
                This is what a great L4 does. Except it&apos;s already done it by the time I arrive in the morning.
              </p>
              <p className="text-sm text-[#4a4a6a]">— Senior PM, currently in beta</p>
              <div className="border-t border-gray-100 my-6" />
              <p className="text-sm text-[#4a4a6a]">
                Current beta includes PMs from Meta, Snap, and Google.
              </p>
            </div>
          </div>
        </section>

        {/* ── FOUNDER NOTE ─────────────────────────────────── */}
        <section className="py-24 px-6 bg-[#f4f6f8]">
          <div className="max-w-2xl mx-auto">
            <p className="text-xs tracking-widest uppercase text-[#0e7c7b] mb-4">
              WHY WE BUILT THIS
            </p>
            <p className="text-lg text-[#1a1a2e] leading-relaxed mb-6">
              I spent 10 years as a PM across Google, Yahoo, Apple, Facebook, Instagram, and Snap. The best product teams I worked with had one thing others didn&apos;t — they knew what to build before they built it. They moved from hypothesis to code to revenue proof in weeks, not quarters.
            </p>
            <p className="text-lg text-[#1a1a2e] leading-relaxed mb-6">
              Most teams can&apos;t do that. Not because they&apos;re slow — because the tools don&apos;t exist. Amplitude tells you what&apos;s broken. Jira tracks what you&apos;re building. Nothing closes the loop from your data all the way to a revenue number on a board slide.
            </p>
            <p className="text-lg text-[#1a1a2e] leading-relaxed mb-6">
              Agent NorthStar is that loop. Built from a decade of watching what world-class product teams actually do — and making it available to every growth team that can&apos;t afford to hire those people.
            </p>
            <p className="text-base font-semibold text-[#0a2342]">Amrit Lal, Founder</p>
            <p className="text-sm text-[#4a4a6a] mt-1">
              10 years across Google, Yahoo, Apple, Facebook, Instagram, Snap
            </p>
          </div>
        </section>

        {/* ── EARLY ACCESS ─────────────────────────────────── */}
        <section id="early-access" className="py-24 px-6 bg-[#0a2342]">
          <div className="max-w-xl mx-auto text-center">
            <p className="text-xs tracking-widest uppercase text-[#0e7c7b] mb-4">
              EARLY ACCESS
            </p>
            <h2 className="text-4xl font-bold text-white mb-6">Request access</h2>
            <p className="text-lg text-white/70 leading-relaxed mb-12">
              We&apos;re accepting a small number of teams for the next beta cohort. We&apos;re looking for growth leaders at Series B or C companies with a specific board metric to move this quarter.
              <br /><br />
              Tell us what metric you&apos;re working on. We read every request and reach out within 48 hours if it&apos;s a fit.
            </p>
            <form action="/auth/login" method="get" className="flex flex-col sm:flex-row gap-3 w-full">
              <input
                type="text"
                name="metric"
                placeholder="What metric are you trying to move this quarter?"
                className="w-full sm:flex-1 px-5 py-4 rounded-xl text-base text-[#1a1a2e] bg-white border-0 focus:outline-none focus:ring-2 focus:ring-[#0e7c7b]"
              />
              <button
                type="submit"
                className="bg-[#0e7c7b] text-white px-6 py-4 rounded-xl font-medium whitespace-nowrap hover:bg-[#0a6b6a] transition"
              >
                Request access →
              </button>
            </form>
            <p className="mt-4 text-sm text-white/50 text-center">
              No pitch. No credit card. We&apos;ll reach out personally.
            </p>
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────────── */}
        <footer className="bg-[#0a0a0a] py-12 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <span className="font-bold text-white text-lg">Agent NorthStar</span>
              <div className="flex gap-6 text-sm text-white/40 hover:[&>a]:text-white/70">
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
                <a href="#">Security</a>
              </div>
            </div>
            <p className="mt-8 text-center text-sm text-white/30">
              Built in San Francisco. In beta — not ready to rush.
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
