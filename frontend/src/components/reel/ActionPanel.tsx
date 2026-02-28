"use client";

// ── Right-side action panel ───────────────────────────────────────────────────
// Save · Mark Understood (XP) · Difficulty toggle
// Each button has micro-interaction (bounce + glow on tap).

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useXpStore } from "@/store/useXpStore";
import type { Difficulty, ReelCard } from "@/lib/mock-data";

interface ActionPanelProps {
  card: ReelCard;
  accentColor: string;
}

// ── Difficulty label styling
const DIFFICULTY_STYLES: Record<Difficulty, { label: string; color: string }> = {
  easy: { label: "Easy", color: "#10b981" },
  medium: { label: "Med", color: "#f59e0b" },
  hard: { label: "Hard", color: "#ef4444" },
};

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export default function ActionPanel({ card, accentColor }: ActionPanelProps) {
  const { savedCards, understoodCards, toggleSaved, markUnderstood } = useXpStore();
  const [localDifficulty, setLocalDifficulty] = useState<Difficulty>(card.difficulty);
  const [showXpPop, setShowXpPop] = useState(false);

  const isSaved = savedCards.includes(card.id);
  const isUnderstood = understoodCards.includes(card.id);

  function handleUnderstood() {
    if (isUnderstood) return;
    markUnderstood(card.id, card.xpReward);
    // Show XP pop-up briefly
    setShowXpPop(true);
    setTimeout(() => setShowXpPop(false), 1500);
  }

  function cycleDifficulty() {
    const idx = DIFFICULTIES.indexOf(localDifficulty);
    setLocalDifficulty(DIFFICULTIES[(idx + 1) % DIFFICULTIES.length]);
  }

  return (
    <div className="flex flex-col items-center gap-5 pr-3">
      {/* ── Save button ── */}
      <ActionButton
        onTap={() => toggleSaved(card.id)}
        label={isSaved ? "Saved" : "Save"}
        active={isSaved}
        activeColor="#7c3aed"
        icon={
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill={isSaved ? "#7c3aed" : "none"} stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        }
      />

      {/* ── Mark Understood ── */}
      <div className="relative">
        <ActionButton
          onTap={handleUnderstood}
          label={`+${card.xpReward} XP`}
          active={isUnderstood}
          activeColor="#10b981"
          icon={
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill={isUnderstood ? "#10b981" : "none"} stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        {/* XP floating pop */}
        <AnimatePresence>
          {showXpPop && (
            <motion.span
              key="xp-pop"
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -40, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-black text-brand-gold pointer-events-none whitespace-nowrap"
            >
              +{card.xpReward} XP!
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Difficulty toggle ── */}
      <motion.button
        onTap={cycleDifficulty}
        whileTap={{ scale: 0.88 }}
        className="flex flex-col items-center gap-1 cursor-pointer"
      >
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-[10px] font-black border"
          style={{
            borderColor: DIFFICULTY_STYLES[localDifficulty].color,
            color: DIFFICULTY_STYLES[localDifficulty].color,
            backgroundColor: `${DIFFICULTY_STYLES[localDifficulty].color}15`,
          }}
        >
          {DIFFICULTY_STYLES[localDifficulty].label}
        </div>
        <span className="text-[10px] text-brand-muted">Level</span>
      </motion.button>
    </div>
  );
}

// ── Reusable action button with bounce micro-interaction
interface ActionButtonProps {
  onTap: () => void;
  label: string;
  active: boolean;
  activeColor: string;
  icon: React.ReactNode;
}

function ActionButton({ onTap, label, active, activeColor, icon }: ActionButtonProps) {
  return (
    <motion.button
      onTap={onTap}
      whileTap={{ scale: 0.82 }}
      whileHover={{ scale: 1.08 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="flex flex-col items-center gap-1 cursor-pointer"
    >
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center transition-colors duration-200"
        style={
          active
            ? { backgroundColor: `${activeColor}20`, color: activeColor }
            : { backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }
        }
      >
        {icon}
      </div>
      <span className="text-[10px] text-brand-muted">{label}</span>
    </motion.button>
  );
}
