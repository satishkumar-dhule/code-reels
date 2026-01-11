/**
 * Tests Page - Lists all available tests and user progress
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import {
  Trophy, Target, Clock, CheckCircle, Lock,
  ChevronRight, Star, BarChart2, Mic, Coins
} from 'lucide-react';
import { SEOHead } from '../components/SEOHead';
import { AppLayout } from '../components/layout/AppLayout';
import { 
  Test, loadTests, getAllTestProgress, TestProgress, getTestStats 
} from '../lib/tests';
import { useCredits } from '../context/CreditsContext';

export default function Tests() {
  const [_, setLocation] = useLocation();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const progress = getAllTestProgress();
  const stats = getTestStats();
  const { balance, formatCredits, config } = useCredits();

  useEffect(() => {
    loadTests().then(t => {
      setTests(t);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <SEOHead
        title="Knowledge Tests - Test Your Interview Prep | Code Reels"
        description="Test your technical interview knowledge with quizzes for each topic. Track your progress and earn shareable badges."
        canonical="https://open-interview.github.io/tests"
      />

      <AppLayout title="Tests" showBackOnMobile>
        <div className="max-w-4xl mx-auto font-mono">

          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6"
          >
            <div className="border border-border p-3 bg-card rounded-lg text-center">
              <Trophy className="w-5 h-5 mx-auto mb-1 text-primary" />
              <div className="text-lg font-bold">{stats.passedTests}</div>
              <div className="text-[9px] text-muted-foreground uppercase">Passed</div>
            </div>
            <div className="border border-border p-3 bg-card rounded-lg text-center">
              <Target className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold">{stats.totalAttempts}</div>
              <div className="text-[9px] text-muted-foreground uppercase">Attempts</div>
            </div>
            <div className="border border-border p-3 bg-card rounded-lg text-center">
              <BarChart2 className="w-5 h-5 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold">{stats.averageScore}%</div>
              <div className="text-[9px] text-muted-foreground uppercase">Avg Score</div>
            </div>
            <button 
              onClick={() => setLocation('/profile')}
              className="border border-amber-500/30 p-3 bg-amber-500/10 rounded-lg text-center hover:bg-amber-500/20 transition-colors"
            >
              <Coins className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <div className="text-lg font-bold text-amber-500">{formatCredits(balance)}</div>
              <div className="text-[9px] text-muted-foreground uppercase">Credits</div>
            </button>
          </motion.div>

          {/* Voice Interview CTA */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setLocation('/voice-interview')}
            className="w-full mb-6 p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-4 hover:from-emerald-500/20 hover:to-teal-500/20 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Mic className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-bold">Voice Interview Practice</h3>
              <p className="text-xs text-muted-foreground">Answer questions out loud and get AI feedback</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-bold text-green-400 flex items-center gap-1">
                <Coins className="w-3 h-3" />+{config.VOICE_ATTEMPT}
              </span>
              <ChevronRight className="w-5 h-5 text-emerald-500" />
            </div>
          </motion.button>

          {/* Tests List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading tests...</p>
            </div>
          ) : tests.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 border border-dashed border-border rounded-lg"
            >
              <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <h2 className="text-lg font-bold mb-2">No Tests Available Yet</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Tests are being generated by our bot. Check back soon!
              </p>
              <button
                onClick={() => setLocation('/')}
                className="text-primary hover:underline text-sm"
              >
                Continue Learning
              </button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {tests.map((test, i) => {
                const testProgress = progress[test.id];
                const isPassed = testProgress?.passed;
                const bestScore = testProgress?.bestScore || 0;
                const attempts = testProgress?.attempts.length || 0;

                return (
                  <motion.div
                    key={test.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setLocation(`/test/${test.channelId}`)}
                    className="border border-border p-4 bg-card rounded-lg cursor-pointer hover:border-primary/50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Status icon */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isPassed 
                          ? 'bg-green-500/20' 
                          : attempts > 0 
                          ? 'bg-orange-500/20' 
                          : 'bg-muted/20'
                      }`}>
                        {isPassed ? (
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        ) : (
                          <Trophy className={`w-6 h-6 ${attempts > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                        )}
                      </div>

                      {/* Test info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold leading-tight">{test.title}</h3>
                          {isPassed && (
                            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-500 text-[9px] uppercase rounded">
                              Passed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {test.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span>{test.questions.length} questions</span>
                          <span>•</span>
                          <span>{test.passingScore}% to pass</span>
                          {attempts > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-primary">Best: {bestScore}%</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </AppLayout>
    </>
  );
}
