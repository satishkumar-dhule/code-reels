/**
 * Gen Z SRS Review - Spaced Repetition Made Addictive
 * Swipe cards, earn XP, level up your memory
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import { SEOHead } from '../components/SEOHead';
import { useCredits } from '../context/CreditsContext';
import { EnhancedMermaid } from '../components/EnhancedMermaid';
import { ListenButton } from '../components/ListenButton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Brain, ChevronLeft, Eye, Flame, Sparkles, Zap, Check
} from 'lucide-react';

// Mock SRS data - replace with actual implementation
const mockReviewCards = [
  {
    id: 'q-1',
    question: 'How would you find all processes running on port 8080 and terminate them safely?',
    answer: 'Use `lsof -ti:8080 | xargs kill -9` or `netstat -tulpn | grep 8080` to find PIDs, then `kill -15 <PID>` for graceful shutdown.',
    tldr: 'Use lsof or netstat to find PIDs, then kill -15 for graceful termination',
    codeInterpretation: `\`\`\`bash
lsof -ti:8080 | xargs kill -15
\`\`\`

**Line-by-line breakdown:**

1. \`lsof -ti:8080\`
   - \`lsof\` = List Open Files command
   - \`-t\` = Output PIDs only (terse mode)
   - \`-i:8080\` = Filter by internet connections on port 8080
   - Returns: Space-separated list of process IDs

2. \`|\` = Pipe operator
   - Takes output from left command
   - Passes it as input to right command

3. \`xargs kill -15\`
   - \`xargs\` = Converts input into arguments
   - \`kill -15\` = Send SIGTERM signal (graceful shutdown)
   - Each PID becomes: \`kill -15 <PID>\`

**Example execution:**
\`\`\`bash
# If PIDs are 1234 and 5678
lsof -ti:8080        # Returns: 1234 5678
xargs kill -15       # Executes: kill -15 1234 5678
\`\`\``,
    explanation: `**Finding Processes:**
- \`lsof -ti:8080\` - Lists PIDs using port 8080
- \`netstat -tulpn | grep 8080\` - Alternative method

**Terminating Safely:**
- \`kill -15 <PID>\` - SIGTERM (graceful shutdown)
- \`kill -9 <PID>\` - SIGKILL (force kill, last resort)

**Best Practice:** Always try SIGTERM first to allow cleanup.`,
    diagram: `graph LR
    A[Port 8080] --> B[lsof -ti:8080]
    B --> C[Get PIDs]
    C --> D[kill -15 PID]
    D --> E{Process Stopped?}
    E -->|Yes| F[Done]
    E -->|No| G[kill -9 PID]`,
    difficulty: 'intermediate',
    channel: 'linux',
    dueDate: new Date(),
    interval: 1,
    easeFactor: 2.5
  },
  {
    id: 'q-2',
    question: 'What is the difference between TCP and UDP?',
    answer: 'TCP is connection-oriented, reliable, ordered delivery. UDP is connectionless, faster, no guaranteed delivery. TCP for accuracy, UDP for speed.',
    tldr: 'TCP = reliable & ordered, UDP = fast & connectionless',
    codeInterpretation: `\`\`\`python
# TCP Socket Example
import socket

# Create TCP socket
tcp_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
tcp_socket.connect(('server.com', 80))
tcp_socket.send(b'GET / HTTP/1.1')
\`\`\`

**Line-by-line breakdown:**

1. \`socket.socket(socket.AF_INET, socket.SOCK_STREAM)\`
   - \`AF_INET\` = IPv4 address family
   - \`SOCK_STREAM\` = TCP protocol (stream-based)
   - Creates a TCP socket object

2. \`tcp_socket.connect(('server.com', 80))\`
   - Initiates 3-way handshake
   - Establishes connection before data transfer
   - Blocks until connection established

3. \`tcp_socket.send(b'GET / HTTP/1.1')\`
   - Sends data reliably
   - Guarantees delivery and order
   - Waits for acknowledgment

**UDP Alternative:**
\`\`\`python
# UDP Socket - No connection needed
udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
udp_socket.sendto(b'data', ('server.com', 53))  # Fire and forget
\`\`\``,
    explanation: `**TCP (Transmission Control Protocol):**
- Connection-oriented (3-way handshake)
- Guaranteed delivery with acknowledgments
- Ordered packet delivery
- Flow control and congestion control
- Use cases: HTTP, FTP, Email

**UDP (User Datagram Protocol):**
- Connectionless (no handshake)
- No delivery guarantees
- No ordering
- Lower overhead, faster
- Use cases: DNS, Video streaming, Gaming`,
    difficulty: 'beginner',
    channel: 'networking',
    dueDate: new Date(),
    interval: 1,
    easeFactor: 2.5
  },
  {
    id: 'q-3',
    question: 'Explain the CAP theorem',
    answer: 'CAP theorem states distributed systems can only guarantee 2 of 3: Consistency, Availability, Partition tolerance. Must choose based on requirements.',
    tldr: 'Pick 2 of 3: Consistency, Availability, Partition tolerance',
    codeInterpretation: `\`\`\`javascript
// CP System Example (MongoDB)
const result = await db.collection.findOneAndUpdate(
  { _id: userId },
  { $inc: { balance: -100 } },
  { writeConcern: { w: 'majority' } }  // Wait for majority acknowledgment
);
\`\`\`

**Line-by-line breakdown:**

1. \`findOneAndUpdate({ _id: userId }, ...)\`
   - Atomic operation on single document
   - Finds document by ID and updates it

2. \`{ $inc: { balance: -100 } }\`
   - \`$inc\` = Increment operator
   - Decrements balance by 100
   - Atomic operation ensures consistency

3. \`{ writeConcern: { w: 'majority' } }\`
   - \`w: 'majority'\` = Wait for majority of nodes
   - Ensures **Consistency** across replicas
   - Sacrifices **Availability** during network partition
   - This is a **CP choice** (Consistency + Partition tolerance)

**AP System Alternative (Cassandra):**
\`\`\`javascript
// AP System - Always available, eventual consistency
await client.execute(
  'UPDATE users SET balance = balance - 100 WHERE id = ?',
  [userId],
  { consistency: cassandra.types.consistencies.one }  // Any node responds
);
\`\`\``,
    explanation: `**The Three Guarantees:**

1. **Consistency (C):** All nodes see the same data at the same time
2. **Availability (A):** Every request receives a response
3. **Partition Tolerance (P):** System continues despite network failures

**Trade-offs:**
- **CP Systems:** Consistent + Partition tolerant (MongoDB, HBase)
- **AP Systems:** Available + Partition tolerant (Cassandra, DynamoDB)
- **CA Systems:** Consistent + Available (Traditional RDBMS, but not truly distributed)

In practice, partition tolerance is mandatory for distributed systems, so you choose between CP or AP.`,
    diagram: `graph TD
    CAP[CAP Theorem] --> C[Consistency]
    CAP --> A[Availability]
    CAP --> P[Partition Tolerance]
    C --> CP[CP: MongoDB]
    A --> AP[AP: Cassandra]
    P --> CP
    P --> AP`,
    difficulty: 'advanced',
    channel: 'system-design',
    dueDate: new Date(),
    interval: 1,
    easeFactor: 2.5
  }
];

const confidenceLevels = [
  { id: 'again', label: 'Again', color: 'from-red-500 to-orange-500', emoji: '😰', interval: 1 },
  { id: 'hard', label: 'Hard', color: 'from-orange-500 to-yellow-500', emoji: '😅', interval: 2 },
  { id: 'good', label: 'Good', color: 'from-green-500 to-emerald-500', emoji: '😊', interval: 4 },
  { id: 'easy', label: 'Easy', color: 'from-blue-500 to-cyan-500', emoji: '🚀', interval: 7 }
];

// Diagram section with error handling
function DiagramSection({ diagram }: { diagram: string }) {
  const [renderSuccess, setRenderSuccess] = useState<boolean | null>(null);
  
  if (renderSuccess === false) return null;
  
  return (
    <div className="p-6 bg-muted/50 backdrop-blur-xl rounded-[24px] border border-border">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Eye className="w-5 h-5 text-purple-400" />
        </div>
        <span className="text-sm font-bold text-purple-400 uppercase tracking-wider">Diagram</span>
      </div>
      <div className="bg-background/30 rounded-xl p-4 overflow-x-auto">
        <EnhancedMermaid 
          chart={diagram} 
          onRenderResult={(success) => setRenderSuccess(success)}
        />
      </div>
    </div>
  );
}

// Markdown preprocessing
function preprocessMarkdown(text: string): string {
  if (!text) return '';
  let processed = text;
  processed = processed.replace(/([^\n])(```)/g, '$1\n$2');
  processed = processed.replace(/(```\w*)\s*\n?\s*([^\n`])/g, '$1\n$2');
  processed = processed.replace(/^\*\*\s*$/gm, '');
  processed = processed.replace(/\*\*\s*\n\s*([^*]+)\*\*/g, '**$1**');
  processed = processed.replace(/^[•·]\s*/gm, '- ');
  processed = processed.replace(/\n{3,}/g, '\n\n');
  return processed.trim();
}

