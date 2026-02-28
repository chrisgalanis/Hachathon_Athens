import { motion } from 'motion/react';
import { ArrowRight, Zap, BookOpen, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Dot grid background pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(124, 58, 237, 0.3) 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }}
      />

      {/* Animated lava lamp background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Left blob - Purple */}
        <motion.div
          className="absolute -left-20 top-1/4 w-96 h-96 rounded-full blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }}
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Right blob - Cyan */}
        <motion.div
          className="absolute -right-20 top-1/3 w-96 h-96 rounded-full blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }}
          animate={{
            x: [0, -50, 0],
            y: [0, 40, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Center blob - Gold */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 bottom-1/4 w-80 h-80 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.2, 0.3, 0.2]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[430px] mx-auto px-6 py-12">
        {/* Hero section */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="inline-block px-4 py-2 rounded-full bg-[#7c3aed]/20 border border-[#7c3aed]/30 backdrop-blur-xl mb-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-[#7c3aed] text-sm">🎓 Learn smarter, not harder</span>
          </motion.div>

          <h1 className="text-6xl text-white mb-6 leading-tight">
            University<br />
            <span className="bg-gradient-to-r from-[#7c3aed] via-[#06b6d4] to-[#f59e0b] bg-clip-text text-transparent">
              for Gen Z
            </span>
          </h1>

          <p className="text-white/60 text-lg mb-8 leading-relaxed">
            Swipe through micro-lessons.<br />
            Master university concepts.<br />
            Level up your grades.
          </p>

          <motion.button
            onClick={() => navigate('/feed')}
            className="px-8 py-4 bg-[#7c3aed] text-white rounded-full text-lg flex items-center gap-2 mx-auto shadow-2xl shadow-[#7c3aed]/50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Learning
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>

        {/* Phone mockup with glowing border */}
        <motion.div
          className="relative mx-auto w-64 h-[500px] mb-16"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          {/* Pulsing glow */}
          <motion.div
            className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-[#7c3aed] via-[#06b6d4] to-[#f59e0b] opacity-50 blur-2xl"
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [0.98, 1.02, 0.98]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Phone frame */}
          <div className="relative z-10 w-full h-full rounded-[3rem] bg-gradient-to-br from-[#7c3aed]/20 via-[#06b6d4]/20 to-[#f59e0b]/20 border-2 border-white/10 backdrop-blur-xl overflow-hidden">
            <div className="absolute inset-4 bg-[#0a0a0f] rounded-[2.5rem] flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#7c3aed]/20 border border-[#7c3aed]/30 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-[#7c3aed]" />
                </div>
                <p className="text-white/40 text-sm">Preview</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          className="grid grid-cols-3 gap-4 mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {[
            { label: 'Active Students', value: '12K+', color: '#7c3aed' },
            { label: 'Micro Lessons', value: '5K+', color: '#06b6d4' },
            { label: 'Avg. Grade Up', value: '+1.2', color: '#f59e0b' }
          ].map((stat, i) => (
            <div 
              key={i}
              className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 text-center"
            >
              <div 
                className="text-2xl mb-1"
                style={{ color: stat.color }}
              >
                {stat.value}
              </div>
              <div className="text-white/50 text-xs">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* How it works */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <h2 className="text-white text-2xl mb-6 text-center">How it works</h2>
          <div className="space-y-4">
            {[
              { icon: Zap, title: 'Swipe to Learn', desc: 'Vertical reels of bite-sized lessons', color: '#7c3aed' },
              { icon: BookOpen, title: 'Earn XP', desc: 'Complete lessons, level up your knowledge', color: '#06b6d4' },
              { icon: TrendingUp, title: 'Track Progress', desc: 'See your streak and achievements grow', color: '#f59e0b' }
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div 
                  key={i}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4"
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${step.color}20`, borderColor: `${step.color}30` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: step.color }} />
                  </div>
                  <div>
                    <h3 className="text-white text-lg mb-1">{step.title}</h3>
                    <p className="text-white/50 text-sm">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center pb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <motion.button
            onClick={() => navigate('/feed')}
            className="px-8 py-4 bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] text-white rounded-full text-lg shadow-2xl shadow-[#7c3aed]/30 w-full"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Get Started Free
          </motion.button>
          <p className="text-white/40 text-sm mt-4">No credit card required</p>
        </motion.div>
      </div>
    </div>
  );
}
