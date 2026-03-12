'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowUpRight } from 'lucide-react'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'

/* ─────────────────────────────────────────────────────────
   PUBLICATION LOGO SVGs
───────────────────────────────────────────────────────── */

function TechCrunchLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 36" className={className} aria-label="TechCrunch" fill="currentColor">
      <rect x="0" y="4" width="28" height="28" rx="5" fill="#0AE448" />
      <text x="14" y="23" textAnchor="middle" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="15" fill="#000">TC</text>
      <text x="38" y="26" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="18" fill="currentColor">TechCrunch</text>
    </svg>
  )
}

function ForbesLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 36" className={className} aria-label="Forbes" fill="currentColor">
      <text x="0" y="30" fontFamily="Times New Roman, Georgia, serif" fontWeight="700" fontSize="36" letterSpacing="-1" fill="currentColor">Forbes</text>
    </svg>
  )
}

function TheInformationLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 36" className={className} aria-label="The Information" fill="currentColor">
      <rect x="0" y="6" width="4" height="24" fill="#C41230" />
      <text x="12" y="27" fontFamily="Georgia, serif" fontWeight="400" fontSize="20" fill="currentColor" letterSpacing="0.5">The Information</text>
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────
   ARTICLE DATA
───────────────────────────────────────────────────────── */