export default function ReviewSessionGenZ() {
  const [, setLocation] = useLocation();
  const { onSRSReview } = useCredits();
  const [cards] = useState(mockReviewCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [streak, setStreak] = useState(0);

  const currentCard = cards[currentIndex];
  const progress = ((reviewedCount / cards.length) * 100).toFixed(0);

  const handleConfidence = (level: string) => {
    // Award credits based on confidence using the unified system
    const rating = level as 'again' | 'hard' | 'good' | 'easy';
    onSRSReview(rating);

    setReviewedCount(prev => prev + 1);
    setStreak(prev => level === 'easy' || level === 'good' ? prev + 1 : 0);
    setShowAnswer(false);

    // Move to next card
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Session complete
      setLocation('/stats');
    }
  };

  const handleRevealAnswer = () => {
    setShowAnswer(true);
  };

  const handleSkip = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    }
  };

  if (!currentCard) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-black mb-2">Review Complete!</h2>
            <p className="text-muted-foreground mb-6">You've reviewed all cards for today</p>
            <button
              onClick={() => setLocation('/')}
              className="px-8 py-4 bg-gradient-to-r from-primary to-cyan-500 rounded-[16px] font-bold text-black"
            >
              Back to Home
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <>
      <SEOHead
        title="SRS Review - Spaced Repetition 🧠"
        description="Review your cards with spaced repetition"
        canonical="https://open-interview.github.io/review"
      />

      <AppLayout>
        {/* iPhone 13 FIX: Ensure content fits within viewport with safe areas */}
        <div className="min-h-screen bg-background text-foreground overflow-x-hidden w-full">
          <div className="max-w-4xl mx-auto px-6 py-8 w-full" style={{ maxWidth: '100vw' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setLocation('/')}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="font-bold">{streak}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  <span className="font-bold">{reviewedCount}/{cards.length}</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-bold">{progress}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-primary to-cyan-500"
                />
              </div>
            </div>

            {/* Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCard.id}
                initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.9, rotateY: 10 }}
                transition={{ duration: 0.3 }}
                className="relative w-full overflow-hidden"
                style={{ maxWidth: '100%' }}
              >
                {/* Question Card */}
                <div className="p-8 bg-muted/50 backdrop-blur-xl rounded-[32px] border border-border min-h-[400px] flex flex-col w-full overflow-hidden"
                     style={{ maxWidth: '100%' }}>
                  {/* Tags */}
                  <div className="flex items-center gap-2 mb-6">
                    <span className="px-3 py-1 bg-[#00ff88]/20 text-primary rounded-full text-xs font-bold uppercase">
                      {currentCard.channel}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      currentCard.difficulty === 'beginner' ? 'bg-green-500/20 text-green-500' :
                      currentCard.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-red-500/20 text-red-500'
                    }`}>
                      {currentCard.difficulty}
                    </span>
                  </div>

                  {/* Question */}
                  <div className="flex-1 flex items-center justify-center">
                    <h2 className="text-3xl font-bold text-center leading-relaxed">
                      {currentCard.question}
                    </h2>
                  </div>

                  {/* Answer (Hidden/Shown) */}
                  <AnimatePresence>
                    {showAnswer && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 space-y-4"
                      >
                        {/* TLDR */}
                        {currentCard.tldr && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-[20px] backdrop-blur-sm"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Zap className="w-4 h-4 text-cyan-400" />
                              <span className="text-xs font-bold text-cyan-400 uppercase">TL;DR</span>
                            </div>
                            <p className="text-sm text-[#e0e0e0]">{currentCard.tldr}</p>
                          </motion.div>
                        )}

                        {/* Answer */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          className="p-6 bg-muted/50 backdrop-blur-xl rounded-[24px] border border-border"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-primary" />
                              <span className="font-bold text-primary">Answer</span>
                            </div>
                            <ListenButton 
                              text={`${currentCard.answer}${currentCard.explanation ? '. ' + currentCard.explanation : ''}`}
                              label="Listen"
                              size="sm"
                            />
                          </div>
                          <p className="text-lg text-foreground leading-relaxed">
                            {currentCard.answer}
                          </p>
                        </motion.div>

                        {/* Code Interpretation */}
                        {currentCard.codeInterpretation && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.18 }}
                            className="p-6 bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-[24px] backdrop-blur-sm"
                          >
                            <div className="flex items-center gap-2 mb-4">
                              <Check className="w-5 h-5 text-pink-400" />
                              <span className="font-bold text-pink-400 uppercase text-sm">Code Interpretation</span>
                            </div>
                            <div className="prose prose-invert max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  code({ className, children }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const isInline = !match && !String(children).includes('\n');
                                    
                                    if (isInline) {
                                      return (
                                        <code className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded text-sm font-mono">
                                          {children}
                                        </code>
                                      );
                                    }
                                    
                                    return (
                                      <div className="my-4 rounded-xl overflow-hidden">
                                        <SyntaxHighlighter
                                          language={match ? match[1] : 'text'}
                                          style={vscDarkPlus}
                                          customStyle={{ 
                                            margin: 0, 
                                            padding: '1.5rem',
                                            background: '#0a0a0a',
                                            fontSize: '0.9rem',
                                          }}
                                        >
                                          {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                      </div>
                                    );
                                  },
                                  p({ children }) {
                                    return <p className="mb-3 text-[#e0e0e0] leading-relaxed">{children}</p>;
                                  },
                                  h1({ children }) {
                                    return <h1 className="text-xl font-bold mb-3 mt-4 text-foreground">{children}</h1>;
                                  },
                                  h2({ children }) {
                                    return <h2 className="text-lg font-bold mb-2 mt-4 text-foreground">{children}</h2>;
                                  },
                                  strong({ children }) {
                                    return <strong className="font-bold text-foreground">{children}</strong>;
                                  },
                                  ul({ children }) {
                                    return <ul className="space-y-2 mb-3">{children}</ul>;
                                  },
                                  ol({ children }) {
                                    return <ol className="space-y-2 mb-3 list-decimal list-inside">{children}</ol>;
                                  },
                                  li({ children }) {
                                    return (
                                      <li className="flex gap-2 text-[#e0e0e0]">
                                        <span className="text-pink-400 mt-1">•</span>
                                        <span className="flex-1">{children}</span>
                                      </li>
                                    );
                                  },
                                }}
                              >
                                {preprocessMarkdown(currentCard.codeInterpretation)}
                              </ReactMarkdown>
                            </div>
                          </motion.div>
                        )}

                        {/* Diagram */}
                        {currentCard.diagram && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <DiagramSection diagram={currentCard.diagram} />
                          </motion.div>
                        )}

                        {/* Explanation */}
                        {currentCard.explanation && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="p-6 bg-muted/50 backdrop-blur-xl rounded-[24px] border border-border"
                          >
                            <div className="flex items-center gap-2 mb-4">
                              <Brain className="w-5 h-5 text-orange-400" />
                              <span className="font-bold text-orange-400 uppercase text-sm">Explanation</span>
                            </div>
                            <div className="prose prose-invert max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  code({ className, children }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const isInline = !match && !String(children).includes('\n');
                                    
                                    if (isInline) {
                                      return (
                                        <code className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded text-sm font-mono">
                                          {children}
                                        </code>
                                      );
                                    }
                                    
                                    return (
                                      <div className="my-4 rounded-xl overflow-hidden">
                                        <SyntaxHighlighter
                                          language={match ? match[1] : 'text'}
                                          style={vscDarkPlus}
                                          customStyle={{ 
                                            margin: 0, 
                                            padding: '1.5rem',
                                            background: '#0a0a0a',
                                            fontSize: '0.9rem',
                                          }}
                                        >
                                          {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                      </div>
                                    );
                                  },
                                  p({ children }) {
                                    return <p className="mb-3 text-[#e0e0e0] leading-relaxed">{children}</p>;
                                  },
                                  h1({ children }) {
                                    return <h1 className="text-xl font-bold mb-3 mt-4 text-foreground">{children}</h1>;
                                  },
                                  h2({ children }) {
                                    return <h2 className="text-lg font-bold mb-2 mt-4 text-foreground">{children}</h2>;
                                  },
                                  strong({ children }) {
                                    return <strong className="font-bold text-foreground">{children}</strong>;
                                  },
                                  ul({ children }) {
                                    return <ul className="space-y-2 mb-3">{children}</ul>;
                                  },
                                  li({ children }) {
                                    return (
                                      <li className="flex gap-2 text-[#e0e0e0]">
                                        <span className="text-primary mt-1">•</span>
                                        <span className="flex-1">{children}</span>
                                      </li>
                                    );
                                  },
                                }}
                              >
                                {preprocessMarkdown(currentCard.explanation)}
                              </ReactMarkdown>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Actions */}
                <div className="mt-6">
                  {!showAnswer ? (
                    // Reveal Answer Button
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleRevealAnswer}
                      className="w-full py-6 bg-gradient-to-r from-primary to-cyan-500 rounded-[20px] font-bold text-xl text-black flex items-center justify-center gap-3"
                    >
                      <Eye className="w-6 h-6" />
                      Tap to reveal answer
                    </motion.button>
                  ) : (
                    // Confidence Buttons
                    <div className="space-y-3">
                      <div className="text-center text-sm text-muted-foreground mb-4">
                        How well did you know this?
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {confidenceLevels.map((level) => (
                          <motion.button
                            key={level.id}
                            whileHover={{ scale: 1.05, y: -4 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleConfidence(level.id)}
                            className={`p-4 bg-gradient-to-br ${level.color} rounded-[16px] font-bold text-foreground`}
                          >
                            <div className="text-2xl mb-1">{level.emoji}</div>
                            <div className="text-sm">{level.label}</div>
                            <div className="text-xs opacity-70 mt-1">+{level.interval}d</div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Skip Button */}
                <div className="mt-4 text-center">
                  <button
                    onClick={handleSkip}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip this card
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Stats Footer */}
            <div className="mt-8 grid grid-cols-3 gap-4 w-full" style={{ maxWidth: '100%' }}>
              <div className="p-4 bg-muted/50 rounded-[16px] text-center">
                <div className="text-2xl font-black">{cards.length}</div>
                <div className="text-xs text-muted-foreground">Total Cards</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-[16px] text-center">
                <div className="text-2xl font-black">{reviewedCount}</div>
                <div className="text-xs text-muted-foreground">Reviewed</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-[16px] text-center">
                <div className="text-2xl font-black">{cards.length - reviewedCount}</div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </>
  );
}
