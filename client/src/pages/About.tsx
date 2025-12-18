import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  ArrowLeft, Brain, Code, Target, Flame, Lock, Unlock, Volume2, VolumeX,
  Github, Star, MessageSquare, Bug, Sparkles, Zap, BookOpen, Users, 
  Palette, Terminal, Globe, Heart, Coffee, Rocket, ExternalLink, User,
  Linkedin, Mail, MapPin, Briefcase, Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SEOHead } from '../components/SEOHead';
import { trackEasterEggUnlocked } from '../hooks/use-analytics';
import { useTheme } from '../context/ThemeContext';
import { getAllQuestions, channels } from '../lib/data';

export default function About() {
  const [_, setLocation] = useLocation();
  const { theme, cycleTheme } = useTheme();
  const [easterEgg1, setEasterEgg1] = useState(false);
  const [easterEgg2, setEasterEgg2] = useState(false);
  const [easterEgg3, setEasterEgg3] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'features' | 'tech' | 'community' | 'developer'>('features');

  const allQuestions = getAllQuestions();
  const totalChannels = channels.length;

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  useEffect(() => {
    let keySequence = '';
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        goBack();
        return;
      }
      
      const key = e.key.toLowerCase();
      keySequence = (keySequence + key).slice(-6);
      
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

  const features = [
    { icon: <Brain className="w-5 h-5" />, title: 'AI-Powered', desc: 'Questions generated and improved by AI daily' },
    { icon: <Code className="w-5 h-5" />, title: 'Code Examples', desc: 'Real-world code snippets and diagrams' },
    { icon: <Target className="w-5 h-5" />, title: 'Multi-Domain', desc: `${totalChannels} channels covering all tech areas` },
    { icon: <Flame className="w-5 h-5" />, title: 'Daily Updates', desc: 'Fresh content added automatically' },
    { icon: <Sparkles className="w-5 h-5" />, title: 'Mermaid Diagrams', desc: 'Interactive diagrams with theme support' },
    { icon: <Zap className="w-5 h-5" />, title: 'Progress Tracking', desc: 'Track streaks and completion stats' },
  ];

  const techStack = [
    { name: 'React', color: '#61dafb' },
    { name: 'TypeScript', color: '#3178c6' },
    { name: 'Vite', color: '#646cff' },
    { name: 'Tailwind', color: '#38bdf8' },
    { name: 'Framer Motion', color: '#ff0055' },
    { name: 'Mermaid', color: '#ff3670' },
    { name: 'Node.js', color: '#68a063' },
    { name: 'GitHub Actions', color: '#2088ff' },
  ];

  const themeColors: Record<string, string> = {
    unix: '#22c55e',
    cyberpunk: '#ff00ff',
    dracula: '#bd93f9',
    light: '#000000',
    matrix: '#00ff00',
    'blade-runner': '#ff8c00',
    tron: '#00d4ff',
    fallout: '#9acd32',
    witcher: '#ffd700',
    dune: '#00bfff',
    solarized: '#2aa198',
    nord: '#88c0d0',
    monokai: '#a6e22e',
    synthwave: '#ff6ad5',
    gruvbox: '#fe8019',
    catppuccin: '#cba6f7',
    hacker: '#00ff00',
    midnight: '#3b82f6',
    // Apple themes
    'macos-light': '#007aff',
    'macos-dark': '#0a84ff',
    'ios-light': '#007aff',
    'ios-dark': '#0a84ff',
    'visionos': '#64d2ff',
    'aqua': '#0066cc',
    'graphite': '#8e8e93',
  };

  return (
    <>
      <SEOHead
        title="About Code Reels - Free Open Source AI-Powered Interview Prep Platform"
        description="Code Reels is a free, open-source, AI-powered platform with 1000+ technical interview questions. Features daily AI-generated content, progress tracking, interactive diagrams, ELI5 explanations, and company data. Built for FAANG interview prep."
        keywords="about code reels, free interview prep, open source interview platform, ai powered learning, technical interviews, FAANG prep, software engineer interview, coding interview practice"
        canonical="https://reel-interview.github.io/about"
      />
      <div className="min-h-screen bg-background text-foreground font-mono overflow-y-auto">
        {/* Hero Section */}
        <div className="relative border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
            <div className="flex items-center justify-between mb-6">
              <button onClick={goBack} className="flex items-center gap-2 text-xs uppercase tracking-widest hover:text-primary transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="flex items-center gap-2">
                <button onClick={cycleTheme} className="p-2 hover:bg-muted rounded transition-colors" title={`Theme: ${theme}`}>
                  <Palette className="w-4 h-4" style={{ color: themeColors[theme] }} />
                </button>
                <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 hover:bg-muted rounded transition-colors" title={soundEnabled ? "Mute" : "Unmute"}>
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <h1 className="text-3xl sm:text-5xl font-bold mb-4">
                <span className="text-primary">&gt;</span> Code_Reels
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto mb-6">
                AI-powered interview prep platform. Swipe through bite-sized questions, track your progress, and ace your next technical interview.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-lg">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold">{allQuestions.length}+ Questions</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-lg">
                  <Globe className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold">{totalChannels} Channels</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-lg">
                  <Rocket className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold">Daily Updates</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto">
              {(['features', 'tech', 'community', 'developer'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-xs uppercase tracking-widest font-bold border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            {activeTab === 'features' && (
              <motion.div key="features" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {features.map((f, i) => (
                    <motion.div
                      key={f.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors bg-card"
                    >
                      <div className="text-primary mb-3">{f.icon}</div>
                      <h3 className="font-bold text-sm mb-1">{f.title}</h3>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Easter Eggs */}
                <div className="border border-border rounded-lg p-4 bg-card">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Hidden Secrets
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { unlocked: easterEgg1, name: 'Konami', hint: '↑↑↓↓←→←→BA', emoji: '🎮' },
                      { unlocked: easterEgg2, name: 'Hacker', hint: 'Type "HACK"', emoji: '💻' },
                      { unlocked: easterEgg3, name: 'Legend', hint: 'Type "LEGEND"', emoji: '👑' },
                    ].map((egg) => (
                      <motion.div
                        key={egg.name}
                        animate={egg.unlocked ? { scale: [1, 1.05, 1] } : {}}
                        className={`p-3 rounded border text-center transition-all ${
                          egg.unlocked ? 'border-primary bg-primary/10' : 'border-border'
                        }`}
                      >
                        <div className="text-2xl mb-1">{egg.unlocked ? egg.emoji : '🔒'}</div>
                        <div className="text-xs font-bold uppercase">{egg.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {egg.unlocked ? 'Unlocked!' : egg.hint}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'tech' && (
              <motion.div key="tech" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="border border-border rounded-lg p-6 bg-card mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                    <Terminal className="w-4 h-4" /> Tech Stack
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {techStack.map((tech, i) => (
                      <motion.div
                        key={tech.name}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-3 border border-border rounded text-center hover:border-primary/50 transition-colors"
                      >
                        <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: tech.color }} />
                        <div className="text-xs font-bold">{tech.name}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="border border-border rounded-lg p-6 bg-card">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4">Architecture</h3>
                  <div className="space-y-3 text-xs text-muted-foreground">
                    <p>• Static site hosted on GitHub Pages - zero server costs</p>
                    <p>• GitHub Actions for daily AI-powered question generation</p>
                    <p>• Local storage for progress tracking - your data stays with you</p>
                    <p>• Mermaid.js for interactive diagrams with multiple themes</p>
                    <p>• Fully responsive design with mobile-first approach</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'community' && (
              <motion.div key="community" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="border border-border rounded-lg p-6 bg-card mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Open Source
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Code Reels is open source and community-driven. Contribute questions, report bugs, or suggest features!
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a href="https://github.com/satishkumar-dhule/code-reels" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded font-bold text-xs uppercase hover:opacity-90 transition-opacity">
                      <Github className="w-4 h-4" /> Star on GitHub
                    </a>
                    <a href="https://github.com/satishkumar-dhule/code-reels/issues/new" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 border border-border rounded font-bold text-xs uppercase hover:border-primary transition-colors">
                      <Bug className="w-4 h-4" /> Report Bug
                    </a>
                    <a href="https://github.com/satishkumar-dhule/code-reels/discussions" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 border border-border rounded font-bold text-xs uppercase hover:border-primary transition-colors">
                      <MessageSquare className="w-4 h-4" /> Discuss
                    </a>
                  </div>
                </div>

                {/* What's New Link */}
                <a 
                  href="/whats-new"
                  onClick={(e) => { e.preventDefault(); setLocation('/whats-new'); }}
                  className="block border border-border rounded-lg p-6 bg-card mb-6 hover:border-primary/50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">What's New</h3>
                        <p className="text-xs text-muted-foreground">See latest questions and updates</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </a>

                {/* Bot Activity Link */}
                <a 
                  href="/bot-activity"
                  onClick={(e) => { e.preventDefault(); setLocation('/bot-activity'); }}
                  className="block border border-border rounded-lg p-6 bg-card mb-6 hover:border-primary/50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Bot className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">Bot Activity</h3>
                        <p className="text-xs text-muted-foreground">See what our AI bots have been doing</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </a>

                <div className="border border-border rounded-lg p-6 bg-card">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4">Contributing</h3>
                  <div className="space-y-3 text-xs text-muted-foreground">
                    <p>• Fork the repo and create a feature branch</p>
                    <p>• Add questions to the appropriate channel JSON files</p>
                    <p>• Submit a PR with a clear description</p>
                    <p>• Questions are reviewed and merged daily</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'developer' && (
              <motion.div key="developer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {/* Developer Profile Card */}
                <div className="border border-border rounded-lg overflow-hidden bg-card mb-6">
                  <div className="h-24 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/10" />
                  <div className="px-6 pb-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
                      <div className="w-24 h-24 rounded-full bg-background border-4 border-background flex items-center justify-center overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                          <User className="w-12 h-12 text-primary-foreground" />
                        </div>
                      </div>
                      <div className="text-center sm:text-left flex-1">
                        <h2 className="text-xl font-bold">Satishkumar Dhule</h2>
                        <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1">
                          <Briefcase className="w-3 h-3" /> Software Engineer
                        </p>
                      </div>
                      <a
                        href="https://satishkumar-dhule.github.io/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-primary text-primary-foreground rounded font-bold text-xs uppercase hover:opacity-90 transition-opacity flex items-center gap-2"
                      >
                        <Globe className="w-4 h-4" /> Portfolio
                      </a>
                    </div>
                  </div>
                </div>

                {/* About Developer */}
                <div className="border border-border rounded-lg p-6 bg-card mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" /> About the Developer
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Passionate software engineer with expertise in building scalable applications and developer tools. 
                    Created Code Reels to help developers prepare for technical interviews in a modern, engaging way.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="https://satishkumar-dhule.github.io/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 border border-border rounded text-xs hover:border-primary transition-colors"
                    >
                      <Globe className="w-4 h-4" /> Website
                    </a>
                    <a
                      href="https://github.com/satishkumar-dhule"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 border border-border rounded text-xs hover:border-primary transition-colors"
                    >
                      <Github className="w-4 h-4" /> GitHub
                    </a>
                    <a
                      href="https://linkedin.com/in/satishkumar-dhule"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 border border-border rounded text-xs hover:border-primary transition-colors"
                    >
                      <Linkedin className="w-4 h-4" /> LinkedIn
                    </a>
                  </div>
                </div>

                {/* Other Projects */}
                <div className="border border-border rounded-lg p-6 bg-card">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                    <Code className="w-4 h-4" /> More Projects
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Check out more projects and contributions on my portfolio website.
                  </p>
                  <a
                    href="https://satishkumar-dhule.github.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary text-sm hover:underline"
                  >
                    Visit Portfolio <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="border-t border-border py-6 mt-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              Made with <Heart className="w-3 h-3 text-red-500" /> and <Coffee className="w-3 h-3 text-amber-500" /> • Open Source • MIT License
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
