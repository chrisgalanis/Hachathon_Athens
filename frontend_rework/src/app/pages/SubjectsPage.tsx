import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayCircle, Upload, FileText, CheckCircle, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import { FloatingNav } from '../components/FloatingNav';
import { fetchAllReels, uploadTranscript, pollUploadStatus, type RawReel, type UploadJob } from '../api';
import { useNavigate } from 'react-router';

const ACCENT = '#7c3aed';

const SUBJECT_COLORS = [
  '#7c3aed', '#06b6d4', '#f59e0b', '#10b981',
  '#ec4899', '#8b5cf6', '#f97316', '#14b8a6',
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

function emojiFor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('algebra') || lower.includes('math') || lower.includes('linear')) return '📐';
  if (lower.includes('signal') || lower.includes('awgn') || lower.includes('noise')) return '📶';
  if (lower.includes('channel') || lower.includes('comm')) return '📡';
  if (lower.includes('econom') || lower.includes('finance') || lower.includes('inflation')) return '📈';
  if (lower.includes('calcul') || lower.includes('differential')) return '∫';
  if (lower.includes('physics') || lower.includes('quantum')) return '⚛️';
  if (lower.includes('network') || lower.includes('graph')) return '🕸️';
  if (lower.includes('algorithm') || lower.includes('data')) return '💻';
  return '📚';
}

type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading' }
  | { phase: 'processing'; jobId: string; message: string }
  | { phase: 'done'; subject: string }
  | { phase: 'error'; message: string };

interface CategoryInfo {
  name: string;
  reels: Array<{ reel: RawReel; index: number }>;
}

