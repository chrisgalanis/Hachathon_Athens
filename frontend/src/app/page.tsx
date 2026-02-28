"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ── Lava lamp background ─────────────────────────────────────────────────────
function LavaLamp() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <style>{`
        @keyframes lava1 {
          0%   { transform: translate(0, 0)    scale(1); }
          25%  { transform: translate(0, 18%)  scale(1.12); }
          50%  { transform: translate(0, 35%)  scale(0.95); }
          75%  { transform: translate(0, 18%)  scale(1.08); }
          100% { transform: translate(0, 0)    scale(1); }
        }
        @keyframes lava2 {
          0%   { transform: translate(0, 0)    scale(1.05); }
          33%  { transform: translate(0, -22%) scale(0.92); }
          66%  { transform: translate(0, 12%)  scale(1.15); }
          100% { transform: translate(0, 0)    scale(1.05); }
        }
        @keyframes lava3 {
          0%   { transform: translate(0, 0)    scale(1); }
          40%  { transform: translate(0, 28%)  scale(1.1); }
          80%  { transform: translate(0, -10%) scale(0.9); }
          100% { transform: translate(0, 0)    scale(1); }
        }
        @keyframes lava4 {
          0%   { transform: translate(0, 0)   scale(0.95); }
          50%  { transform: translate(0, -30%) scale(1.2); }
          100% { transform: translate(0, 0)   scale(0.95); }
        }
        @keyframes lava5 {
          0%   { transform: translate(0, 0)   scale(1.1); }
          35%  { transform: translate(0, 20%) scale(0.88); }
          70%  { transform: translate(0, -15%) scale(1.15); }
          100% { transform: translate(0, 0)   scale(1.1); }
        }
      `}</style>

      {/* ── LEFT COLUMN ── */}
      {/* blob L1 — purple, top */}
      <div style={{
        position: "absolute", left: "8%", top: "-10%",
        width: 340, height: 340, borderRadius: "50%",
        background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)",
        filter: "blur(72px)", opacity: 0.35,
        animation: "lava1 14s ease-in-out infinite",
      }} />
      {/* blob L2 — cyan, mid */}
      <div style={{
        position: "absolute", left: "4%", top: "30%",
        width: 260, height: 260, borderRadius: "50%",
        background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)",
        filter: "blur(60px)", opacity: 0.22,
        animation: "lava3 18s ease-in-out infinite",
      }} />
      {/* blob L3 — gold, bottom */}
      <div style={{
        position: "absolute", left: "6%", bottom: "-5%",
        width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)",
        filter: "blur(80px)", opacity: 0.2,
        animation: "lava2 22s ease-in-out infinite",
      }} />

      {/* ── RIGHT COLUMN (mirror) ── */}
      {/* blob R1 — purple, top */}
      <div style={{
        position: "absolute", right: "8%", top: "-10%",
        width: 340, height: 340, borderRadius: "50%",
        background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)",
        filter: "blur(72px)", opacity: 0.35,
        animation: "lava1 14s ease-in-out infinite",
      }} />
      {/* blob R2 — cyan, mid */}
      <div style={{
        position: "absolute", right: "4%", top: "30%",
        width: 260, height: 260, borderRadius: "50%",
        background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)",
        filter: "blur(60px)", opacity: 0.22,
        animation: "lava3 18s ease-in-out infinite",
      }} />
      {/* blob R3 — gold, bottom */}
      <div style={{
        position: "absolute", right: "6%", bottom: "-5%",
        width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)",
        filter: "blur(80px)", opacity: 0.2,
        animation: "lava2 22s ease-in-out infinite",
      }} />

      {/* ── CENTRE accent (shared) ── */}
      <div style={{
        position: "absolute", left: "50%", top: "55%",
        transform: "translateX(-50%)",
        width: 200, height: 200, borderRadius: "50%",
        background: "radial-gradient(circle, #a855f7 0%, transparent 70%)",
        filter: "blur(90px)", opacity: 0.18,
        animation: "lava4 26s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", left: "50%", top: "10%",
        transform: "translateX(-50%)",
        width: 160, height: 160, borderRadius: "50%",
        background: "radial-gradient(circle, #10b981 0%, transparent 70%)",
        filter: "blur(70px)", opacity: 0.14,
        animation: "lava5 20s ease-in-out infinite",
      }} />
    </div>
  );
}

