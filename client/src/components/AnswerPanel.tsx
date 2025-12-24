import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedMermaid } from './EnhancedMermaid';
import { YouTubePlayer } from './YouTubePlayer';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  BookOpen, Code2, Lightbulb, ExternalLink,
  ChevronDown, Baby, Copy, Check, Tag,
  GitBranch, Play
} from 'lucide-react';
import type { Question } from '../lib/data';
import { GiscusComments } from './GiscusComments';
import { formatTag } from '../lib/utils';

type MediaTab = 'diagram' | 'eli5' | 'video';

/**
 * Preprocess markdown text to fix common formatting issues
 */
function preprocessMarkdown(text: string): string {
  if (!text) return '';
  
  let processed = text;
  
  // Wrap Big-O notation in code spans to protect from markdown parsing
  // Matches O(n), O(n²), O(n log n), O(1), O(n^2), Θ(n), Ω(n), etc.
  processed = processed.replace(/([OΘΩ])\(([^)]+)\)/g, '`$1($2)`');
  
  // Fix code fences that are not on their own line
  // Pattern: text followed by ``` on same line (but not at start of line)
  // This handles cases like "Example: ```yaml" -> "Example:\n```yaml"
  processed = processed.replace(/([^\n`])(\s*```)/g, '$1\n```');
  // Pattern: ``` followed by text on same line (except language identifier)
  processed = processed.replace(/(```\w*)\s*\n?\s*([^\n`])/g, '$1\n$2');
  // Fix colon followed by backticks with optional space: ": ```" or ":```"
  processed = processed.replace(/:\s*```/g, ':\n\n```');
  
  // Fix broken bold markers - standalone ** on their own line
  processed = processed.replace(/^\*\*\s*$/gm, '');
  
  // Fix bold markers that are split across lines (e.g., "**\nSome text**")
  processed = processed.replace(/\*\*\s*\n\s*([^*]+)\*\*/g, '**$1**');
  
  // Fix unclosed bold markers at start of lines followed by content
  // Pattern: line starting with ** but no closing ** on same line
  const lines = processed.split('\n');
  const fixedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Count ** occurrences in line
    const boldMarkers = (line.match(/\*\*/g) || []).length;
    
    // If odd number of ** markers, it's unbalanced
    if (boldMarkers % 2 === 1) {
      // If line starts with ** and has no closing, remove the opening **
      if (line.trim().startsWith('**') && boldMarkers === 1) {
        line = line.replace(/^\s*\*\*\s*/, '');
      }
      // If line ends with ** and has no opening, remove the closing **
      else if (line.trim().endsWith('**') && boldMarkers === 1) {
        line = line.replace(/\s*\*\*\s*$/, '');
      }
    }
    
    fixedLines.push(line);
  }
  processed = fixedLines.join('\n');
  
  // Fix inline bullet points
  processed = processed.replace(/^[•·]\s*/gm, '- ');
  
  if (processed.includes('•') || processed.includes('·')) {
    const bulletLines = processed.split('\n');
    const processedLines = bulletLines.map(line => {
      const bulletCount = (line.match(/[•·]/g) || []).length;
      if (bulletCount > 1 || (bulletCount === 1 && !line.trim().startsWith('•') && !line.trim().startsWith('·'))) {
        const parts = line.split(/[•·]/).map(p => p.trim()).filter(p => p);
        if (parts.length > 1) {
          return parts.map(p => `- ${p}`).join('\n');
        }
      }
      return line.replace(/^[•·]\s*/, '- ');
    });
    processed = processedLines.join('\n');
  }
  
  processed = processed.replace(/(\d+[.)]\s+[^0-9]+?)(?=\s+\d+[.)])/g, '$1\n');
  processed = processed.replace(/(?<!\n)(\d+[.)]\s+)/g, '\n$1');
  processed = processed.replace(/\n{3,}/g, '\n\n');
  processed = processed.replace(/^\n+/, '');
  
  return processed;
}

// Check if mermaid diagram is valid
function isValidMermaidDiagram(diagram: string | undefined | null): boolean {
  if (!diagram || typeof diagram !== 'string') return false;
  const trimmed = diagram.trim();
  if (!trimmed || trimmed.length < 10) return false;
  
  const validStarts = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie', 'gitGraph', 'mindmap', 'timeline', 'quadrantChart', 'sankey', 'xychart', 'block'];
  const firstLine = trimmed.split('\n')[0].toLowerCase().trim();
  const hasValidStart = validStarts.some(start => firstLine.startsWith(start.toLowerCase()));
  if (!hasValidStart) return false;
  
  const lines = trimmed.split('\n').filter(line => {
    const l = line.trim().toLowerCase();
    return l && !l.startsWith('%%') && !validStarts.some(s => l.startsWith(s.toLowerCase()));
  });
  
  if (lines.length < 3) return false;
  
  const lowerContent = trimmed.toLowerCase();
  if (
    (lowerContent.includes('start') && lowerContent.includes('end') && lines.length <= 3) ||
    (lowerContent.match(/\bstart\b/g)?.length === 1 && lowerContent.match(/\bend\b/g)?.length === 1 && lines.length <= 2)
  ) {
    return false;
  }
  
  return true;
}

