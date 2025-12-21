/**
 * Getting Started Card
 * Guides new users through their first steps on mobile
 */

import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { 
  Sparkles, ChevronRight, X, BookOpen, Code, Compass, CheckCircle
} from 'lucide-react';
import { OnboardingStorage } from '../../services/storage.service';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  completed: boolean;
}

interface GettingStartedCardProps {
  subscribedChannels: number;
  hasStartedLearning: boolean;
  hasCompletedQuestion: boolean;
}

export function GettingStartedCard({ 
  subscribedChannels, 
  hasStartedLearning,
  hasCompletedQuestion 
}: GettingStartedCardProps) {
  const [, setLocation] = useLocation();
  
  // Check dismissed state only once on mount
  const [dismissed, setDismissed] = useState(() => {
    try {
      return OnboardingStorage.hasSeenGettingStarted();
    } catch {
      return false;
    }
  });

  // Memoize steps to prevent re-creation on every render
  const steps = useMemo<Step[]>(() => [
    {
      id: 'subscribe',
      title: 'Pick your topics',
      description: 'Subscribe to channels that match your goals',
      icon: <Compass className="w-5 h-5" />,
      path: '/channels',
      completed: subscribedChannels >= 3
    },
    {
      id: 'explore',
      title: 'Start learning',
      description: 'Swipe through questions like stories',
      icon: <BookOpen className="w-5 h-5" />,
      path: subscribedChannels > 0 ? '/channel/system-design' : '/channels',
      completed: hasStartedLearning
    },
    {
      id: 'practice',
      title: 'Practice coding',
      description: 'Solve real interview challenges',
      icon: <Code className="w-5 h-5" />,
      path: '/coding',
      completed: hasCompletedQuestion
    }
  ], [subscribedChannels, hasStartedLearning, hasCompletedQuestion]);

  // Don't show if user has completed all steps or dismissed
  const allComplete = subscribedChannels >= 3 && hasStartedLearning && hasCompletedQuestion;
  if (dismissed || allComplete) return null;

  const completedCount = steps.filter(s => s.completed).length;
  const nextStep = steps.find(s => !s.completed) || steps[0];

  const handleDismiss = () => {
    setDismissed(true);
    try {
      OnboardingStorage.markGettingStartedSeen();
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <section className="mx-4 my-3">
      <div className="bg-gradient-to-br from-primary/10 via-card to-card rounded-xl border border-primary/20 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Getting Started</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {completedCount}/{steps.length} done
            </span>
            <button 
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Dismiss getting started"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar - static, no animation */}
        <div className="h-1 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>

        {/* Steps */}
        <div className="p-3 space-y-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => setLocation(step.path)}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left
                ${step.completed 
                  ? 'bg-primary/5 opacity-60' 
                  : step.id === nextStep.id 
                    ? 'bg-primary/10 ring-1 ring-primary/30' 
                    : 'bg-muted/30 hover:bg-muted/50'
                }
              `}
            >
              {/* Step indicator */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                ${step.completed 
                  ? 'bg-primary/20 text-primary' 
                  : step.id === nextStep.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }
              `}>
                {step.completed ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  step.icon
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm ${step.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {step.title}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {step.description}
                </div>
              </div>

              {/* Action */}
              {!step.completed && (
                <ChevronRight className={`w-4 h-4 flex-shrink-0 ${
                  step.id === nextStep.id ? 'text-primary' : 'text-muted-foreground'
                }`} />
              )}
            </button>
          ))}
        </div>

        {/* Quick tip */}
        <div className="px-4 py-3 bg-muted/30 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            💡 Tip: Swipe left/right on questions to navigate, tap to reveal answers
          </p>
        </div>
      </div>
    </section>
  );
}
