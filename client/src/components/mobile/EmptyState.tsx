/**
 * Empty State Component
 * Shows helpful prompts when sections have no content
 */

import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { 
  Compass, BookOpen, Code, Trophy, Sparkles, 
  ChevronRight, Rocket
} from 'lucide-react';

interface EmptyStateProps {
  type: 'channels' | 'progress' | 'coding' | 'general';
  title?: string;
  description?: string;
}

const emptyStateConfig = {
  channels: {
    icon: Compass,
    title: 'No channels yet',
    description: 'Subscribe to topics that interest you to start learning',
    action: 'Browse Channels',
    path: '/channels',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  progress: {
    icon: BookOpen,
    title: 'Start your journey',
    description: 'Complete questions to track your progress here',
    action: 'View Questions',
    path: '/channels',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  },
  coding: {
    icon: Code,
    title: 'Ready to code?',
    description: 'Practice real interview coding challenges',
    action: 'Try a Challenge',
    path: '/coding',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  },
  general: {
    icon: Sparkles,
    title: 'Nothing here yet',
    description: 'Check back later for new content',
    action: 'Go Home',
    path: '/',
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  }
};

export function EmptyState({ type, title, description }: EmptyStateProps) {
  const [, setLocation] = useLocation();
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <div className={`w-16 h-16 rounded-2xl ${config.bgColor} flex items-center justify-center mb-4`}>
        <Icon className={`w-8 h-8 ${config.color}`} />
      </div>
      
      <h3 className="font-semibold text-lg mb-2">
        {title || config.title}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        {description || config.description}
      </p>

      <button
        onClick={() => setLocation(config.path)}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full font-medium text-sm shadow-sm hover:bg-primary/90 transition-colors"
      >
        {config.action}
        <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// Compact inline empty state for cards
export function InlineEmptyState({ 
  message, 
  actionLabel, 
  onAction 
}: { 
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
      <span className="text-sm text-muted-foreground">{message}</span>
      <button
        onClick={onAction}
        className="text-sm text-primary font-medium flex items-center gap-1"
      >
        {actionLabel}
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

// Welcome banner for completely new users
export function WelcomeBanner({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-4 my-4 p-6 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-2xl border border-primary/20"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <Rocket className="w-6 h-6 text-primary-foreground" />
        </div>
        
        <div className="flex-1">
          <h2 className="font-bold text-lg mb-1">Welcome to Learn Reels! 🎉</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Master technical interviews with bite-sized questions. Swipe through topics like stories.
          </p>
          
          <button
            onClick={onGetStarted}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm"
          >
            Get Started
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
