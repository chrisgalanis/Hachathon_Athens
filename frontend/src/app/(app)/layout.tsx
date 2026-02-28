// ── App shell layout — wraps all "in-app" routes with the phone-frame ─────────
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "stretch",
        background: "#111116",
        height: "100dvh",
        maxHeight: "100dvh",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div className="phone-frame">{children}</div>
    </div>
  );
}
