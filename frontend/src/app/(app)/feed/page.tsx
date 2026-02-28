"use client";

// ── Feed — Reel feed page ─────────────────────────────────────────────────────
// Query params:
//   ?concept=Linear_Algebra              → load all reels for that concept
//   ?concept=Linear_Algebra&lecture=21   → load all + scroll to lecture 21
//   ?card=card-id                        → scroll to that card id (mock data)
//   ?subject=subject-name                → scroll by subject slug (mock data)
//
// Falls back to MOCK_CARDS when no concept is provided.

import { useRef, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReelFeed, { type ReelFeedHandle } from "@/components/reel/ReelFeed";
import BottomNav from "@/components/nav/BottomNav";
import { MOCK_CARDS, type ReelCard } from "@/lib/mock-data";
import { fetchReels } from "@/lib/api";

export default function FeedPage() {
  const feedRef = useRef<ReelFeedHandle>(null);
  const searchParams = useSearchParams();

  const conceptParam = searchParams.get("concept");
  const lectureParam = searchParams.get("lecture");

  const [cards, setCards] = useState<ReelCard[]>(MOCK_CARDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch reels from backend whenever the concept param changes ──────────
  useEffect(() => {
    if (!conceptParam) {
      setCards(MOCK_CARDS);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetchReels(conceptParam)
      .then((reels) => {
        setCards(reels.length > 0 ? reels : MOCK_CARDS);
      })
      .catch(() => {
        setError("Could not load reels — showing demo content.");
        setCards(MOCK_CARDS);
      })
      .finally(() => setLoading(false));
  }, [conceptParam]);

  // ── Scroll to target card after cards are loaded ──────────────────────────
  useEffect(() => {
    if (loading) return;

    const cardParam = searchParams.get("card");
    const subjectParam = searchParams.get("subject");

    let targetIndex = -1;

    if (lectureParam && conceptParam) {
      // Navigate to a specific lecture within the concept
      const targetId = `${conceptParam}-lecture-${lectureParam}`;
      targetIndex = cards.findIndex((c) => c.id === targetId);
    } else if (cardParam) {
      targetIndex = cards.findIndex((c) => c.id === cardParam);
    } else if (subjectParam) {
      targetIndex = cards.findIndex(
        (c) =>
          c.subject.toLowerCase().replace(/\s+/g, "-") === subjectParam ||
          c.id === subjectParam
      );
    }

    if (targetIndex < 0) return;

    requestAnimationFrame(() => {
      feedRef.current?.scrollToCard(targetIndex);
    });
  }, [cards, loading, searchParams, lectureParam, conceptParam]);

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
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
                <p className="text-white/40 text-sm">Loading reels…</p>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="absolute top-4 left-4 right-4 z-50 bg-red-900/80 text-red-200 text-xs px-3 py-2 rounded-lg backdrop-blur-sm">
                  {error}
                </div>
              )}
              <ReelFeed ref={feedRef} cards={cards} />
            </>
          )}
          <BottomNav />
        </main>
      </div>
    </div>
  );
}
