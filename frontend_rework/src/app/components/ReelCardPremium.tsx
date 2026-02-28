import { Heart, Sparkles, Pause, Play } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';

interface ReelCardPremiumProps {
  subject: string;
  subjectColor: string;
  topic: string;
  bullets: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  bgGradient: string;
  progress: number;
  totalCards: number;
  currentCard: number;
  videoSrc?: string;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function ReelCardPremium({
  subject,
  subjectColor,
  topic,
  bullets,
  difficulty,
  bgGradient,
  progress,
  totalCards,
  currentCard,
  videoSrc,
}: ReelCardPremiumProps) {
  const [liked, setLiked] = useState(false);
const [aura, setAura] = useState(0);
  // Non-video cards always show UI; video cards start hidden
  const [showUI, setShowUI] = useState(!videoSrc);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const videoRef   = useRef<HTMLVideoElement>(null);
  const cardRef    = useRef<HTMLDivElement>(null);
  const idleTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAndStartIdle = useCallback(() => {
    setShowUI(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setShowUI(false), 3000);
  }, []);

  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setShowUI(false), 3000);
  }, []);

  // Play/pause on scroll visibility; reset UI each time card re-enters view
  useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {});
          setIsPlaying(true);
          if (videoSrc) setShowUI(false); // hide UI fresh every time
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
          if (videoSrc) {
            if (idleTimer.current) clearTimeout(idleTimer.current);
            setShowUI(false);
          }
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(cardRef.current);
    return () => {
      observer.disconnect();
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [videoSrc]);

  const togglePlayPause = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().catch(() => {});
      setIsPlaying(true);
    } else {
      vid.pause();
      setIsPlaying(false);
    }
    resetIdle();
  }, [resetIdle]);

  // Click on the card: if UI is hidden → show it; if UI is visible → toggle play/pause
  const handleInteraction = useCallback(() => {
    if (!videoSrc) return;
    if (!showUI) {
      showAndStartIdle();
    } else {
      togglePlayPause();
    }
  }, [videoSrc, showUI, showAndStartIdle, togglePlayPause]);

  const handleScrubChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) videoRef.current.currentTime = val;
    resetIdle();
  }, [resetIdle]);

  const difficultyColors = {
    Easy: '#10b981',
    Medium: '#f59e0b',
    Hard: '#ef4444',
  };

  const scrubPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={cardRef}
      className="h-screen w-full snap-start snap-always relative overflow-hidden"
      onTouchStart={() => { if (videoSrc) showAndStartIdle(); }}
      onClick={handleInteraction}
    >
      {/* Background: video or gradient */}
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          className="absolute inset-0 w-full h-full object-contain"
          playsInline
          onTimeUpdate={() => {
            if (!isScrubbing && videoRef.current)
              setCurrentTime(videoRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) setDuration(videoRef.current.duration);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => { setIsPlaying(false); showAndStartIdle(); }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: bgGradient }} />
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />

      {/* All UI overlays — single opacity gate */}
      <motion.div
        className="absolute inset-0 z-10"
        animate={{ opacity: showUI ? 1 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        style={{ pointerEvents: showUI ? 'auto' : 'none' }}
      >
        {/* Story-style progress dots at top */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-4">
          {[...Array(totalCards)].map((_, i) => (
            <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: i < currentCard - 1 ? '100%' : i === currentCard - 1 ? `${progress}%` : '0%',
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          ))}
        </div>

        {/* Subject chip */}
        <div className="absolute top-16 left-6 z-20">
          <div
            className="px-4 py-2 rounded-full backdrop-blur-xl border border-white/20 shadow-2xl flex items-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${subjectColor}40, ${subjectColor}20)`,
              boxShadow: `0 0 30px ${subjectColor}40`,
            }}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subjectColor }} />
            <span className="text-white text-sm">{subject}</span>
          </div>
        </div>

        {/* Play/pause indicator (center) */}
        {videoSrc && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <motion.div
              key={isPlaying ? 'play' : 'pause'}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.2 }}
              className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center"
            >
              {isPlaying
                ? <Pause className="w-7 h-7 text-white" />
                : <Play className="w-7 h-7 text-white ml-1" />
              }
            </motion.div>
          </div>
        )}

        {/* Main content */}
        <div className={`absolute inset-x-0 px-8 ${videoSrc ? 'bottom-28' : 'top-1/3'}`}>
          <h1 className="text-white text-3xl mb-4 leading-tight tracking-tight">{topic}</h1>

          {!videoSrc && (
            <div className="space-y-4">
              {bullets.map((bullet, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] mt-2.5 flex-shrink-0" />
                  <p className="text-white/90 text-lg leading-relaxed">{bullet}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-6">
            <div
              className="px-4 py-2 rounded-full backdrop-blur-xl border"
              style={{
                backgroundColor: `${difficultyColors[difficulty]}20`,
                borderColor: `${difficultyColors[difficulty]}30`,
              }}
            >
              <span className="text-sm" style={{ color: difficultyColors[difficulty] }}>
                {difficulty}
              </span>
            </div>
          </div>
        </div>

        {/* Video scrubber bar */}
        {videoSrc && duration > 0 && (
          <div
            className="absolute bottom-4 left-4 right-20 z-20 flex items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-white/70 text-xs tabular-nums w-8 shrink-0">
              {formatTime(currentTime)}
            </span>
            <div className="relative flex-1 h-8 flex items-center">
              {/* Track */}
              <div className="absolute inset-x-0 h-1 bg-white/20 rounded-full" />
              {/* Filled */}
              <div
                className="absolute left-0 h-1 rounded-full"
                style={{ width: `${scrubPercent}%`, background: 'white' }}
              />
              {/* Range input (invisible but interactive) */}
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={currentTime}
                onMouseDown={() => setIsScrubbing(true)}
                onTouchStart={() => setIsScrubbing(true)}
                onMouseUp={() => setIsScrubbing(false)}
                onTouchEnd={() => setIsScrubbing(false)}
                onChange={handleScrubChange}
                className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
              />
            </div>
            <span className="text-white/70 text-xs tabular-nums w-8 shrink-0 text-right">
              {formatTime(duration)}
            </span>
          </div>
        )}

        {/* Action sidebar */}
        <div className="absolute right-4 bottom-32 z-20 flex flex-col gap-6">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={(e) => { e.stopPropagation(); setLiked(!liked); }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg">
              <Heart className={`w-6 h-6 transition-all ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            </div>
            <span className="text-white text-xs">Like</span>
          </motion.button>

<motion.button
            whileTap={{ scale: 0.85 }}
            onClick={(e) => { e.stopPropagation(); setAura(a => a + 10); }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-full backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-lg"
              style={{ background: aura > 0 ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.1)' }}
            >
              <Sparkles className={`w-6 h-6 transition-all ${aura > 0 ? 'text-[#7c3aed]' : 'text-white'}`} />
            </div>
            <span className="text-white text-xs">+{aura} Aura</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
