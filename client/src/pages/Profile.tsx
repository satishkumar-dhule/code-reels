/**
 * Profile Page
 * User stats, achievements, and settings
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import { useChannelStats } from '../hooks/use-stats';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useGlobalStats } from '../hooks/use-progress';
import { useCredits } from '../context/CreditsContext';
import { useLevel } from '../hooks/use-level';
import { SEOHead } from '../components/SEOHead';
import { MetricCard } from '../components/unified';
import {
  Code, Trophy, Target, Flame, BookOpen, ChevronRight,
  Bell, HelpCircle, Zap, Calendar, TrendingUp, Bookmark, Shuffle, Eye,
  Coins, Gift, History, Mic, Volume2, Play, Award
} from 'lucide-react';
import {
  isTTSSupported,
  getVoices,
  getSavedVoiceName,
  saveVoicePreference,
  getSavedRate,
  saveRatePreference,
  speak,
  stop
} from '../lib/text-to-speech';

export default function Profile() {
  const [, setLocation] = useLocation();
  const { stats: channelStats } = useChannelStats();
  const { getSubscribedChannels, preferences, toggleShuffleQuestions, togglePrioritizeUnvisited, toggleHideCertifications } = useUserPreferences();
  const { stats: activityStats } = useGlobalStats();
  const { balance, state: creditsState, history, onRedeemCoupon, formatCredits, config } = useCredits();
  const { levelProgress, currentStreak } = useLevel();
  const subscribedChannels = getSubscribedChannels();
  
  const [couponCode, setCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Calculate stats
  const totalQuestions = channelStats.reduce((sum, s) => sum + s.total, 0);
  const totalCompleted = subscribedChannels.reduce((sum, channel) => {
    const channelProgress = JSON.parse(localStorage.getItem(`progress-${channel.id}`) || '[]');
    return sum + channelProgress.length;
  }, 0);

  const streak = (() => {
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (activityStats.find(x => x.date === d.toISOString().split('T')[0])) s++;
      else break;
    }
    return s;
  })();

  const daysActive = activityStats.length;

  return (
    <>
      <SEOHead
        title="Profile - Code Reels"
        description="View your learning progress and achievements"
      />
      
      <AppLayout title="Profile" showBackOnMobile>
        <div className="max-w-6xl mx-auto pb-8">
          {/* Desktop: Two column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Left Column - Profile & Stats */}
            <div className="space-y-4">
          {/* Profile Header - Clean Premium Design */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border overflow-hidden"
          >
            {/* Top gradient section - Warm premium colors */}
            <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-5">
              {/* XP and Level row */}
              <div className="flex items-start justify-between mb-5">
                {/* XP Progress */}
                <div className="flex-1 mr-4">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-white/70 text-sm">Experience</span>
                    <span className="text-white text-2xl font-bold">{levelProgress.currentXP.toLocaleString()} XP</span>
                  </div>
                  <div className="w-full max-w-[200px] bg-white/20 rounded-full h-2.5 mb-1.5">
                    <div 
                      className="bg-gradient-to-r from-amber-400 to-orange-400 h-2.5 rounded-full transition-all duration-700"
                      style={{ width: `${levelProgress.progress}%` }}
                    />
                  </div>
                  <div className="text-white/60 text-xs">
                    {levelProgress.xpForNext} XP to next level
                  </div>
                </div>
                
                {/* Level Badge */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center border border-white/20">
                  <div className="text-amber-300 text-xs font-semibold uppercase tracking-wider">
                    Level {levelProgress.currentLevel.level}
                  </div>
                  <div className="text-white text-lg font-bold">
                    {levelProgress.currentLevel.title}
                  </div>
                </div>
              </div>
              
              {/* Title and Streak row */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-white text-xl font-bold">Interview Prep</h1>
                  <p className="text-white/60 text-sm">Mastering technical interviews</p>
                </div>
                {currentStreak > 0 && (
                  <div className="flex items-center gap-1.5 bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-400/30">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-300 text-sm font-medium">{currentStreak} day streak</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Bottom stats section */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Code className="w-7 h-7 text-white" />
                </div>
                
                {/* Stats Grid */}
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-xl font-bold">{totalCompleted}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">{subscribedChannels.length}</div>
                    <div className="text-xs text-muted-foreground">Topics</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">{daysActive}</div>
                    <div className="text-xs text-muted-foreground">Days Active</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Stats Cards */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-3"
          >
            <MetricCard
              icon={<Flame className="w-5 h-5" />}
              value={streak.toString()}
              label="Day Streak"
              variant="warning"
              size="md"
            />
            <MetricCard
              icon={<Target className="w-5 h-5" />}
              value={`${Math.round((totalCompleted / totalQuestions) * 100) || 0}%`}
              label="Progress"
              variant="success"
              size="md"
            />
            <MetricCard
              icon={<Calendar className="w-5 h-5" />}
              value={daysActive.toString()}
              label="Days Active"
              variant="info"
              size="md"
            />
            <MetricCard
              icon={<TrendingUp className="w-5 h-5" />}
              value={totalCompleted.toString()}
              label="Questions Done"
              variant="default"
              size="md"
            />
          </motion.section>

          {/* Achievements - in left column on desktop */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl border border-border overflow-hidden"
          >
            <button
              onClick={() => setLocation('/badges')}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Achievements</h3>
                  <p className="text-sm text-muted-foreground">View your badges</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </motion.section>

          {/* Settings - in left column on desktop */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card rounded-2xl border border-border overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border/50">
              <h3 className="text-sm font-semibold text-muted-foreground">Settings</h3>
            </div>
            <div className="divide-y divide-border/50">
              <ToggleItem
                icon={<Shuffle className="w-5 h-5" />}
                label="Shuffle Questions"
                sublabel="Randomize question order"
                enabled={preferences.shuffleQuestions !== false}
                onToggle={toggleShuffleQuestions}
              />
              <ToggleItem
                icon={<Eye className="w-5 h-5" />}
                label="Unvisited First"
                sublabel="Show new questions first"
                enabled={preferences.prioritizeUnvisited !== false}
                onToggle={togglePrioritizeUnvisited}
              />
              <ToggleItem
                icon={<Award className="w-5 h-5" />}
                label="Hide Certifications"
                sublabel="Remove certifications from navigation"
                enabled={preferences.hideCertifications === true}
                onToggle={toggleHideCertifications}
              />
              <MenuItem
                icon={<Bell className="w-5 h-5" />}
                label="Notifications"
                sublabel="View all alerts"
                onClick={() => setLocation('/notifications')}
              />
              <MenuItem
                icon={<HelpCircle className="w-5 h-5" />}
                label="About"
                sublabel="App information"
                onClick={() => setLocation('/about')}
              />
            </div>
          </motion.section>
            </div>

            {/* Right Column - Credits & Menu */}
            <div className="space-y-4">
          {/* Credits Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-2xl border border-amber-500/20 p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{formatCredits(balance)} Credits</h3>
                  <p className="text-xs text-muted-foreground">
                    Earned: {formatCredits(creditsState.totalEarned)} · Spent: {formatCredits(creditsState.totalSpent)}
                  </p>
                </div>
              </div>
            </div>

            {/* How to earn */}
            <div className="bg-black/10 rounded-lg p-3 mb-4">
              <h4 className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1">
                <Mic className="w-3 h-3" /> Earn Credits
              </h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Voice interview attempt</span>
                  <span className="text-amber-400">+{config.VOICE_ATTEMPT}</span>
                </div>
                <div className="flex justify-between">
                  <span>Successful interview (hire)</span>
                  <span className="text-amber-400">+{config.VOICE_SUCCESS_BONUS} bonus</span>
                </div>
                <div className="flex justify-between">
                  <span>View question</span>
                  <span className="text-red-400">-{config.QUESTION_VIEW_COST}</span>
                </div>
              </div>
            </div>

            {/* Coupon Redemption */}
            <div>
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                <Gift className="w-3 h-3" /> Redeem Coupon
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 px-3 py-2 bg-black/20 border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  onClick={() => {
                    if (!couponCode.trim()) return;
                    const result = onRedeemCoupon(couponCode);
                    setCouponMessage({
                      type: result.success ? 'success' : 'error',
                      text: result.message
                    });
                    if (result.success) setCouponCode('');
                    setTimeout(() => setCouponMessage(null), 3000);
                  }}
                  className="px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Apply
                </button>
              </div>
              {couponMessage && (
                <p className={`text-xs mt-2 ${couponMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {couponMessage.text}
                </p>
              )}
            </div>

            {/* Recent Transactions */}
            {history.length > 0 && (
              <div className="mt-4 pt-4 border-t border-amber-500/20">
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                  <History className="w-3 h-3" /> Recent Activity
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {history.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex justify-between text-xs">
                      <span className="text-muted-foreground truncate flex-1">{tx.description}</span>
                      <span className={tx.amount > 0 ? 'text-green-400' : 'text-red-400'}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.section>

          {/* Menu Items */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-2xl border border-border overflow-hidden"
          >
            <MenuItem
              icon={<Bookmark className="w-5 h-5" />}
              label="Bookmarks"
              sublabel="Saved questions"
              onClick={() => setLocation('/bookmarks')}
            />
            <MenuItem
              icon={<BookOpen className="w-5 h-5" />}
              label="My Channels"
              sublabel={`${subscribedChannels.length} subscribed`}
              onClick={() => setLocation('/channels')}
            />
            <MenuItem
              icon={<Zap className="w-5 h-5" />}
              label="Coding Challenges"
              sublabel="Practice coding"
              onClick={() => setLocation('/coding')}
            />
            <MenuItem
              icon={<Target className="w-5 h-5" />}
              label="Mock Tests"
              sublabel="Test your knowledge"
              onClick={() => setLocation('/tests')}
            />
            <MenuItem
              icon={<TrendingUp className="w-5 h-5" />}
              label="Statistics"
              sublabel="View detailed stats"
              onClick={() => setLocation('/stats')}
            />
          </motion.section>

          {/* Voice Settings */}
          {isTTSSupported() && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card rounded-2xl border border-border overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">Voice Settings</h3>
              </div>
              <VoiceSettings />
            </motion.section>
          )}
            </div>
          </div>
        </div>
      </AppLayout>
    </>
  );
}

function MenuItem({ 
  icon, 
  label, 
  sublabel, 
  onClick 
}: { 
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0 active:bg-muted/70 cursor-pointer touch-manipulation"
    >
      <div className="flex items-center gap-3 pointer-events-none">
        <span className="text-muted-foreground">{icon}</span>
        <div className="text-left">
          <h4 className="font-medium text-sm">{label}</h4>
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground pointer-events-none" />
    </button>
  );
}

function ToggleItem({ 
  icon, 
  label, 
  sublabel, 
  enabled,
  onToggle
}: { 
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0 active:bg-muted/70 cursor-pointer touch-manipulation"
      aria-label={`${label}: ${enabled ? 'enabled' : 'disabled'}`}
      aria-pressed={enabled}
    >
      <div className="flex items-center gap-3 pointer-events-none">
        <span className={enabled ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
        <div className="text-left">
          <h4 className="font-medium text-sm">{label}</h4>
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        </div>
      </div>
      <div 
        className={`w-11 h-6 rounded-full transition-colors relative ${
          enabled ? 'bg-primary' : 'bg-muted'
        }`}
        aria-hidden="true"
      >
        <div 
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </div>
    </button>
  );
}

// Voice Settings Component
function VoiceSettings() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [rate, setRate] = useState(0.9);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = getVoices();
      setVoices(availableVoices);
      
      // Set initial selection
      const saved = getSavedVoiceName();
      if (saved && availableVoices.find(v => v.name === saved)) {
        setSelectedVoice(saved);
      } else if (availableVoices.length > 0) {
        // Default to first English voice
        const englishVoice = availableVoices.find(v => v.lang.startsWith('en'));
        setSelectedVoice(englishVoice?.name || availableVoices[0].name);
      }
    };

    loadVoices();
    setRate(getSavedRate());

    // Chrome loads voices async
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoice(voiceName);
    saveVoicePreference(voiceName);
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    saveRatePreference(newRate);
  };

  const testVoice = () => {
    if (isPlaying) {
      stop();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    speak(
      "Hello! This is how I will read the answers for you. You can adjust the speed using the slider below.",
      {
        onEnd: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      }
    );
  };

  // Group voices by language
  const groupedVoices = voices.reduce((acc, voice) => {
    const lang = voice.lang;
    const langName = getLangDisplayName(lang);
    if (!acc[langName]) {
      acc[langName] = [];
    }
    acc[langName].push(voice);
    return acc;
  }, {} as Record<string, SpeechSynthesisVoice[]>);

  // Sort: English first, then alphabetically
  const sortedLangs = Object.keys(groupedVoices).sort((a, b) => {
    if (a.startsWith('English') && !b.startsWith('English')) return -1;
    if (!a.startsWith('English') && b.startsWith('English')) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="p-4 space-y-4">
      {/* Voice Selection */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Voice
        </label>
        <select
          value={selectedVoice}
          onChange={(e) => handleVoiceChange(e.target.value)}
          className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {sortedLangs.map(lang => (
            <optgroup key={lang} label={lang}>
              {groupedVoices[lang].map(voice => (
                <option key={voice.name} value={voice.name}>
                  {voice.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Speed Slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-muted-foreground">
            Speed
          </label>
          <span className="text-xs text-muted-foreground">
            {rate.toFixed(1)}x
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          value={rate}
          onChange={(e) => handleRateChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>Slower</span>
          <span>Faster</span>
        </div>
      </div>

      {/* Test Button */}
      <button
        onClick={testVoice}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
          isPlaying
            ? 'bg-primary text-primary-foreground'
            : 'bg-primary/10 text-primary hover:bg-primary/20'
        }`}
      >
        <Play className={`w-4 h-4 ${isPlaying ? 'animate-pulse' : ''}`} />
        {isPlaying ? 'Playing...' : 'Test Voice'}
      </button>
    </div>
  );
}

// Helper to get display name for language code
function getLangDisplayName(langCode: string): string {
  const langMap: Record<string, string> = {
    'en-US': 'English (US)',
    'en-GB': 'English (UK)',
    'en-AU': 'English (Australia)',
    'en-IN': 'English (India)',
    'en-ZA': 'English (South Africa)',
    'en-IE': 'English (Ireland)',
    'en-NZ': 'English (New Zealand)',
    'en': 'English',
    'hi-IN': 'Hindi',
    'ta-IN': 'Tamil',
    'te-IN': 'Telugu',
    'mr-IN': 'Marathi',
    'bn-IN': 'Bengali',
    'gu-IN': 'Gujarati',
    'kn-IN': 'Kannada',
    'ml-IN': 'Malayalam',
    'pa-IN': 'Punjabi',
  };
  
  return langMap[langCode] || langCode;
}
