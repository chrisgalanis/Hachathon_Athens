"use client";

// ── Top XP / Streak header bar ───────────────────────────────────────────────
// Stays on top of the reel. Shows live XP, level, and current streak.

import { motion, AnimatePresence } from "framer-motion";
import { useXpStore } from "@/store/useXpStore";
import { useEffect, useRef, useState } from "react";

export default function XpHeader() {
  const { totalXp, level, streak } = useXpStore();
  const prevXp = useRef(totalXp);
  const [xpDelta, setXpDelta] = useState(0);

  // Detect XP change to flash the counter
  useEffect(() => {
    if (totalXp !== prevXp.current) {
      setXpDelta(totalXp - prevXp.current);
      prevXp.current = totalXp;
      const t = setTimeout(() => setXpDelta(0), 900);
      return () => clearTimeout(t);
    }
  }, [totalXp]);

  const XP_PER_LEVEL = 100;
  const xpInLevel = totalXp % XP_PER_LEVEL;
  const levelPct = (xpInLevel / XP_PER_LEVEL) * 100;

  return (
    <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-safe-top pt-3 pb-2 bg-gradient-to-b from-black/60 to-transparent">
      <div className="flex items-center justify-between">
        {/* Level badge */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-accent flex items-center justify-center text-xs font-black">
            L{level}
          </div>
          {/* XP bar (thin) */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <motion.span
                key={totalXp}
                animate={xpDelta > 0 ? { scale: [1, 1.3, 1], color: ["#fff", "#f59e0b", "#fff"] } : {}}
                transition={{ duration: 0.5 }}
                className="text-xs font-bold text-white"
              >
                {totalXp} XP
              </motion.span>
            </div>
            <div className="w-20 h-1 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-brand-accent"
                animate={{ width: `${levelPct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        {/* Streak counter */}
        <AnimatePresence mode="wait">
          <motion.div
            key={streak}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            className="flex items-center gap-1 bg-white/10 rounded-xl px-2.5 py-1"
          >
            <span className="text-sm">🔥</span>
            <span className="text-xs font-bold text-brand-gold">{streak}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
