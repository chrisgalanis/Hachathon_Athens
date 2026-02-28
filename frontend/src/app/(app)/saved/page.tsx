"use client";

// ── Saved Reels Page ──────────────────────────────────────────────────────────
// Shows bookmarked cards in LIFO order (most recently saved first).
// Tapping a card navigates to the home feed scrolled to that card.

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useXpStore } from "@/store/useXpStore";
import { MOCK_CARDS } from "@/lib/mock-data";
import BottomNav from "@/components/nav/BottomNav";

export default function SavedPage() {
  const { savedCards, toggleSaved } = useXpStore();
  const router = useRouter();

  // LIFO — most recently saved first
  const lifoIds = [...savedCards].reverse();
  const saved = lifoIds
    .map((id) => MOCK_CARDS.find((c) => c.id === id))
    .filter(Boolean) as typeof MOCK_CARDS;

  return (
    <div className="relative w-full h-full flex flex-col bg-brand-bg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-4">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-brand-accent" fill="currentColor">
          <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
        </svg>
        <h1 className="text-xl font-black text-white">Saved</h1>
        {saved.length > 0 && (
          <span className="ml-auto text-xs text-white/40 font-medium">{saved.length} reel{saved.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3">
        <AnimatePresence>
          {saved.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-64 gap-3 text-white/30"
            >
              <svg viewBox="0 0 24 24" className="w-14 h-14" fill="none" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
              <p className="text-sm font-medium">No saved reels yet</p>
              <p className="text-xs text-center px-6">Tap the bookmark icon on any reel to save it here</p>
            </motion.div>
          ) : (
            saved.map((card, i) => (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative flex items-stretch rounded-2xl overflow-hidden border border-white/8 bg-brand-card cursor-pointer"
                onClick={() => router.push(`/?card=${card.id}`)}
              >
                {/* Accent bar */}
                <div className="w-1 shrink-0" style={{ backgroundColor: card.accentColor }} />

                {/* Thumbnail */}
                <div
                  className={`w-16 shrink-0 bg-gradient-to-b ${card.bgGradient} flex items-center justify-center`}
                >
                  {card.videoSrc ? (
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-white/70" fill="currentColor">
                      <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
                    </svg>
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 px-3 py-3 min-w-0">
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: card.accentColor }}
                  >
                    {card.subject}
                  </span>
                  <p className="text-sm font-bold text-white mt-0.5 leading-snug line-clamp-2">
                    {card.topic}
                  </p>
                  <p className="text-[11px] text-white/35 mt-1 font-medium capitalize">{card.difficulty}</p>
                </div>

                {/* Remove button */}
                <button
                  className="shrink-0 px-3 flex items-center justify-center text-white/30 hover:text-red-400 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSaved(card.id);
                  }}
                  aria-label="Remove from saved"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
