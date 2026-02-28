# LearnReel 🎓⚡

> Vertical lecture reels. Study in 60 seconds.

## Stack
- **Next.js 14** — App Router
- **TypeScript** — strict mode
- **Tailwind CSS** — mobile-first, custom brand palette
- **Framer Motion** — GPU-friendly animations
- **Zustand** — XP / streak global state (persisted to localStorage)

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Run dev server
npm run dev

# 3. Open on mobile (same WiFi)
# Find your local IP and open http://192.168.x.x:3000 in mobile browser
```

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout — viewport, metadata
│   ├── page.tsx            # Home — reel feed
│   ├── subjects/page.tsx   # Subjects browser (stub)
│   ├── upload/page.tsx     # Upload page (stub)
│   └── progress/page.tsx   # Progress dashboard
│
├── components/
│   ├── reel/               # Core reel card components
│   │   ├── ReelFeed.tsx    # Snap-scroll container
│   │   ├── ReelCard.tsx    # Full-screen card compositor
│   │   ├── CardBackground.tsx  # Animated gradient + orbs
│   │   ├── BulletList.tsx  # Staggered bullet animation
│   │   ├── ProgressBar.tsx # Concept progress indicator
│   │   ├── ActionPanel.tsx # Save · XP · Difficulty actions
│   │   ├── XpHeader.tsx    # Top XP + streak bar
│   │   └── LevelUpOverlay.tsx  # Level-up celebration
│   │
│   └── nav/
│       └── BottomNav.tsx   # Fixed bottom navigation
│
├── store/
│   └── useXpStore.ts       # Zustand XP + streak store
│
└── lib/
    └── mock-data.ts        # Lecture cards (replace with AI parser)
```

---

## Dopamine Mechanics Implemented

| Feature | Status |
|---|---|
| Snap scroll (CSS-native, 60fps) | ✅ |
| Staggered bullet animation | ✅ |
| XP reward on "Understood" | ✅ |
| Streak counter | ✅ |
| Level-up overlay | ✅ |
| XP floating pop (+XP!) | ✅ |
| Button bounce micro-interactions | ✅ |
| Animated progress bar | ✅ |
| Floating orb backgrounds | ✅ |
| Save for revision | ✅ |
| Difficulty toggle | ✅ |
| Progress dashboard | ✅ |
| localStorage persistence | ✅ |

---

## Next Steps (Phase 2)
- AI PDF parsing (LangChain / custom)
- Auto bullet generation
- Adaptive difficulty per user history
- User auth + cloud sync
