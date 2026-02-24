'use client'

import { motion } from 'framer-motion'

const LINE1 = 'What if your product feature'
const LINE2 = 'could improve itself?'

const words1 = LINE1.split(' ')
const words2 = LINE2.split(' ')

export default function HeroHeadline() {
  return (
    <h1 className="font-display font-normal leading-tight text-zinc-100 text-center" style={{ fontSize: 'clamp(48px, 6vw, 80px)', letterSpacing: '-0.02em' }}>
      <span className="block">
        {words1.map((word, i) => (
          <motion.span
            key={`1-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="inline-block mr-[0.25em]"
          >
            {word}
          </motion.span>
        ))}
      </span>
      <span className="block">
        {words2.map((word, i) => (
          <motion.span
            key={`2-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: words1.length * 0.06 + i * 0.06 }}
            className="inline-block mr-[0.25em]"
          >
            {word}
          </motion.span>
        ))}
      </span>
    </h1>
  )
}
