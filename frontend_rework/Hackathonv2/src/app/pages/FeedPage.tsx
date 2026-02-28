import { useEffect, useState } from 'react';
import { ReelCardPremium } from '../components/ReelCardPremium';
import { FloatingNav } from '../components/FloatingNav';
import { fetchAllReels, type RawReel } from '../api';

// Map a concept/subject name to a consistent accent colour
const SUBJECT_COLORS = [
  '#7c3aed', '#06b6d4', '#f59e0b', '#10b981',
  '#ec4899', '#8b5cf6', '#f97316', '#14b8a6',
];

const BG_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
];

function colorFor(concept: string, palette: string[]): string {
  let hash = 0;
  for (let i = 0; i < concept.length; i++) hash = (hash * 31 + concept.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

function rawToCardProps(reel: RawReel, index: number, total: number) {
  return {
    subject: reel.subject,
    subjectColor: colorFor(reel.concept, SUBJECT_COLORS),
    topic: reel.topic,
    bullets: reel.concepts.slice(0, 4),
    xp: 15,
    difficulty: 'Medium' as const,
    bgGradient: colorFor(reel.concept, BG_GRADIENTS),
    progress: 0,
    totalCards: total,
    currentCard: index + 1,
  };
}

export function FeedPage() {
  const [reels, setReels] = useState<RawReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllReels()
      .then(setReels)
      .catch(() => setError('Could not load reels. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-white/60 text-lg">Loading reels…</div>
      </div>
    );
  }

  if (error || reels.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0f] px-8">
        <div className="text-center">
          <div className="text-white/60 text-lg mb-2">{error ?? 'No reels found.'}</div>
          <div className="text-white/30 text-sm">Make sure the backend is running on port 8000.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Main scroll container */}
      <div className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
        {reels.map((reel, index) => (
          <ReelCardPremium
            key={reel.id}
            {...rawToCardProps(reel, index, reels.length)}
          />
        ))}
      </div>

      {/* Floating Navigation */}
      <FloatingNav />

      {/* Hide scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
