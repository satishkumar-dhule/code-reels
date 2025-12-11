import { useLocation } from "wouter";
import { useGlobalStats, useProgress } from "../hooks/use-progress";
import { useTheme } from "../context/ThemeContext";
import { channels, getQuestions, getStatsByChannel, getAllQuestions, getQuestionDifficulty } from "../lib/data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";
import { ArrowLeft, Trophy, Target, Flame, Zap, BookOpen, Clock, TrendingUp, Award, CheckCircle, Circle } from "lucide-react";
import { motion } from "framer-motion";

export default function Stats() {
  const [_, setLocation] = useLocation();
  const { stats } = useGlobalStats();
  const { theme } = useTheme();

  // Get all progress data across channels
  const allProgress = channels.map(channel => {
    const stored = localStorage.getItem(`progress-${channel.id}`);
    const completed = stored ? JSON.parse(stored) : [];
    const questions = getQuestions(channel.id);
    return {
      id: channel.id,
      name: channel.name,
      completed: completed.length,
      total: questions.length,
      percent: questions.length > 0 ? Math.round((completed.length / questions.length) * 100) : 0
    };
  });

  // Calculate totals
  const totalCompleted = allProgress.reduce((acc, c) => acc + c.completed, 0);
  const totalQuestions = getAllQuestions().length;
  const overallPercent = totalQuestions > 0 ? Math.round((totalCompleted / totalQuestions) * 100) : 0;

  // Get difficulty distribution
  const allQuestions = getAllQuestions();
  const difficultyData = [
    { name: 'Beginner', value: allQuestions.filter(q => getQuestionDifficulty(q) === 'beginner').length, color: '#22c55e' },
    { name: 'Intermediate', value: allQuestions.filter(q => getQuestionDifficulty(q) === 'intermediate').length, color: '#eab308' },
    { name: 'Advanced', value: allQuestions.filter(q => getQuestionDifficulty(q) === 'advanced').length, color: '#ef4444' },
  ];

  // Channel stats for bar chart
  const channelStats = getStatsByChannel();

  // Calculate streak (simplified)
  const currentStreak = stats.length > 0 ? Math.min(stats.length, 7) : 0;

  // Activity heatmap data (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dateStr = date.toISOString().split('T')[0];
    const activity = stats.find(s => s.date === dateStr);
    return {
      date: dateStr,
      day: date.getDate(),
      count: activity?.count || 0,
    };
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-4 sm:p-8 font-mono overflow-x-hidden">
      <header className="mb-6 sm:mb-12 flex items-center justify-between border-b border-border pb-4 sm:pb-6">
        <button 
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 hover:text-primary transition-colors text-xs uppercase tracking-widest font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-lg sm:text-2xl font-bold uppercase tracking-tighter">
          <span className="text-primary">&gt;</span> Statistics
        </h1>
      </header>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-border p-4 sm:p-6 bg-card"
        >
          <div className="flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground mb-2">
            <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-primary" /> Overall
          </div>
          <div className="text-2xl sm:text-4xl font-bold text-primary">{overallPercent}%</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">{totalCompleted}/{totalQuestions} completed</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border border-border p-4 sm:p-6 bg-card"
        >
          <div className="flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground mb-2">
            <Flame className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" /> Streak
          </div>
          <div className="text-2xl sm:text-4xl font-bold text-orange-500">{currentStreak}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">days active</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border border-border p-4 sm:p-6 bg-card"
        >
          <div className="flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground mb-2">
            <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" /> Sessions
          </div>
          <div className="text-2xl sm:text-4xl font-bold text-blue-400">{stats.reduce((acc, curr) => acc + curr.count, 0)}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">total sessions</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border border-border p-4 sm:p-6 bg-card"
        >
          <div className="flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground mb-2">
            <Target className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" /> Modules
          </div>
          <div className="text-2xl sm:text-4xl font-bold text-green-400">{channels.length}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">available</div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Progress by Module */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="border border-border p-4 sm:p-6 bg-card"
        >
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest mb-4 sm:mb-6 text-primary flex items-center gap-2">
            <span className="w-2 h-2 bg-primary block"></span> Progress by Module
          </h2>
          <div className="space-y-3 sm:space-y-4">
            {allProgress.map((module, idx) => (
              <div key={module.id} className="space-y-1">
                <div className="flex justify-between text-[10px] sm:text-xs">
                  <span className="uppercase tracking-widest">{module.name}</span>
                  <span className="text-muted-foreground">{module.completed}/{module.total}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${module.percent}%` }}
                    transition={{ delay: 0.5 + idx * 0.1, duration: 0.5 }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Difficulty Distribution */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="border border-border p-4 sm:p-6 bg-card"
        >
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest mb-4 sm:mb-6 text-primary flex items-center gap-2">
            <span className="w-2 h-2 bg-primary block"></span> Difficulty Distribution
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 sm:w-40 sm:h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={difficultyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {difficultyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 sm:space-y-3">
              {difficultyData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 sm:gap-3">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                  <div className="flex-1">
                    <div className="text-[10px] sm:text-xs uppercase tracking-widest">{item.name}</div>
                    <div className="text-sm sm:text-lg font-bold">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Activity Heatmap */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="border border-border p-4 sm:p-6 bg-card mb-6 sm:mb-8"
      >
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest mb-4 sm:mb-6 text-primary flex items-center gap-2">
          <span className="w-2 h-2 bg-primary block"></span> Activity (Last 30 Days)
        </h2>
        <div className="grid grid-cols-10 sm:grid-cols-15 gap-1">
          {last30Days.map((day, idx) => (
            <div
              key={idx}
              className={`w-full aspect-square rounded-sm transition-colors ${
                day.count === 0 ? 'bg-muted/30' :
                day.count < 3 ? 'bg-primary/30' :
                day.count < 5 ? 'bg-primary/60' :
                'bg-primary'
              }`}
              title={`${day.date}: ${day.count} sessions`}
            />
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 mt-3 text-[9px] sm:text-[10px] text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-muted/30"></div>
            <div className="w-3 h-3 rounded-sm bg-primary/30"></div>
            <div className="w-3 h-3 rounded-sm bg-primary/60"></div>
            <div className="w-3 h-3 rounded-sm bg-primary"></div>
          </div>
          <span>More</span>
        </div>
      </motion.div>

      {/* Questions by Channel Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="border border-border p-4 sm:p-6 bg-card"
      >
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest mb-4 sm:mb-6 text-primary flex items-center gap-2">
          <span className="w-2 h-2 bg-primary block"></span> Questions by Module
        </h2>
        <div className="h-[200px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={channelStats} layout="vertical">
              <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={10} />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="var(--color-muted-foreground)" 
                fontSize={10}
                width={80}
                tickFormatter={(value) => value.replace('.', '')}
              />
              <Tooltip 
                cursor={{fill: 'var(--color-muted)', opacity: 0.2}}
                contentStyle={{ 
                  backgroundColor: 'var(--color-popover)', 
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-foreground)',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="beginner" stackId="a" fill="#22c55e" name="Beginner" />
              <Bar dataKey="intermediate" stackId="a" fill="#eab308" name="Intermediate" />
              <Bar dataKey="advanced" stackId="a" fill="#ef4444" name="Advanced" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="mt-8 text-center text-muted-foreground text-[10px] sm:text-xs uppercase tracking-widest">
        Keep learning! Every question brings you closer to mastery.
      </div>
    </div>
  );
}
