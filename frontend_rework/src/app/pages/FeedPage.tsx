import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ReelCardPremium } from '../components/ReelCardPremium';
import { FloatingNav } from '../components/FloatingNav';
import { fetchAllReels, resolveVideoUrl, type RawReel } from '../api';

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

// Simple muted autoplay video for the brainrot bottom slot
type Caption = { start: number; end: number; text: string };

function BrainrotVideo({ src, captions, userPaused = false }: { src: string; captions: Caption[]; userPaused?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const inView = useRef(false);
  const userPausedRef = useRef(userPaused);

  // Keep ref in sync with prop so the observer callback always sees the latest value
  useEffect(() => { userPausedRef.current = userPaused; });

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView.current = entry.isIntersecting;
        if (entry.isIntersecting && !userPausedRef.current) ref.current?.play().catch(() => {});
        else ref.current?.pause();
      },
      { threshold: 0.5 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // React to userPaused prop changes while the card is in view
  useEffect(() => {
    if (!inView.current) return;
    if (userPaused) ref.current?.pause();
    else ref.current?.play().catch(() => {});
  }, [userPaused]);

  const activeCaption = captions.find(c => currentTime >= c.start && currentTime < c.end);

  return (
    <div className="relative w-full h-full">
      <video
        ref={ref}
        src={src}
        className="w-full h-full object-cover"
        playsInline
        muted
        loop
        onTimeUpdate={() => { if (ref.current) setCurrentTime(ref.current.currentTime); }}
      />
      {activeCaption && (
        <div className="absolute bottom-4 left-4 right-4 flex justify-center pointer-events-none">
          <span className="bg-black/75 text-white text-sm font-medium px-4 py-2 rounded-xl text-center leading-snug">
            {activeCaption.text}
          </span>
        </div>
      )}
    </div>
  );
}

// Wraps a split-screen brainrot + educational card pair, sharing pause state between them
function BrainrotSlide({
  reel,
  cardProps,
  onShowNavChange,
}: {
  reel: RawReel;
  cardProps: ReturnType<typeof rawToCardProps>;
  onShowNavChange: (v: boolean) => void;
}) {
  const [brainrotPaused, setBrainrotPaused] = useState(false);
  const brainrotUrl = resolveVideoUrl(reel.brainrotSrc!);

  return (
    <div className="h-screen snap-start snap-always flex flex-col">
      <div className="h-1/2 overflow-hidden bg-black relative">
        <BrainrotVideo src={brainrotUrl} captions={reel.captions} userPaused={brainrotPaused} />
      </div>
      <div className="h-1/2 overflow-hidden">
        <ReelCardPremium
          {...cardProps}
          compact
          onShowUIChange={onShowNavChange}
          onPlayStateChange={(playing) => setBrainrotPaused(!playing)}
        />
      </div>
    </div>
  );
}

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
    bgGradient: colorFor(reel.concept, BG_GRADIENTS),
    progress: 0,
    totalCards: total,
    currentCard: index + 1,
    videoSrc: reel.videoSrc ? resolveVideoUrl(reel.videoSrc) : undefined,
  };
}

export function FeedPage() {
  const [reels, setReels] = useState<RawReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNav, setShowNav] = useState(true);
  const [searchParams] = useSearchParams();
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    fetchAllReels()
      .then(setReels)
      .catch(() => setError('Could not load reels. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  // Scroll to the requested index once reels are rendered
  useEffect(() => {
    const index = parseInt(searchParams.get('index') ?? '0', 10);
    if (!loading && reels.length > 0 && index > 0) {
      const el = reelRefs.current[index];
      if (el) el.scrollIntoView({ behavior: 'instant' });
    }
  }, [loading, reels, searchParams]);

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
          <div className="text-white/30 text-sm">Could not reach the API. Please try again later.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Main scroll container */}
      <div className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
        {reels.map((reel, index) => {
          if (reel.brainrotSrc) {
            return (
              <div key={reel.id} ref={el => { reelRefs.current[index] = el; }}>
                <BrainrotSlide
                  reel={reel}
                  cardProps={rawToCardProps(reel, index, reels.length)}
                  onShowNavChange={setShowNav}
                />
              </div>
            );
          }

          // Full-screen: no brainrot video
          return (
            <div key={reel.id} ref={el => { reelRefs.current[index] = el; }} className="h-screen snap-start snap-always">
              <ReelCardPremium
                {...rawToCardProps(reel, index, reels.length)}
                captions={reel.captions}
                onShowUIChange={setShowNav}
              />
            </div>
          );
        })}
      </div>

      {/* Floating Navigation */}
      <FloatingNav visible={showNav} />

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
