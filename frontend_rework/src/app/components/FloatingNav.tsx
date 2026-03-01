import { Home, Search, BookOpen, TrendingUp } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';

export function FloatingNav({ visible = true }: { visible?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'feed', icon: Home, label: 'Home', path: '/feed' },
    { id: 'chatbot', icon: Search, label: 'Search', path: '/chatbot' },
    { id: 'subjects', icon: BookOpen, label: 'Subjects', path: '/subjects' },
    { id: 'progress', icon: TrendingUp, label: 'Progress', path: '/progress' },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[430px] w-full px-4"
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
    >
      {/* Floating pill navigation */}
      <motion.div
        className="mx-auto w-fit backdrop-blur-2xl bg-white/10 rounded-full border border-white/10 shadow-2xl px-2 py-2"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        <div className="flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(item.path)}
                className="relative px-5 py-3 rounded-full transition-all"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavPill"
                    className="absolute inset-0 bg-[#7c3aed] rounded-full"
                    transition={{ type: "spring", duration: 0.6, bounce: 0.2 }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 relative z-10 transition-colors ${
                    isActive ? 'text-white' : 'text-white/60'
                  }`}
                />
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
