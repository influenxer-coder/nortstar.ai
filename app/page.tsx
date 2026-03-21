import Link from 'next/link'
import NorthStarLoader from '@/components/NorthStarLoader'
import NorthStarDemo from '@/components/NorthStarDemo'

export const metadata = {
  title: 'Agent NorthStar — The Fastest Experimenter in Your Space',
  description:
    'NorthStar watches your market 24/7, maps competitor flows, finds the gaps in your product, and turns them into tested experiments. Shipped.',
}

// ── Statsig-inspired design tokens ───────────────────────────────────────────
const C = {
  bg: '#f6f6f6',
  surface: '#ffffff',
  surface2: '#ededed',
  blue: '#367eed',
  blueTint: 'rgba(54,126,237,0.08)',
  text: '#1f2328',
  muted: '#535963',
  dim: '#9ca3af',
  border: '#d4d7dc',
  green: '#10b981',
  shadow: '0 0 20px rgba(27,37,40,0.06)',
} as const

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

const ICP = [
  'You have 50K+ MAU and a clear conversion metric',
  'Your improvement cycle is 4–12 weeks today',
  'Your team uses GitHub + a coding agent (Cursor, Claude Code)',
  'You track analytics (PostHog, Amplitude, Mixpanel)',
  "You're measured on revenue impact, not tickets closed",
  "You have Q2 OKRs and not enough experiments to hit them",
]

const sansFont = "var(--font-sans-dm, 'Inter', -apple-system, sans-serif)"
const monoFont = "var(--font-mono-dm, 'Geist Mono', monospace)"

const pillBtn = (primary: boolean) => ({
  display: 'inline-block',
  fontFamily: sansFont,
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 30,
  padding: '11px 24px',
  textDecoration: 'none',
  border: primary ? 'none' : `1px solid ${C.border}`,
  background: primary ? C.text : C.surface,
  color: primary ? C.surface : C.muted,
  cursor: 'pointer',
  letterSpacing: '-0.01em',
} as const)

