import { Search, X, Play, Lightbulb } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { FloatingNav } from '../components/FloatingNav';
import { fetchSubjects, type SubjectMeta } from '../api';

const SUBJECT_COLORS = [
  '#7c3aed', '#06b6d4', '#f59e0b', '#10b981',
  '#ec4899', '#8b5cf6', '#f97316', '#14b8a6',
];

const EXAMPLE_QUERIES = [
  { label: 'What is an eigenvector?', category: 'Mathematics' },
  { label: 'Explain matrix multiplication', category: 'Mathematics' },
  { label: 'What is the Fourier transform?', category: 'Mathematics' },
  { label: 'How does LU decomposition work?', category: 'Mathematics' },
  { label: 'What are eigenvalues used for?', category: 'Mathematics' },
];

const CATEGORIES = ['All', 'Mathematics', 'Physics', 'Computer Science', 'Economics'];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

export function ChatbotPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [subjects, setSubjects] = useState<SubjectMeta[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubjects()
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, []);

  const showResults = searchQuery.length > 0;

  const filteredSubjects = subjects.filter(s =>
    s.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.concept.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function goToFeed(concept: string, lecture: number = 1) {
    navigate(`/feed?concept=${encodeURIComponent(concept)}&lecture=${lecture}`);
  }

  function handleExampleQuery(label: string) {
    setSearchQuery(label);
    inputRef.current?.focus();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-32">
      <div className="max-w-[430px] mx-auto">
        {/* Sticky header */}
        <div className="sticky top-0 z-40 backdrop-blur-2xl bg-[#0a0a0f]/80 border-b border-white/10 px-6 py-4">
          <h1 className="text-white text-2xl mb-4">Search</h1>

          {/* Animated search bar */}
          <motion.div
            className="relative"
            animate={{ scale: focused ? 1.01 : 1 }}
            transition={{ duration: 0.15 }}
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search topics, concepts…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="w-full pl-12 pr-10 py-3 bg-white/10 border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none transition-all backdrop-blur-xl"
              style={focused ? { boxShadow: '0 0 0 2px #7c3aed80', borderColor: '#7c3aed80' } : {}}
            />
            {searchQuery.length > 0 && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all"
              >
                <X className="w-3.5 h-3.5 text-white/60" />
              </button>
            )}
          </motion.div>

          {/* Category filter pills */}
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={
                  activeCategory === cat
                    ? { backgroundColor: '#7c3aed', color: '#fff' }
                    : { backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <AnimatePresence mode="wait">
            {!showResults ? (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Example queries */}
                <div className="mb-8">
                  <p className="text-white/40 text-sm mb-3 uppercase tracking-wider">Try asking…</p>
                  <div className="space-y-2">
                    {EXAMPLE_QUERIES.map((q, i) => (
                      <motion.button
                        key={i}
                        onClick={() => handleExampleQuery(q.label)}
                        className="w-full text-left px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm hover:bg-white/10 hover:text-white transition-all flex items-center gap-3"
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                      >
                        <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
                        <span>{q.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Popular subjects horizontal scroll */}
                <div className="mb-8">
                  <p className="text-white/40 text-sm mb-3 uppercase tracking-wider">Popular Subjects</p>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                    {subjects.slice(0, 8).map(s => {
                      const color = colorFor(s.concept);
                      return (
                        <motion.button
                          key={s.concept}
                          onClick={() => goToFeed(s.concept, 1)}
                          className="flex-shrink-0 px-4 py-2.5 rounded-2xl border text-sm text-white/80 hover:text-white transition-all"
                          style={{ backgroundColor: `${color}15`, borderColor: `${color}40` }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {s.displayName}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Tip card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="flex gap-3 p-4 rounded-2xl bg-[#7c3aed]/10 border border-[#7c3aed]/20"
                >
                  <Lightbulb className="w-5 h-5 text-[#7c3aed] flex-shrink-0 mt-0.5" />
                  <p className="text-white/60 text-sm leading-relaxed">
                    Search for any concept and tap <span className="text-[#7c3aed]">Watch</span> to jump straight to that lecture in the feed.
                  </p>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <p className="text-white/40 text-sm mb-4">
                  {filteredSubjects.length} result{filteredSubjects.length !== 1 ? 's' : ''} for "{searchQuery}"
                </p>

                {filteredSubjects.length === 0 ? (
                  <div className="text-white/40 text-center py-16">No subjects match your search.</div>
                ) : (
                  <div className="space-y-3">
                    {filteredSubjects.map((subject, i) => {
                      const color = colorFor(subject.concept);
                      return (
                        <motion.div
                          key={subject.concept}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                        >
                          {/* Color dot */}
                          <div
                            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-lg"
                            style={{ backgroundColor: `${color}25` }}
                          >
                            📖
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{subject.displayName}</p>
                            <p className="text-white/40 text-xs mt-0.5">
                              {subject.lectureCount} lectures · {subject.videoCount} videos
                            </p>
                          </div>

                          {/* Watch button */}
                          <button
                            onClick={() => goToFeed(subject.concept, 1)}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                            style={{ backgroundColor: `${color}25`, color }}
                          >
                            <Play className="w-3 h-3" />
                            Watch
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
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