const ARTICLES = [
  {
    id: 'techcrunch',
    pub: 'TechCrunch',
    pubColor: '#0AE448',
    category: 'STARTUPS',
    eyebrow: 'Exclusive',
    headline: 'NorthStar AI Raises $12M to Give Every Product Team a Competitive Intelligence Agent',
    dek: 'The San Francisco startup wants to replace the quarterly planning ritual with a continuously running AI that knows what your competitors are building — before they ship it.',
    date: 'March 11, 2026',
    readTime: '5 min read',
    author: 'Sarah Chen',
    authorTitle: 'Senior Reporter, Enterprise & AI',
    coverBg: 'linear-gradient(135deg, #001a0a 0%, #002a10 100%)',
    accentColor: '#0AE448',
    textStyle: 'techcrunch',
    body: [
      {
        type: 'lede',
        text: 'What if your product team could turn behavioral data, past launch history, sales feedback, and support tickets into a single ranked list of what to build next — and then get a Claude Code-ready spec, run a staged test, and write the result to a revenue attribution ledger? That\'s the premise behind NorthStar AI, which today announced a $12 million seed round led by Benchmark, with participation from Y Combinator and a group of operators from Figma, Stripe, and Linear.',
      },
      {
        type: 'p',
        text: 'The company, founded in 2024 by a former PM who spent over a decade at Snap, Meta, Apple, and Google, has built what it calls a "product operating system" — an AI that ingests a company\'s own internal data (behavioral analytics, past launch history, sales CRM, and customer feedback), synthesizes it into a ranked Feature Hit List, converts the top hypothesis into a Claude Code-ready spec, and closes the loop with a revenue attribution ledger.',
      },
      {
        type: 'h2',
        text: 'The PM problem it\'s solving',
      },
      {
        type: 'p',
        text: 'The problem NorthStar targets is familiar to anyone who\'s sat in a quarterly planning meeting: the data that could tell you what to build next — behavioral analytics, past launch outcomes, sales feedback, support tickets — lives in different systems. By the time it\'s manually synthesized, debated, and turned into a spec, the window has often closed. The company is always one planning cycle behind.',
      },
      {
        type: 'p',
        text: '"I spent a decade watching teams build the right thing at the wrong time," said the company\'s founder in an interview with TechCrunch. "The information was always there — in PostHog, in Confluence, in someone\'s HubSpot notes. Nobody was connecting it. NorthStar connects it and tells you what to build next — then proves whether it was right."',
      },
      {
        type: 'quote',
        text: '"The information was always there — in PostHog, in Confluence, in someone\'s HubSpot notes. Nobody was connecting it."',
        attribution: 'NorthStar AI Founder',
      },
      {
        type: 'h2',
        text: 'How it works',
      },
      {
        type: 'p',
        text: 'NorthStar connects to the four data sources that product teams already have but rarely synthesize together: behavioral analytics (PostHog, Amplitude, Mixpanel), past launch history with outcome data, sales CRM close/lost reasons, and customer support and feedback streams. The intelligence layer cross-references all four to surface what Lal calls a Feature Hit List — a ranked set of hypotheses, each scored on the convergence of signals from all four sources, with a predicted revenue lift range attached. The output that sets NorthStar apart from analytics tools is what comes next. The PM selects the top hypothesis, and NorthStar generates a structured product spec formatted for direct use by Claude Code: problem statement, behavioral evidence, success metric, acceptance criteria, and test design. The spec ships to a defined small user segment — typically 10 to 20 percent — and NorthStar monitors the behavioral signal against predicted lift in real time. When the test closes, the result is written automatically to an attribution ledger: hypothesis, spec, code change, cohort behavior, revenue delta. That ledger is the artifact the CPO takes to the board.',
      },
      {
        type: 'p',
        text: 'The loop is the product. "Every company I worked at had the data to make this decision," Lal said. "None of them had the system to connect it. The data sat in PostHog. The past launches sat in Confluence. The sales signals sat in someone\'s HubSpot notes. NorthStar connects them and tells you what to build next — then proves whether it was right."',
      },
      {
        type: 'p',
        text: 'One early customer, a Series B PLG company, used NorthStar\'s internal data — behavioral analytics, past launch history, and support tickets — to identify the right onboarding activation bet. Two prior attempts had shipped without a clear success metric; NorthStar surfaced why they were inconclusive and generated a spec with the correct metric. Third attempt: NorthStar spec, Claude Code build, 10% rollout. Result: 34% activation lift, $340K ARR impact attributed in the ledger.',
      },
      {
        type: 'h2',
        text: 'What\'s next',
      },
      {
        type: 'p',
        text: 'The $12M raise will fund GTM expansion and a deeper model layer that can infer competitive strategy from patent filings and M&A signals. NorthStar is currently in closed pilot with 15 companies and plans to open a broader waitlist this quarter.',
      },
      {
        type: 'p',
        text: 'Benchmark partner Sarah Guo, who is joining the board, called it "the most obvious enterprise AI wedge I\'ve seen in the last 18 months." She added: "Every company is already paying for competitive intelligence. None of them trust it. NorthStar changes that."',
      },
    ],
  },
  {
    id: 'forbes',
    pub: 'Forbes',
    pubColor: '#C9982A',
    category: 'TECHNOLOGY',
    eyebrow: 'Forbes Exclusive',
    headline: 'The Startup That Wants to Kill the Quarterly Planning Cycle',
    dek: 'A former Big Tech PM has quietly built an AI that tells you what your competitors are building before they ship. Fortune 500 companies are paying close attention.',
    date: 'March 8, 2026',
    readTime: '8 min read',
    author: 'Michael Torres',
    authorTitle: 'Forbes Staff',
    coverBg: 'linear-gradient(135deg, #0a0800 0%, #1a1200 100%)',
    accentColor: '#C9982A',
    textStyle: 'forbes',
    body: [
      {
        type: 'lede',
        text: 'SOMEWHERE IN SAN FRANCISCO — The whiteboard behind him reads, in precise block letters: "What did they ship yesterday?" It\'s not a question directed at his own engineers. It\'s a directive for his AI. And according to a growing roster of product leaders, that AI is answering it faster — and more accurately — than any analyst team they\'ve ever hired.',
      },
      {
        type: 'p',
        text: 'This is NorthStar AI, a product operating system that ingests a company\'s own internal data — behavioral analytics, past launch history, sales CRM, and customer feedback — and closes the loop from hypothesis to spec to code to revenue proof. Its founder would rather we didn\'t use the word "influential." He prefers "accurate."',
      },
      {
        type: 'h2',
        text: 'THE PROBLEM WITH HOW COMPANIES PLAN',
      },
      {
        type: 'p',
        text: 'The quarterly business review is one of the oldest rituals in American enterprise. Every 90 days, product teams gather to review what happened, debate what\'s next, and produce a roadmap that becomes gospel until the next gathering. It is, by design, backward-looking. And in a market moving at AI speed, that lag has become existential.',
      },
      {
        type: 'p',
        text: '"I\'ve seen companies lose $40 million deals because a competitor shipped a feature they didn\'t know was coming," says one NorthStar customer, a VP of Product at a publicly traded SaaS company who requested anonymity. "Nobody got fired. The information just wasn\'t there. Now it is."',
      },
      {
        type: 'quote',
        text: '"I\'ve seen companies lose $40 million deals because a competitor shipped a feature they didn\'t know was coming. Nobody got fired. The information just wasn\'t there. Now it is."',
        attribution: 'VP of Product, publicly traded SaaS company',
      },
      {
        type: 'h2',
        text: 'THE MACHINE THAT READS BETWEEN THE LINES',
      },
      {
        type: 'p',
        text: 'The product works by synthesizing the four data streams that most product teams generate but never connect: user behavioral data, historical launch outcomes, sales intelligence, and customer feedback. The behavioral layer — PostHog, Amplitude, or Mixpanel — surfaces activation patterns and retention signals. The launch history corpus, which grows more accurate over time as NorthStar accumulates a company\'s own track record, tells the system which hypotheses from similar contexts were correct and which weren\'t. Sales data contributes close/lost patterns — the feature requests that won or lost deals. And customer feedback threads, from Zendesk to NPS verbatims, fill in the texture that metrics alone don\'t capture.\n\nFrom this synthesis, NorthStar generates a Feature Hit List. The PM selects the highest-confidence item. NorthStar converts it into a product spec structured for Claude Code — complete with behavioral evidence, success metrics, test design, and effort estimates. The spec ships to a small user segment. NorthStar watches. When the experiment closes, the result enters the attribution ledger. The CPO now has a paper trail from product decision to revenue outcome — built automatically, every two weeks.',
      },
      {
        type: 'h2',
        text: 'THE BENCHMARK BET',
      },
      {
        type: 'p',
        text: 'When Benchmark led the company\'s $12 million seed round, it was betting not just on the product but on the category. Analytics and prioritization tools have existed for years. What NorthStar\'s backers believe is different is the closed loop: from a company\'s own data to a ranked hypothesis, to a Claude Code-ready spec, to a staged test, to a revenue entry in the attribution ledger. Most tools stop at the recommendation; NorthStar is built to prove whether it was right.',
      },
      {
        type: 'p',
        text: '"There\'s a massive gap between monitoring and intelligence," says Benchmark\'s Sarah Guo. "Every company has monitoring. Nobody has intelligence. That\'s the market NorthStar is building."',
      },
      {
        type: 'p',
        text: 'Forbes estimates NorthStar\'s current ARR at approximately $2.4M on 15 active pilot customers — a figure the company neither confirmed nor denied. At its current pricing of $3,000–$8,000 per month depending on the number of agents deployed, it would need to scale to roughly 40 customers to reach $3M ARR. Early indications suggest that goal is within sight.',
      },
    ],
  },
  {
    id: 'theinformation',
    pub: 'The Information',
    pubColor: '#C41230',
    category: 'ARTIFICIAL INTELLIGENCE',
    eyebrow: 'Deep Dive',
    headline: 'Inside the Competitive Intelligence Startup Quietly Reshaping How PMs Build Product',
    dek: 'NorthStar AI is telling product managers what competitors are building before they ship. The implications for how software companies plan — and how they fight — are only beginning to come into focus.',
    date: 'March 5, 2026',
    readTime: '12 min read',
    author: 'Jessica Liang',
    authorTitle: 'Staff Writer, The Information',
    coverBg: 'linear-gradient(135deg, #08000a 0%, #110010 100%)',
    accentColor: '#C41230',
    textStyle: 'theinformation',
    body: [
      {
        type: 'lede',
        text: 'The document sitting in a product leader\'s inbox on a Wednesday morning in October read like a standard briefing. Bullet points. Confidence percentages. Data sources cited. What made it unusual was the date stamp at the top: the intelligence it contained would not become public for another six weeks, when the company\'s primary competitor shipped the exact feature it described.',
      },
      {
        type: 'p',
        text: 'That document came from NorthStar AI, an 18-month-old startup that has built a system for inferring what software companies are building before they announce it. According to three people familiar with the company\'s early customer base, NorthStar has already produced at least four such accurate predictions for paying customers — each of which enabled a response before the competitive threat materialized.',
      },
      {
        type: 'p',
        text: 'The company has raised $12 million in seed funding, is operating in closed pilot with 15 companies, and has said nothing publicly about its technology or strategy. This article is based on conversations with the founder, two early customers, and three investors who passed on the deal.',
      },
      {
        type: 'h2',
        text: 'What the system actually does',
      },
      {
        type: 'p',
        text: 'NorthStar is a product operating system that ingests four internal data sources — user behavioral analytics, past launch history with outcome data, sales CRM signals, and customer feedback — and synthesizes them into a ranked prioritization output the company calls a Feature Hit List. Each item carries a confidence score derived from the convergence of signals across all four inputs. The highest-ranked hypothesis is then converted by NorthStar\'s output layer into a product spec designed for direct ingestion by Claude Code: structured problem statement, behavioral evidence, success criteria, test design, and effort tier. The spec deploys to a defined small user segment. NorthStar monitors the behavioral response against its predicted lift range, tracking toward statistical significance. When the test closes, the result — hypothesis, spec, code change, measured outcome, revenue delta — is written to a running attribution ledger. Over time, that ledger becomes the company\'s institutional memory for product decisions: what was bet, what was built, what worked, and what it was worth.',
      },
      {
        type: 'p',
        text: 'The more important distinction is what these tools do with their output: most analytics and prioritization tools stop at the recommendation. NorthStar\'s architecture is designed to close the loop — from the data that generated the hypothesis, through the code change, to the revenue entry in the ledger. That full-loop design is either a significant technical moat or an ambitious integration challenge, depending on whether Lal\'s team can execute it.',
      },
      {
        type: 'quote',
        text: '"Individually, none of these signals mean anything. Collectively, they tell you almost everything about what a company is prioritizing."',
        attribution: 'NorthStar AI, internal framing',
      },
      {
        type: 'h2',
        text: 'The customer evidence',
      },
      {
        type: 'p',
        text: 'One customer, a Series B company in the HR technology space, described receiving a Feature Hit List generated from their own PostHog data, past launch history, and support tickets — with an onboarding activation hypothesis at the top and a 0.84 confidence score. Two prior attempts at that moment had shipped without a clear success metric; NorthStar surfaced why they were inconclusive and generated a Claude Code-ready spec. They shipped to 10% of users. Result: 34% activation lift, $340K ARR attributed in the ledger.',
      },
      {
        type: 'p',
        text: '"The confidence score was what got my attention," said the customer, who asked not to be named. "It wasn\'t claiming certainty. It was saying: here is what we believe, here is why, here is how confident we are. That\'s a level of epistemic honesty I\'d never seen from a prioritization tool."',
      },
      {
        type: 'p',
        text: 'Two other customers, in the B2B SaaS and consumer fintech spaces, described similar experiences: internal data synthesized into a Hit List, a spec handed to engineering, a staged rollout, and an attribution entry when the test closed.',
      },
      {
        type: 'h2',
        text: 'The questions the company hasn\'t answered',
      },
      {
        type: 'p',
        text: 'Several questions about NorthStar\'s approach remain unresolved. The company has not disclosed how often hypotheses fail to move the needle — which will be central to evaluating its actual reliability at scale. The methodology for weighting the four data sources, while described in broad strokes, has not been validated by independent researchers.',
      },
      {
        type: 'p',
        text: 'Three investors who reviewed NorthStar during its seed round and passed cited the same concern: that the full-loop architecture — integrating behavioral analytics, launch history, CRM, and feedback into one system and then tracking through to revenue — is an ambitious integration challenge that could prove difficult to execute at scale.',
      },
      {
        type: 'p',
        text: 'The founder\'s response to this concern, relayed through a spokesperson: "That\'s exactly what we\'re building for. The model gets harder to fool as it gets smarter. That\'s the moat."',
      },
    ],
  },
]

