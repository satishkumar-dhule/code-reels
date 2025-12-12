import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Brain, Code, Target, Flame, Lock, Unlock, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';
import { SEOHead } from '../components/SEOHead';

export default function About() {
  const [_, setLocation] = useLocation();
  const [easterEgg1, setEasterEgg1] = useState(false);
  const [easterEgg2, setEasterEgg2] = useState(false);
  const [easterEgg3, setEasterEgg3] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Easter Egg detection
  useEffect(() => {
    let keySequence = '';
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keySequence = (keySequence + key).slice(-6);
      
      if (keySequence === 'hack') {
        setEasterEgg2(true);
        playSound();
        keySequence = '';
      } else if (keySequence === 'legend') {
        setEasterEgg3(true);
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
    } catch (e) {
      // Audio context not available
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLocation('/');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setLocation]);

  return (
    <>
      <SEOHead
        title="About Code Reels - Master Technical Interviews"
        description="Learn about Code Reels, an interactive platform for practicing technical interview questions with bite-sized learning modules."
        keywords="about, technical interviews, learning platform, interview prep"
        canonical="https://reel-interview.github.io/about"
      />
      <div className="h-screen bg-background text-foreground flex flex-col p-2 sm:p-3 font-mono overflow-hidden">
      {/* Header */}
      <header className="border-b border-border pb-2 flex justify-between items-start mb-2 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <button 
            onClick={() => setLocation('/')}
            className="flex items-center gap-1 text-[9px] sm:text-xs uppercase tracking-widest hover:text-primary transition-colors mb-0.5"
          >
            <ArrowLeft className="w-2.5 h-2.5" /> Back
          </button>
          <h1 className="text-base sm:text-xl font-bold tracking-tighter uppercase truncate">
            <span className="text-primary mr-1">&gt;</span>About
          </h1>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1 hover:bg-white/10 border border-white/10 rounded transition-colors flex-shrink-0 ml-2"
          title={soundEnabled ? "Mute" : "Unmute"}
        >
          {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
        </button>
      </header>

      {/* Content Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 pb-2">
          
          {/* Mission */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-border p-2 bg-card"
          >
            <h2 className="text-[9px] sm:text-xs font-bold uppercase tracking-tight text-primary mb-1">$ Mission</h2>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground leading-tight">
              AI-powered interview prep platform with daily questions across 6 domains. Open-source, community-driven.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="border border-border p-2 bg-card"
          >
            <h2 className="text-[9px] sm:text-xs font-bold uppercase tracking-tight text-primary mb-1">📊 Stats</h2>
            <div className="grid grid-cols-4 gap-1">
              <div className="text-center"><div className="text-sm font-bold text-primary">130+</div><div className="text-[7px] text-muted-foreground">Q's</div></div>
              <div className="text-center"><div className="text-sm font-bold text-primary">6</div><div className="text-[7px] text-muted-foreground">Cats</div></div>
              <div className="text-center"><div className="text-sm font-bold text-primary">3</div><div className="text-[7px] text-muted-foreground">Lvls</div></div>
              <div className="text-center"><div className="text-sm font-bold text-primary">∞</div><div className="text-[7px] text-muted-foreground">Daily</div></div>
            </div>
          </motion.div>

          {/* Features */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="border border-border p-2 bg-card sm:col-span-2"
          >
            <h2 className="text-[9px] sm:text-xs font-bold uppercase tracking-tight text-primary mb-1">✨ Features</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              {[
                { icon: <Brain className="w-3 h-3" />, label: 'AI-Powered' },
                { icon: <Code className="w-3 h-3" />, label: 'Code Examples' },
                { icon: <Target className="w-3 h-3" />, label: 'Multi-Domain' },
                { icon: <Flame className="w-3 h-3" />, label: 'Daily Updates' },
              ].map((f, i) => (
                <div key={i} className="border border-border/50 p-1 text-center">
                  <div className="text-primary mb-0.5 flex justify-center">{f.icon}</div>
                  <div className="text-[7px] font-bold uppercase tracking-tight">{f.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Tech Stack */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="border border-border p-2 bg-card sm:col-span-2"
          >
            <h2 className="text-[9px] sm:text-xs font-bold uppercase tracking-tight text-primary mb-1">⚙️ Built With</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
              {['React', 'TypeScript', 'Vite', 'Node.js', 'OpenCode', 'GitHub'].map((t, i) => (
                <div key={i} className="border border-border/50 p-1 text-center text-[7px] font-bold uppercase tracking-tight hover:border-primary transition-colors">
                  {t}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Easter Eggs */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="border border-border p-2 bg-card sm:col-span-2"
          >
            <h2 className="text-[9px] sm:text-xs font-bold uppercase tracking-tight text-primary mb-1">🎮 Easter Eggs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
              <motion.div
                animate={easterEgg1 ? { scale: [1, 1.05, 1] } : {}}
                className={`border p-1.5 text-center transition-all ${easterEgg1 ? 'border-primary bg-primary/10' : 'border-border'}`}
              >
                <div className="flex justify-center mb-0.5">
                  {easterEgg1 ? <Unlock className="w-3 h-3 text-primary" /> : <Lock className="w-3 h-3" />}
                </div>
                <div className="text-[7px] font-bold uppercase">Konami</div>
                <div className="text-[6px] text-muted-foreground">{easterEgg1 ? '🎉 Found!' : 'Arrows'}</div>
              </motion.div>

              <motion.div
                animate={easterEgg2 ? { scale: [1, 1.05, 1] } : {}}
                className={`border p-1.5 text-center transition-all ${easterEgg2 ? 'border-primary bg-primary/10' : 'border-border'}`}
              >
                <div className="flex justify-center mb-0.5">
                  {easterEgg2 ? <Unlock className="w-3 h-3 text-primary" /> : <Lock className="w-3 h-3" />}
                </div>
                <div className="text-[7px] font-bold uppercase">Hacker</div>
                <div className="text-[6px] text-muted-foreground">{easterEgg2 ? '💻 Access!' : 'Type HACK'}</div>
              </motion.div>

              <motion.div
                animate={easterEgg3 ? { scale: [1, 1.05, 1] } : {}}
                className={`border p-1.5 text-center transition-all ${easterEgg3 ? 'border-primary bg-primary/10' : 'border-border'}`}
              >
                <div className="flex justify-center mb-0.5">
                  {easterEgg3 ? <Unlock className="w-3 h-3 text-primary" /> : <Lock className="w-3 h-3" />}
                </div>
                <div className="text-[7px] font-bold uppercase">Legend</div>
                <div className="text-[6px] text-muted-foreground">{easterEgg3 ? '👑 Legend!' : 'Type LEGEND'}</div>
              </motion.div>
            </div>
          </motion.div>

          {/* Community */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="border border-border p-2 bg-card sm:col-span-2"
          >
            <h2 className="text-[9px] sm:text-xs font-bold uppercase tracking-tight text-primary mb-1">🤝 Community</h2>
            <p className="text-[8px] text-muted-foreground mb-1.5 leading-tight">
              Open-source & community-driven. Contribute, improve, or report bugs on GitHub.
            </p>
            <div className="flex flex-wrap gap-1">
              <a 
                href="https://github.com/satishkumar-dhule/code-reels"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-0.5 border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors text-[7px] font-bold uppercase tracking-widest"
              >
                Star
              </a>
              <a 
                href="https://github.com/satishkumar-dhule/code-reels/issues/new"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-0.5 border border-border hover:border-primary transition-colors text-[7px] font-bold uppercase tracking-widest"
              >
                Issue
              </a>
              <a 
                href="https://github.com/satishkumar-dhule/code-reels/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-0.5 border border-border hover:border-primary transition-colors text-[7px] font-bold uppercase tracking-widest"
              >
                Discuss
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border pt-1 text-center text-[7px] text-muted-foreground flex-shrink-0 mt-1">
        <p>Made with ❤️ • Open Source • MIT License</p>
      </footer>
      </div>
    </>
  );
}
