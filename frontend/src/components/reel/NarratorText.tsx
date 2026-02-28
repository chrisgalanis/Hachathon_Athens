"use client";

// ── Narrator Text — TTS-style word-by-word highlight ─────────────────────────
// Simulates text-from-speech: words highlight sequentially like a teleprompter.
// The full narration is the concatenation of all bullets into natural sentences.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NarratorTextProps {
  topic: string;
  bullets: string[];
  subject: string;
  accentColor: string;
  /** ms per word — default 420 */
  wpm?: number;
}

function bulletToSentence(bullet: string): string {
  // Strip leading dashes/dots, ensure sentence ends with a period
  const cleaned = bullet.replace(/^[-•]\s*/, "").trim();
  return cleaned.endsWith(".") || cleaned.endsWith("!") || cleaned.endsWith("?")
    ? cleaned
    : cleaned + ".";
}

export default function NarratorText({
  topic,
  bullets,
  subject,
  accentColor,
  wpm = 420,
}: NarratorTextProps) {
  // Build flat word list with sentence-boundary markers
  const sentences = bullets.map(bulletToSentence);
  // Current sentence index (one bullet at a time on screen)
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [running, setRunning] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSentence = sentences[sentenceIdx] ?? "";
  const words = currentSentence.split(/\s+/);

  // Reset when card changes (topic changes)
  useEffect(() => {
    setSentenceIdx(0);
    setWordIdx(0);
    setRunning(true);
  }, [topic]);

  useEffect(() => {
    if (!running) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const msPerWord = Math.round(60_000 / wpm);

    timerRef.current = setTimeout(() => {
      if (wordIdx < words.length - 1) {
        setWordIdx((w) => w + 1);
      } else {
        // End of sentence — pause then advance
        timerRef.current = setTimeout(() => {
          if (sentenceIdx < sentences.length - 1) {
            setSentenceIdx((s) => s + 1);
            setWordIdx(0);
          } else {
            // All bullets done — stop
            setRunning(false);
          }
        }, 900);
      }
    }, msPerWord);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordIdx, sentenceIdx, running, wpm]);

  return (
    <div className="flex flex-col h-full justify-end pb-28 px-5 gap-4">
      {/* Subject + topic header */}
      <div className="flex flex-col gap-1">
        <span
          className="self-start text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
        >
          {subject}
        </span>
        <h2 className="text-2xl font-black leading-snug text-white drop-shadow-md">
          {topic}
        </h2>
      </div>

      {/* Sentence progress dots */}
      <div className="flex gap-1.5">
        {sentences.map((_, i) => (
          <div
            key={i}
            className="h-1 rounded-full transition-all duration-300"
            style={{
              flex: i === sentenceIdx ? 2 : 1,
              backgroundColor:
                i < sentenceIdx
                  ? accentColor
                  : i === sentenceIdx
                  ? accentColor
                  : "rgba(255,255,255,0.15)",
              opacity: i <= sentenceIdx ? 1 : 0.4,
            }}
          />
        ))}
      </div>

      {/* TTS text box */}
      <AnimatePresence mode="wait">
        <motion.div
          key={sentenceIdx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl px-4 py-4 text-base leading-relaxed font-medium"
          style={{
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: `1px solid ${accentColor}30`,
          }}
        >
          {words.map((word, i) => (
            <span
              key={i}
              className="transition-all duration-150 "
              style={{
                color:
                  i < wordIdx
                    ? "rgba(255,255,255,0.45)"
                    : i === wordIdx
                    ? "#ffffff"
                    : "rgba(255,255,255,0.25)",
                fontWeight: i === wordIdx ? 700 : 400,
                textShadow:
                  i === wordIdx
                    ? `0 0 12px ${accentColor}`
                    : "none",
              }}
            >
              {word}{" "}
            </span>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Tap-to-skip hint */}
      {running && (
        <p className="text-[10px] text-white/30 text-center">
          tap card to skip sentence
        </p>
      )}
    </div>
  );
}
