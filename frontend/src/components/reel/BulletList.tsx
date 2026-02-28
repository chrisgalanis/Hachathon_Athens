"use client";

// ── Staggered bullet list ─────────────────────────────────────────────────────
// Each bullet animates in sequentially — drives "reading rhythm".

import { motion } from "framer-motion";

interface BulletListProps {
  topic: string;
  bullets: string[];
  subject: string;
  accentColor: string;
}

// Stagger: each bullet enters 120ms after the previous
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const bulletVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export default function BulletList({
  topic,
  bullets,
  subject,
  accentColor,
}: BulletListProps) {
  return (
    <div className="flex flex-col gap-3 px-5 pt-4 pb-2">
      {/* Subject tag */}
      <span
        className="self-start text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
        style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
      >
        {subject}
      </span>

      {/* Topic headline */}
      <h2 className="text-xl font-bold leading-snug text-white">{topic}</h2>

      {/* Animated bullets */}
      <motion.ul
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-2.5 mt-1"
      >
        {bullets.map((bullet, i) => (
          <motion.li
            key={i}
            variants={bulletVariants}
            className="flex items-start gap-2.5 text-sm leading-relaxed text-white/85"
          >
            {/* Accent dot */}
            <span
              className="mt-[5px] shrink-0 w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
            {bullet}
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}
