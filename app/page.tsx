import Link from 'next/link'
import NorthStarLoader from '@/components/NorthStarLoader'

export const metadata = {
  title: 'Agent NorthStar — The Fastest Experimenter in Your Space',
  description:
    'NorthStar watches your market 24/7, maps competitor flows, finds the gaps in your product, and turns them into tested experiments. Shipped.',
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: '#07080A',
  surface: '#0F1114',
  surface2: '#161A1F',
  amber: '#E8A030',
  text: '#F2EDE6',
  muted: 'rgba(242,237,230,0.45)',
  dim: 'rgba(242,237,230,0.22)',
  border: 'rgba(255,255,255,0.07)',
} as const

// ── Loop steps ────────────────────────────────────────────────────────────────
const LOOP = [
  {
    num: '01',
    label: 'MARKET',
    title: "What's trending in your space",
    body: 'NorthStar maps what new players in your vertical are shipping. What customers are gravitating toward. What the new standard is becoming.',
  },
  {
    num: '02',
    label: 'THREAT',
    title: 'How they deliver value',
    body: "We map each competitor's sign-up to aha moment. Exactly how they deliver the value your customers want — step by step.",
  },
  {
    num: '03',
    label: 'GAP',
    title: "Where you're falling behind",
    body: 'We overlay your existing flow against the new standard. Ranked gaps. Specific drop-offs. Tied to your OKRs — not vanity metrics.',
  },
  {
    num: '04',
    label: 'TEST',
    title: 'Smallest change. Fastest learning.',
    body: 'NorthStar generates a coding-agent-ready MD spec. Your PM approves, coding agent opens a PR, engineer reviews and merges. Test live. Results feed the next hypothesis.',
  },
]

// ── ICP checklist ─────────────────────────────────────────────────────────────
const ICP = [
  'You have 50K+ MAU and a clear conversion metric',
  'Your improvement cycle is 4–12 weeks today',
  'Your team uses GitHub + a coding agent (Cursor, Claude Code)',
  'You track analytics (PostHog, Amplitude, Mixpanel)',
  "You're measured on revenue impact, not tickets closed",
  "You have Q2 OKRs and not enough experiments to hit them",
]

