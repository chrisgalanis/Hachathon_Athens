// ── Upload page (stub) ────────────────────────────────────────────────────────
import BottomNav from "@/components/nav/BottomNav";

export default function UploadPage() {
  return (
    <main className="relative w-full h-full bg-brand-bg flex flex-col items-center justify-center gap-4 px-6">
      <div className="w-16 h-16 rounded-2xl bg-brand-accent flex items-center justify-center glow-purple">
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="white" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-white">Upload your lecture</h2>
      <p className="text-sm text-brand-muted text-center">PDF · PPT · Notes — AI parsing coming soon</p>
      <BottomNav />
    </main>
  );
}
