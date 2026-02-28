"use client";

// ── Subjects page ─────────────────────────────────────────────────────────────
// Two tabs: Public (open university lectures) & Your Subjects (uploaded by user)
// Clicking a subject navigates to its reel feed.

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";

// ── Mock data ─────────────────────────────────────────────────────────────────
const PUBLIC_SUBJECTS = [
  {
    id: "os",
    title: "Operating Systems",
    source: "openEclass · UoA",
    icon: "🖥️",
    cardCount: 24,
    accent: "#7c3aed",
  },
  {
    id: "ds",
    title: "Data Structures",
    source: "openEclass · AUTH",
    icon: "🌲",
    cardCount: 31,
    accent: "#3b82f6",
  },
  {
    id: "net",
    title: "Computer Networks",
    source: "Open University Notes",
    icon: "🌐",
    cardCount: 18,
    accent: "#10b981",
  },
  {
    id: "algo",
    title: "Algorithms & Complexity",
    source: "openEclass · NTUA",
    icon: "⚡",
    cardCount: 27,
    accent: "#f59e0b",
  },
  {
    id: "db",
    title: "Databases",
    source: "openEclass · UoA",
    icon: "🗄️",
    cardCount: 22,
    accent: "#ef4444",
  },
  {
    id: "ml",
    title: "Machine Learning",
    source: "Open University Notes",
    icon: "🤖",
    cardCount: 35,
    accent: "#a855f7",
  },
];

const USER_SUBJECTS = [
  {
    id: "user-bio",
    title: "Biochemistry Notes",
    source: "Uploaded by you",
    icon: "🧬",
    cardCount: 8,
    accent: "#10b981",
  },
  {
    id: "user-math",
    title: "Linear Algebra",
    source: "Uploaded by you",
    icon: "📐",
    cardCount: 12,
    accent: "#3b82f6",
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────
function SubjectCard({
  subject,
}: {
  subject: (typeof PUBLIC_SUBJECTS)[0];
}) {
  return (
    <Link href={`/?card=card-1`}>
      <motion.div
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-brand-card border border-white/5 active:border-white/10"
      >
        {/* Icon bubble */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: `${subject.accent}20` }}
        >
          {subject.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight truncate">
            {subject.title}
          </p>
          <p className="text-[11px] text-brand-muted mt-0.5 truncate">
            {subject.source}
          </p>
        </div>

        {/* Card count + arrow */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${subject.accent}20`,
              color: subject.accent,
            }}
          >
            {subject.cardCount} cards
          </span>
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-brand-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </motion.div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SubjectsPage() {
  const [tab, setTab] = useState<"public" | "yours">("public");

  const subjects = tab === "public" ? PUBLIC_SUBJECTS : USER_SUBJECTS;

  return (
    <main className="relative w-full h-full bg-brand-bg flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-white">Subjects</h1>
        <p className="text-sm text-brand-muted mt-1">
          Pick a subject — reels start instantly
        </p>
      </div>

      {/* ── Tab switcher ── */}
      <div className="px-5 mb-4 flex-shrink-0">
        <div className="flex gap-2 p-1 bg-brand-card rounded-2xl">
          {(["public", "yours"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                tab === t
                  ? "bg-brand-accent text-white shadow-md"
                  : "text-brand-muted"
              }`}
            >
              {t === "public" ? "📚 Public" : "📁 Your Subjects"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Subject list ── */}
      <div className="flex-1 overflow-y-auto px-5 pb-28 space-y-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-3"
          >
            {subjects.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <span className="text-4xl">📭</span>
                <p className="text-brand-muted text-sm text-center">
                  No subjects yet.{" "}
                  <Link href="/upload" className="text-brand-accent underline">
                    Upload one!
                  </Link>
                </p>
              </div>
            )}
            {subjects.map((s) => (
              <SubjectCard key={s.id} subject={s} />
            ))}

            {/* Upload CTA at the bottom of Your Subjects */}
            {tab === "yours" && subjects.length > 0 && (
              <Link href="/upload">
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center justify-center gap-3 py-4 rounded-2xl border border-dashed border-brand-accent/40 text-brand-accent text-sm font-semibold mt-2"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Upload new subject
                </motion.div>
              </Link>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav />
    </main>
  );
}
