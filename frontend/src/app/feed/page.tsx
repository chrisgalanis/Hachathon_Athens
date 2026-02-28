"use client";

// ── Feed — Reel feed page ─────────────────────────────────────────────────────
import { useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ReelFeed, { type ReelFeedHandle } from "@/components/reel/ReelFeed";
import BottomNav from "@/components/nav/BottomNav";
import { MOCK_CARDS } from "@/lib/mock-data";

export default function FeedPage() {
  const feedRef = useRef<ReelFeedHandle>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const cardId = searchParams.get("card");
    const subjectParam = searchParams.get("subject");

    let targetIndex = 0;

    if (cardId) {
      const idx = MOCK_CARDS.findIndex((c) => c.id === cardId);
      if (idx !== -1) targetIndex = idx;
    } else if (subjectParam) {
      const idx = MOCK_CARDS.findIndex(
        (c) =>
          c.subject.toLowerCase().replace(/\s+/g, "-") === subjectParam ||
          c.id === subjectParam
      );
      if (idx !== -1) targetIndex = idx;
    } else {
      return;
    }

    requestAnimationFrame(() => {
      feedRef.current?.scrollToCard(targetIndex);
    });
  }, [searchParams]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "stretch",
        background: "#111116",
        minHeight: "100dvh",
        overflow: "hidden",
      }}
    >
      <div className="phone-frame">
        <main className="relative w-full h-full overflow-hidden bg-brand-bg">
          <ReelFeed ref={feedRef} cards={MOCK_CARDS} />
          <BottomNav />
        </main>
      </div>
    </div>
  );
}
