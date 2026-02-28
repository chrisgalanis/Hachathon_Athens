"use client";

// ── Level-up celebration overlay ─────────────────────────────────────────────
// Triggered when the user levels up. Full-screen flash + animated text.

import { motion, AnimatePresence } from "framer-motion";

interface LevelUpOverlayProps {
  level: number;
  visible: boolean;
}

export default function LevelUpOverlay({ level, visible }: LevelUpOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="level-up"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.4, rotate: -6 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex flex-col items-center gap-3 text-center"
          >
            <motion.span
              animate={{ rotate: [0, -10, 10, -8, 8, 0] }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-6xl"
            >
              ⚡
            </motion.span>
            <p className="text-brand-gold font-black text-lg tracking-widest uppercase">
              Level Up!
            </p>
            <p className="text-4xl font-black text-white">Level {level}</p>
            <p className="text-sm text-white/60">Keep going! 🚀</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