// ── Phone mockup with cycling cards ──────────────────────────────────────────
const PREVIEW_CARDS = [
  { emoji: "📐", subject: "Linear Algebra", title: "Eigenvalues in 60 seconds", color: "#7c3aed" },
  { emoji: "⚛️", subject: "Quantum Physics", title: "Schrödinger's uncertainty principle", color: "#06b6d4" },
  { emoji: "💻", subject: "Algorithms", title: "Big-O — what it actually means", color: "#10b981" },
  { emoji: "📈", subject: "Microeconomics", title: "Nash Equilibrium, no BS", color: "#f59e0b" },
];

function PhoneMockup() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % PREVIEW_CARDS.length), 2200);
    return () => clearInterval(t);
  }, []);
  const card = PREVIEW_CARDS[active];
  return (
    <div className="relative mx-auto select-none" style={{ width: 200, height: 360 }}>
      {/* shell */}
      <div className="absolute inset-0 rounded-[34px] border border-white/10" style={{ background: "linear-gradient(160deg,#18182a,#0a0a0f)", boxShadow: "0 32px 64px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.06)" }} />
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 h-1.5 rounded-full bg-white/10" />
      {/* card */}
      <div className="absolute inset-[8px] rounded-[26px] overflow-hidden flex flex-col justify-end p-4 transition-all duration-500" style={{ background: `linear-gradient(180deg,${card.color}18 0%,${card.color}55 60%,#0a0a0f 100%)` }}>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full self-start mb-2" style={{ background: card.color + "30", color: card.color }}>{card.subject}</span>
        <div className="text-4xl mb-2">{card.emoji}</div>
        <p className="text-white text-xs font-bold leading-snug">{card.title}</p>
        <div className="flex gap-2 mt-3 text-base opacity-60">❤️ 💬 🔖</div>
        <div className="flex gap-1 mt-2 justify-center">
          {PREVIEW_CARDS.map((_, i) => (
            <div key={i} className="h-0.5 rounded-full transition-all duration-300" style={{ width: i === active ? 18 : 5, background: i === active ? "#fff" : "rgba(255,255,255,.25)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step card ─────────────────────────────────────────────────────────────────
function Step({ n, icon, title, desc, color }: { n: string; icon: string; title: string; desc: string; color: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black" style={{ background: color + "22", color }}>{n}</div>
      <div className="pt-1">
        <p className="font-bold text-sm text-white">{icon} {title}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ── Landing page ──────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen w-full text-white" style={{ background: "#0a0a0f", overflowY: "auto", overflowX: "hidden" }}>
      <LavaLamp />

      {/* NAV */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎓</span>
          <span className="font-extrabold text-lg tracking-tight">Learn<span style={{ color: "#a855f7" }}>Reel</span></span>
        </div>
        <button
          onClick={() => router.push("/feed")}
          className="text-xs font-semibold px-4 py-2 rounded-full border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 transition-colors"
        >
          Enter app →
        </button>
      </header>

      {/* HERO */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-8 pb-16 max-w-xl mx-auto">
        {/* badge */}
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(168,85,247,0.3)", color: "#c084fc" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
          Built for Greek universities · NTUA · UoA · AUTH
        </div>

        <h1 className="text-4xl sm:text-5xl font-black leading-[1.1] tracking-tight mb-4">
          University<br />
          <span style={{ background: "linear-gradient(90deg,#a855f7,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            for&nbsp;Gen&nbsp;Z
          </span>
        </h1>

        <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-xs">
          Lecture content turned into <strong className="text-white">60-second reels</strong>. Swipe, learn, pass.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <button
            onClick={() => router.push("/feed")}
            className="relative px-8 py-4 rounded-2xl font-bold text-sm text-white overflow-hidden group transition-all duration-200 hover:scale-[1.03] active:scale-95"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 28px rgba(124,58,237,0.55)" }}
          >
            Start for free →
          </button>
          <button
            onClick={() => router.push("/upload")}
            className="px-8 py-4 rounded-2xl font-bold text-sm border border-white/10 text-gray-300 hover:bg-white/5 transition-all duration-200"
          >
            📤 Upload lectures
          </button>
        </div>

        {/* social proof avatars */}
        <div className="flex items-center gap-2 mt-5 text-xs text-gray-500">
          <div className="flex -space-x-1.5">
            {["🧑‍🎓","👩‍🎓","🧑‍💻","👩‍🔬"].map((e, i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px]">{e}</div>
            ))}
          </div>
          <span><strong className="text-gray-300">2,400+</strong> students already learning</span>
        </div>

        {/* phone mockup */}
        <div className="mt-14"><PhoneMockup /></div>
      </section>

      {/* STATS */}
      <section className="relative z-10 py-10 px-6 max-w-xl mx-auto">
        <div className="grid grid-cols-3 gap-3">
          {[
            { n: "1,200+", label: "Lecture reels" },
            { n: "34",     label: "Greek universities" },
            { n: "92%",    label: "Pass rate boost" },
          ].map(({ n, label }) => (
            <div key={label} className="rounded-2xl p-4 text-center border border-white/5" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-xl font-black" style={{ background: "linear-gradient(90deg,#a855f7,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{n}</p>
              <p className="text-[10px] text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative z-10 py-10 px-6 max-w-xl mx-auto">
        <p className="text-xs font-semibold text-center mb-1" style={{ color: "#a855f7" }}>HOW IT WORKS</p>
        <h2 className="text-2xl font-black text-center mb-8">As simple as TikTok.</h2>
        <div className="flex flex-col gap-5">
          <Step n="01" icon="📂" title="Upload your lecture" desc="PDF, notes, YouTube link — it takes anything." color="#7c3aed" />
          <Step n="02" icon="🤖" title="AI builds the reels" desc="60-second explanations with animated visuals." color="#06b6d4" />
          <Step n="03" icon="📱" title="Scroll & learn" desc="Swipe up like Instagram. One reel = one concept." color="#10b981" />
          <Step n="04" icon="🏆" title="Earn XP & streak badges" desc="Gamified learning that keeps you on track for exams." color="#f59e0b" />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 py-14 px-6 max-w-md mx-auto text-center">
        <div className="rounded-3xl p-8 border border-purple-500/20 relative overflow-hidden" style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.15),rgba(6,182,212,0.05))" }}>
          <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: "radial-gradient(circle at 50% 0%,rgba(124,58,237,0.35),transparent 65%)" }} />
          <p className="text-4xl mb-3">🚀</p>
          <h2 className="text-xl font-black mb-2">Ready to study smarter?</h2>
          <p className="text-gray-400 text-sm mb-6">Sign up in under 30 seconds. No credit card.</p>
          <button
            onClick={() => router.push("/feed")}
            className="w-full py-4 rounded-2xl font-black text-base text-white transition-all duration-200 hover:scale-[1.02] active:scale-95"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 36px rgba(124,58,237,0.5)" }}
          >
            Start now — it's free →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-8 px-6 text-center border-t border-white/5">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span>🎓</span>
          <span className="font-extrabold text-sm">Learn<span style={{ color: "#a855f7" }}>Reel</span></span>
        </div>
        <p className="text-gray-600 text-xs">Made with ❤️ by students for students · Athens Hackathon 2026</p>
      </footer>
    </div>
  );
}
