import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { 
  Brain, Code, Target, Flame, Volume2, VolumeX,
  Github, MessageSquare, Bug, Sparkles, Zap, BookOpen, Users, 
  Terminal, Globe, Heart, Coffee, Rocket, ExternalLink, User,
  Linkedin, ChevronRight, Play, Pause, Copy, Check,
  Briefcase, Bot, Award, Cpu, Database, Cloud, Shield,
  GitBranch, Layers, Monitor, Smartphone, Server, Lock
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { SEOHead } from '../components/SEOHead';
import { AppLayout } from '../components/layout/AppLayout';
import { trackEasterEggUnlocked } from '../hooks/use-analytics';
import { getAllQuestions, channels } from '../lib/data';
import { cn } from '../lib/utils';

// Animated counter component
function AnimatedCounter({ value, duration = 2 }: { value: number; duration?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(count, value, { duration });
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v));
    return () => { controls.stop(); unsubscribe(); };
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
}

// Terminal typing effect
function TerminalTyping({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
        }
      }, 30);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay]);

  useEffect(() => {
    const interval = setInterval(() => setShowCursor(v => !v), 530);
    return () => clearInterval(interval);
  }, []);

  return (
    <span>
      {displayed}
      <span className={cn("text-primary", showCursor ? "opacity-100" : "opacity-0")}>▋</span>
    </span>
  );
}

// Code snippet with copy functionality
function CodeSnippet({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-background/80 text-green-400 p-4 rounded-lg text-xs overflow-x-auto font-mono">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}

// Floating tech icons background
function FloatingIcons() {
  const icons = [Code, Database, Cloud, Server, Shield, GitBranch, Cpu, Layers];
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.map((Icon, i) => (
        <motion.div
          key={i}
          className="absolute text-primary/5"
          initial={{ 
            x: Math.random() * 100 + '%', 
            y: Math.random() * 100 + '%',
            rotate: Math.random() * 360 
          }}
          animate={{ 
            y: [null, '-20%', '120%'],
            rotate: [null, 360, 720]
          }}
          transition={{ 
            duration: 20 + Math.random() * 10,
            repeat: Infinity,
            delay: i * 2
          }}
        >
          <Icon className="w-12 h-12 sm:w-16 sm:h-16" />
        </motion.div>
      ))}
    </div>
  );
}

// Glitch text effect
function GlitchText({ children, className }: { children: string; className?: string }) {
  const [isGlitching, setIsGlitching] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 200);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className={cn("relative inline-block", className)}>
      <span className={cn(isGlitching && "animate-pulse")}>{children}</span>
      {isGlitching && (
        <>
          <span className="absolute top-0 left-0.5 text-cyan-500 opacity-70 clip-glitch-1">{children}</span>
          <span className="absolute top-0 -left-0.5 text-red-500 opacity-70 clip-glitch-2">{children}</span>
        </>
      )}
    </span>
  );
}

// Matrix rain effect
function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
    const fontSize = 10;
    const columns = canvas.width / fontSize;
    const drops: number[] = Array(Math.floor(columns)).fill(1);
    
    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f0';
      ctx.font = `${fontSize}px monospace`;
      
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };
    
    const interval = setInterval(draw, 50);
    return () => clearInterval(interval);
  }, []);
  
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-20" />;
}

