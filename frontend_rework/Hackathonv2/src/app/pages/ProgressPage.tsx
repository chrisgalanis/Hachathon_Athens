import { motion } from 'motion/react';
import { Flame, Target, Award, TrendingUp, Calendar } from 'lucide-react';
import { FloatingNav } from '../components/FloatingNav';

const achievements = [
  { id: 1, icon: '🎯', title: 'First Lesson', desc: 'Complete your first reel', unlocked: true, color: '#7c3aed' },
  { id: 2, icon: '🔥', title: '7 Day Streak', desc: 'Learn for 7 days straight', unlocked: true, color: '#f59e0b' },
  { id: 3, icon: '⚡', title: 'Speed Learner', desc: 'Complete 10 lessons in 1 day', unlocked: true, color: '#06b6d4' },
  { id: 4, icon: '🏆', title: 'Subject Master', desc: 'Complete all lessons in 1 subject', unlocked: false, color: '#10b981' },
  { id: 5, icon: '💎', title: '1000 XP', desc: 'Earn 1000 total XP', unlocked: false, color: '#ec4899' },
  { id: 6, icon: '🌟', title: 'Perfect Week', desc: 'Complete daily goal 7 days', unlocked: false, color: '#8b5cf6' }
];

const weeklyActivity = [
  { day: 'Mon', xp: 120, completed: true },
  { day: 'Tue', xp: 85, completed: true },
  { day: 'Wed', xp: 150, completed: true },
  { day: 'Thu', xp: 95, completed: true },
  { day: 'Fri', xp: 110, completed: true },
  { day: 'Sat', xp: 0, completed: false },
  { day: 'Sun', xp: 0, completed: false }
];

export function ProgressPage() {
  const totalXP = 2847;
  const currentStreak = 5;
  const longestStreak = 12;
  const lessonsCompleted = 67;

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-32">
      <div className="max-w-[430px] mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-white text-3xl mb-2">Your Progress</h1>
          <p className="text-white/50">Track your learning journey</p>
        </motion.div>

        {/* XP Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative backdrop-blur-xl bg-gradient-to-br from-[#7c3aed]/20 to-[#06b6d4]/20 border border-white/10 rounded-3xl p-6 mb-6 overflow-hidden"
        >
          {/* Animated background glow */}
          <motion.div
            className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#7c3aed]/30 blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-[#7c3aed]" />
              <span className="text-white/60 text-sm">Total XP</span>
            </div>
            <div className="text-5xl text-white mb-2">{totalXP.toLocaleString()}</div>
            <div className="text-[#06b6d4] text-sm">+160 this week</div>
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-4 mb-6"
        >
          {/* Current streak */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <Flame className="w-6 h-6 text-[#f59e0b] mx-auto mb-2" />
            <div className="text-2xl text-white mb-1">{currentStreak}</div>
            <div className="text-white/50 text-xs">Day Streak</div>
          </div>

          {/* Lessons completed */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <Target className="w-6 h-6 text-[#06b6d4] mx-auto mb-2" />
            <div className="text-2xl text-white mb-1">{lessonsCompleted}</div>
            <div className="text-white/50 text-xs">Completed</div>
          </div>

          {/* Longest streak */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <Award className="w-6 h-6 text-[#10b981] mx-auto mb-2" />
            <div className="text-2xl text-white mb-1">{longestStreak}</div>
            <div className="text-white/50 text-xs">Best Streak</div>
          </div>
        </motion.div>

        {/* Weekly activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-[#7c3aed]" />
            <h2 className="text-white text-lg">This Week</h2>
          </div>

          <div className="flex items-end justify-between gap-2 h-32 mb-4">
            {weeklyActivity.map((day, i) => {
              const maxXP = Math.max(...weeklyActivity.map(d => d.xp));
              const height = (day.xp / maxXP) * 100;
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <motion.div 
                    className="w-full rounded-lg relative overflow-hidden"
                    style={{ 
                      height: day.xp > 0 ? `${height}%` : '8px',
                      background: day.completed 
                        ? 'linear-gradient(to top, #7c3aed, #06b6d4)' 
                        : 'rgba(255,255,255,0.1)'
                    }}
                    initial={{ height: 0 }}
                    animate={{ 
                      height: day.xp > 0 ? `${height}%` : '8px'
                    }}
                    transition={{ delay: i * 0.1 + 0.4 }}
                  >
                    {day.completed && (
                      <motion.div
                        className="absolute inset-0 bg-white/20"
                        animate={{
                          y: ['-100%', '100%']
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      />
                    )}
                  </motion.div>
                  <span className={`text-xs ${day.completed ? 'text-white' : 'text-white/40'}`}>
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-white/50 text-sm text-center">
            560 XP earned this week
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-[#f59e0b]" />
            <h2 className="text-white text-lg">Achievements</h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {achievements.map((achievement, i) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 + 0.5 }}
                className={`backdrop-blur-xl border rounded-2xl p-4 text-center transition-all ${
                  achievement.unlocked
                    ? 'bg-white/5 border-white/10'
                    : 'bg-white/5 border-white/5 opacity-40'
                }`}
              >
                <div className="text-4xl mb-2">{achievement.icon}</div>
                <div className="text-white text-xs mb-1 line-clamp-1">
                  {achievement.title}
                </div>
                <div className="text-white/40 text-[10px] line-clamp-2">
                  {achievement.desc}
                </div>
                {achievement.unlocked && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#10b981] flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.05 + 0.7, type: "spring" }}
                  >
                    <span className="text-white text-xs">✓</span>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Floating Navigation */}
      <FloatingNav />
    </div>
  );
}
