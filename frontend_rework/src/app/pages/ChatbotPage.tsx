import { Search, TrendingUp, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FloatingNav } from '../components/FloatingNav';
import { fetchSubjects, type SubjectMeta } from '../api';

const SUBJECT_COLORS = [
  '#7c3aed', '#06b6d4', '#f59e0b', '#10b981',
  '#ec4899', '#8b5cf6', '#f97316', '#14b8a6',
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

const difficultyColors: Record<string, string> = {
  Easy: '#10b981',
  Medium: '#f59e0b',
  Hard: '#ef4444',
};

export function ChatbotPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [subjects, setSubjects] = useState<SubjectMeta[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    fetchSubjects()
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowResults(query.length > 0);
  };

  const trendingSearches = subjects.slice(0, 5).map(s => s.displayName);

  // Filter subjects by query
  const filteredSubjects = subjects.filter(s =>
    s.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-32">
      <div className="max-w-[430px] mx-auto">
        {/* Frosted glass header */}
        <div className="sticky top-0 z-40 backdrop-blur-2xl bg-[#0a0a0f]/80 border-b border-white/10 px-6 py-4">
          <h1 className="text-white text-2xl mb-4">Search Lectures</h1>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search topics, subjects…"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50 focus:border-[#7c3aed]/50 transition-all backdrop-blur-xl"
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {!showResults ? (
            <>
              {/* Trending */}
              {trendingSearches.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-[#7c3aed]" />
                    <h2 className="text-white text-lg">Trending Now</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trendingSearches.map((name, i) => (
                      <motion.button
                        key={i}
                        onClick={() => handleSearch(name)}
                        className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/80 text-sm backdrop-blur-xl hover:bg-white/10 transition-all"
                        whileTap={{ scale: 0.95 }}
                      >
                        {name}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Browse by subject */}
              <div>
                <h2 className="text-white text-lg mb-4">Browse by Subject</h2>
                <div className="space-y-3">
                  {subjects.map((subject, i) => {
                    const color = colorFor(subject.concept);
                    return (
                      <motion.button
                        key={subject.concept}
                        onClick={() => handleSearch(subject.displayName)}
                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all flex items-center justify-between"
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-white">{subject.displayName}</span>
                        </div>
                        <div className="text-white/40 text-sm">
                          {subject.lectureCount} lectures
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Search results */}
              <AnimatePresence>
                {filteredSubjects.length === 0 ? (
                  <div className="text-white/40 text-center py-16">No subjects match "{searchQuery}"</div>
                ) : (
                  <div className="space-y-4">
                    {filteredSubjects.map((subject, i) => {
                      const color = colorFor(subject.concept);
                      return (
                        <motion.div
                          key={subject.concept}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all"
                        >
                          <div className="flex gap-4 p-4">
                            {/* Colour swatch */}
                            <div
                              className="w-24 h-24 rounded-xl flex-shrink-0 flex items-center justify-center"
                              style={{ background: `linear-gradient(135deg, ${color}80, ${color}20)` }}
                            >
                              <span className="text-3xl">📖</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              {/* Subject chip */}
                              <div
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full mb-2"
                                style={{ backgroundColor: `${color}20` }}
                              >
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                                <span className="text-xs" style={{ color }}>{subject.displayName}</span>
                              </div>

                              <h3 className="text-white text-base mb-1">{subject.displayName}</h3>

                              <div className="text-white/50 text-sm mb-3">
                                {subject.lectureCount} lectures · {subject.videoCount} videos
                              </div>

                              {/* Bottom row */}
                              <div className="flex items-center justify-between">
                                <div
                                  className="px-2 py-1 rounded-full text-xs"
                                  style={{ backgroundColor: `${difficultyColors.Medium}20`, color: difficultyColors.Medium }}
                                >
                                  Medium
                                </div>
                                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7c3aed]/20 border border-[#7c3aed]/30 rounded-full text-[#7c3aed] text-sm hover:bg-[#7c3aed]/30 transition-all">
                                  <Play className="w-3 h-3" />
                                  <span>Browse</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>

      <FloatingNav />

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
