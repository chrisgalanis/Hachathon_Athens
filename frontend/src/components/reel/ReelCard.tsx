"use client";

// ── Single Reel Card ──────────────────────────────────────────────────────────
// Full-screen vertical slide — skeleton for MP4 video reels.
//
// Structure:
//   Layer 0 — MP4 video (full-bleed, object-fit cover) — THE content
//   Layer 1 — Bottom overlay: subject tag + title (metadata only)
//   Layer 2 — Right edge: ActionPanel (save, understood, difficulty)
//   Layer 3 — LevelUp overlay (celebration)
//
// No XP header, no progress bar, no narrator text — the video carries everything.

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ReelCard as ReelCardType } from "@/lib/mock-data";
import { useXpStore } from "@/store/useXpStore";

import ActionPanel from "./ActionPanel";
import LevelUpOverlay from "./LevelUpOverlay";
import SubtitleOverlay from "./SubtitleOverlay";

interface ReelCardProps {
  card: ReelCardType;
  cardIndex: number;
  totalCards: number;
}

export default function ReelCard({ card, cardIndex, totalCards }: ReelCardProps) {
  const { level } = useXpStore();
  const prevLevel = useRef(level);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Level-up detection
  useEffect(() => {
    if (level > prevLevel.current) {
      prevLevel.current = level;
      setShowLevelUp(true);
      const t = setTimeout(() => setShowLevelUp(false), 2200);
      return () => clearTimeout(t);
    }
  }, [level]);

  // Tap anywhere on the video area to pause / resume
  function handleVideoTap() {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play();
      setIsPaused(false);
    } else {
      vid.pause();
      setIsPaused(true);
    }
  }

  return (
    <div className="reel-slide flex flex-col bg-black">

      {/* ── Layer 0: Video — full-bleed, covers the slide ── */}
      {card.videoSrc ? (
        <video
          ref={videoRef}
          src={card.videoSrc}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted={false}
          playsInline
          onClick={handleVideoTap}
        />
      ) : (
        /* ── Placeholder shown until a real video is provided ── */
        <div
          className={`absolute inset-0 bg-gradient-to-b ${card.bgGradient} flex items-center justify-center`}
          onClick={handleVideoTap}
        >
          <div className="flex flex-col items-center gap-3 opacity-40">
            <svg viewBox="0 0 24 24" className="w-16 h-16" fill="none" stroke="white" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
            </svg>
            <span className="text-white/60 text-sm font-medium">Video goes here</span>
          </div>
        </div>
      )}

      {/* Pause indicator */}
      {isPaused && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
        >
          <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <svg viewBox="0 0 24 24" className="w-10 h-10" fill="white">
              <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7 0a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
            </svg>
          </div>
        </motion.div>
      )}

      {/* ── Layer 1.5: Subtitle overlay (when captions present + video playing) ── */}
      {card.captions && card.captions.length > 0 && (
        <SubtitleOverlay captions={card.captions} videoRef={videoRef} />
      )}

      {/* ── Layer 1: Bottom metadata gradient + text ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)",
          paddingBottom: "80px", // space above bottom nav
          paddingLeft: "16px",
          paddingRight: "72px", // space for action panel on right
          paddingTop: "80px",
        }}
      >
        {/* Subject tag */}
        <span
          className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-2"
          style={{ backgroundColor: `${card.accentColor}30`, color: card.accentColor }}
        >
          {card.subject}
        </span>

        {/* Topic headline */}
        <h2 className="text-lg font-black leading-snug text-white drop-shadow-lg">
          {card.topic}
        </h2>

        {/* Card counter */}
        <p className="text-[11px] text-white/50 mt-1 font-medium">
          {cardIndex + 1} / {totalCards}
        </p>
      </div>

      {/* ── Layer 2: Right-side action panel ── */}
      <div className="absolute right-2 bottom-24 z-10 flex flex-col items-center">
        <ActionPanel card={card} accentColor={card.accentColor} />
      </div>

      {/* ── Layer 3: Level-up overlay ── */}
      <LevelUpOverlay level={level} visible={showLevelUp} />
    </div>
  );
}
