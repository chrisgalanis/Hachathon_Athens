"use client";

// ── Reel Feed — snap-scroll container ────────────────────────────────────────
// Renders all cards stacked vertically. CSS snap scroll handles the UX.
// Each card is 100dvh — GPU scroll via CSS, not JS.
//
// Exposes scrollToCard(index) via useImperativeHandle for programmatic navigation
// (e.g. tapping a subject card routes here and jumps to the matching reel).

import { useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import type { ReelCard } from "@/lib/mock-data";
import ReelCard from "./ReelCard";

export interface ReelFeedHandle {
  scrollToCard: (index: number) => void;
}

interface ReelFeedProps {
  cards: ReelCard[];
}

const ReelFeed = forwardRef<ReelFeedHandle, ReelFeedProps>(function ReelFeed({ cards }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToCard = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container) return;
    const target = container.children[index] as HTMLElement;
    target?.scrollIntoView({ behavior: "instant" });
  }, []);

  useImperativeHandle(ref, () => ({ scrollToCard }), [scrollToCard]);

  return (
    /*
     * reel-container is defined in globals.css:
     *   height: 100dvh
     *   overflow-y: scroll
     *   scroll-snap-type: y mandatory
     *   scroll-snap-stop: always (on children)
     */
    <div ref={containerRef} className="reel-container">
      {cards.map((card, index) => (
        <ReelCard
          key={card.id}
          card={card}
          cardIndex={index}
          totalCards={cards.length}
        />
      ))}
    </div>
  );
});

export default ReelFeed;
