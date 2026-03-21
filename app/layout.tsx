import type { Metadata } from 'next'
import { Instrument_Serif, DM_Sans, DM_Mono } from 'next/font/google'
import PostHogProvider from '@/components/PostHogProvider'
import './globals.css'

const serif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})
const dmSans = DM_Sans({
  weight: ['300', '400', '500'],
  subsets: ['latin'],
  variable: '--font-sans-dm',
  display: 'swap',
})
const dmMono = DM_Mono({
  weight: ['300', '400', '500'],
  subsets: ['latin'],
  variable: '--font-mono-dm',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NorthStar — Autonomous Feature Improvement',
  description: 'NorthStar embeds an autonomous agent on your highest-traffic features. It reads user signals, forms hypotheses, ships code changes, and measures outcomes — continuously.',
  keywords: 'autonomous feature improvement, product, AI agent, conversion optimization',
  openGraph: {
    title: 'NorthStar — Autonomous Feature Improvement',
    description: 'NorthStar embeds an autonomous agent on your highest-traffic features. It reads user signals, forms hypotheses, ships code changes, and measures outcomes — continuously.',
    type: 'website',
  },
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${serif.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <script dangerouslySetInnerHTML={{ __html: "!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split('.');2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}var m=(p=document.createElement('script')).type='text/javascript';p.async=!0,p.src=s.api_host+'/static/array.js',(r=document.getElementsByTagName('script')[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a='posthog',u.people=u.people||[],u.toString=function(t){var e='posthog';return'posthog'!==a&&(e+='.'+a),t||(e+=' (stub)'),e},u.people.toString=function(){return u.toString()+' (stub)'},o='capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId'.split(' '),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init('phc_51MhFihWZNGszP21QUrKNi9EIecoqYzYfDGp9aC1rhK',{api_host:'https://us.i.posthog.com',capture_pageview:!0,capture_pageleave:!0,autocapture:!0})" }} />
      <body className="antialiased bg-background text-foreground font-sans">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
