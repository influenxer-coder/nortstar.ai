'use client'

interface LogoProps {
  className?: string
  size?: number
  /** Render mark + "NORTHSTAR" wordmark with 10px gap (e.g. for nav) */
  wordmark?: boolean
  /** Mark color: 'white' | 'purple'. Default white when wordmark, else inherit (currentColor) */
  color?: 'white' | 'purple'
}

const RAD = (d: number) => (d * Math.PI) / 180

/**
 * NorthStar logo: five-point star, sharp geometric, slightly elongated on vertical axis,
 * with abstract arrowhead/A cutout in the center. Wordmark "NORTHSTAR" in all caps.
 */
export function Logo({
  className = '',
  size = 24,
  wordmark = false,
  color,
}: LogoProps) {
  const s = Math.min(32, Math.max(24, size))
  const cx = s / 2
  const cy = s / 2
  const fill = color === 'purple' ? '#7C3AED' : color === 'white' ? '#fff' : 'currentColor'

  const Rx = s * 0.38
  const Ry = s * 0.44
  const rxInner = s * 0.16
  const ryInner = s * 0.2
  const outerAngles = [-90, -18, 54, 126, 198]
  const innerAngles = [-54, 18, 90, 162, 234]
  const starPoints: [number, number][] = []
  for (let i = 0; i < 5; i++) {
    starPoints.push([
      cx + Rx * Math.cos(RAD(outerAngles[i])),
      cy + Ry * Math.sin(RAD(outerAngles[i])),
    ])
    starPoints.push([
      cx + rxInner * Math.cos(RAD(innerAngles[i])),
      cy + ryInner * Math.sin(RAD(innerAngles[i])),
    ])
  }
  const starPath = starPoints.map(([x, y]) => `${x},${y}`).join(' ')

  const arrowTop = [cx, cy - s * 0.12]
  const arrowLeft = [cx - s * 0.16, cy + s * 0.06]
  const arrowRight = [cx + s * 0.16, cy + s * 0.06]

  const starPathD = `M ${starPoints.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`
  const arrowPathD = `M ${arrowTop[0]} ${arrowTop[1]} L ${arrowLeft[0]} ${arrowLeft[1]} L ${arrowRight[0]} ${arrowRight[1]} Z`
  const pathD = `${starPathD} ${arrowPathD}`

  const mark = (
    <svg
      viewBox={`0 0 ${s} ${s}`}
      width={s}
      height={s}
      className={className}
      aria-hidden
    >
      <path fillRule="evenodd" d={pathD} fill={fill} />
    </svg>
  )

  if (wordmark) {
    return (
      <div className="inline-flex items-center gap-[10px]">
        {mark}
        <span className="font-sans font-medium tracking-[0.05em] text-[15px] sm:text-base text-inherit uppercase">
          NORTHSTAR
        </span>
      </div>
    )
  }

  return mark
}
