"use client";

// ── Progress page ─────────────────────────────────────────────────────────────
// Shows live XP, level, streak, and saved + understood card counts.

import BottomNav from "@/components/nav/BottomNav";
import { useXpStore } from "@/store/useXpStore";
import { motion } from "framer-motion";

const XP_PER_LEVEL = 100;

export default function ProgressPage() {
  const { totalXp, level, streak, savedCards, understoodCards } = useXpStore();
  const xpInLevel = totalXp % XP_PER_LEVEL;
  const levelPct = (xpInLevel / XP_PER_LEVEL) * 100;

  const stats = [
    { label: "Total XP", value: totalXp, color: "#f59e0b", icon: "⚡" },
    { label: "Current Level", value: level, color: "#7c3aed", icon: "🏆" },
    { label: "Streak", value: streak, color: "#ef4444", icon: "🔥" },
    { label: "Understood", value: understoodCards.length, color: "#10b981", icon: "✅" },
    { label: "Saved", value: savedCards.length, color: "#6366f1", icon: "🔖" },
  ];

  return (
    <main className="relative w-full h-[100dvh] bg-brand-bg flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 pt-12 pb-24">
        <h1 className="text-2xl font-black text-white mb-1">Your Progress</h1>
        <p className="text-sm text-brand-muted mb-6">Keep the streak alive. 🔥</p>

        {/* Level bar */}
        <div className="bg-brand-card rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-white">Level {level}</span>
            <span className="text-xs text-brand-muted">{xpInLevel} / {XP_PER_LEVEL} XP</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-brand-accent"
              initial={{ width: 0 }}
              animate={{ width: `${levelPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.3, ease: "easeOut" }}
              className="bg-brand-card rounded-2xl p-4 flex flex-col gap-1"
            >
              <span className="text-xl">{stat.icon}</span>
              <span className="text-2xl font-black" style={{ color: stat.color }}>
                {stat.value}
              </span>
              <span className="text-xs text-brand-muted">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
