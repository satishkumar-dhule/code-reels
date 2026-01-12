/**
 * QuestionFeedback - Minimal feedback component for processor bot
 * Creates GitHub Issues for feedback (works with static site)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, Sparkles, RefreshCw, Ban, Check, X, ExternalLink } from 'lucide-react';

type FeedbackType = 'improve' | 'rewrite' | 'disable';

interface FeedbackOption {
  type: FeedbackType;
  icon: React.ReactNode;
  label: string;
  color: string;
  issueLabel: string;
}

const FEEDBACK_OPTIONS: FeedbackOption[] = [
  { type: 'improve', icon: <Sparkles className="w-3 h-3" />, label: 'Improve', color: 'text-blue-400 hover:bg-blue-500/20', issueLabel: 'improve' },
  { type: 'rewrite', icon: <RefreshCw className="w-3 h-3" />, label: 'Rewrite', color: 'text-amber-400 hover:bg-amber-500/20', issueLabel: 'rewrite' },
  { type: 'disable', icon: <Ban className="w-3 h-3" />, label: 'Remove', color: 'text-red-400 hover:bg-red-500/20', issueLabel: 'disable' },
];

// GitHub repo for issues
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO || 'open-interview/open-interview';

const FEEDBACK_STORAGE_KEY = 'question-feedback';

interface StoredFeedback {
  questionId: string;
  type: FeedbackType;
  timestamp: string;
}

function getStoredFeedback(): StoredFeedback[] {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveFeedback(feedback: StoredFeedback): void {
  const existing = getStoredFeedback().filter(f => f.questionId !== feedback.questionId);
  existing.push(feedback);
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(existing));
}

function getFeedbackForQuestion(questionId: string): StoredFeedback | null {
  return getStoredFeedback().find(f => f.questionId === questionId) || null;
}

function removeFeedback(questionId: string): void {
  const filtered = getStoredFeedback().filter(f => f.questionId !== questionId);
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(filtered));
}

// Generate GitHub issue URL with pre-filled content
function generateGitHubIssueUrl(questionId: string, feedbackType: FeedbackType): string {
  const title = `[${feedbackType.toUpperCase()}] Question: ${questionId}`;
  const body = `## Question Feedback

**Question ID:** \`${questionId}\`
**Feedback Type:** ${feedbackType}
**Page URL:** ${window.location.href}

---

### Details
<!-- Please describe what needs to be ${feedbackType === 'improve' ? 'improved' : feedbackType === 'rewrite' ? 'rewritten' : 'removed'} -->



---
*This issue was created via the question feedback button.*
`;

  const labels = `bot:processor,feedback:${feedbackType}`;
  
  return `https://github.com/${GITHUB_REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=${encodeURIComponent(labels)}`;
}

interface QuestionFeedbackProps {
  questionId: string;
  className?: string;
}

export function QuestionFeedback({ questionId, className = '' }: QuestionFeedbackProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [existing, setExisting] = useState<StoredFeedback | null>(null);

  useEffect(() => {
    setExisting(getFeedbackForQuestion(questionId));
    setIsOpen(false);
  }, [questionId]);

  const handleSelect = (type: FeedbackType) => {
    // Save locally to show indicator
    const feedback: StoredFeedback = {
      questionId,
      type,
      timestamp: new Date().toISOString()
    };
    saveFeedback(feedback);
    setExisting(feedback);
    setIsOpen(false);

    // Open GitHub issue in new tab
    const issueUrl = generateGitHubIssueUrl(questionId, type);
    window.open(issueUrl, '_blank', 'noopener,noreferrer');
  };

  const handleClear = () => {
    removeFeedback(questionId);
    setExisting(null);
  };

  // If already submitted, show small indicator
  if (existing) {
    const opt = FEEDBACK_OPTIONS.find(o => o.type === existing.type);
    return (
      <button
        onClick={handleClear}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] transition-all ${
          existing.type === 'improve' ? 'bg-blue-500/20 text-blue-400' :
          existing.type === 'rewrite' ? 'bg-amber-500/20 text-amber-400' :
          'bg-red-500/20 text-red-400'
        } ${className}`}
        title="Click to clear"
      >
        <Check className="w-2.5 h-2.5" />
        <span className="hidden sm:inline">{opt?.label}</span>
      </button>
    );
  }

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        title="Flag question for review"
      >
        <Flag className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            
            {/* Popup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1 z-50 bg-card/95 backdrop-blur border border-border rounded-lg shadow-xl p-1.5 min-w-[120px]"
            >
              <p className="text-[9px] text-muted-foreground px-2 pb-1 flex items-center gap-1">
                <ExternalLink className="w-2.5 h-2.5" />
                Opens GitHub Issue
              </p>
              {FEEDBACK_OPTIONS.map(opt => (
                <button
                  key={opt.type}
                  onClick={() => handleSelect(opt.type)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] transition-all ${opt.color}`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-[10px] text-muted-foreground/60 hover:text-muted-foreground mt-0.5"
              >
                <X className="w-2.5 h-2.5" />
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
