import { Heart, Bookmark, Share2 } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ReelCardPremiumProps {
  subject: string;
  subjectColor: string;
  topic: string;
  bullets: string[];
  xp: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  bgGradient: string;
  progress: number;
  totalCards: number;
  currentCard: number;
}

export function ReelCardPremium({
  subject,
  subjectColor,
  topic,
  bullets,
  xp,
  difficulty,
  bgGradient,
  progress,
  totalCards,
  currentCard
}: ReelCardPremiumProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const difficultyColors = {
    Easy: '#10b981',
    Medium: '#f59e0b',
    Hard: '#ef4444'
  };

  return (
    <div className="h-screen w-full snap-start snap-always relative overflow-hidden">
      {/* Background gradient */}
      <div 
        className="absolute inset-0"
        style={{ background: bgGradient }}
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />

      {/* Instagram Stories-style progress bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-4">
        {[...Array(totalCards)].map((_, i) => (
          <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ 
                width: i < currentCard - 1 ? '100%' : i === currentCard - 1 ? `${progress}%` : '0%'
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        ))}
      </div>

      {/* Floating subject chip */}
      <motion.div
        className="absolute top-16 left-6 z-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div 
          className="px-4 py-2 rounded-full backdrop-blur-xl border border-white/20 shadow-2xl flex items-center gap-2"
          style={{ 
            background: `linear-gradient(135deg, ${subjectColor}40, ${subjectColor}20)`,
            boxShadow: `0 0 30px ${subjectColor}40`
          }}
        >
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: subjectColor }}
          />
          <span className="text-white text-sm">{subject}</span>
        </div>
      </motion.div>

      {/* Main content area */}
      <div className="absolute inset-x-0 top-1/3 px-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {/* Topic title */}
          <h1 className="text-white text-4xl mb-6 leading-tight tracking-tight">
            {topic}
          </h1>

          {/* Bullet points */}
          <div className="space-y-4">
            {bullets.map((bullet, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                className="flex items-start gap-3"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] mt-2.5 flex-shrink-0" />
                <p className="text-white/90 text-lg leading-relaxed">{bullet}</p>
              </motion.div>
            ))}
          </div>

          {/* Bottom badges */}
          <motion.div
            className="flex items-center gap-3 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {/* XP badge */}
            <div className="px-4 py-2 rounded-full bg-[#f59e0b]/20 backdrop-blur-xl border border-[#f59e0b]/30">
              <span className="text-[#f59e0b] text-sm">+{xp} XP</span>
            </div>

            {/* Difficulty badge */}
            <div 
              className="px-4 py-2 rounded-full backdrop-blur-xl border"
              style={{ 
                backgroundColor: `${difficultyColors[difficulty]}20`,
                borderColor: `${difficultyColors[difficulty]}30`
              }}
            >
              <span 
                className="text-sm"
                style={{ color: difficultyColors[difficulty] }}
              >
                {difficulty}
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* TikTok-style action sidebar */}
      <div className="absolute right-4 bottom-32 z-20 flex flex-col gap-6">
        {/* Like button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => setLiked(!liked)}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-14 h-14 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg">
            <Heart
              className={`w-6 h-6 transition-all ${
                liked ? 'fill-red-500 text-red-500' : 'text-white'
              }`}
            />
          </div>
          <span className="text-white text-xs">Like</span>
        </motion.button>

        {/* Bookmark button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => setSaved(!saved)}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-14 h-14 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg">
            <Bookmark
              className={`w-6 h-6 transition-all ${
                saved ? 'fill-[#f59e0b] text-[#f59e0b]' : 'text-white'
              }`}
            />
          </div>
          <span className="text-white text-xs">Save</span>
        </motion.button>

        {/* Share button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-14 h-14 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs">Share</span>
        </motion.button>
      </div>
    </div>
  );
}