interface AnswerPanelProps {
  question: Question;
  isCompleted: boolean;
}

// Compact expandable card component
function ExpandableCard({ 
  title, 
  icon, 
  children, 
  defaultExpanded = true,
  variant = 'default',
  badge
}: { 
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  variant?: 'default' | 'highlight' | 'success' | 'purple';
  badge?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const variantStyles = {
    default: 'bg-card border-border',
    highlight: 'bg-primary/5 border-primary/20',
    success: 'bg-green-500/5 border-green-500/20',
    purple: 'bg-purple-500/5 border-purple-500/20',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    highlight: 'text-primary',
    success: 'text-green-500',
    purple: 'text-purple-500',
  };

  return (
    <div className={`rounded-xl sm:rounded-2xl border overflow-hidden ${variantStyles[variant]}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <span className={iconStyles[variant]}>{icon}</span>
          <span className="font-semibold text-sm sm:text-base">{title}</span>
          {badge && (
            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary/10 text-primary text-[10px] sm:text-xs font-medium rounded">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
      </button>
      
      {isMobile ? (
        isExpanded && <div className="px-3 pb-3">{children}</div>
      ) : (
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 sm:px-4 lg:px-5 pb-3 sm:pb-4 lg:pb-5">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

// Code block with copy button
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg sm:rounded-xl overflow-hidden border border-border bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {language || 'code'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
              <span className="text-green-500">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{ 
          margin: 0, 
          padding: '0.75rem', 
          background: 'transparent',
          fontSize: '0.75rem',
          lineHeight: '1.5',
        }}
        wrapLines={true}
        wrapLongLines={true}
        className="!text-xs sm:!text-sm !p-3 sm:!p-4"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

// Tabbed Media Panel for Diagram, ELI5, and Video
function TabbedMediaPanel({ 
  question,
  hasDiagram,
  hasEli5,
  hasVideo
}: { 
  question: Question;
  hasDiagram: boolean;
  hasEli5: boolean;
  hasVideo: boolean;
}) {
  const availableTabs: MediaTab[] = [];
  if (hasDiagram) availableTabs.push('diagram');
  if (hasEli5) availableTabs.push('eli5');
  if (hasVideo) availableTabs.push('video');
  
  const [activeTab, setActiveTab] = useState<MediaTab>(availableTabs[0]);
  
  if (availableTabs.length === 0) return null;

  const tabConfig = {
    diagram: { label: 'Diagram', icon: <GitBranch className="w-4 h-4" />, color: 'text-primary' },
    eli5: { label: 'ELI5', icon: <Baby className="w-4 h-4" />, color: 'text-green-500' },
    video: { label: 'Video', icon: <Play className="w-4 h-4" />, color: 'text-purple-500' },
  };

  return (
    <div className="rounded-xl sm:rounded-2xl border border-border bg-card overflow-hidden">
      {/* Tab Headers */}
      <div className="flex border-b border-border bg-muted/30">
        {availableTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 sm:py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab 
                ? `${tabConfig[tab].color} bg-card` 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <span className={activeTab === tab ? tabConfig[tab].color : ''}>{tabConfig[tab].icon}</span>
            <span>{tabConfig[tab].label}</span>
            {activeTab === tab && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-current"
              />
            )}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="p-3 sm:p-4 lg:p-5">
        <AnimatePresence mode="wait">
          {activeTab === 'diagram' && hasDiagram && (
            <motion.div
              key="diagram"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <EnhancedMermaid chart={question.diagram!} />
            </motion.div>
          )}
          
          {activeTab === 'eli5' && hasEli5 && (
            <motion.div
              key="eli5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-3"
            >
              <span className="text-2xl flex-shrink-0">🧒</span>
              <p className="text-sm sm:text-base text-foreground/90 leading-relaxed">{question.eli5}</p>
            </motion.div>
          )}
          
          {activeTab === 'video' && hasVideo && (
            <motion.div
              key="video"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <YouTubePlayer 
                shortVideo={question.videos?.shortVideo} 
                longVideo={question.videos?.longVideo} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function AnswerPanel({ question, isCompleted }: AnswerPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMobileView = typeof window !== 'undefined' && window.innerWidth < 640;

  const hasDiagram = isValidMermaidDiagram(question.diagram);
  const hasEli5 = !!question.eli5;
  const hasVideo = !!(question.videos?.shortVideo || question.videos?.longVideo);
  const hasMediaContent = hasDiagram || hasEli5 || hasVideo;

  const renderMarkdown = useCallback((text: string) => {
    const processedText = preprocessMarkdown(text);
    
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeContent = String(children).replace(/\n$/, '');
            const isInline = !match && !String(children).includes('\n');
            
            if (isInline) {
              return (
                <code className="px-1 sm:px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[0.85em] font-mono">
                  {children}
                </code>
              );
            }
            
            if (language === 'mermaid') {
              if (!isValidMermaidDiagram(codeContent)) return null;
              return (
                <div className="my-4 sm:my-6">
                  <EnhancedMermaid chart={codeContent} />
                </div>
              );
            }
            
            return (
              <div className="my-3 sm:my-4">
                <CodeBlock code={codeContent} language={language} />
              </div>
            );
          },
          p({ children }) {
            return <p className="mb-3 sm:mb-4 leading-relaxed text-foreground/90 text-sm sm:text-base">{children}</p>;
          },
          h1({ children }) {
            return <h1 className="text-base sm:text-lg lg:text-xl font-bold mb-3 sm:mb-4 mt-4 sm:mt-6 text-foreground border-b border-border pb-2">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-sm sm:text-base lg:text-lg font-bold mb-2 sm:mb-3 mt-4 sm:mt-5 text-foreground">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-sm sm:text-base font-semibold mb-2 mt-3 sm:mt-4 text-foreground/90">{children}</h3>;
          },
          strong({ children }) {
            return <strong className="font-semibold text-foreground">{children}</strong>;
          },
          ul({ children }) {
            return <ul className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 ml-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 ml-1 [counter-reset:list-counter]">{children}</ol>;
          },
          li({ children, node }) {
            const parent = (node as any)?.parent;
            const isOrdered = parent?.tagName === 'ol';
            
            return (
              <li className="flex gap-2 sm:gap-3 text-foreground/90 text-sm sm:text-base [counter-increment:list-counter]">
                <span className="shrink-0 text-primary mt-0.5">
                  {isOrdered ? <span className="text-xs sm:text-sm font-medium before:content-[counter(list-counter)'.']" /> : '•'}
                </span>
                <span className="flex-1">{children}</span>
              </li>
            );
          },
          a({ href, children }) {
            return (
              <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 sm:border-l-4 border-primary/50 pl-3 sm:pl-4 py-1 sm:py-2 my-3 sm:my-4 bg-primary/5 text-muted-foreground italic text-sm sm:text-base">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="my-3 sm:my-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm sm:text-base">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold bg-muted border border-border text-xs sm:text-sm">{children}</th>;
          },
          td({ children }) {
            return <td className="px-3 sm:px-4 py-2 sm:py-3 border border-border text-sm sm:text-base">{children}</td>;
          },
        }}
      >
        {processedText}
      </ReactMarkdown>
    );
  }, []);

  return (
    <motion.div
      ref={scrollContainerRef}
      initial={isMobileView ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full overflow-y-auto"
    >
      <div className="max-w-3xl lg:max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 lg:py-8 space-y-2.5 sm:space-y-4 lg:space-y-5">

        {/* TLDR - Always visible, highlighted */}
        {question.answer && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5">
            <div className="flex items-start gap-2 sm:gap-3">
              <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wider text-primary font-semibold mb-1 sm:mb-2">TLDR</div>
                <p className="text-sm sm:text-base lg:text-lg text-foreground/90 leading-relaxed">
                  {question.answer}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabbed Media Panel - Diagram, ELI5, Video */}
        {hasMediaContent && (
          <TabbedMediaPanel
            question={question}
            hasDiagram={hasDiagram}
            hasEli5={hasEli5}
            hasVideo={hasVideo}
          />
        )}

        {/* Full Explanation */}
        <ExpandableCard
          title="Full Explanation"
          icon={<BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />}
          defaultExpanded={true}
          badge={question.explanation ? `${Math.ceil(question.explanation.split(' ').length / 200)} min read` : undefined}
        >
          <div className="prose prose-sm sm:prose-base max-w-none">
            {renderMarkdown(question.explanation)}
          </div>
        </ExpandableCard>

        {/* Tags */}
        {question.tags && question.tags.length > 0 && (
          <div className="flex items-start gap-2 sm:gap-3 pt-2 sm:pt-3">
            <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground mt-1 flex-shrink-0" />
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {question.tags.map(tag => (
                <span 
                  key={tag} 
                  className="px-2 sm:px-3 py-0.5 sm:py-1 bg-muted text-[10px] sm:text-xs font-mono text-muted-foreground rounded-full border border-border"
                >
                  {formatTag(tag)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Source Link */}
        {question.sourceUrl && (
          <a
            href={question.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-muted hover:bg-muted/80 border border-border rounded-lg sm:rounded-xl transition-colors text-sm sm:text-base"
          >
            <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
            <span className="text-muted-foreground">View Source</span>
          </a>
        )}

        {/* Discussion - Direct embed without extra wrapper */}
        <GiscusComments questionId={question.id} />

      </div>
    </motion.div>
  );
}
