// ── LearnReel API client ────────────────────────────────────────────────────
// Talks to the FastAPI backend running at NEXT_PUBLIC_API_URL (default: localhost:8000).
// All functions return frontend-ready types or throw on network/HTTP error.

import type { ReelCard } from "@/lib/mock-data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Response shapes from the backend
// ---------------------------------------------------------------------------

export interface SubjectMeta {
  concept: string;
  course: string;
  displayName: string;
  lectureCount: number;
  videoCount: number;
}

interface RawReel {
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
  hasVideo: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rawToReelCard(raw: RawReel): ReelCard {
  return {
    id: raw.id,
    subject: raw.subject,
    topic: raw.topic,
    bullets: raw.concepts.slice(0, 4),
    xpReward: 15,
    difficulty: "medium",
    bgGradient: "from-violet-900 via-purple-900 to-brand-bg",
    accentColor: "#7c3aed",
    // Prefix with the backend origin so the <video> tag can reach the file
    videoSrc: raw.videoSrc ? `${API_BASE}${raw.videoSrc}` : undefined,
    captions: raw.captions ?? [],
  };
}

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
export async function fetchAllReels(): Promise<ReelCard[]> {
  const raw = await apiFetch<RawReel[]>("/api/reels");
  return raw.map(rawToReelCard);
}

/**
 * All reels for a concept (e.g. "Linear_Algebra"), sorted by lecture number.
 * Returns frontend ReelCard objects ready to pass straight to <ReelFeed />.
 */
export async function fetchReels(concept: string): Promise<ReelCard[]> {
  const raw = await apiFetch<RawReel[]>(
    `/api/reels/${encodeURIComponent(concept)}`
  );
  return raw.map(rawToReelCard);
}

/**
 * Single reel for a concept + lecture number.
 * e.g. fetchReel("Linear_Algebra", 21)
 */
export async function fetchReel(
  concept: string,
  lectureNumber: number
): Promise<ReelCard> {
  const raw = await apiFetch<RawReel>(
    `/api/reels/${encodeURIComponent(concept)}/${lectureNumber}`
  );
  return rawToReelCard(raw);
}
