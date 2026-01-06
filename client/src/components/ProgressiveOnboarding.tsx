/**
 * Progressive Onboarding
 * 
 * Non-blocking onboarding that collects user preferences progressively
 * while they're using the app. Never blocks direct URL access.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Sparkles, Check } from 'lucide-react';
import { rolesConfig, getRecommendedChannels } from '../lib/channels-config';
import { useUserPreferences } from '../context/UserPreferencesContext';

// Icon imports for roles
import { 
  Layout, Server, Layers, Smartphone, Activity, Shield, 
  Cpu, Users, Database, Brain, Workflow, Box
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  'layout': <Layout className="w-5 h-5" />,
  'server': <Server className="w-5 h-5" />,
  'layers': <Layers className="w-5 h-5" />,
  'smartphone': <Smartphone className="w-5 h-5" />,
  'infinity': <Activity className="w-5 h-5" />,
  'activity': <Activity className="w-5 h-5" />,
  'workflow': <Workflow className="w-5 h-5" />,
  'brain': <Brain className="w-5 h-5" />,
  'shield': <Shield className="w-5 h-5" />,
  'cpu': <Cpu className="w-5 h-5" />,
  'users': <Users className="w-5 h-5" />,
  'box': <Box className="w-5 h-5" />,
  'database': <Database className="w-5 h-5" />
};

const DISMISSED_KEY = 'progressive-onboarding-dismissed';
const ROLE_PROMPT_DELAY = 3000; // Show after 3 seconds on page

interface ProgressiveOnboardingProps {
  onComplete?: () => void;
}

export function ProgressiveOnboarding({ onComplete }: ProgressiveOnboardingProps) {
  const { preferences, setRole, subscribeChannel, unsubscribeChannel, needsOnboarding } = useUserPreferences();
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState<'role' | 'channels'>('role');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());

  // Check if we should show the prompt
  useEffect(() => {
    // Don't show if already completed onboarding
    if (!needsOnboarding) return;
    
    // Don't show if dismissed this session
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    // Show after a delay to let user see the page first
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, ROLE_PROMPT_DELAY);

    return () => clearTimeout(timer);
  }, [needsOnboarding]);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true');
    setIsVisible(false);
  };

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    // Pre-select recommended channels
    const recommended = getRecommendedChannels(roleId);
    setSelectedChannels(new Set(recommended.map(c => c.id)));
    setStep('channels');
  };

  const toggleChannel = (channelId: string) => {
    setSelectedChannels(prev => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  const handleComplete = () => {
    if (selectedRole) {
      // First set the role (this also sets onboardingComplete and default channels)
      setRole(selectedRole);
      
      // Then adjust channels based on user selection
      const recommended = getRecommendedChannels(selectedRole);
      const recommendedIds = new Set(recommended.map(c => c.id));
      
      // Unsubscribe from channels user deselected
      recommendedIds.forEach(id => {
        if (!selectedChannels.has(id)) {
          unsubscribeChannel(id);
        }
      });
      
      // Subscribe to any additional channels user selected
      selectedChannels.forEach(id => {
        if (!recommendedIds.has(id)) {
          subscribeChannel(id);
        }
      });
      
      setIsVisible(false);
      onComplete?.();
    }
  };

  const recommendedChannels = selectedRole ? getRecommendedChannels(selectedRole) : [];

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50"
      >
        <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-primary/10 px-4 py-3 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">
                {step === 'role' ? 'Personalize Your Experience' : 'Select Your Channels'}
              </span>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <AnimatePresence mode="wait">
              {step === 'role' ? (
                <motion.div
                  key="role"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <p className="text-sm text-muted-foreground mb-4">
                    What's your role? We'll recommend the best channels for you.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {rolesConfig.slice(0, 8).map(role => (
                      <button
                        key={role.id}
                        onClick={() => handleRoleSelect(role.id)}
                        className="p-3 border border-border rounded-lg text-left hover:border-primary hover:bg-primary/5 transition-all group"
                      >
                        <div className="text-muted-foreground group-hover:text-primary mb-1">
                          {iconMap[role.icon] || <Cpu className="w-5 h-5" />}
                        </div>
                        <div className="font-medium text-xs">{role.name}</div>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleDismiss}
                    className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    I'll explore on my own
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="channels"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <p className="text-sm text-muted-foreground mb-3">
                    We've selected {selectedChannels.size} channels for you. Tap to toggle.
                  </p>
                  
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto mb-4">
                    {recommendedChannels.map(channel => {
                      const isSelected = selectedChannels.has(channel.id);
                      return (
                        <button
                          key={channel.id}
                          onClick={() => toggleChannel(channel.id)}
                          className={`
                            px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5
                            ${isSelected 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }
                          `}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {channel.name}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep('role')}
                      className="flex-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleComplete}
                      disabled={selectedChannels.size === 0}
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-1 hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      Start Learning <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 pb-3">
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${step === 'role' ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${step === 'channels' ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ProgressiveOnboarding;