/* ─────────────────────────────────────────────────────────
   PUBLICATION CARD
───────────────────────────────────────────────────────── */

function PubCard({
  article,
  onClick,
}: {
  article: (typeof ARTICLES)[0]
  onClick: () => void
}) {
  return (
    <motion.button
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={onClick}
      className="text-left w-full group rounded-2xl border border-[#1a1a1a] bg-[#0d0b12]/80 overflow-hidden hover:border-zinc-700/60 transition-colors duration-200"
    >
      {/* Publication color bar */}
      <div className="h-1 w-full" style={{ background: article.pubColor }} />

      <div className="p-7">
        {/* Category + eyebrow */}
        <div className="flex items-center justify-between mb-4">
          <span
            className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase"
            style={{ color: article.pubColor }}
          >
            {article.category}
          </span>
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
            {article.eyebrow}
          </span>
        </div>

        {/* Headline */}
        <h3 className="text-zinc-100 text-base font-semibold leading-snug mb-3 group-hover:text-white transition-colors">
          {article.headline}
        </h3>

        {/* Dek */}
        <p className="text-zinc-500 text-sm leading-relaxed mb-5 line-clamp-3">
          {article.dek}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 shrink-0" />
            <div>
              <span className="text-xs text-zinc-400 font-medium">{article.author}</span>
              <span className="text-xs text-zinc-600 mx-1.5">·</span>
              <span className="text-xs text-zinc-600">{article.date}</span>
            </div>
          </div>
          <ArrowUpRight
            className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0"
          />
        </div>
      </div>
    </motion.button>
  )
}

