'use client'

interface LogoProps {
  className?: string
  size?: number
  /** Render mark + "NorthStar" wordmark with 10px gap (e.g. for nav) */
  wordmark?: boolean
  /** Mark color: 'white' | 'purple'. Default white when wordmark, else inherit (currentColor) */
  color?: 'white' | 'purple'
}

/**
 * NorthStar logo: four-point star (✦), sharp geometric, slightly elongated on vertical axis.
 * Optional wordmark "NorthStar" in DM Sans Medium, 0.05em letter-spacing.
 */
export function Logo({
  className = '',
  size = 24,
  wordmark = false,
  color,
}: LogoProps) {
  const s = Math.min(32, Math.max(28, size))
  const cx = s / 2
  const cy = s / 2
  const ry = s * 0.48
  const rx = s * 0.42
  const fill = color === 'purple' ? '#7C3AED' : color === 'white' ? '#fff' : 'currentColor'

  const points = [
    [cx, cy - ry],
    [cx + rx, cy],
    [cx, cy + ry],
    [cx - rx, cy],
  ]
  const pts = points.map(([x, y]) => `${x},${y}`).join(' ')

  const mark = (
    <svg
      viewBox={`0 0 ${s} ${s}`}
      width={s}
      height={s}
      className={className}
      aria-hidden
    >
      <polygon points={pts} fill={fill} />
    </svg>
  )

  if (wordmark) {
    return (
      <div className="inline-flex items-center gap-[10px]">
        {mark}
        <span className="font-medium tracking-[0.05em] font-sans text-[15px] sm:text-base text-inherit">
          NorthStar
        </span>
      </div>
    )
  }

  return mark
}
