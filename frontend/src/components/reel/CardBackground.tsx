"use client";

// ── Dynamic animated background for each reel card ───────────────────────────
// GPU-friendly: uses CSS transforms + opacity only (no layout shifts).
// Gameplay-style: floating orbs + gradient layer.

import { motion } from "framer-motion";
import { memo } from "react";

interface CardBackgroundProps {
  gradient: string;   // Tailwind gradient string e.g. "from-violet-900 via-purple-900 to-brand-bg"
  accentColor: string; // hex color for orb tint
}

// Orb config — static positions so they don't re-randomize on re-render
const ORBS = [
  { size: 280, x: -60, y: 100, duration: 8, delay: 0 },
  { size: 200, x: 180, y: -40, duration: 10, delay: 2 },
  { size: 160, x: 60, y: 340, duration: 7, delay: 1 },
  { size: 120, x: 260, y: 500, duration: 12, delay: 3 },
];

function CardBackground({ gradient, accentColor }: CardBackgroundProps) {
  return (
    <div className={`absolute inset-0 bg-gradient-to-b ${gradient} opacity-90`}>
      {/* Floating orbs — blurred circles for ambient light effect */}
      {ORBS.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle, ${accentColor}30, transparent 70%)`,
            filter: "blur(40px)",
            willChange: "transform, opacity", // GPU hint
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Scanline texture overlay — subtle gaming vibe */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 3px)",
        }}
      />
    </div>
  );
}

// Memo: background only re-renders when gradient/accent changes (i.e. per card)
export default memo(CardBackground);
