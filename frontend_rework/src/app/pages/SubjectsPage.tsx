import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { PlayCircle } from 'lucide-react';
import { FloatingNav } from '../components/FloatingNav';
import { fetchAllReels, type RawReel } from '../api';
import { useNavigate } from 'react-router';

const ACCENT = '#7c3aed';

export function SubjectsPage() {
  const [reels, setReels] = useState<RawReel[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllReels()
      .then(setReels)
      .catch(() => setReels([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-32">
      <div className="max-w-[430px] mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-white/50 text-sm mb-1">Now studying</p>
          <h1 className="text-white text-3xl font-semibold">Linear Algebra</h1>
        </motion.div>

        {/* Subject card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 mb-8 overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: ACCENT }} />
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
              style={{ backgroundColor: `${ACCENT}20` }}
            >
              📐
            </div>
            <div>
              <h2 className="text-white text-lg font-medium">Linear Algebra</h2>
              <p className="text-white/50 text-sm mt-0.5">
                {loading ? '…' : `${reels.length} lectures available`}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Lectures list */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-white/60 text-xs uppercase tracking-widest mb-4">Lectures</h2>

          {loading ? (
            <div className="text-white/40 text-center py-12">Loading lectures…</div>
          ) : reels.length === 0 ? (
            <div className="text-white/40 text-center py-12">No lectures found.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {reels.map((reel, index) => (
                <motion.button
                  key={reel.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/feed?index=${index}`)}
                  className="flex items-center gap-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-left hover:bg-white/10 transition-all"
                >
                  {/* Index badge */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold flex-shrink-0"
                    style={{ backgroundColor: `${ACCENT}25`, color: ACCENT }}
                  >
                    {index + 1}
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium leading-snug truncate">
                      {reel.subject}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {reel.hasVideo ? 'Video available' : 'No video'}
                    </p>
                  </div>

                  <PlayCircle className="w-5 h-5 flex-shrink-0" style={{ color: ACCENT }} />
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <FloatingNav />
    </div>
  );
}
