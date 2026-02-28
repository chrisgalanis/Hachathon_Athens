import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { FloatingNav } from '../components/FloatingNav';
import { fetchSubjects, type SubjectMeta } from '../api';
import { useNavigate } from 'react-router';

const SUBJECT_COLORS = [
  '#7c3aed', '#06b6d4', '#f59e0b', '#10b981',
  '#ec4899', '#8b5cf6', '#f97316', '#14b8a6',
];

const SUBJECT_ICONS: Record<string, string> = {
  physics: '⚛️',
  'computer science': '💻',
  mathematics: '📐',
  'linear algebra': '📐',
  economics: '📊',
  chemistry: '🧪',
  biology: '🧬',
  history: '🏛️',
  literature: '📚',
};

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

function iconFor(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(SUBJECT_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '📖';
}

export function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubjects()
      .then(setSubjects)
      .catch(() => setSubjects([]))
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
          <h1 className="text-white text-3xl mb-2">Subjects</h1>
          <p className="text-white/50">Browse all available courses</p>
        </motion.div>

        {loading ? (
          <div className="text-white/40 text-center py-16">Loading subjects…</div>
        ) : subjects.length === 0 ? (
          <div className="text-white/40 text-center py-16">No subjects found. Is the backend running?</div>
        ) : (
          <>
            {/* Subject cards grid */}
            <div className="grid grid-cols-2 gap-4">
              {subjects.map((subject, i) => {
                const color = colorFor(subject.concept);
                const completed = 0; // no user tracking yet
                const total = subject.lectureCount;

                return (
                  <motion.button
                    key={subject.concept}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(`/feed?concept=${encodeURIComponent(subject.concept)}`)}
                    className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-5 text-left overflow-hidden hover:bg-white/10 transition-all"
                  >
                    {/* Colour stripe */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1 opacity-80"
                      style={{ backgroundColor: color }}
                    />

                    {/* Icon */}
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      {iconFor(subject.displayName)}
                    </div>

                    <h3 className="text-white text-base mb-3 leading-tight">{subject.displayName}</h3>

                    <div className="text-white/50 text-sm mb-3">
                      {completed}/{total} lectures
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        animate={{ width: total > 0 ? `${(completed / total) * 100}%` : '0%' }}
                        transition={{ delay: i * 0.05 + 0.3, duration: 0.8 }}
                      />
                    </div>

                    <div className="flex items-center gap-1 text-sm" style={{ color }}>
                      <span>Browse</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Stats overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6"
            >
              <h2 className="text-white text-xl mb-4">Overview</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl text-[#7c3aed] mb-1">{subjects.length}</div>
                  <div className="text-white/50 text-xs">Subjects</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-[#06b6d4] mb-1">
                    {subjects.reduce((sum, s) => sum + s.lectureCount, 0)}
                  </div>
                  <div className="text-white/50 text-xs">Lectures</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-[#f59e0b] mb-1">
                    {subjects.reduce((sum, s) => sum + s.videoCount, 0)}
                  </div>
                  <div className="text-white/50 text-xs">Videos</div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>

      <FloatingNav />
    </div>
  );
}