export default function About() {
  const [_, setLocation] = useLocation();
  const [easterEgg1, setEasterEgg1] = useState(false);
  const [easterEgg2, setEasterEgg2] = useState(false);
  const [easterEgg3, setEasterEgg3] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'mission' | 'features' | 'tech' | 'community' | 'developer'>('mission');
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');

  const allQuestions = getAllQuestions();
  const totalChannels = channels.length;

  // Konami code detection
  useEffect(() => {
    let keySequence = '';
    const konamiCode = 'arrowuparrowuparrowdownarrowdownarrowleftarrowrightarrowleftarrowrightba';
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keySequence = (keySequence + key).slice(-30);
      
      if (keySequence.includes('hack')) {
        setEasterEgg2(true);
        trackEasterEggUnlocked('hacker_mode');
        playSound();
        keySequence = '';
      } else if (keySequence.includes('legend')) {
        setEasterEgg3(true);
        trackEasterEggUnlocked('legend_status');
        playSound();
        keySequence = '';
      } else if (keySequence.includes(konamiCode)) {
        setEasterEgg1(true);
        trackEasterEggUnlocked('konami_code');
        playSound();
        keySequence = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const playSound = () => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {}
  };

  const handleTerminalCommand = (cmd: string) => {
    const commands: Record<string, string> = {
      'help': 'Available commands: help, stats, channels, start, clear, sudo, whoami',
      'stats': `📊 ${allQuestions.length}+ questions across ${totalChannels} channels`,
      'channels': channels.slice(0, 5).map(c => c.name).join(', ') + '...',
      'start': '🚀 Redirecting to practice mode...',
      'clear': 'CLEAR',
      'sudo': '🔐 Nice try! You need root access for that.',
      'whoami': '👨‍💻 A developer preparing to ace their next interview!',
      'ls': 'questions/  channels/  badges/  stats/  profile/',
      'cat readme': 'Code Reels: Your AI-powered interview prep companion',
      'npm install success': '✅ Success installed! Now go crush that interview!',
      'git commit -m "hired"': '🎉 Commit successful! You\'re hired!',
    };
    
    const response = commands[cmd.toLowerCase()] || `Command not found: ${cmd}. Type 'help' for available commands.`;
    
    if (response === 'CLEAR') {
      setCommandHistory([]);
    } else {
      setCommandHistory(prev => [...prev, `$ ${cmd}`, response]);
      if (cmd.toLowerCase() === 'start') {
        setTimeout(() => setLocation('/voice-interview'), 1000);
      }
    }
    setCurrentCommand('');
  };

  const features = [
    { icon: <Brain className="w-6 h-6" />, title: 'AI-Powered Generation', desc: 'Fresh questions generated daily by advanced AI models', color: 'from-purple-500 to-pink-500' },
    { icon: <Code className="w-6 h-6" />, title: 'Real Code Examples', desc: 'Production-ready snippets and system design diagrams', color: 'from-cyan-500 to-blue-500' },
    { icon: <Target className="w-6 h-6" />, title: 'FAANG-Ready', desc: 'Questions modeled after top tech company interviews', color: 'from-orange-500 to-red-500' },
    { icon: <Flame className="w-6 h-6" />, title: 'Streak System', desc: 'Gamified learning with daily streaks and rewards', color: 'from-yellow-500 to-orange-500' },
    { icon: <Sparkles className="w-6 h-6" />, title: 'Voice Practice', desc: 'Practice speaking your answers out loud with AI feedback', color: 'from-green-500 to-emerald-500' },
    { icon: <Zap className="w-6 h-6" />, title: 'Instant Feedback', desc: 'Get immediate insights on your interview responses', color: 'from-indigo-500 to-purple-500' },
  ];

  const techStack = [
    { name: 'React 18', icon: <Layers className="w-5 h-5" />, desc: 'Modern UI with hooks & suspense' },
    { name: 'TypeScript', icon: <Code className="w-5 h-5" />, desc: 'Type-safe development' },
    { name: 'Vite', icon: <Zap className="w-5 h-5" />, desc: 'Lightning-fast builds' },
    { name: 'Tailwind CSS', icon: <Monitor className="w-5 h-5" />, desc: 'Utility-first styling' },
    { name: 'Framer Motion', icon: <Sparkles className="w-5 h-5" />, desc: 'Smooth animations' },
    { name: 'GitHub Actions', icon: <GitBranch className="w-5 h-5" />, desc: 'CI/CD automation' },
    { name: 'OpenAI', icon: <Brain className="w-5 h-5" />, desc: 'AI question generation' },
    { name: 'PWA', icon: <Smartphone className="w-5 h-5" />, desc: 'Works offline' },
  ];

  const stats = [
    { label: 'Questions', value: allQuestions.length, icon: <BookOpen className="w-5 h-5" /> },
    { label: 'Channels', value: totalChannels, icon: <Layers className="w-5 h-5" /> },
    { label: 'Daily Updates', value: 10, suffix: '+', icon: <Rocket className="w-5 h-5" /> },
    { label: 'Open Source', value: 100, suffix: '%', icon: <Github className="w-5 h-5" /> },
  ];

  return (
    <>
      <SEOHead
        title="About Code Reels - AI-Powered Interview Prep for Developers"
        description="Code Reels is a free, open-source platform with 1000+ technical interview questions. Features AI-generated content, voice practice, progress tracking, and FAANG-style prep."
        keywords="about code reels, interview prep, ai learning, technical interviews, FAANG prep, software engineer interview, coding practice"
        canonical="https://open-interview.github.io/about"
      />
      <AppLayout title="About" showBackOnMobile>
        <div className="font-mono relative">
          <FloatingIcons />
          
          {/* Hero Section - Terminal Style */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative mb-8 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-cyan-500/10 rounded-2xl" />
            <MatrixRain />
            
            <div className="relative z-10 p-6 sm:p-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 hover:bg-muted rounded transition-colors" aria-label={soundEnabled ? "Mute sound effects" : "Enable sound effects"}>
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>
              
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h1 className="text-4xl sm:text-6xl font-black mb-4">
                    <span className="text-primary">&gt;</span> <GlitchText>Code_Reels</GlitchText>
                  </h1>
                </motion.div>
                
                <p className="text-lg sm:text-xl text-muted-foreground mb-2">
                  <TerminalTyping text="Level up your interview game with AI-powered practice" delay={500} />
                </p>
                
                <p className="text-sm text-muted-foreground/70 mb-8">
                  Built by developers, for developers. 100% open source.
                </p>

                {/* Animated Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  {stats.map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="p-4 bg-card/50 backdrop-blur border border-border/50 rounded-xl"
                    >
                      <div className="text-primary mb-2">{stat.icon}</div>
                      <div className="text-2xl sm:text-3xl font-black">
                        <AnimatedCounter value={stat.value} />
                        {stat.suffix}
                      </div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap justify-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setLocation('/voice-interview')}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-cyan-500 text-foreground font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-primary/30"
                  >
                    <Play className="w-4 h-4" /> Start Practicing
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTerminalOpen(!terminalOpen)}
                    className="px-6 py-3 bg-background/80 text-green-400 font-bold rounded-lg flex items-center gap-2 border border-green-500/30"
                  >
                    <Terminal className="w-4 h-4" /> Open Terminal
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Interactive Terminal */}
          <AnimatePresence>
            {terminalOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden"
              >
                <div className="bg-background rounded-xl border border-green-500/30 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border-b border-green-500/30">
                    <Terminal className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-400 font-mono">code-reels@terminal ~ </span>
                  </div>
                  <div className="p-4 font-mono text-sm max-h-64 overflow-y-auto">
                    <div className="text-green-400 mb-2">Welcome to Code Reels Terminal! Type 'help' for commands.</div>
                    {commandHistory.map((line, i) => (
                      <div key={i} className={cn("mb-1", line.startsWith('$') ? 'text-cyan-400' : 'text-green-400/80')}>
                        {line}
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400">$</span>
                      <input
                        type="text"
                        value={currentCommand}
                        onChange={(e) => setCurrentCommand(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTerminalCommand(currentCommand)}
                        className="flex-1 bg-transparent text-green-400 outline-none"
                        placeholder="Type a command..."
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Navigation */}
          <div className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10 mb-6">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {(['mission', 'features', 'tech', 'community', 'developer'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-4 py-3 text-xs uppercase tracking-widest font-bold border-b-2 transition-all whitespace-nowrap",
                    activeTab === tab 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="max-w-4xl mx-auto py-4 pb-16">
            <AnimatePresence mode="wait">
              {/* Mission Tab */}
              {activeTab === 'mission' && (
                <motion.div key="mission" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="grid gap-6">
                    {/* Mission Statement */}
                    <div className="relative p-6 sm:p-8 border border-border rounded-2xl bg-gradient-to-br from-card to-card/50 overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                      <h2 className="text-2xl sm:text-3xl font-black mb-4 flex items-center gap-3">
                        <Rocket className="w-8 h-8 text-primary" />
                        Our Mission
                      </h2>
                      <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                        We believe every developer deserves access to high-quality interview preparation. 
                        Code Reels democratizes technical interview prep by providing <span className="text-primary font-bold">free, AI-powered practice</span> that 
                        adapts to your learning style.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">Free Forever</span>
                        <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-sm font-medium">Open Source</span>
                        <span className="px-3 py-1 bg-purple-500/10 text-purple-500 rounded-full text-sm font-medium">Community Driven</span>
                      </div>
                    </div>

                    {/* Why Code Reels */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="p-5 border border-border rounded-xl bg-card hover:border-primary/50 transition-colors">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center mb-4">
                          <Target className="w-6 h-6 text-foreground" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">The Problem</h3>
                        <p className="text-sm text-muted-foreground">
                          Traditional interview prep is expensive, outdated, and doesn't simulate real interview conditions. 
                          Most platforms charge $30-50/month for basic features.
                        </p>
                      </div>
                      <div className="p-5 border border-border rounded-xl bg-card hover:border-primary/50 transition-colors">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4">
                          <Sparkles className="w-6 h-6 text-foreground" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">Our Solution</h3>
                        <p className="text-sm text-muted-foreground">
                          AI-generated questions updated daily, voice practice mode, gamified learning with streaks and badges, 
                          and a supportive community—all completely free.
                        </p>
                      </div>
                    </div>

                    {/* Quick Start */}
                    <div className="p-6 border border-border rounded-xl bg-card">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-primary" /> Quick Start
                      </h3>
                      <CodeSnippet code={`# Clone and run locally
git clone https://github.com/open-interview/open-interview.git
cd open-interview
pnpm install
pnpm dev

# Or just visit: https://open-interview.github.io`} />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Features Tab */}
              {activeTab === 'features' && (
                <motion.div key="features" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {features.map((f, i) => (
                      <motion.div
                        key={f.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        whileHover={{ scale: 1.02, y: -4 }}
                        className="group p-5 border border-border rounded-xl bg-card hover:border-primary/50 transition-all cursor-pointer"
                      >
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br text-foreground", f.color)}>
                          {f.icon}
                        </div>
                        <h3 className="font-bold text-base mb-2 group-hover:text-primary transition-colors">{f.title}</h3>
                        <p className="text-sm text-muted-foreground">{f.desc}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Easter Eggs Section */}
                  <div className="border border-dashed border-primary/30 rounded-xl p-6 bg-primary/5">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                      <Lock className="w-4 h-4" /> Hidden Secrets
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      We've hidden some easter eggs for the curious developers. Can you find them all?
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { unlocked: easterEgg1, name: 'Konami', hint: '↑↑↓↓←→←→BA', emoji: '🎮' },
                        { unlocked: easterEgg2, name: 'Hacker', hint: 'Type "HACK"', emoji: '💻' },
                        { unlocked: easterEgg3, name: 'Legend', hint: 'Type "LEGEND"', emoji: '👑' },
                      ].map((egg) => (
                        <motion.div
                          key={egg.name}
                          animate={egg.unlocked ? { scale: [1, 1.1, 1] } : {}}
                          className={cn(
                            "p-4 rounded-lg border text-center transition-all",
                            egg.unlocked ? 'border-primary bg-primary/20' : 'border-border bg-card'
                          )}
                        >
                          <div className="text-3xl mb-2">{egg.unlocked ? egg.emoji : '🔒'}</div>
                          <div className="text-xs font-bold uppercase">{egg.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {egg.unlocked ? '✓ Unlocked!' : egg.hint}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tech Tab */}
              {activeTab === 'tech' && (
                <motion.div key="tech" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {techStack.map((tech, i) => (
                      <motion.div
                        key={tech.name}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -2 }}
                        className="p-4 border border-border rounded-xl bg-card hover:border-primary/50 transition-all"
                      >
                        <div className="text-primary mb-2">{tech.icon}</div>
                        <div className="font-bold text-sm">{tech.name}</div>
                        <div className="text-xs text-muted-foreground">{tech.desc}</div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="border border-border rounded-xl p-6 bg-card">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Server className="w-5 h-5 text-primary" /> Architecture
                    </h3>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-start gap-3">
                        <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span><strong className="text-foreground">Static Hosting:</strong> GitHub Pages with zero server costs</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span><strong className="text-foreground">CI/CD:</strong> GitHub Actions for automated deployments and AI content generation</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span><strong className="text-foreground">Data Storage:</strong> Local storage for progress—your data stays with you</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span><strong className="text-foreground">AI Pipeline:</strong> LangGraph-powered question generation with quality checks</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Community Tab */}
              {activeTab === 'community' && (
                <motion.div key="community" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="border border-border rounded-xl p-6 bg-card mb-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" /> Join the Community
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Code Reels is built by the community, for the community. Contribute questions, report bugs, or help improve the platform!
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <a href="https://github.com/open-interview/open-interview" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">
                        <Github className="w-4 h-4" /> Star on GitHub
                      </a>
                      <a href="https://github.com/open-interview/open-interview/issues/new" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-lg font-bold text-sm hover:border-primary transition-colors">
                        <Bug className="w-4 h-4" /> Report Bug
                      </a>
                      <a href="https://github.com/open-interview/open-interview/discussions" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-lg font-bold text-sm hover:border-primary transition-colors">
                        <MessageSquare className="w-4 h-4" /> Discussions
                      </a>
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <a 
                      href="/whats-new"
                      onClick={(e) => { e.preventDefault(); setLocation('/whats-new'); }}
                      className="flex items-center gap-4 p-5 border border-border rounded-xl bg-card hover:border-primary/50 transition-colors group"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-cyan-500 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold group-hover:text-primary transition-colors">What's New</h3>
                        <p className="text-sm text-muted-foreground">Latest questions and updates</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                    <a 
                      href="/bot-activity"
                      onClick={(e) => { e.preventDefault(); setLocation('/bot-activity'); }}
                      className="flex items-center gap-4 p-5 border border-border rounded-xl bg-card hover:border-primary/50 transition-colors group"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <Bot className="w-6 h-6 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold group-hover:text-primary transition-colors">Bot Activity</h3>
                        <p className="text-sm text-muted-foreground">See what our AI bots are doing</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  </div>

                  <div className="border border-border rounded-xl p-6 bg-card">
                    <h3 className="font-bold text-lg mb-4">Contributing Guide</h3>
                    <CodeSnippet code={`# Fork and clone the repo
git clone https://github.com/YOUR_USERNAME/open-interview.git

# Create a feature branch
git checkout -b feature/awesome-feature

# Make your changes and commit
git commit -m "Add awesome feature"

# Push and create a PR
git push origin feature/awesome-feature`} />
                  </div>
                </motion.div>
              )}

              {/* Developer Tab */}
              {activeTab === 'developer' && (
                <motion.div key="developer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  {/* Developer Profile Card - Clean design without overflow issues */}
                  <div className="border border-border rounded-2xl bg-card mb-6">
                    {/* Gradient Banner - Full height visible */}
                    <div 
                      data-testid="developer-banner"
                      className="h-32 sm:h-40 bg-gradient-to-r from-primary via-purple-500 to-cyan-500 rounded-t-2xl relative flex items-end justify-center pb-4"
                    >
                      <div className="absolute inset-0 opacity-20 rounded-t-2xl" style={{
                        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.1) 39px, rgba(255,255,255,0.1) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.1) 39px, rgba(255,255,255,0.1) 40px)`
                      }} />
                      {/* Avatar positioned at bottom of banner */}
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        data-testid="developer-avatar"
                        className="absolute -bottom-12 sm:-bottom-14 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-card border-4 border-card flex items-center justify-center shadow-xl z-10"
                      >
                        <div className="w-full h-full rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
                          <User className="w-12 h-12 sm:w-14 sm:h-14 text-foreground" />
                        </div>
                      </motion.div>
                    </div>
                    
                    {/* Profile Info - with space for avatar overlap */}
                    <div className="px-4 sm:px-6 pb-6 pt-16 sm:pt-20 text-center">
                      <h2 className="text-xl sm:text-2xl font-black mb-1">Satishkumar Dhule</h2>
                      <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm mb-4">
                        <Briefcase className="w-4 h-4 shrink-0" /> Software Engineer
                      </p>
                      <a
                        href="https://satishkumar-dhule.github.io/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-cyan-500 text-foreground rounded-lg font-bold text-sm hover:opacity-90 transition-opacity shadow-lg"
                      >
                        <Globe className="w-4 h-4" /> Portfolio
                      </a>
                    </div>
                  </div>

                  {/* About Developer */}
                  <div className="border border-border rounded-xl p-6 bg-card mb-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" /> About the Creator
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Passionate software engineer with expertise in building scalable applications and developer tools. 
                      Created Code Reels to help developers prepare for technical interviews in a modern, engaging way.
                      Believes in open source and giving back to the developer community.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href="https://satishkumar-dhule.github.io/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:border-primary hover:text-primary transition-colors"
                      >
                        <Globe className="w-4 h-4" /> Website
                      </a>
                      <a
                        href="https://github.com/satishkumar-dhule"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:border-primary hover:text-primary transition-colors"
                      >
                        <Github className="w-4 h-4" /> GitHub
                      </a>
                      <a
                        href="https://linkedin.com/in/satishkumar-dhule"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:border-primary hover:text-primary transition-colors"
                      >
                        <Linkedin className="w-4 h-4" /> LinkedIn
                      </a>
                    </div>
                  </div>

                  {/* Support */}
                  <div className="border border-dashed border-amber-500/30 rounded-xl p-6 bg-amber-500/5 mb-8">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-amber-500" /> Support the Project
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      If Code Reels has helped you in your interview prep journey, consider supporting the project!
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href="https://github.com/open-interview/open-interview"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-foreground rounded-lg font-bold text-sm hover:bg-amber-600 transition-colors"
                      >
                        <Award className="w-4 h-4" /> Star on GitHub
                      </a>
                      <a
                        href="https://github.com/open-interview/open-interview/fork"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 border border-amber-500/30 rounded-lg font-bold text-sm hover:bg-amber-500/10 transition-colors"
                      >
                        <GitBranch className="w-4 h-4" /> Fork & Contribute
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <footer className="border-t border-border py-8 mt-12">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4"
              >
                Made with <Heart className="w-4 h-4 text-red-500 animate-pulse" /> and <Coffee className="w-4 h-4 text-amber-500" /> by developers, for developers
              </motion.div>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span>Open Source</span>
                <span>•</span>
                <span>MIT License</span>
                <span>•</span>
                <a href="https://github.com/open-interview/open-interview" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  GitHub
                </a>
              </div>
            </div>
          </footer>
        </div>
      </AppLayout>
    </>
  );
}
