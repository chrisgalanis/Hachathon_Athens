"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ── Floating orb background ───────────────────────────────────────────────────
function Orbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)", filter: "blur(60px)" }}
      />
      <div
        className="absolute bottom-0 -right-24 w-[380px] h-[380px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)", filter: "blur(80px)" }}
      />
      <div
        className="absolute top-1/2 right-8 w-[200px] h-[200px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)", filter: "blur(50px)" }}
      />
    </div>
  );
}

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let start = 0;
      const step = Math.ceil(to / 60);
      const timer = setInterval(() => {
        start += step;
        if (start >= to) { setVal(to); clearInterval(timer); }
        else setVal(start);
      }, 16);
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ── Reel preview card ─────────────────────────────────────────────────────────
const PREVIEW_CARDS = [
  { emoji: "📐", subject: "Γραμμική Άλγεβρα", title: "Eigenvalues σε 60 δευτερόλεπτα", color: "#7c3aed" },
  { emoji: "⚛️", subject: "Κβαντική Φυσική", title: "Schrödinger — αρχή αβεβαιότητας", color: "#06b6d4" },
  { emoji: "📈", subject: "Μικροοικονομία", title: "Nash Equilibrium χωρίς bullshit", color: "#10b981" },
  { emoji: "💻", subject: "Αλγόριθμοι", title: "Big-O notation — τελικά τι σημαίνει;", color: "#f59e0b" },
];

