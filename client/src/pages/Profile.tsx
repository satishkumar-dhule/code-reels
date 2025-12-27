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
import { useProgress, useGlobalStats } from '../hooks/use-progress';
import { useCredits } from '../context/CreditsContext';
import { SEOHead } from '../components/SEOHead';
import {
  Code, Trophy, Target, Flame, BookOpen, ChevronRight,
  Bell, HelpCircle, Zap, Calendar, TrendingUp, Bookmark, Shuffle, Eye,
  Coins, Gift, History, Mic, Volume2, Play
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
  const { getSubscribedChannels, preferences, toggleShuffleQuestions, togglePrioritizeUnvisited } = useUserPreferences();
  const { stats: activityStats } = useGlobalStats();
  const { balance, state: creditsState, history, onRedeemCoupon, formatCredits, config } = useCredits();
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
        <div className="max-w-lg mx-auto space-y-4 pb-8">
          {/* Profile Header */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border overflow-hidden"
          >
            {/* Cover gradient */}
            <div className="h-20 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
            
            {/* Profile info */}
            <div className="px-4 pb-4 -mt-10">
              <div className="w-20 h-20 rounded-full bg-card border-4 border-card flex items-center justify-center shadow-lg">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Code className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              
              <h1 className="text-xl font-bold mt-3">Interview Prep</h1>
              <p className="text-sm text-muted-foreground">
                Mastering technical interviews
              </p>
              
              {/* Quick stats */}
              <div className="flex gap-4 mt-4">
                <div>
                  <span className="font-bold">{totalCompleted}</span>
                  <span className="text-muted-foreground text-sm ml-1">completed</span>
                </div>
                <div>
                  <span className="font-bold">{subscribedChannels.length}</span>
                  <span className="text-muted-foreground text-sm ml-1">topics</span>
                </div>
                <div>
                  <span className="font-bold">{daysActive}</span>
                  <span className="text-muted-foreground text-sm ml-1">days</span>
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
            <StatCard
              icon={<Flame className="w-5 h-5" />}
              value={streak.toString()}
              label="Day Streak"
              color="text-orange-500"
              bgColor="bg-orange-500/10"
            />
            <StatCard
              icon={<Target className="w-5 h-5" />}
              value={`${Math.round((totalCompleted / totalQuestions) * 100) || 0}%`}
              label="Progress"
              color="text-green-500"
              bgColor="bg-green-500/10"
            />
            <StatCard
              icon={<Calendar className="w-5 h-5" />}
              value={daysActive.toString()}
              label="Days Active"
              color="text-blue-500"
              bgColor="bg-blue-500/10"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              value={totalCompleted.toString()}
              label="Questions Done"
              color="text-purple-500"
              bgColor="bg-purple-500/10"
            />
          </motion.section>

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

          {/* Achievements */}
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

          {/* Settings */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-2xl border border-border overflow-hidden relative"
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
      </AppLayout>
    </>
  );
}

function StatCard({ 
  icon, 
  value, 
  label, 
  color, 
  bgColor 
}: { 
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center mb-3`}>
        <span className={color}>{icon}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
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