function deriveCategories(reels: RawReel[]): CategoryInfo[] {
  const map = new Map<string, Array<{ reel: RawReel; index: number }>>();
  reels.forEach((reel, i) => {
    const name = reel.subject;
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push({ reel, index: i });
  });
  return Array.from(map.entries())
    .map(([name, reels]) => ({ name, reels }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function SubjectsPage() {
  const [reels, setReels] = useState<RawReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [upload, setUpload] = useState<UploadState>({ phase: 'idle' });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  function loadData() {
    fetchAllReels()
      .then(setReels)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []);

  const categories = deriveCategories(reels);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // Cleanup poll on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUpload({ phase: 'error', message: 'Please upload a PDF file.' });
      return;
    }
    setUpload({ phase: 'uploading' });
    try {
      const { jobId } = await uploadTranscript(file);
      setUpload({ phase: 'processing', jobId, message: 'Starting pipeline…' });
      pollRef.current = setInterval(async () => {
        try {
          const status: UploadJob = await pollUploadStatus(jobId);
          if (status.status === 'done') {
            clearInterval(pollRef.current!);
            loadData();
            setUpload({ phase: 'done', subject: status.result?.subject ?? 'Your transcript' });
          } else if (status.status === 'error') {
            clearInterval(pollRef.current!);
            setUpload({ phase: 'error', message: status.message });
          } else {
            setUpload({ phase: 'processing', jobId, message: status.message });
          }
        } catch {
          // Keep polling silently
        }
      }, 3000);
    } catch (err) {
      setUpload({ phase: 'error', message: err instanceof Error ? err.message : 'Upload failed.' });
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

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
          <h1 className="text-white text-3xl font-semibold">
            {loading ? '…' : categories.length === 0 ? 'My Library' : `${categories.length} subject${categories.length !== 1 ? 's' : ''}`}
          </h1>
        </motion.div>

        {/* Subject cards */}
        {!loading && categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex flex-col gap-3 mb-8"
          >
            {categories.map((cat, i) => {
              const color = colorFor(cat.name);
              const emoji = emojiFor(cat.name);
              const isOpen = openCategory === cat.name;
              return (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.04 }}
                  className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />
                  {/* Header row — toggles dropdown */}
                  <button
                    className="w-full flex items-center gap-4 p-5 text-left"
                    onClick={() => setOpenCategory(isOpen ? null : cat.name)}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-white text-base font-medium truncate">{cat.name}</h2>
                      <p className="text-white/50 text-sm mt-0.5">
                        {cat.reels.length} reel{cat.reels.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 text-white/40" />
                    </motion.div>
                  </button>

                  {/* Dropdown reel list */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="dropdown"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-white/8 mx-4 mb-3" />
                        <div className="flex flex-col gap-1 px-3 pb-3">
                          {cat.reels.map(({ reel, index }) => (
                            <button
                              key={reel.id}
                              onClick={() => navigate(`/feed?index=${index}`)}
                              className="flex items-center gap-3 px-3 py-3 rounded-2xl text-left hover:bg-white/8 transition-colors"
                            >
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${color}20` }}
                              >
                                <PlayCircle className="w-4 h-4" style={{ color }} />
                              </div>
                              <p className="text-white/80 text-sm leading-snug flex-1 min-w-0 truncate">
                                {reel.topic}
                              </p>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* ── PDF Upload Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-white/60 text-xs uppercase tracking-widest mb-4">Upload Transcript</h2>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={onFileChange}
          />

          <AnimatePresence mode="wait">
            {upload.phase === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed rounded-2xl p-6 flex flex-col items-center gap-3 transition-all"
                style={{
                  borderColor: dragOver ? ACCENT : 'rgba(255,255,255,0.15)',
                  backgroundColor: dragOver ? `${ACCENT}10` : 'rgba(255,255,255,0.03)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${ACCENT}20` }}
                >
                  <Upload className="w-5 h-5" style={{ color: ACCENT }} />
                </div>
                <div className="text-center">
                  <p className="text-white text-sm font-medium">Drop your transcript PDF</p>
                  <p className="text-white/40 text-xs mt-1">Any university transcript • PDF only</p>
                </div>
                <div
                  className="text-xs font-medium px-4 py-2 rounded-xl"
                  style={{ backgroundColor: `${ACCENT}25`, color: ACCENT }}
                >
                  Browse files
                </div>
              </motion.div>
            )}

            {upload.phase === 'uploading' && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="border border-white/10 rounded-2xl p-6 flex items-center gap-4 bg-white/5"
              >
                <Loader2 className="w-6 h-6 animate-spin flex-shrink-0" style={{ color: ACCENT }} />
                <div>
                  <p className="text-white text-sm font-medium">Uploading PDF…</p>
                  <p className="text-white/40 text-xs mt-0.5">Sending to server</p>
                </div>
              </motion.div>
            )}

            {upload.phase === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="border rounded-2xl p-6 bg-white/5"
                style={{ borderColor: `${ACCENT}40` }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${ACCENT}20` }}
                  >
                    <FileText className="w-5 h-5" style={{ color: ACCENT }} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Processing transcript</p>
                    <p className="text-white/50 text-xs mt-0.5">{upload.message}</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: ACCENT }}
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
                <p className="text-white/30 text-xs mt-3 text-center">This takes a few minutes — AI is generating your reels</p>
              </motion.div>
            )}

            {upload.phase === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="border rounded-2xl p-6 bg-white/5 flex items-start gap-4"
                style={{ borderColor: '#22c55e40' }}
              >
                <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-green-500" />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">Reels ready!</p>
                  <p className="text-white/50 text-xs mt-0.5">
                    "{upload.subject}" has been added to your feed
                  </p>
                  <button
                    onClick={() => navigate('/feed')}
                    className="mt-3 text-xs font-medium px-4 py-2 rounded-xl"
                    style={{ backgroundColor: `${ACCENT}25`, color: ACCENT }}
                  >
                    Watch now →
                  </button>
                </div>
                <button
                  onClick={() => setUpload({ phase: 'idle' })}
                  className="text-white/30 text-xs hover:text-white/60 transition-colors"
                >
                  Upload another
                </button>
              </motion.div>
            )}

            {upload.phase === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="border rounded-2xl p-5 bg-white/5 flex items-start gap-3"
                style={{ borderColor: '#ef444440' }}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">Something went wrong</p>
                  <p className="text-white/50 text-xs mt-0.5">{upload.message}</p>
                </div>
                <button
                  onClick={() => setUpload({ phase: 'idle' })}
                  className="text-white/30 text-xs hover:text-white/60 transition-colors"
                >
                  Retry
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Empty state */}
        {!loading && categories.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-white/40 text-center py-12"
          >
            No subjects yet — upload a transcript to get started.
          </motion.div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-white/40 text-center py-12">Loading library…</div>
        )}
      </div>

      <FloatingNav />
    </div>
  );
}
