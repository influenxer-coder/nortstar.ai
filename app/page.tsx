import Link from 'next/link'
import { ArrowRight, Zap, Bell, FileText, Search, ChevronRight, Star } from 'lucide-react'
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
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
                Sign in
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white">
                Request Access
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-xs text-violet-300 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Now in private beta — request enterprise access
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            The AI Product Manager
            <br />
            <span className="gradient-text">on Your Team</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop drowning in feedback. NorthStar lives in your workflow—Slack, Linear, Notion—
            delivering insights and PRDs proactively. No setup, no empty states.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth/login">
              <Button size="lg" className="bg-violet-600 hover:bg-violet-500 text-white h-12 px-8 text-base gap-2">
                See Live Demo
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="h-12 px-8 text-base border-zinc-700 text-zinc-300 hover:border-zinc-500">
              Request Enterprise Access
            </Button>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {['A', 'B', 'C', 'D'].map((l, i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 border-2 border-zinc-950 flex items-center justify-center text-[10px] font-bold text-white">
                    {l}
                  </div>
                ))}
              </div>
              <span>Trusted by 40+ PMs</span>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-1">4.9/5</span>
            </div>
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
                  <h3 className="font-semibold text-zinc-100">Hi Alex!</h3>
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
              PMs spend 60-70% of time on busywork
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              Reading tickets, writing summaries, drafting PRDs—all tasks that AI should handle,
              freeing you to make decisions that matter.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Search className="w-5 h-5 text-violet-400" />,
                title: 'Research Synthesis',
                description: 'Monitors Zendesk, Gong, and Intercom continuously. Proactively surfaces what matters, not just what\'s new.',
                stat: '127 tickets → 5 insights',
              },
              {
                icon: <FileText className="w-5 h-5 text-violet-400" />,
                title: 'Instant PRD Generation',
                description: 'Click "Generate PRD" on any insight. Get a 70% complete draft in 30 seconds, backed by real customer evidence.',
                stat: '10 hours → 30 seconds',
              },
              {
                icon: <Bell className="w-5 h-5 text-violet-400" />,
                title: 'Proactive Alerts',
                description: 'NorthStar pings your Slack when customers mention churn, bugs, or competitors. You\'re always first to know.',
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
              Aha moment in 5 seconds
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              IT admin connects your data sources once. Every PM gets instant value
              from day one—no setup, no onboarding, no empty states.
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
            Enterprise Pricing
          </h2>
          <p className="text-zinc-400 text-lg mb-12">
            One plan, unlimited PMs. Designed for teams that move fast.
          </p>

          <div className="border border-violet-500/30 rounded-xl p-8 bg-violet-500/5 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 px-3 py-1 rounded-full font-medium">
                Most Popular
              </span>
            </div>

            <h3 className="text-2xl font-bold text-zinc-100 mb-2">Enterprise</h3>
            <div className="flex items-baseline justify-center gap-1 mb-6">
              <span className="text-5xl font-bold gradient-text">$10K</span>
              <span className="text-zinc-400">/month</span>
            </div>

            <ul className="text-sm text-zinc-300 space-y-3 mb-8 text-left max-w-sm mx-auto">
              {[
                'Unlimited PM seats',
                'All integrations (Zendesk, Gong, Intercom, Slack)',
                'SSO (Okta, Azure AD)',
                'Custom data retention',
                'Priority support + dedicated CSM',
                'API access',
                'Slack + Linear + Notion integrations',
                'Weekly AI reports',
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-violet-400 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link href="/auth/login">
              <Button size="lg" className="w-full bg-violet-600 hover:bg-violet-500 text-white h-12 text-base">
                Request Enterprise Access
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-zinc-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to stop drowning in feedback?
          </h2>
          <p className="text-zinc-400 text-lg mb-8">
            See NorthStar in action with real demo data. No setup required.
          </p>
          <Link href="/auth/login">
            <Button size="lg" className="bg-violet-600 hover:bg-violet-500 text-white h-12 px-10 text-base gap-2">
              <Zap className="w-4 h-4" />
              Try Live Demo — Free
            </Button>
          </Link>
          <p className="text-xs text-zinc-600 mt-4">No credit card required. Demo uses sample data.</p>
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
            © 2026 NorthStar AI. Built for product teams who move fast.
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
