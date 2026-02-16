'use client'

interface LogoProps {
  className?: string
  size?: number
}

/**
 * North Star logo: eight-pointed star with dark red center and lighter red points.
 * Flat design matching the brand mark.
 */
export function Logo({ className = '', size = 24 }: LogoProps) {
  const cx = size / 2
  const cy = size / 2
  const innerR = size * 0.18  // center circle
  const midR = size * 0.22    // base of each point
  const outerR = size * 0.48  // tip of each point

  const deg = (d: number) => (d * Math.PI) / 180

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      {/* 8 radiating points (lighter red) */}
      <g fill="#eb554f">
        {[...Array(8)].map((_, i) => {
          const a = i * 45
          const a1 = a - 22.5
          const a2 = a + 22.5
          const x0 = cx + midR * Math.cos(deg(a1))
          const y0 = cy + midR * Math.sin(deg(a1))
          const x1 = cx + midR * Math.cos(deg(a2))
          const y1 = cy + midR * Math.sin(deg(a2))
          const x2 = cx + outerR * Math.cos(deg(a))
          const y2 = cy + outerR * Math.sin(deg(a))
          return (
            <polygon key={i} points={`${x0},${y0} ${x1},${y1} ${x2},${y2}`} />
          )
        })}
      </g>
      {/* Center circle (darker red) */}
      <circle cx={cx} cy={cy} r={innerR} fill="#b72b2a" />
    </svg>
  )
}
