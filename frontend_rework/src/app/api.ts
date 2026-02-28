// ── LearnReel API client ────────────────────────────────────────────────────
// Talks to the FastAPI backend (default: localhost:8000).
// Set VITE_API_URL in .env to override.

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubjectMeta {
  concept: string;
  course: string;
  displayName: string;
  lectureCount: number;
  videoCount: number;
}

export interface RawReel {
  id: string;
  concept: string;
  lectureNumber: number;
  subject: string;
  topic: string;
  concepts: string[];
  examples: string[];
  analogy: string[];
  transcript: string;
  captions: Array<{ start: number; end: number; text: string }>;
  videoSrc: string | null;
  brainrotSrc: string | null;
  pdfSrc: string | null;
  hasVideo: boolean;
  isUserUpload?: boolean;
  fileName?: string;
  fileType?: 'video' | 'pdf';
}

export interface UploadedReel extends RawReel {
  isUserUpload: true;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** List every available concept with lecture / video counts. */
export async function fetchSubjects(): Promise<SubjectMeta[]> {
  return apiFetch<SubjectMeta[]>("/api/subjects");
}

/** All reels listed in reels.json, in order. */
export async function fetchAllReels(): Promise<RawReel[]> {
  return apiFetch<RawReel[]>("/api/reels");
}

/** All reels for a concept (e.g. "Linear_Algebra"), sorted by lecture number. */
export async function fetchReels(concept: string): Promise<RawReel[]> {
  return apiFetch<RawReel[]>(`/api/reels/${encodeURIComponent(concept)}`);
}

/** Single reel for a concept + lecture number. */
export async function fetchReel(concept: string, lectureNumber: number): Promise<RawReel> {
  return apiFetch<RawReel>(`/api/reels/${encodeURIComponent(concept)}/${lectureNumber}`);
}

/** Resolve a video path returned by the backend into a full URL. */
export function resolveVideoUrl(videoSrc: string): string {
  return `${API_BASE}${videoSrc}`;
}

/** Upload a video or PDF file; returns the reel metadata for playback. */
export async function uploadFile(file: File): Promise<UploadedReel> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json() as Promise<UploadedReel>;
}
