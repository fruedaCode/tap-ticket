'use client'

import { motion, useTransform, type MotionValue } from 'motion/react'
import { useI18n } from '@/lib/i18n'

// Scaling an SVG group around its own centre needs the group's bounding box as
// the reference, not the whole viewBox.
const FROM_CENTER = { transformBox: 'fill-box', transformOrigin: 'center' } as const

const RECEIPT_BODY =
  'M84 56 H172 V232 L167 240 L162 232 L157 240 L152 232 L147 240 L142 232 L137 240 ' +
  'L132 232 L127 240 L122 232 L117 240 L112 232 L107 240 L102 232 L97 240 L92 232 L87 240 L84 232 Z'

const CHECK = 'M295.5 110 l3 3 l6 -6.5'

/**
 * The hero illustration, driven entirely by scroll progress (0 to 1). Every
 * value derives from the incoming MotionValue, so scrolling never re-renders
 * React. At progress 0 the artwork sits in beat 1, which is what the server and
 * the first client paint both produce.
 */
export function HeroStory({ progress }: { progress: MotionValue<number> }) {
  const { t } = useI18n()

  // Beat 1 to 2: the receipt glides into the phone, which takes over the frame.
  const receiptX = useTransform(progress, [0.08, 0.45], [0, 74])
  const receiptScale = useTransform(progress, [0.08, 0.45], [1, 0.8])
  const receiptOpacity = useTransform(progress, [0.26, 0.44], [1, 0])
  const beamOpacity = useTransform(progress, [0.18, 0.34], [1, 0])
  const phoneX = useTransform(progress, [0.12, 0.5], [0, -52])
  const phoneScale = useTransform(progress, [0.12, 0.5], [1, 1.1])

  // Beat 2: three friends claim their line items, one after another.
  const claim1 = useTransform(progress, [0.34, 0.44], [0, 1])
  const claim2 = useTransform(progress, [0.4, 0.5], [0, 1])
  const claim3 = useTransform(progress, [0.46, 0.56], [0, 1])

  // Beat 2 to 3: the line items give way to three different shares, all paid.
  const rowsOpacity = useTransform(progress, [0.66, 0.76], [1, 0])
  const settledOpacity = useTransform(progress, [0.7, 0.82], [0, 1])
  const settledY = useTransform(progress, [0.7, 0.82], [12, 0])

  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label={t('A receipt scanned into a phone, claimed by three friends and settled')}
      className="h-auto w-full"
    >
      <rect x="8" y="8" width="384" height="284" rx="24" fill="#FDECEA" />

      <motion.g style={{ x: receiptX, scale: receiptScale, opacity: receiptOpacity, ...FROM_CENTER }}>
        <g transform="rotate(-8 128 150)">
          <path d={RECEIPT_BODY} transform="translate(4 5)" fill="#450A0A" opacity="0.08" />
          <path d={RECEIPT_BODY} fill="#FFFFFF" />
          <rect x="106" y="70" width="44" height="8" rx="4" fill="#450A0A" opacity="0.8" />
          <rect x="96" y="88" width="40" height="7" rx="3.5" fill="#D9C8C3" />
          <rect x="144" y="88" width="14" height="7" rx="3.5" fill="#D9C8C3" />
          <rect x="96" y="102" width="32" height="7" rx="3.5" fill="#D9C8C3" />
          <rect x="144" y="102" width="14" height="7" rx="3.5" fill="#D9C8C3" />
          <rect x="96" y="116" width="36" height="7" rx="3.5" fill="#D9C8C3" />
          <rect x="144" y="116" width="14" height="7" rx="3.5" fill="#D9C8C3" />
          <line
            x1="96"
            y1="134"
            x2="160"
            y2="134"
            stroke="#EBDAD5"
            strokeWidth="2.5"
            strokeDasharray="2 5"
            strokeLinecap="round"
          />
          <rect x="96" y="142" width="28" height="9" rx="4.5" fill="#DC2626" />
          <rect x="136" y="142" width="16" height="9" rx="4.5" fill="#DC2626" />
        </g>
      </motion.g>

      <motion.g style={{ opacity: beamOpacity }}>
        <rect x="172" y="138" width="34" height="4" rx="2" fill="#DC2626" opacity="0.4" />
        <circle cx="182" cy="140" r="7" fill="#DC2626" />
        <path
          d="M 192 129 A 16 16 0 1 1 192 151"
          fill="none"
          stroke="#DC2626"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path
          d="M 200 122 A 26 26 0 1 1 200 158"
          fill="none"
          stroke="#DC2626"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.4"
        />
      </motion.g>

      <motion.g style={{ x: phoneX, scale: phoneScale, ...FROM_CENTER }}>
        <rect
          x="200"
          y="48"
          width="128"
          height="212"
          rx="22"
          fill="#450A0A"
          opacity="0.08"
          transform="translate(4 5)"
        />
        <rect x="200" y="48" width="128" height="212" rx="22" fill="#450A0A" />
        <rect x="208" y="60" width="112" height="188" rx="14" fill="#FFFFFF" />

        <rect x="216" y="70" width="22" height="14" rx="4" fill="#DC2626" />
        <line
          x1="223"
          y1="73"
          x2="223"
          y2="81"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeDasharray="1 2.5"
          strokeLinecap="round"
          opacity="0.9"
        />
        <circle cx="232" cy="77" r="3" fill="#FFFFFF" />
        <rect x="246" y="73" width="42" height="7" rx="3.5" fill="#450A0A" opacity="0.8" />
        <line x1="214" y1="94" x2="314" y2="94" stroke="#F0DAD5" strokeWidth="2" />

        <motion.g style={{ opacity: rowsOpacity }}>
          <rect x="216" y="106" width="52" height="8" rx="4" fill="#D9C8C3" />
          <rect x="216" y="128" width="42" height="8" rx="4" fill="#D9C8C3" />
          <rect x="216" y="150" width="48" height="8" rx="4" fill="#D9C8C3" />
          <circle cx="300" cy="110" r="10" fill="#FFFFFF" stroke="#D9C8C3" strokeWidth="2" />
          <circle cx="300" cy="132" r="10" fill="#FFFFFF" stroke="#D9C8C3" strokeWidth="2" />
          <circle cx="300" cy="154" r="10" fill="#FFFFFF" stroke="#D9C8C3" strokeWidth="2" />

          <motion.g style={{ opacity: claim1 }}>
            <circle cx="300" cy="110" r="10" fill="#DC2626" />
            <path
              d={CHECK}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.g>
          <motion.g style={{ opacity: claim2 }} transform="translate(0 22)">
            <circle cx="300" cy="110" r="10" fill="#D97706" />
            <path
              d={CHECK}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.g>
          <motion.g style={{ opacity: claim3 }} transform="translate(0 44)">
            <circle cx="300" cy="110" r="10" fill="#450A0A" />
            <path
              d={CHECK}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.g>

          <line x1="214" y1="172" x2="314" y2="172" stroke="#F0DAD5" strokeWidth="2" />
          <rect x="216" y="180" width="26" height="8" rx="4" fill="#DC2626" />
          <rect x="288" y="180" width="22" height="8" rx="4" fill="#DC2626" opacity="0.6" />
          <rect x="216" y="200" width="94" height="18" rx="9" fill="#DC2626" />
          <rect x="241" y="206" width="44" height="6" rx="3" fill="#FFFFFF" />
        </motion.g>

        {/* Beat 3: one row per person, three different amounts, all settled. */}
        <motion.g style={{ opacity: settledOpacity, y: settledY }}>
          <circle cx="232" cy="112" r="13" fill="#DC2626" />
          <rect x="252" y="108" width="30" height="7" rx="3.5" fill="#D9C8C3" />
          <rect x="288" y="107" width="24" height="9" rx="4.5" fill="#DC2626" />

          <circle cx="232" cy="150" r="13" fill="#450A0A" />
          <rect x="252" y="146" width="30" height="7" rx="3.5" fill="#D9C8C3" />
          <rect x="296" y="145" width="16" height="9" rx="4.5" fill="#450A0A" />

          <circle cx="232" cy="188" r="13" fill="#D97706" />
          <rect x="252" y="184" width="30" height="7" rx="3.5" fill="#D9C8C3" />
          <rect x="282" y="183" width="30" height="9" rx="4.5" fill="#D97706" />

          <circle cx="264" cy="222" r="15" fill="#DC2626" />
          <path
            d="M257 222 l5 5 l9 -10"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.g>
      </motion.g>

      <g fill="#DC2626">
        <circle cx="186" cy="216" r="4" opacity="0.5" />
        <circle cx="76" cy="96" r="4" opacity="0.35" />
        <circle cx="344" cy="120" r="3" opacity="0.35" />
      </g>
    </svg>
  )
}
