"use client";

// ── Subtitle Overlay ──────────────────────────────────────────────────────────
// Renders the active caption for the current video time.
// Synced to a <video> element via its currentTime.

import { useState, useEffect, RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Caption } from "@/lib/mock-data";

interface SubtitleOverlayProps {
  captions: Caption[];
  videoRef: RefObject<HTMLVideoElement>;
}

export default function SubtitleOverlay({ captions, videoRef }: SubtitleOverlayProps) {
  const [activeText, setActiveText] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function onTimeUpdate() {
      const t = video!.currentTime;
      const active = captions.find((c) => t >= c.start && t < c.end);
      setActiveText(active?.text ?? null);
    }

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [captions, videoRef]);

  return (
    <AnimatePresence mode="wait">
      {activeText && (
        <motion.div
          key={activeText}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="absolute left-3 right-3 z-20 pointer-events-none"
          style={{ bottom: "152px" }} // sits above the metadata overlay; below action panel
        >
          <p
            className="text-center text-sm font-semibold leading-snug text-white px-3 py-2 rounded-xl"
            style={{
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(6px)",
              textShadow: "0 1px 4px rgba(0,0,0,0.8)",
            }}
          >
            {activeText}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