function PhoneMockup() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % PREVIEW_CARDS.length), 2400);
    return () => clearInterval(t);
  }, []);
  const card = PREVIEW_CARDS[active];
  return (
    <div className="relative mx-auto select-none" style={{ width: 220, height: 390 }}>
      <div
        className="absolute inset-0 rounded-[36px] border border-white/10"
        style={{ background: "linear-gradient(160deg, #18182a 0%, #0a0a0f 100%)", boxShadow: "0 40px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)" }}
      />
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-1.5 rounded-full bg-white/10" />
      <div
        className="absolute inset-[10px] rounded-[28px] overflow-hidden flex flex-col justify-end p-4 transition-all duration-500"
        style={{ background: `linear-gradient(180deg, ${card.color}22 0%, ${card.color}66 60%, #0a0a0f 100%)` }}
      >
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full self-start mb-2" style={{ background: card.color + "33", color: card.color }}>
          {card.subject}
        </span>
        <div className="text-5xl mb-2">{card.emoji}</div>
        <p className="text-white text-sm font-bold leading-snug">{card.title}</p>
        <div className="flex gap-3 mt-3">{["❤️", "💬", "🔖"].map((ic) => <span key={ic} className="text-lg opacity-70">{ic}</span>)}</div>
        <div className="flex gap-1 mt-3 justify-center">
          {PREVIEW_CARDS.map((_, i) => (
            <div key={i} className="h-0.5 rounded-full transition-all duration-300" style={{ width: i === active ? 20 : 6, background: i === active ? "#fff" : "rgba(255,255,255,0.3)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, color }: { icon: string; title: string; desc: string; color: string }) {
  return (
    <div className="rounded-2xl p-5 border border-white/5 flex flex-col gap-2 hover:scale-[1.02] transition-transform duration-200" style={{ background: "linear-gradient(140deg, #16162299, #0a0a0f99)", backdropFilter: "blur(12px)" }}>
      <div className="text-2xl w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + "22" }}>{icon}</div>
      <p className="font-bold text-white text-sm">{title}</p>
      <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}

// ── Testimonial ───────────────────────────────────────────────────────────────
function Testimonial({ text, name, uni, avatar }: { text: string; name: string; uni: string; avatar: string }) {
  return (
    <div className="rounded-2xl p-5 border border-white/5 flex flex-col gap-3" style={{ background: "linear-gradient(140deg, #16162299, #0a0a0f99)", backdropFilter: "blur(12px)" }}>
      <p className="text-sm text-gray-300 leading-relaxed italic">"{text}"</p>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: "#7c3aed33", color: "#a855f7" }}>{avatar}</div>
        <div>
          <p className="text-white text-xs font-semibold">{name}</p>
          <p className="text-gray-500 text-[10px]">{uni}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main landing page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  return (
    <div className="relative min-h-screen w-full overflow-y-auto overflow-x-hidden text-white" style={{ background: "#0a0a0f" }}>
      <Orbs />

      {/* ── NAV ── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎓</span>
          <span className="font-extrabold text-lg tracking-tight">Learn<span style={{ color: "#a855f7" }}>Reel</span></span>
        </div>
        <button onClick={() => router.push("/feed")} className="text-xs font-semibold px-4 py-2 rounded-full border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 transition-colors">
          Είσοδος →
        </button>
      </header>

      {/* ── HERO ── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-10 pb-20 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(168,85,247,0.3)", color: "#c084fc" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Διαθέσιμο στα ελληνικά πανεπιστήμια
        </div>
        <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight mb-4">
          Μάθε{" "}
          <span style={{ background: "linear-gradient(90deg, #a855f7, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            σαν να κάνεις scroll
          </span>
          <br />στο TikTok.
        </h1>
        <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-sm">
          Εξηγήσεις πανεπιστημιακών μαθημάτων σε <strong className="text-white">60 δευτερόλεπτα</strong>.
          Από φοιτητές, για φοιτητές. Χωρίς διαφημίσεις, χωρίς bullshit.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <button
            onClick={() => router.push("/feed")}
            className="relative px-8 py-4 rounded-2xl font-bold text-sm text-white overflow-hidden group transition-all duration-200 hover:scale-[1.03] active:scale-95"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 0 30px rgba(124,58,237,0.5)" }}
          >
            <span className="relative z-10">Ξεκίνα δωρεάν →</span>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
          </button>
          <button onClick={() => router.push("/upload")} className="px-8 py-4 rounded-2xl font-bold text-sm border border-white/10 text-gray-300 hover:bg-white/5 transition-all duration-200">
            📤 Ανέβασε διαλέξεις
          </button>
        </div>
        <div className="flex items-center gap-2 mt-6 text-xs text-gray-500">
          <div className="flex -space-x-1.5">
            {["🧑‍🎓","👩‍🎓","🧑‍💻","👩‍🔬"].map((e, i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px]">{e}</div>
            ))}
          </div>
          <span><strong className="text-gray-300">2.400+</strong> φοιτητές χρησιμοποιούν ήδη το LearnReel</span>
        </div>
        <div className="mt-16"><PhoneMockup /></div>
      </section>

      {/* ── STATS ── */}
      <section className="relative z-10 py-12 px-6 max-w-2xl mx-auto">
        <div className="grid grid-cols-3 gap-4">
          {[
            { val: 1200, suffix: "+", label: "Reels μαθημάτων" },
            { val: 34, suffix: "", label: "Ελληνικά ΑΕΙ & ΤΕΙ" },
            { val: 92, suffix: "%", label: "Επιτυχία στις εξετάσεις" },
          ].map(({ val, suffix, label }) => (
            <div key={label} className="rounded-2xl p-4 text-center border border-white/5" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-2xl font-black" style={{ background: "linear-gradient(90deg, #a855f7, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                <Counter to={val} suffix={suffix} />
              </p>
              <p className="text-[10px] text-gray-500 mt-1 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative z-10 py-12 px-6 max-w-2xl mx-auto">
        <p className="text-xs font-semibold text-center mb-2" style={{ color: "#a855f7" }}>ΠΩΣ ΛΕΙΤΟΥΡΓΕΙ</p>
        <h2 className="text-2xl font-black text-center mb-10">Απλό σαν TikTok.<br /><span className="text-gray-400 font-normal text-base">Χωρίς τις χαζές χορογραφίες.</span></h2>
        <div className="flex flex-col gap-4">
          {[
            { step: "01", icon: "📂", title: "Ανέβασε τη διάλεξή σου", desc: "PDF, σημειώσεις, YouTube link — τα δέχεται όλα.", color: "#7c3aed" },
            { step: "02", icon: "🤖", title: "Το AI τα μετατρέπει σε Reels", desc: "Εξηγήσεις 60 δευτερολέπτων με κινούμενα διαγράμματα.", color: "#06b6d4" },
            { step: "03", icon: "📱", title: "Κάνε scroll & μάθε", desc: "Swipe up σαν στο Instagram. Κάθε reel = μία έννοια.", color: "#10b981" },
            { step: "04", icon: "🏆", title: "Μάζεψε XP & ξεκλείδωσε badges", desc: "Gamified μάθηση που σε κρατά on track για τις εξετάσεις.", color: "#f59e0b" },
          ].map(({ step, icon, title, desc, color }) => (
            <div key={step} className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black" style={{ background: color + "22", color }}>{step}</div>
              <div className="pt-1">
                <p className="font-bold text-sm text-white">{icon} {title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative z-10 py-12 px-6 max-w-2xl mx-auto">
        <p className="text-xs font-semibold text-center mb-2" style={{ color: "#06b6d4" }}>ΧΑΡΑΚΤΗΡΙΣΤΙΚΑ</p>
        <h2 className="text-2xl font-black text-center mb-8">Ό,τι χρειάζεσαι για τις εξετάσεις.</h2>
        <div className="grid grid-cols-2 gap-3">
          <FeatureCard icon="🎬" title="Reels 60 δευτερολέπτων" desc="Κάθε βίντεο καλύπτει ακριβώς μία έννοια. Χωρίς padding." color="#7c3aed" />
          <FeatureCard icon="🤖" title="AI εξηγήσεις" desc="GPT-powered περιεχόμενο βασισμένο στις επίσημες διαλέξεις σου." color="#06b6d4" />
          <FeatureCard icon="🔖" title="Αποθήκευσε & επανέλαβε" desc="Bookmark reels για εξετάσεις. Flashcard mode included." color="#10b981" />
          <FeatureCard icon="🏆" title="Streaks & XP" desc="Μάθε κάθε μέρα 10 λεπτά και ξεπέρασε τους συμφοιτητές σου." color="#f59e0b" />
          <FeatureCard icon="🇬🇷" title="Ελληνικό περιεχόμενο" desc="ΕΜΠ, ΕΚΠΑ, ΑΠΘ και 30+ ιδρύματα. Στη γλώσσα σου." color="#ef4444" />
          <FeatureCard icon="📊" title="Πρόοδος & analytics" desc="Δες ακριβώς πού χρειάζεσαι βοήθεια πριν τις εξετάσεις." color="#a855f7" />
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="relative z-10 py-12 px-6 max-w-2xl mx-auto">
        <p className="text-xs font-semibold text-center mb-2" style={{ color: "#f59e0b" }}>ΤΙ ΛΕΝΕ ΟΙ ΦΟΙΤΗΤΕΣ</p>
        <h2 className="text-2xl font-black text-center mb-8">Αληθινές ιστορίες. Χωρίς PR.</h2>
        <div className="flex flex-col gap-3">
          <Testimonial text="Είχα εξετάσεις Γραμμικής Άλγεβρας σε 3 μέρες. Το LearnReel με έσωσε κυριολεκτικά. Πέρασα με 8." name="Νίκος Π." uni="ΕΜΠ — Ηλεκτρολόγος 3ο έτος" avatar="Ν" />
          <Testimonial text="Τέλος με τα 4ωρα YouTube tutorials. Τώρα μαθαίνω στο λεωφορείο, 10 λεπτά τη μέρα." name="Μαρία Κ." uni="ΕΚΠΑ — Πληροφορική 2ο έτος" avatar="Μ" />
          <Testimonial text="Ανέβασα τις σημειώσεις της διάλεξης και σε 5 λεπτά είχα 12 reels έτοιμα. Απίστευτο." name="Δημήτρης Α." uni="ΑΠΘ — Φυσική 4ο έτος" avatar="Δ" />
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="relative z-10 py-16 px-6 max-w-xl mx-auto text-center">
        <div className="rounded-3xl p-8 border border-purple-500/20 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(6,182,212,0.05) 100%)" }}>
          <div className="absolute inset-0 rounded-3xl opacity-30 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 0%, rgba(124,58,237,0.4), transparent 60%)" }} />
          <p className="text-4xl mb-4">🚀</p>
          <h2 className="text-2xl font-black mb-3">Έτοιμος να αλλάξεις<br />τον τρόπο που μελετάς;</h2>
          <p className="text-gray-400 text-sm mb-6">Εγγραφή σε λιγότερο από 30 δευτερόλεπτα.<br />Χωρίς credit card. Χωρίς BS.</p>
          <button
            onClick={() => router.push("/feed")}
            className="relative w-full py-4 rounded-2xl font-black text-base text-white overflow-hidden group transition-all duration-200 hover:scale-[1.02] active:scale-95"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 0 40px rgba(124,58,237,0.5)" }}
          >
            Ξεκίνα τώρα — είναι δωρεάν →
          </button>
          <p className="text-gray-600 text-xs mt-4">
            Ήδη μέλος;{" "}
            <button onClick={() => router.push("/feed")} className="text-purple-400 underline">Σύνδεση</button>
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 py-8 px-6 text-center border-t border-white/5">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-lg">🎓</span>
          <span className="font-extrabold text-sm">Learn<span style={{ color: "#a855f7" }}>Reel</span></span>
        </div>
        <p className="text-gray-600 text-xs">Φτιαγμένο με ❤️ από φοιτητές για φοιτητές · Athens Hackathon 2026</p>
        <div className="flex justify-center gap-4 mt-4 text-xs text-gray-600">
          {["Αρχική","Μαθήματα","Chatbot","Επικοινωνία"].map((l) => (
            <span key={l} className="hover:text-gray-400 cursor-pointer transition-colors">{l}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}
