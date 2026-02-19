import Link from 'next/link'
import { ArrowRight, Zap, Bell, FileText, Search, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={28} className="shrink-0" />
            <span className="font-semibold tracking-tight">NorthStar</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#features" className="hover:text-zinc-100 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-zinc-100 transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-zinc-100 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
                Log in
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md">
                Request Free Trial →
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Eyebrow */}
          <div className="text-sm text-blue-400 uppercase tracking-wide mb-4">
            Early access now open
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-bold leading-tight mb-2">
            <span className="text-white">Ship 10x more features that actually move your metrics.</span>
          </h1>

          <p className="text-neutral-400 text-lg mt-4 max-w-xl mx-auto mb-10">
            Your competitors are shipping 12 features per quarter. 
            You&apos;re shipping 3. NorthStar eliminates the research 
            bottleneck so you ship the RIGHT features 10x faster.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white h-12 px-8 text-base gap-2">
                Request Early Access →
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <button className="text-zinc-400 hover:text-zinc-300 underline">
              See it in action
            </button>
          </div>

          {/* Social proof */}
          <div className="mt-12 text-center">
            <p className="text-sm text-neutral-500">
              No credit card. No setup. First insight in 5 minutes.
            </p>
          </div>
        </div>

        {/* Demo preview */}
        <div className="max-w-4xl mx-auto mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10 pointer-events-none" />
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-2xl shadow-black/50">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <div className="ml-4 flex-1 bg-zinc-800 rounded h-5 max-w-64 flex items-center px-2">
                <span className="text-[10px] text-zinc-500">app.northstar.ai/dashboard</span>
              </div>
            </div>

            {/* Dashboard preview */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-zinc-100">This week&apos;s 127 tickets. Analyzed. Prioritized. Ready.</h3>
                  <p className="text-xs text-zinc-500">I analyzed 127 tickets, 23 calls, 89 chats. Here&apos;s what matters:</p>
                </div>
                <div className="text-xs text-zinc-600 bg-zinc-800 px-3 py-1.5 rounded-md">
                  ⌘K Command
                </div>
              </div>

              {/* Mock insight cards */}
              {[
                { severity: 'bg-red-500', badge: 'CRITICAL', title: 'Team collaboration blocked (23 mentions)', revenue: null },
                { severity: 'bg-orange-500', badge: 'HIGH', title: 'Enterprise wants SSO — $250K+ at risk', revenue: '$250K ARR' },
                { severity: 'bg-green-500', badge: 'POSITIVE', title: 'Onboarding improvements working — confusion ↓71%', revenue: null },
              ].map((item, i) => (
                <div key={i} className="border border-zinc-800 rounded-lg p-4 bg-zinc-950/50 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${item.severity}`} />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{item.badge}</span>
                    {item.revenue && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">💰 {item.revenue}</span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-200">{item.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Competitive advantage */}
      <section className="py-24 px-6 border-t border-zinc-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            The new competitive advantage isn&apos;t code. It&apos;s feature velocity.
          </h2>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto mb-12">
            Cursor gave everyone fast engineering. The winners now are 
            companies that can discover and ship high-impact features faster 
            than their competitors. NorthStar is that advantage.
          </p>
          <div className="grid md:grid-cols-3 gap-8 justify-center mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">3-5x</div>
              <div className="text-sm text-neutral-400 mt-1">More features shipped per quarter</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">50%</div>
              <div className="text-sm text-neutral-400 mt-1">Higher feature success rate (better prioritization)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">16%</div>
              <div className="text-sm text-neutral-400 mt-1">Average growth rate increase in first 90 days</div>
            </div>
          </div>
          <p className="text-xs text-neutral-500">Based on pilot with 5 Series B companies, Q4 2025</p>
        </div>
      </section>

      {/* Problem section */}
      <section id="features" className="py-24 px-6 border-t border-zinc-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              The bottleneck shifted. Nobody noticed.
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto mt-6">
              AI gave engineers Cursor. Designers got Midjourney. 
              Writers got Claude. 
              Product Managers are still reading Zendesk tickets by hand.
              That changes now.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Search className="w-5 h-5 text-violet-400" />,
                title: 'Ship features customers actually want. Not what PMs guess.',
                description: 'Your PM reads 200 tickets. Misses the pattern. Ships the wrong thing. NorthStar finds the signal instantly. Monitors Zendesk, Gong, and Intercom continuously. Proactively surfaces what matters, not just what\'s new.',
                stat: '3x feature hit rate',
              },
              {
                icon: <FileText className="w-5 h-5 text-violet-400" />,
                title: 'Ship 4x faster. From insight to production in 2 weeks, not 8.',
                description: 'Traditional flow: Research (2 weeks) → PRD (1 week) → Engineering (4 weeks) = 7 weeks. With NorthStar: Research (1 day) → PRD (1 day) → Engineering (10 days) = 2 weeks. Click "Generate PRD" on any insight. Get a 70% complete draft in 30 seconds, backed by real customer evidence.',
                stat: '7 weeks → 2 weeks',
              },
              {
                icon: <Bell className="w-5 h-5 text-violet-400" />,
                title: 'Catch churn 30 days before it happens. Save $500K+ per incident.',
                description: 'By the time a customer tells you they\'re churning, it\'s too late. NorthStar detects early signals in support patterns and usage data. NorthStar pings your Slack when customers mention churn, bugs, or competitors. You\'re always first to know.',
                stat: '$450K avg ARR saved per quarter',
              },
            ].map((feature, i) => (
              <div key={i} className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/50 hover:border-zinc-700 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-zinc-100 mb-2">{feature.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-4">{feature.description}</p>
                <div className="text-xs text-violet-400 font-medium">{feature.stat}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The math that matters */}
      <section className="py-24 px-6 border-t border-zinc-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-2">
            The math that matters to your board
          </h2>
          <p className="text-neutral-400 text-center mb-12">
            ROI in the first quarter. Compounding advantage after.
          </p>
          <div className="grid md:grid-cols-2 gap-8 mb-10">
            <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/50">
              <h3 className="font-semibold text-zinc-100 mb-4">Without NorthStar</h3>
              <div className="space-y-2 text-sm text-zinc-400">
                <p className="font-medium text-zinc-300">Quarter 1:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>3 features shipped</li>
                  <li>1 moves metrics (33% hit rate)</li>
                  <li>+2% growth</li>
                  <li>PM spent 100 hrs on research</li>
                </ul>
                <p className="font-medium text-zinc-300 pt-2">Quarter 2:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>3 features shipped</li>
                  <li>1 moves metrics</li>
                  <li>+2% growth</li>
                </ul>
                <p className="pt-2 font-medium text-white">Total: 6 features, 2 wins, 4% growth</p>
              </div>
            </div>
            <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/50 border-blue-500/30">
              <h3 className="font-semibold text-zinc-100 mb-4">With NorthStar</h3>
              <div className="space-y-2 text-sm text-zinc-400">
                <p className="font-medium text-zinc-300">Quarter 1:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>12 features shipped</li>
                  <li>6 move metrics (50% hit rate)</li>
                  <li>+8% growth</li>
                  <li>PM spent 12 hrs on research</li>
                </ul>
                <p className="font-medium text-zinc-300 pt-2">Quarter 2:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>12 features shipped</li>
                  <li>6 move metrics</li>
                  <li>+8% growth</li>
                </ul>
                <p className="pt-2 font-medium text-white">Total: 24 features, 12 wins, 16% growth</p>
              </div>
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white text-center mb-2">
            Not 4x more features. 6x more IMPACT.
          </p>
          <p className="text-xs text-neutral-500 text-center">
            Assumes: PM+eng team of 3, Series B SaaS company. Based on pilot results Q4 2025.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6 border-t border-zinc-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Set up once. Insight in 5 minutes.
            </h2>
            <p className="text-neutral-400 text-lg max-w-xl mx-auto">
              IT connects your tools in 5 minutes. 
              Every PM gets instant access with no training required.
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                step: '01',
                who: 'IT Admin (once)',
                title: 'Connect your data sources',
                description: 'Add API keys for Zendesk, Gong, and Intercom. NorthStar immediately starts syncing the last 90 days of feedback in the background.',
                time: '5 minutes, one time',
              },
              {
                step: '02',
                who: 'New PM',
                title: 'SSO login — instant access',
                description: 'No password. Click the NorthStar link in your welcome email and you\'re in via corporate SSO in < 1 second.',
                time: 'Zero setup',
              },
              {
                step: '03',
                who: 'New PM',
                title: 'Dashboard with real insights',
                description: 'Your first view shows critical issues, feature requests, and churn risks — backed by evidence from real customer conversations.',
                time: '5 seconds elapsed',
              },
              {
                step: '04',
                who: 'AI in background',
                title: 'Proactive Slack alerts',
                description: 'NorthStar monitors for new patterns and alerts #product-insights when something needs your attention. You never miss a churn signal.',
                time: 'Real-time',
              },
            ].map((step, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <span className="text-xs font-bold text-zinc-500">{step.step}</span>
                </div>
                <div className="flex-1 border border-zinc-800 rounded-xl p-5 bg-zinc-900/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">{step.who}</span>
                    <span className="text-xs text-violet-400">{step.time}</span>
                  </div>
                  <h3 className="font-semibold text-zinc-100 mb-1">{step.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 border-t border-zinc-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built for the era of product builders.
          </h2>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto mb-12">
            The companies that win in 2026 won&apos;t have the best engineers.
            They&apos;ll have the fastest product loops. Discovery → Ship → Learn → Repeat.
            Every competitor has fast engineering now. 
            NorthStar gives you fast Product.
          </p>

          {/* Early Access Card */}
          <div className="bg-neutral-900 rounded-2xl p-12 max-w-lg mx-auto">
            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">EARLY ACCESS</div>
            <h3 className="text-2xl font-bold text-white mb-2">Join the waitlist.</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Be among the first PMs to 10x their capacity.
              We&apos;re onboarding teams one by one.
            </p>
            <form className="space-y-4">
              <input
                type="email"
                placeholder="your work email"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Link href="/auth/login" className="block">
                <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-500 text-white h-12 text-base">
                  Request Access →
                </Button>
              </Link>
            </form>
            <p className="text-xs text-zinc-500 mt-4">
              No spam. No credit card. 
              We&apos;ll reach out within 48 hours.
            </p>
          </div>
          <p className="text-sm text-neutral-400 mt-6 max-w-lg mx-auto">
            Expected pricing when we exit early access:<br />
            $499/month for 1-5 PMs | $1,499/month for unlimited PMs
          </p>
          <p className="text-xs text-neutral-500 mt-2 max-w-lg mx-auto">
            For context: One additional PM hire = $160K/year. NorthStar gives you 3x PM capacity for $18K/year.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 border-t border-zinc-900">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Early results from pilot companies
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/50">
              <p className="text-sm text-zinc-300 mb-4">
                &quot;We shipped 11 features in Q4 vs our usual 3. 6 of them moved our growth rate from 4% to 9% MoM. NorthStar paid for itself in week 2.&quot;
              </p>
              <p className="text-xs text-neutral-500">— VP Product, Series B SaaS, $8M ARR</p>
            </div>
            <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/50">
              <p className="text-sm text-zinc-300 mb-4">
                &quot;Our PM found a churn pattern in 5 minutes that would&apos;ve taken us 2 weeks to discover manually. We fixed it, saved $400K in at-risk ARR.&quot;
              </p>
              <p className="text-xs text-neutral-500">— Head of Product, Fintech startup</p>
            </div>
            <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/50">
              <p className="text-sm text-zinc-300 mb-4">
                &quot;The PM/engineer ratio used to be 1:5. With NorthStar it&apos;s 1:8 and we&apos;re shipping MORE. We delayed our next PM hire by 6 months.&quot;
              </p>
              <p className="text-xs text-neutral-500">— CTO, Enterprise SaaS</p>
            </div>
          </div>
          <p className="text-xs text-neutral-500 text-center mt-6">*Pilot participants, Q4 2025. Names available upon request.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-zinc-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-3">
            Your competitor just shipped their 8th feature this quarter. You&apos;ve shipped 2. This is how you catch up.
          </h2>
          <p className="text-neutral-400 text-center mt-3 mb-8">
            Every company has fast engineering now (Cursor, Claude Code, Copilot). The winners will be the ones with fast Product. That&apos;s NorthStar.
          </p>
          <div className="flex items-center justify-center gap-6">
            <Link href="/auth/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 text-lg gap-2">
                Request Early Access →
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-neutral-500 mt-4">
            Onboarding 10 pilot companies in February 2026. Pilot includes: Full access, dedicated onboarding, and we help you measure the ROI.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size={20} className="shrink-0" />
            <span className="font-semibold text-zinc-400">NorthStar</span>
          </div>
          <p className="text-xs text-zinc-600">
            © 2026 NorthStar AI · Built by a PM who spent a decade at 
            Snap, Meta, Apple, and Google. This is the tool that should 
            have existed the whole time.
          </p>
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <a href="#" className="hover:text-zinc-400">Privacy</a>
            <a href="#" className="hover:text-zinc-400">Terms</a>
            <a href="#" className="hover:text-zinc-400">Security</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
