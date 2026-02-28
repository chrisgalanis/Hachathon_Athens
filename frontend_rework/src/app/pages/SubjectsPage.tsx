import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Upload, X, Loader2, CheckCircle, AlertCircle, Play, FileText } from 'lucide-react';
import { FloatingNav } from '../components/FloatingNav';
import { fetchSubjects, uploadFile, type SubjectMeta, type UploadedReel } from '../api';
import { useNavigate } from 'react-router';

// ─── Types ──────────────────────────────────────────────────────────────────

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

interface UploadEntry {
  id: string;
  fileName: string;
  fileType: 'video' | 'pdf';
  status: UploadStatus;
  reel?: UploadedReel;
  error?: string;
  /** File object — only available during the current session (not from localStorage) */
  file?: File;
}

const LS_KEY = 'learnreel_uploads';

function loadPersistedUploads(): UploadEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const entries: UploadEntry[] = JSON.parse(raw);
    // Mark in-progress uploads from a previous session as error
    return entries.map(e =>
      e.status === 'uploading' ? { ...e, status: 'error', error: 'Upload interrupted — please retry.' } : e
    );
  } catch {
    return [];
  }
}

function persistUploads(entries: UploadEntry[]) {
  // Strip the non-serialisable File object before saving
  const toSave = entries.map(({ file: _file, ...rest }) => rest);
  localStorage.setItem(LS_KEY, JSON.stringify(toSave));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Component ──────────────────────────────────────────────────────────────

export function SubjectsPage() {
  const [tab, setTab] = useState<'library' | 'uploads'>('library');
  const [subjects, setSubjects] = useState<SubjectMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadEntry[]>(loadPersistedUploads);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubjects()
      .then(setSubjects)
      .catch(() => setSubjects([]))
      .finally(() => setLoading(false));
  }, []);

  // Persist whenever uploads change
  useEffect(() => {
    persistUploads(uploads);
  }, [uploads]);

  // ── Upload handling ────────────────────────────────────────────────────────

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    for (const file of arr) {
      const isVideo = file.type.startsWith('video/');
      const isPdf = file.type === 'application/pdf';
      if (!isVideo && !isPdf) continue;

      const entry: UploadEntry = {
        id: `${Date.now()}-${Math.random()}`,
        fileName: file.name,
        fileType: isVideo ? 'video' : 'pdf',
        status: 'uploading',
        file,
      };

      setUploads(prev => {
        const next = [entry, ...prev];
        persistUploads(next);
        return next;
      });

      try {
        const reel = await uploadFile(file);
        setUploads(prev => {
          const next = prev.map(e =>
            e.id === entry.id ? { ...e, status: 'done' as UploadStatus, reel } : e
          );
          persistUploads(next);
          return next;
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setUploads(prev => {
          const next = prev.map(e =>
            e.id === entry.id ? { ...e, status: 'error' as UploadStatus, error: msg } : e
          );
          persistUploads(next);
          return next;
        });
      }
    }
  }

  async function retryUpload(entry: UploadEntry) {
    if (!entry.file) return;
    setUploads(prev =>
      prev.map(e => e.id === entry.id ? { ...e, status: 'uploading', error: undefined } : e)
    );
    try {
      const reel = await uploadFile(entry.file);
      setUploads(prev =>
        prev.map(e => e.id === entry.id ? { ...e, status: 'done', reel } : e)
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploads(prev =>
        prev.map(e => e.id === entry.id ? { ...e, status: 'error', error: msg } : e)
      );
    }
  }

  function removeUpload(id: string) {
    setUploads(prev => prev.filter(e => e.id !== id));
  }

  function watchUpload(entry: UploadEntry) {
    if (!entry.reel) return;
    sessionStorage.setItem('learnreel_upload_reel', JSON.stringify(entry.reel));
    navigate('/feed?uploadReel=1');
  }

  // ── Drag-and-drop ─────────────────────────────────────────────────────────

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-32">
      <div className="max-w-[430px] mx-auto px-6 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-white text-3xl mb-2">Explore</h1>
          <p className="text-white/50">Browse courses or upload your own content</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 rounded-2xl bg-white/5 border border-white/10">
          {(['library', 'uploads'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
              style={
                tab === t
                  ? { backgroundColor: '#7c3aed', color: '#fff' }
                  : { color: 'rgba(255,255,255,0.45)' }
              }
            >
              {t === 'library' ? 'Public Library' : 'My Uploads'}
              {t === 'uploads' && uploads.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
                  {uploads.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── PUBLIC LIBRARY TAB ─────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {tab === 'library' && (
            <motion.div
              key="library"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
            >
              {loading ? (
                <div className="text-white/40 text-center py-16">Loading subjects…</div>
              ) : subjects.length === 0 ? (
                <div className="text-white/40 text-center py-16">No subjects found. Is the backend running?</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {subjects.map((subject, i) => {
                      const color = colorFor(subject.concept);
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
                          <div className="absolute top-0 left-0 right-0 h-1 opacity-80" style={{ backgroundColor: color }} />

                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            {iconFor(subject.displayName)}
                          </div>

                          <h3 className="text-white text-base mb-3 leading-tight">{subject.displayName}</h3>

                          <div className="text-white/50 text-sm mb-3">
                            0/{total} lectures
                          </div>

                          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                            <div className="h-full rounded-full w-0" style={{ backgroundColor: color }} />
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
            </motion.div>
          )}

          {/* ── MY UPLOADS TAB ──────────────────────────────────────────── */}
          {tab === 'uploads' && (
            <motion.div
              key="uploads"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.18 }}
            >
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className="relative border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all mb-6"
                style={{
                  borderColor: dragOver ? '#7c3aed' : 'rgba(255,255,255,0.12)',
                  backgroundColor: dragOver ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.03)',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,.pdf"
                  multiple
                  className="hidden"
                  onChange={e => e.target.files && handleFiles(e.target.files)}
                />
                <Upload className="w-10 h-10 text-white/30 mx-auto mb-3" />
                <p className="text-white/70 text-sm mb-1">Drop videos or PDFs here</p>
                <p className="text-white/30 text-xs">or click to browse files</p>
              </div>

              {/* Upload list */}
              {uploads.length === 0 ? (
                <div className="text-white/30 text-center py-8 text-sm">
                  No uploads yet. Add a lecture video or PDF above.
                </div>
              ) : (
                <div className="space-y-3">
                  {uploads.map(entry => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10"
                    >
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {entry.fileType === 'pdf'
                          ? <FileText className="w-5 h-5 text-[#f59e0b]" />
                          : <Play className="w-5 h-5 text-[#7c3aed]" />
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate mb-1">{entry.fileName}</p>

                        {entry.status === 'uploading' && (
                          <div className="flex items-center gap-1.5 text-white/50 text-xs">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Uploading…
                          </div>
                        )}
                        {entry.status === 'done' && (
                          <div className="flex items-center gap-1.5 text-[#10b981] text-xs mb-2">
                            <CheckCircle className="w-3 h-3" />
                            Ready
                          </div>
                        )}
                        {entry.status === 'error' && (
                          <div className="flex items-center gap-1.5 text-[#ef4444] text-xs mb-2">
                            <AlertCircle className="w-3 h-3" />
                            {entry.error ?? 'Failed'}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {entry.status === 'done' && entry.fileType === 'video' && (
                            <button
                              onClick={() => watchUpload(entry)}
                              className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#7c3aed]/20 border border-[#7c3aed]/30 text-[#7c3aed] text-xs hover:bg-[#7c3aed]/30 transition-all"
                            >
                              <Play className="w-3 h-3" />
                              Watch
                            </button>
                          )}
                          {entry.status === 'done' && entry.fileType === 'pdf' && entry.reel?.pdfSrc && (
                            <a
                              href={entry.reel.pdfSrc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/30 text-[#f59e0b] text-xs hover:bg-[#f59e0b]/30 transition-all"
                            >
                              <FileText className="w-3 h-3" />
                              Open PDF
                            </a>
                          )}
                          {entry.status === 'error' && (
                            entry.file
                              ? (
                                <button
                                  onClick={() => retryUpload(entry)}
                                  className="px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs hover:bg-white/20 transition-all"
                                >
                                  Retry
                                </button>
                              )
                              : (
                                <span className="text-white/30 text-xs italic">Re-add file to retry</span>
                              )
                          )}
                        </div>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeUpload(entry.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-all flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5 text-white/40" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <FloatingNav />
    </div>
  );
}
