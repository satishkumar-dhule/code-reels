/**
 * Test Prompt Toast - Shows when user completes a significant portion of a channel
 * Prompts them to test their knowledge
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, ArrowRight, Brain } from 'lucide-react';
import { getTestForChannel, isTestPromptDismissed, dismissTestPrompt } from '../lib/tests';

interface TestPromptToastProps {
  channelId: string;
  channelName: string;
  completedCount: number;
  totalCount: number;
}

export function TestPromptToast({ 
  channelId, 
  channelName, 
  completedCount, 
  totalCount 
}: TestPromptToastProps) {
  const [_, setLocation] = useLocation();
  const [show, setShow] = useState(false);
  const [hasTest, setHasTest] = useState(false);

  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  // Show toast when user reaches certain milestones
  const milestones = [25, 50, 75, 100];
  const reachedMilestone = milestones.find(m => completionPct >= m && completionPct < m + 5);

  useEffect(() => {
    // Check if test exists and prompt not dismissed
    const checkTest = async () => {
      if (isTestPromptDismissed(channelId)) {
        setShow(false);
        return;
      }

      const test = await getTestForChannel(channelId);
      setHasTest(!!test);
      
      // Show if test exists and user reached a milestone
      if (test && reachedMilestone && completedCount >= 10) {
        // Small delay to not interrupt flow
        setTimeout(() => setShow(true), 1500);
      }
    };

    checkTest();
  }, [channelId, completedCount, reachedMilestone]);

  const handleDismiss = () => {
    setShow(false);
    dismissTestPrompt(channelId);
  };

  const handleTakeTest = () => {
    setShow(false);
    setLocation(`/test/${channelId}`);
  };

  if (!show || !hasTest) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50"
      >
        <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-muted/30">
            <div 
              className="h-full bg-gradient-to-r from-primary to-green-500 transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-sm">Ready to Test Your Knowledge?</h3>
                  <button
                    onClick={handleDismiss}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                
                <p className="text-xs text-muted-foreground mb-3">
                  You've completed {completionPct}% of {channelName}! 
                  Take a quiz to reinforce your learning.
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleTakeTest}
                    className="flex-1 py-2 px-3 bg-primary text-primary-foreground text-xs font-bold rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    Take Test
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="py-2 px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
