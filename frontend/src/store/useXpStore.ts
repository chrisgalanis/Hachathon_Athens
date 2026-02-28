// ── XP + Streak global state ─────────────────────────────────────────────────
// Zustand: no Provider needed, works anywhere in the tree.
// Persist to localStorage so XP survives page refreshes.

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface XpState {
  totalXp: number;
  streak: number;           // consecutive "understood" cards
  level: number;            // derived from totalXp
  savedCards: string[];     // card IDs saved for revision
  understoodCards: string[];// card IDs marked understood

  // Actions
  addXp: (amount: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  toggleSaved: (cardId: string) => void;
  markUnderstood: (cardId: string, xpReward: number) => void;
}

// XP thresholds per level (extend as needed)
const XP_PER_LEVEL = 100;

function calcLevel(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export const useXpStore = create<XpState>()(
  persist(
    (set, get) => ({
      totalXp: 0,
      streak: 0,
      level: 1,
      savedCards: [],
      understoodCards: [],

      addXp: (amount) =>
        set((state) => {
          const newXp = state.totalXp + amount;
          return { totalXp: newXp, level: calcLevel(newXp) };
        }),

      incrementStreak: () =>
        set((state) => ({ streak: state.streak + 1 })),

      resetStreak: () => set({ streak: 0 }),

      toggleSaved: (cardId) =>
        set((state) => ({
          savedCards: state.savedCards.includes(cardId)
            ? state.savedCards.filter((id) => id !== cardId)
            : [...state.savedCards, cardId],
        })),

      markUnderstood: (cardId, xpReward) => {
        const { understoodCards, addXp, incrementStreak } = get();
        // Don't double-reward
        if (understoodCards.includes(cardId)) return;
        set((state) => ({
          understoodCards: [...state.understoodCards, cardId],
        }));
        addXp(xpReward);
        incrementStreak();
      },
    }),
    {
      name: "learnreel-xp", // localStorage key
    }
  )
);