/* ─────────────────────────────────────────────────────────
   ARTICLE BODY RENDERER
───────────────────────────────────────────────────────── */

function ArticleBody({
  blocks,
  accentColor,
  style,
}: {
  blocks: (typeof ARTICLES)[0]['body']
  accentColor: string
  style: string
}) {
  const isTechCrunch = style === 'techcrunch'
  const isForbes = style === 'forbes'

  const fontFamily = isForbes
    ? '"Times New Roman", Georgia, serif'
    : isTechCrunch
    ? '"Inter", "SF Pro Text", -apple-system, sans-serif'
    : 'Georgia, serif'

  return (
    <div style={{ fontFamily }}>
      {blocks.map((block, i) => {
        if (block.type === 'lede') {
          return (
            <p
              key={i}
              className="text-base leading-relaxed mb-6 font-medium"
              style={{ color: '#e2e8f0', fontSize: isForbes ? '17px' : '16px' }}
            >
              {block.text}
            </p>
          )
        }
        if (block.type === 'p') {
          return (
            <p
              key={i}
              className="leading-relaxed mb-5"
              style={{
                color: '#94a3b8',
                fontSize: isForbes ? '16px' : '15px',
                lineHeight: '1.75',
              }}
            >
              {block.text}
            </p>
          )
        }
        if (block.type === 'h2') {
          return (
            <h2
              key={i}
              className={`font-bold mb-4 mt-8 ${isForbes ? 'uppercase tracking-widest text-sm' : 'text-lg'}`}
              style={{
                color: isForbes ? accentColor : '#e2e8f0',
                fontFamily: isForbes ? '"Arial", sans-serif' : fontFamily,
                borderBottom: isTechCrunch ? `2px solid ${accentColor}22` : undefined,
                paddingBottom: isTechCrunch ? '8px' : undefined,
              }}
            >
              {block.text}
            </h2>
          )
        }
        if (block.type === 'quote') {
          return (
            <blockquote
              key={i}
              className="my-8 pl-5 py-1"
              style={{ borderLeft: `3px solid ${accentColor}` }}
            >
              <p
                className="text-base leading-relaxed mb-3 italic"
                style={{
                  color: '#cbd5e1',
                  fontFamily: isForbes ? 'Georgia, serif' : fontFamily,
                  fontSize: '16px',
                }}
              >
                {block.text}
              </p>
              <cite
                className="text-xs not-italic"
                style={{ color: accentColor, fontFamily: '"Inter", sans-serif' }}
              >
                {block.attribution}
              </cite>
            </blockquote>
          )
        }
        return null
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   ARTICLE MODAL
───────────────────────────────────────────────────────── */

function ArticleModal({
  article,
  onClose,
}: {
  article: (typeof ARTICLES)[0]
  onClose: () => void
}) {
  const isTC = article.textStyle === 'techcrunch'
  const isForbes = article.textStyle === 'forbes'

  // Modal chrome background per publication
  const modalBg = isTC ? '#0a0a0a' : isForbes ? '#0d0b00' : '#080810'
  const headerBg = isTC ? '#111' : isForbes ? '#100d00' : '#0c0c18'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-2xl mx-4 my-12 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: modalBg }}
      >
        {/* Publication header bar */}
        <div
          className="sticky top-0 z-10 px-8 py-4 flex items-center justify-between border-b"
          style={{
            background: headerBg,
            borderColor: `${article.accentColor}22`,
          }}
        >
          <div className="flex items-center gap-4">
            {/* Publication logo in header */}
            {article.id === 'techcrunch' && (
              <TechCrunchLogo className="h-5 w-auto text-zinc-200" />
            )}
            {article.id === 'forbes' && (
              <ForbesLogo className="h-6 w-auto text-zinc-200" />
            )}
            {article.id === 'theinformation' && (
              <TheInformationLogo className="h-5 w-auto text-zinc-200" />
            )}
            <div
              className="h-4 w-px"
              style={{ background: `${article.accentColor}40` }}
            />
            <span
              className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase"
              style={{ color: article.accentColor }}
            >
              {article.category}
            </span>
          </div>

          {/* Fictional disclaimer + close */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-[10px] font-mono text-zinc-600 uppercase tracking-wider border border-zinc-800 rounded px-2 py-0.5">
              Vision · Not published
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center border border-zinc-800 text-zinc-500 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Article content */}
        <div className="px-8 sm:px-12 py-10">
          {/* Category / eyebrow */}
          <div className="flex items-center gap-2 mb-5">
            <span
              className="text-[11px] font-mono font-bold tracking-[0.18em] uppercase"
              style={{ color: article.accentColor }}
            >
              {article.eyebrow}
            </span>
            <span className="text-zinc-700">·</span>
            <span className="text-[11px] font-mono text-zinc-600 uppercase tracking-wider">
              {article.readTime}
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-zinc-50 font-bold leading-tight mb-4"
            style={{
              fontSize: 'clamp(22px, 3vw, 30px)',
              fontFamily: isForbes
                ? '"Times New Roman", Georgia, serif'
                : isTC
                ? '"Inter", "SF Pro Display", sans-serif'
                : 'Georgia, serif',
              letterSpacing: isForbes ? '-0.01em' : isTC ? '-0.02em' : '-0.01em',
            }}
          >
            {article.headline}
          </h1>

          {/* Dek */}
          <p
            className="text-zinc-400 text-base leading-relaxed mb-6 pb-6 border-b"
            style={{ borderColor: '#1a1a1a' }}
          >
            {article.dek}
          </p>

          {/* Byline */}
          <div className="flex items-center gap-3 mb-8 pb-8 border-b" style={{ borderColor: '#1a1a1a' }}>
            <div
              className="w-9 h-9 rounded-full border-2 shrink-0 flex items-center justify-center text-xs font-bold"
              style={{ borderColor: article.accentColor, color: article.accentColor, background: `${article.accentColor}15` }}
            >
              {article.author.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">{article.author}</p>
              <p className="text-xs text-zinc-500">{article.authorTitle} · {article.date}</p>
            </div>
          </div>

          {/* Body */}
          <ArticleBody
            blocks={article.body}
            accentColor={article.accentColor}
            style={article.textStyle}
          />

          {/* Footer */}
          <div
            className="mt-10 pt-6 border-t flex items-center justify-between"
            style={{ borderColor: '#1a1a1a' }}
          >
            <span
              className="text-xs font-mono uppercase tracking-[0.18em]"
              style={{ color: article.accentColor }}
            >
              {article.pub}
            </span>
            <span className="text-[10px] font-mono text-zinc-700 border border-zinc-800 rounded px-2 py-0.5 uppercase tracking-wider">
              Vision · Not published
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────── */

export default function NewsroomPage() {
  const [active, setActive] = useState<string | null>(null)
  const activeArticle = ARTICLES.find(a => a.id === active) ?? null

  return (
    <div
      className="min-h-screen text-zinc-50 overflow-x-hidden"
      style={{ background: '#0A0F1E' }}
    >
      {/* ── NAV ────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-sm"
        style={{ background: 'rgba(10,15,30,0.92)', borderColor: '#1a2035' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <Logo size={28} wordmark color="white" className="shrink-0" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-500">
            <Link href="/" className="hover:text-zinc-100 transition-colors">Home</Link>
            <Link href="/#how-it-works" className="hover:text-zinc-100 transition-colors">How it works</Link>
            <Link href="/case-studies" className="hover:text-zinc-100 transition-colors">Case Studies</Link>
            <Link href="/newsroom" className="text-zinc-100 font-medium transition-colors">Newsroom</Link>
            <Link href="/rising-products" className="hover:text-zinc-100 transition-colors">Rising Products</Link>
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

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-28 px-6 overflow-hidden">
        {/* Star-field: layered radial gradients + CSS noise substitute */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Ambient glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] rounded-full blur-[120px]"
            style={{ background: 'rgba(124,58,237,0.08)' }} />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px] rounded-full blur-[80px]"
            style={{ background: 'rgba(100,120,255,0.06)' }} />
          {/* Star dots via box-shadow — purely decorative */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px), radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
            backgroundSize: '80px 80px, 40px 40px',
            backgroundPosition: '0 0, 20px 20px',
            opacity: 0.12,
          }} />
        </div>

        <div className="max-w-3xl mx-auto text-center relative">
          {/* Eyebrow */}
          <p className="inline-flex items-center gap-2 text-[#7C3AED] text-[11px] font-mono uppercase tracking-[0.18em] mb-7">
            <span className="inline-block w-3 h-px bg-[#7C3AED]" />
            NorthStar AI · Press
            <span className="inline-block w-3 h-px bg-[#7C3AED]" />
          </p>

          {/* Headline */}
          <h1
            className="mb-5 text-zinc-50"
            style={{ fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif' }}
          >
            The Story We&apos;re Writing
          </h1>

          {/* Subheadline */}
          <p className="text-[#94A3B8] text-lg leading-relaxed max-w-lg mx-auto mb-14">
            Coverage we&apos;re building toward — and earning every day.
          </p>

          {/* Publication logos */}
          <div className="flex items-center justify-center gap-10 sm:gap-16 flex-wrap">
            {[
              { id: 'techcrunch', Logo: TechCrunchLogo },
              { id: 'forbes', Logo: ForbesLogo },
              { id: 'theinformation', Logo: TheInformationLogo },
            ].map(({ id, Logo: PubLogo }) => {
              const article = ARTICLES.find(a => a.id === id)!
              return (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    opacity: 0.45,
                    filter: 'brightness(0) invert(1)',
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.opacity = '1'
                    ;(e.currentTarget as HTMLElement).style.filter = `brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(${id === 'techcrunch' ? '85deg' : id === 'forbes' ? '30deg' : '320deg'})`
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.opacity = '0.45'
                    ;(e.currentTarget as HTMLElement).style.filter = 'brightness(0) invert(1)'
                  }}
                  title={`Read: ${article.headline}`}
                >
                  <PubLogo className="h-7 w-auto" />
                </button>
              )
            })}
          </div>

          <p className="mt-8 text-xs text-zinc-700 font-mono tracking-wide">
            Aspirational coverage · Vision board · Not published
          </p>
        </div>
      </section>

      {/* ── CARDS GRID ──────────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.18em] mb-8 text-center">
            Click any card to read the full article
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            {ARTICLES.map(article => (
              <PubCard
                key={article.id}
                article={article}
                onClick={() => setActive(article.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── EDITORIAL NOTE ──────────────────────────────────── */}
      <section className="py-12 px-6">
        <div className="max-w-xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs font-mono text-zinc-600 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
            These are vision pieces — the stories NorthStar is earning the right to tell.
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer
        className="py-12 px-6 border-t"
        style={{ borderColor: '#1a2035' }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-zinc-500">
            <Logo size={18} className="shrink-0" />
            <span className="text-sm font-medium tracking-wide">NorthStar</span>
          </div>
          <p className="text-xs text-zinc-600 text-center md:text-left max-w-sm leading-relaxed">
            Built by a PM who spent a decade at Snap, Meta, Apple, and Google.
          </p>
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <Link href="/case-studies" className="hover:text-zinc-400 transition-colors">Case Studies</Link>
            <Link href="/newsroom" className="text-zinc-400">Newsroom</Link>
            <Link href="/rising-products" className="hover:text-zinc-400 transition-colors">Rising Products</Link>
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
          </div>
        </div>
      </footer>

      {/* ── ARTICLE MODAL ───────────────────────────────────── */}
      <AnimatePresence>
        {activeArticle && (
          <ArticleModal
            article={activeArticle}
            onClose={() => setActive(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
