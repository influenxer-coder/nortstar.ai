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
            <span className="text-neutral-400">Your engineers have Cursor.</span>
            <br />
            <span className="text-white">Now your PM has NorthStar.</span>
          </h1>

          <p className="text-neutral-400 text-lg mt-4 max-w-xl mx-auto mb-10">
            AI coding tools made your engineers 3x faster. 
            The bottleneck moved. It&apos;s now Product.
            NorthStar handles research, PRDs, and roadmap 
            prioritization — so your PM moves as fast as your code.
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
                title: 'From 200 tickets to 5 insights. In 60 seconds.',
                description: 'Stop reading. Start deciding. Monitors Zendesk, Gong, and Intercom continuously. Proactively surfaces what matters, not just what\'s new.',
                stat: '127 tickets → 5 insights',
              },
              {
                icon: <FileText className="w-5 h-5 text-violet-400" />,
                title: 'A PRD in 45 seconds. With customer quotes built in.',
                description: 'Stop writing. Start shipping. Click "Generate PRD" on any insight. Get a 70% complete draft in 30 seconds, backed by real customer evidence.',
                stat: '10 hours → 30 seconds',
              },
              {
                icon: <Bell className="w-5 h-5 text-violet-400" />,
                title: 'Know before your customers tell you.',
                description: 'Stop monitoring. Start anticipating. NorthStar pings your Slack when customers mention churn, bugs, or competitors. You\'re always first to know.',
                stat: 'Real-time awareness',
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
            Sam Altman calls it: billion-dollar companies run by 2-3 people.
            That future needs engineers with Cursor 
            and PMs with NorthStar.
            We&apos;re in early access. Pricing comes after you&apos;ve 
            seen what it can do.
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
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-zinc-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-3">
            The builder stack is now complete.
          </h2>
          <p className="text-neutral-400 text-center mt-3 mb-8">
            Cursor for engineering. NorthStar for product.
            A 3-person team that ships like a company of 30.
          </p>
          <div className="flex items-center justify-center gap-6">
            <Link href="/auth/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 text-lg gap-2">
                Request Early Access →
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-neutral-500 mt-4">Onboarding teams in February 2026.</p>
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