export default function LandingPage() {
  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: sansFont, overflowX: 'hidden' }}>

      {/* ── NAV ───────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 60,
        borderBottom: `1px solid ${C.border}`,
        background: 'rgba(246,246,246,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 24px',
          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: monoFont, fontSize: 13, letterSpacing: '0.08em', color: C.text, fontWeight: 600 }}>
            AGENT<span style={{ color: C.blue }}>.</span>NORTHSTAR
          </span>

          <div className="land-nav-links">
            <a href="#how-it-works" style={{ fontSize: 14, color: C.muted, textDecoration: 'none', fontWeight: 500 }}>How it works</a>
            <a href="#for-who" style={{ fontSize: 14, color: C.muted, textDecoration: 'none', fontWeight: 500 }}>For who</a>
            <Link href="/auth/login" style={{
              fontFamily: sansFont, fontSize: 13, fontWeight: 600,
              background: C.text, color: C.surface,
              padding: '7px 18px', textDecoration: 'none', borderRadius: 30,
            }}>
              Request access →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section className="land-hero" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 800, height: 600, pointerEvents: 'none',
          background: `radial-gradient(ellipse at center, ${C.blueTint} 0%, transparent 70%)`,
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 760, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          {/* Eyebrow */}
          <div style={{
            display: 'inline-block',
            fontFamily: monoFont, fontSize: 11, fontWeight: 600,
            letterSpacing: '0.1em', color: C.blue,
            border: `1px solid rgba(54,126,237,0.3)`,
            padding: '5px 14px', marginBottom: 32, borderRadius: 30,
          }}>
            AUTONOMOUS GROWTH INTELLIGENCE
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: sansFont,
            fontSize: 'clamp(44px, 6vw, 64px)',
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-2px',
            color: C.text,
            margin: '0 0 24px',
          }}>
            The fastest learners{' '}
            <em style={{ color: C.blue, fontStyle: 'italic' }}>win.</em>
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: 18, lineHeight: 1.65, color: C.muted,
            maxWidth: 540, margin: '0 auto 40px', fontWeight: 400,
          }}>
            Your competitors are shipping. Your customers are already trying their new features.
            NorthStar makes sure you&apos;re never the last to learn what&apos;s working.
          </p>

          {/* CTAs */}
          <div className="land-hero-ctas" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 12, flexWrap: 'wrap', marginBottom: 36,
          }}>
            <Link href="/auth/login" style={pillBtn(true)}>Run NorthStar on my product →</Link>
            <a href="#how-it-works" style={pillBtn(false)}>See how it works</a>
          </div>

          {/* Trust line */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 7, fontFamily: monoFont, fontSize: 11, color: C.dim, letterSpacing: '0.06em',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'inline-block', flexShrink: 0 }} />
            IN BETA
          </div>

          {/* Loader */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <NorthStarLoader bgColor={C.bg} />
          </div>
        </div>
      </section>

      {/* ── PROBLEM ───────────────────────────────────────────────────────────── */}
      <section className="land-section" style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontFamily: monoFont, fontSize: 11, fontWeight: 600, color: C.blue, letterSpacing: '0.1em', marginBottom: 20 }}>
            THE PROBLEM
          </div>
          <h2 style={{
            fontFamily: sansFont, fontSize: 'clamp(32px, 4vw, 52px)',
            fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1.1,
            color: C.text, maxWidth: 680, margin: '0 auto 24px',
          }}>
            Your worst mistake isn&apos;t shipping too slow. It&apos;s not learning fast enough.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: C.muted, maxWidth: 580, fontWeight: 400, margin: '0 auto' }}>
            New incumbents don&apos;t outbuild you. They out-experiment you. They ship smaller
            bets, learn faster, and compound those learnings week over week. By the time you
            notice them, they&apos;ve already reshaped what your customers expect.
          </p>
        </div>
      </section>

      {/* ── 4-STEP LOOP ───────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="land-section" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontFamily: monoFont, fontSize: 11, fontWeight: 600, color: C.blue, letterSpacing: '0.1em', marginBottom: 16 }}>
            THE LOOP
          </div>
          <h2 style={{
            fontFamily: sansFont, fontSize: 'clamp(28px, 3.5vw, 44px)',
            fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.1,
            color: C.text, margin: '0 auto 56px',
          }}>
            From market signal to live experiment
          </h2>

          <div className="land-grid-4" style={{ textAlign: 'left', gap: 16 }}>
            {LOOP.map((step) => (
              <div key={step.num} className="loop-step" style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '32px 28px',
                boxShadow: C.shadow,
              }}>
                <div style={{
                  fontFamily: monoFont, fontSize: 11, letterSpacing: '0.06em',
                  marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ color: C.dim, fontWeight: 500 }}>{step.num}</span>
                  <span style={{ color: C.blue, fontWeight: 600 }}>— {step.label}</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 12px', lineHeight: 1.35 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: C.muted, margin: 0, fontWeight: 400 }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO ──────────────────────────────────────────────────────────────── */}
      <section style={{ borderBottom: `1px solid ${C.border}`, background: C.surface, padding: '72px 32px 0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>

          {/* Laptop frame */}
          <div style={{ filter: 'drop-shadow(0 32px 64px rgba(0,0,0,0.18))' }}>

            {/* Screen body */}
            <div style={{ background: '#1c1c1e', borderRadius: '16px 16px 0 0', padding: '14px 14px 0' }}>
              {/* Camera dot */}
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#3a3a3c' }} />
              </div>
              {/* Browser chrome */}
              <div style={{ background: '#2c2c2e', borderRadius: '6px 6px 0 0', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
                    <span key={i} style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: c }} />
                  ))}
                </div>
                <div style={{ flex: 1, background: '#3a3a3c', borderRadius: 6, padding: '4px 12px', fontFamily: monoFont, fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
                  agent-northstar.com
                </div>
              </div>
              {/* Screen content */}
              <div style={{ background: C.bg, maxHeight: 560, overflowY: 'auto', overflowX: 'hidden' }}>
                <NorthStarDemo compact />
              </div>
            </div>

            {/* Hinge */}
            <div style={{ height: 5, background: 'linear-gradient(to bottom, #111, #3a3a3c)' }} />

            {/* Keyboard base */}
            <div style={{ background: 'linear-gradient(to bottom, #e2e2e2, #c8c8c8)', height: 30, borderRadius: '0 0 10px 10px', position: 'relative', marginLeft: -16, marginRight: -16 }}>
              <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', width: 88, height: 13, background: '#bdbdbd', border: '1px solid #aaa', borderRadius: 4 }} />
            </div>

            {/* Bottom edge */}
            <div style={{ height: 4, background: '#b0b0b0', borderRadius: '0 0 4px 4px', marginLeft: -20, marginRight: -20 }} />
          </div>

        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────────────────── */}
      <section style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div className="land-grid-3" style={{ maxWidth: 1200, margin: '0 auto' }}>
          {[
            { num: '10×', label: 'more experiments shipped per sprint vs baseline' },
            { num: '48h', label: 'from market signal to live PR — no sprint required' },
            { num: '0', label: 'meetings required to go from hypothesis to merged code' },
          ].map((stat, i) => (
            <div key={i} className={`land-stat-cell${i < 2 ? ' land-stat-border' : ''}`}>
              <div style={{
                fontFamily: sansFont, fontSize: 52, fontWeight: 700,
                color: C.blue, lineHeight: 1, marginBottom: 10, letterSpacing: '-2px',
              }}>
                {stat.num}
              </div>
              <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.55, fontWeight: 400 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ICP ───────────────────────────────────────────────────────────────── */}
      <section id="for-who" className="land-section" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="land-grid-2" style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Left */}
          <div>
            <div style={{ fontFamily: monoFont, fontSize: 11, fontWeight: 600, color: C.blue, letterSpacing: '0.1em', marginBottom: 20 }}>
              BUILT FOR
            </div>
            <h2 style={{
              fontFamily: sansFont, fontSize: 'clamp(28px, 3vw, 40px)',
              fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.15,
              color: C.text, margin: '0 0 20px',
            }}>
              VP / Head of Product at Series B–D SaaS
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.75, color: C.muted, fontWeight: 400, margin: 0 }}>
              You have OKRs, traffic, and a team that moves fast when unblocked. NorthStar
              removes the bottleneck between &quot;we should test that&quot; and &quot;it&apos;s live.&quot;
            </p>
          </div>

          {/* Right: checklist */}
          <div style={{
            border: `1px solid ${C.border}`, background: C.surface,
            borderRadius: 10, padding: '32px 36px',
            boxShadow: C.shadow,
            display: 'flex', flexDirection: 'column', gap: 18,
          }}>
            {ICP.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <span style={{
                  fontFamily: monoFont, fontSize: 11, fontWeight: 700,
                  color: C.surface, background: C.blue,
                  padding: '1px 8px', borderRadius: 30,
                  marginTop: 2, flexShrink: 0,
                }}>
                  YES
                </span>
                <span style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, fontWeight: 400 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <section className="land-section" style={{ background: C.surface, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 700, height: 500, pointerEvents: 'none',
          background: `radial-gradient(ellipse at center, ${C.blueTint} 0%, transparent 70%)`,
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{
            fontFamily: sansFont, fontSize: 'clamp(32px, 4vw, 52px)',
            fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1.1,
            color: C.text, margin: '0 0 18px',
          }}>
            Your competitors aren&apos;t waiting.{' '}
            <em style={{ color: C.blue, fontStyle: 'italic' }}>Neither should you.</em>
          </h2>
          <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.65, margin: '0 auto 40px', maxWidth: 460, fontWeight: 400 }}>
            We&apos;ll have a hypothesis on your highest-traffic surface within 24 hours of onboarding.
          </p>
          <div className="land-cta-buttons" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/auth/login" style={pillBtn(true)}>Run NorthStar on my product →</Link>
            <Link href="/auth/signin" style={pillBtn(false)}>Log in</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '28px 24px', background: C.bg }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16,
        }}>
          <span style={{ fontFamily: monoFont, fontSize: 12, color: C.dim, letterSpacing: '0.06em', fontWeight: 500 }}>
            AGENT<span style={{ color: C.blue }}>.</span>NORTHSTAR · Built in San Francisco · © 2025
          </span>
          <div style={{ display: 'flex', gap: 28 }}>
            {['Privacy', 'Terms', 'Security'].map((link) => (
              <a key={link} href="#" style={{ fontSize: 13, color: C.dim, textDecoration: 'none', fontWeight: 400 }}>{link}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
