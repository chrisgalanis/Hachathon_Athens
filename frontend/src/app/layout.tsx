import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearnReel — Study in 60 seconds",
  description: "Vertical lecture reels. Learn faster.",
  // PWA-ready meta tags for mobile install prompt
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LearnReel",
  },
};

// Force full-screen mobile rendering
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-brand-bg text-white antialiased">
        {children}
      </body>
    </html>
  );
}
