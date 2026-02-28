"use client";

// ── Concept progress bar ──────────────────────────────────────────────────────
// Animates in on mount. Shows position in lecture (cardIndex / totalCards).

import { motion } from "framer-motion";

interface ProgressBarProps {
  cardIndex: number;   // 0-based
  totalCards: number;
  accentColor: string; // hex
}

export default function ProgressBar({
  cardIndex,
  totalCards,
  accentColor,
}: ProgressBarProps) {
  const pct = ((cardIndex + 1) / totalCards) * 100;

  return (
    <div className="w-full px-4 py-2">
      {/* Label row */}
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-brand-muted font-medium tracking-wide uppercase">
          Concept
        </span>
        <span className="text-xs font-bold" style={{ color: accentColor }}>
          {cardIndex + 1} / {totalCards}
        </span>
      </div>

      {/* Track */}
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: accentColor }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