export default function LandingPage() {
  return (
    <div
      style={{
        background: C.bg,
        color: C.text,
        fontFamily: "var(--font-sans-dm, 'DM Sans', sans-serif)",
        fontWeight: 400,
        overflowX: 'hidden',
      }}
    >
      {/* ── NAV ──────────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: 60,
          borderBottom: `1px solid ${C.border}`,
          background: 'rgba(7,8,10,0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <span
            style={{
              fontFamily: "var(--font-mono-dm, 'DM Mono', monospace)",
              fontSize: 13,
              letterSpacing: '0.08em',
              color: C.text,
            }}
          >
            AGENT<span style={{ color: C.amber }}>.</span>NORTHSTAR
          </span>

          {/* Links + CTA */}
          <div className="land-nav-links">
            <a
              href="#how-it-works"
              style={{ fontSize: 13, color: C.muted, textDecoration: 'none', fontWeight: 400 }}
            >
              How it works
            </a>
            <a
              href="#for-who"
              style={{ fontSize: 13, color: C.muted, textDecoration: 'none', fontWeight: 400 }}
            >
              For who
            </a>
            <Link
              href="/auth/login"
              style={{
                fontFamily: "var(--font-mono-dm, 'DM Mono', monospace)",
                fontSize: 12,
                background: C.amber,
                color: '#000',
                padding: '8px 16px',
                textDecoration: 'none',
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              Request access →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section
        className="land-hero"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient amber glow */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 800,
            height: 600,
            background: `radial-gradient(ellipse at center, rgba(232,160,48,0.05) 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: 760,
            margin: '0 auto',
            padding: '0 24px',
            textAlign: 'center',
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              display: 'inline-block',
              fontFamily: "var(--font-mono-dm, 'DM Mono', monospace)",
              fontSize: 11,
              letterSpacing: '0.12em',
              color: C.amber,
              border: `1px solid rgba(232,160,48,0.3)`,
              padding: '5px 12px',
              marginBottom: 32,
            }}
          >
            AUTONOMOUS GROWTH INTELLIGENCE
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--font-serif, 'Instrument Serif', serif)",
              fontSize: 'clamp(52px, 7vw, 88px)',
              fontWeight: 400,
              lineHeight: 1.02,
              letterSpacing: '-0.01em',
              color: C.text,
              margin: '0 0 28px',
            }}
          >
            The fastest companies{' '}
            <em style={{ color: C.amber, fontStyle: 'italic' }}>win.</em>
          </h1>

          {/* Sub */}
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.65,
              color: C.muted,
              maxWidth: 560,
              margin: '0 auto 40px',
              fontWeight: 300,
            }}
          >
            Your competitors are shipping. Your customers are already trying their new features.
            NorthStar makes sure you&apos;re never the last to learn what&apos;s working.
          </p>

          {/* CTAs */}
          <div
            className="land-hero-ctas"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              flexWrap: 'wrap',
              marginBottom: 32,
            }}
          >
            <Link
              href="/auth/login"
              style={{
                fontFamily: "var(--font-mono-dm, 'DM Mono', monospace)",
                fontSize: 13,
                background: C.amber,
                color: '#000',
                padding: '13px 24px',
                textDecoration: 'none',
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              Run NorthStar on my product →
            </Link>
            <a
              href="#how-it-works"
              style={{
                fontSize: 13,
                color: C.muted,
                textDecoration: 'none',
                border: `1px solid ${C.border}`,
                padding: '12px 20px',
                fontWeight: 400,
              }}
            >
              See how it works
            </a>
          </div>

          {/* Trust line */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: "var(--font-mono-dm, 'DM Mono', monospace)",
              fontSize: 11,
              color: C.dim,
              letterSpacing: '0.06em',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#22c55e',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            IN BETA
          </div>
        </div>
      </section>

      {/* ── LOADER ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
          background: C.surface,
        }}
      >
        <NorthStarLoader />
      </div>

      {/* ── PROBLEM ──────────────────────────────────────────────────────────── */}
      <section
        className="land-section"
        style={{ borderBottom: `1px solid ${C.border}` }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div
            style={{
              fontFamily: "var(--font-mono-dm, 'DM Mono', monospace)",
              fontSize: 11,
              color: C.amber,
              letterSpacing: '0.1em',
              marginBottom: 24,
            }}
          >
            THE PROBLEM
          </div>
          <h2
            style={{
              fontFamily: "var(--font-serif, 'Instrument Serif', serif)",
              fontSize: 'clamp(36px, 5vw, 60px)',
              fontWeight: 400,
              lineHeight: 1.1,
              color: C.text,
              maxWidth: 700,
              margin: '0 0 28px',
            }}
          >
            Your worst mistake isn&apos;t shipping too slow. It&apos;s not learning fast enough.
          </h2>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.7,
              color: C.muted,
              maxWidth: 600,
              fontWeight: 300,
            }}
          >
            New incumbents don&apos;t outbuild you. They out-experiment you. They ship smaller
            bets, learn faster, and compound those learnings week over week. By the time you
            notice them, they&apos;ve already reshaped what your customers expect.
          </p>
        </div>
      </section>

      {/* ── 4-STEP LOOP ──────────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="land-section"
        style={{ borderBottom: `1px solid ${C.border}` }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div
            style={{
              fontFamily: "var(--font-mono-dm, 'DM Mono', monospace)",
              fontSize: 11,
              color: C.amber,
              letterSpacing: '0.1em',
              marginBottom: 16,
            }}
          >
            THE LOOP
          </div>
          <h2
            style={{
              fontFamily: "var(--font-serif, 'Instrument Serif', serif)",
              fontSize: 'clamp(32px, 4vw, 52px)',
              fontWeight: 400,
              lineHeight: 1.1,
              color: C.text,
              margin: '0 0 64px',
            }}
          >
            From market signal to live experiment
          </h2>

          <div
            className="land-grid-4"
            style={{
              borderTop: `1px solid ${C.border}`,
              borderLeft: `1px solid ${C.border}`,
            }}
          >
            {LOOP.map((step) => (
              <div
                key={step.num}
                className="loop-step"
                style={{
                  padding: '40px 32px',
                  borderRight: `1px solid ${C.border}`,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono-dm, 'DM Mono', monospace)",
                    fontSize: 11,
                    color: C.dim,
                    letterSpacing: '0.08em',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span>{step.num}</span>
                  <span style={{ color: C.amber }}>— {step.label}</span>
                </div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: C.text,
                    margin: '0 0 14px',
                    lineHeight: 1.3,
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: C.muted,
                    margin: 0,
                    fontWeight: 300,
                  }}
                >
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TERMINAL + COPY ───────────────────────────────────────────────────── */}
      <section
        className="land-section"
        style={{ borderBottom: `1px solid ${C.border}` }}
      >
        <div
          className="land-grid-2-center"
          style={{ maxWidth: 1200, margin: '0 auto' }}
        >
          {/* Left: copy */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono-dm, 'DM Mono', monospace)",
                fontSize: 11,
                color: C.amber,
                letterSpacing: '0.1em',
                marginBottom: 20,
              }}
            >
              UNDER THE HOOD
            </div>
            <h2
              style={{
                fontFamily: "var(--font-serif, 'Instrument Serif', serif)",
                fontSize: 'clamp(32px, 3.5vw, 48px)',
                fontWeight: 400,
                lineHeight: 1.12,
                color: C.text,
                margin: '0 0 24px',
              }}
            >
              A 24/7 growth teammate who never stops watching
            </h2>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.75,
                color: C.muted,
                fontWeight: 300,
                margin: '0 0 20px',
              }}
            >
              NorthStar reads your analytics, watches your competitors, and generates ranked
              hypotheses with coding-agent-ready MD specs.
            </p>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.75,
                color: C.muted,
                fontWeight: 300,
                margin: 0,
              }}
            >
              Your PM approves. Your coding agent opens a PR. You ship. No sprint tickets. No
              spec meetings. No translation loss between PM and engineer.
            </p>
          </div>

          {/* Right: terminal */}
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              fontFamily: "var(--font-mono-dm, 'DM Mono', monospace)",
              fontSize: 12,
              overflow: 'hidden',
            }}
          >
            {/* Terminal chrome */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${C.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
              <span style={{ marginLeft: 'auto', fontSize: 10, color: C.dim, letterSpacing: '0.06em' }}>
                agent-northstar · apollo.io
              </span>
            </div>

            {/* Terminal body */}
            <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                {
                  key: 'competitor.detected',
                  val: 'outreach.io',
                  note: 'inline template suggestions · +22% activation',
                },
                {
                  key: 'gap.identified',
                  val: 'apollo step 2 blank editor',
                  note: '41% abandonment',
                  accent: true,
                },
                {
                  key: 'hypothesis.ranked',
                  val: '#1 confidence 0.87',
                  note: '"default to template, opt-out to blank" → Q2 KR trial-to-paid 34%→45%',
                },
                {
                  key: 'spec.generated',
                  val: '→ cursor / claude code ready',
                  note: undefined,
                },
                {
                  key: 'pr.open',
                  val: '22 mins after approval',
                  note: undefined,
                },
              ].map((line, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: line.accent ? C.amber : C.dim }}>{line.key}</span>
                    <span style={{ color: C.text }}>{line.val}</span>
                  </div>
                  {line.note && (
                    <span style={{ color: C.dim, paddingLeft: 16, fontSize: 11 }}>
                      {line.note}
                    </span>
                  )}
                </div>
              ))}

              {/* Blinking cursor */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <span style={{ color: C.dim }}>›</span>
                <span
                  className="cursor-blink"
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 14,
                    background: C.amber,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: `1px solid ${C.border}`,
          background: C.surface,
        }}
      >
        <div
          className="land-grid-3"
          style={{ maxWidth: 1200, margin: '0 auto' }}
        >
          {[
            { num: '10×', label: 'more experiments shipped per sprint vs baseline' },
            { num: '48h', label: 'from market signal to live PR — no sprint required' },
            { num: '0', label: 'meetings required to go from hypothesis to merged code' },
          ].map((stat, i) => (
            <div
              key={i}
              className={`land-stat-cell${i < 2 ? ' land-stat-border' : ''}`}
            >
              <div
                style={{
                  fontFamily: "var(--font-serif, 'Instrument Serif', serif)",
                  fontSize: 56,
                  fontWeight: 400,
                  color: C.amber,
                  lineHeight: 1,
                  marginBottom: 12,
                }}
              >
                {stat.num}
              </div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, fontWeight: 300 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* ── ICP ──────────────────────────────────────────────────────────────── */}
      <section
        id="for-who"
        className="land-section"
        style={{ borderBottom: `1px solid ${C.border}` }}
      >
        <div
          className="land-grid-2"
          style={{ maxWidth: 1200, margin: '0 auto' }}
        >
          {/* Left */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono-dm, 'DM Mono', monospace)",
                fontSize: 11,
                color: C.amber,
                letterSpacing: '0.1em',
                marginBottom: 20,
              }}
            >
              BUILT FOR
            </div>
            <h2
              style={{
                fontFamily: "var(--font-serif, 'Instrument Serif', serif)",
                fontSize: 'clamp(32px, 3.5vw, 48px)',
                fontWeight: 400,
                lineHeight: 1.12,
                color: C.text,
                margin: '0 0 24px',
              }}
            >
              VP / Head of Product at Series B–D SaaS
            </h2>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.75,
                color: C.muted,
                fontWeight: 300,
                margin: 0,
              }}
            >
              You have OKRs, traffic, and a team that moves fast when unblocked. NorthStar
              removes the bottleneck between &quot;we should test that&quot; and &quot;it&apos;s
              live.&quot;
            </p>
          </div>

          {/* Right: checklist */}
          <div
            style={{
              border: `1px solid ${C.border}`,
              background: C.surface,
              padding: '36px 40px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {ICP.map((item, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono-dm, 'DM Mono', monospace)",
                    fontSize: 12,
                    color: C.amber,
                    marginTop: 2,
                    flexShrink: 0,
                  }}
                >
                  YES
                </span>
                <span style={{ fontSize: 14, color: C.muted, lineHeight: 1.55, fontWeight: 300 }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section
        className="land-section"
        style={{
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
        }}
      >
        {/* Ambient glow */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 700,
            height: 500,
            background: `radial-gradient(ellipse at center, rgba(232,160,48,0.06) 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
          <h2
            style={{
              fontFamily: "var(--font-serif, 'Instrument Serif', serif)",
              fontSize: 'clamp(36px, 5vw, 60px)',
              fontWeight: 400,
              lineHeight: 1.1,
              color: C.text,
              margin: '0 0 20px',
            }}
          >
            Your competitors aren&apos;t waiting.{' '}
            <em style={{ color: C.amber, fontStyle: 'italic' }}>Neither should you.</em>
          </h2>
          <p
            style={{
              fontSize: 16,
              color: C.muted,
              lineHeight: 1.65,
              margin: '0 auto 44px',
              maxWidth: 480,
              fontWeight: 300,
            }}
          >
            We&apos;ll have a hypothesis on your highest-traffic surface within 24 hours of
            onboarding.
          </p>
          <div
            className="land-cta-buttons"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/auth/login"
              style={{
                fontFamily: "var(--font-mono-dm, 'DM Mono', monospace)",
                fontSize: 13,
                background: C.amber,
                color: '#000',
                padding: '14px 28px',
                textDecoration: 'none',
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              Run NorthStar on my product →
            </Link>
            <Link
              href="/auth/signin"
              style={{
                fontSize: 13,
                color: C.muted,
                textDecoration: 'none',
                border: `1px solid ${C.border}`,
                padding: '13px 20px',
                fontWeight: 400,
              }}
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: `1px solid ${C.border}`,
          padding: '28px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono-dm, 'DM Mono', monospace)",
              fontSize: 12,
              color: C.dim,
              letterSpacing: '0.06em',
            }}
          >
            AGENT<span style={{ color: C.amber }}>.</span>NORTHSTAR · Built in San Francisco · © 2025
          </span>
          <div style={{ display: 'flex', gap: 28 }}>
            {['Privacy', 'Terms', 'Security'].map((link) => (
              <a
                key={link}
                href="#"
                style={{ fontSize: 12, color: C.dim, textDecoration: 'none' }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
