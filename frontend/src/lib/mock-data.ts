// ── Mock lecture cards ──────────────────────────────────────────────────────
// Replace with AI-parsed content later. Each card = one micro-concept.
// videoSrc — path relative to /public, e.g. "/videos/clip-1.mp4"
//            Leave undefined to show the gradient placeholder.

export type Difficulty = "easy" | "medium" | "hard";

export interface Caption {
  start: number;   // seconds into the video
  end: number;     // seconds into the video
  text: string;    // subtitle text shown on screen
}

export interface ReelCard {
  id: string;
  subject: string;
  topic: string;         // card headline (shown in bottom overlay)
  bullets: string[];     // kept for chatbot context; not rendered on card
  xpReward: number;      // XP for marking understood
  difficulty: Difficulty;
  bgGradient: string;    // placeholder gradient when no video
  accentColor: string;   // hex — drives accent colours + glow
  videoSrc?: string;     // path to MP4 in /public — THE content of the reel
  captions?: Caption[];  // timed subtitle captions shown over the video
}

export const MOCK_CARDS: ReelCard[] = [
  {
    id: "card-1",
    subject: "Linear Algebra",
    topic: "Vectors — What even are they?",
    bullets: [
      "A vector is both a direction and a magnitude.",
      "In physics: an arrow in space. In CS: an ordered list of numbers.",
      "Adding vectors = tip-to-tail. Scaling = stretching or flipping.",
      "Basis vectors î and ĵ span all of 2D space.",
    ],
    xpReward: 10,
    difficulty: "easy",
    bgGradient: "from-violet-900 via-purple-900 to-brand-bg",
    accentColor: "#7c3aed",
  },
  {
    id: "card-2",
    subject: "Operating Systems",
    topic: "Context Switching",
    bullets: [
      "CPU switches between processes by saving/restoring state.",
      "The saved state is stored in the PCB.",
      "Context switch = overhead — it's pure CPU time lost.",
      "Modern CPUs minimize this with hardware threads (hyperthreading).",
      "Faster scheduling ≠ more switches — balance is key.",
    ],
    xpReward: 15,
    difficulty: "medium",
    bgGradient: "from-blue-900 via-indigo-900 to-brand-bg",
    accentColor: "#3b82f6",
  },
  {
    id: "card-3",
    subject: "Operating Systems",
    topic: "Deadlock — Four Conditions",
    bullets: [
      "Mutual Exclusion: only one process holds a resource at a time.",
      "Hold & Wait: process holds one resource, waits for another.",
      "No Preemption: resources can't be forcibly taken away.",
      "Circular Wait: P1 waits for P2, P2 waits for P1... 🔁",
    ],
    xpReward: 20,
    difficulty: "hard",
    bgGradient: "from-red-900 via-rose-900 to-brand-bg",
    accentColor: "#ef4444",
  },
  {
    id: "card-4",
    subject: "Data Structures",
    topic: "Hash Tables in 4 bullets",
    bullets: [
      "Maps keys → values via a hash function.",
      "Average O(1) lookup — worst case O(n) with collisions.",
      "Collision strategies: chaining (linked list) or open addressing.",
      "Load factor > 0.7 → resize the table to maintain performance.",
    ],
    xpReward: 15,
    difficulty: "medium",
    bgGradient: "from-emerald-900 via-teal-900 to-brand-bg",
    accentColor: "#10b981",
  },
  {
    id: "card-5",
    subject: "Networks",
    topic: "TCP vs UDP — When to use what",
    bullets: [
      "TCP: reliable, ordered, slower — use for files, web pages, email.",
      "UDP: fire-and-forget, faster — use for video, gaming, DNS.",
      "TCP handshake = 3 steps (SYN → SYN-ACK → ACK).",
      "UDP has no handshake — latency wins over reliability.",
    ],
    xpReward: 10,
    difficulty: "easy",
    bgGradient: "from-amber-900 via-orange-900 to-brand-bg",
    accentColor: "#f59e0b",
  },
];
