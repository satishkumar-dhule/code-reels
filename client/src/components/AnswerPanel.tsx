import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedMermaid } from './EnhancedMermaid';
import { YouTubePlayer } from './YouTubePlayer';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Check, BookOpen, Code2, Lightbulb, ExternalLink, Building2, 
  ChevronDown, Baby 
} from 'lucide-react';
import type { Question } from '../lib/data';
import { GiscusComments } from './GiscusComments';

// Check if mermaid diagram content is valid (non-empty and has valid structure)
function isValidMermaidDiagram(diagram: string | undefined | null): boolean {
  if (!diagram || typeof diagram !== 'string') return false;
  const trimmed = diagram.trim();
  if (!trimmed || trimmed.length < 10) return false;
  // Check for common mermaid diagram types
  const validStarts = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie', 'gitGraph', 'mindmap', 'timeline', 'quadrantChart', 'sankey', 'xychart', 'block'];
  const firstLine = trimmed.split('\n')[0].toLowerCase().trim();
  return validStarts.some(start => firstLine.startsWith(start.toLowerCase()));
}

interface AnswerPanelProps {
  question: Question;
  isCompleted: boolean;
}

interface CollapsibleSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  accentColor?: string;
  onVisibilityChange?: (id: string, isVisible: boolean) => void;
}

function CollapsibleSection({ 
  id, 
  title, 
  icon, 
  children, 
  defaultExpanded = true,
  accentColor = 'primary',
  onVisibilityChange 
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [userToggled, setUserToggled] = useState(false); // Track if user manually toggled
  const sectionRef = useRef<HTMLDivElement>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Only auto-collapse when section scrolls above viewport
  // Don't auto-expand - let user control that
  useEffect(() => {
    // Skip auto-collapse if user has manually toggled
    if (userToggled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Only auto-collapse when scrolled above viewport (not below)
          if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
            setIsExpanded(false);
          }
          onVisibilityChange?.(id, entry.isIntersecting);
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '-100px 0px 0px 0px' // Only trigger when header is well above viewport
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [id, userToggled, onVisibilityChange]);

  const toggleExpanded = () => {
    setUserToggled(true); // Mark as user-controlled
    setIsExpanded(!isExpanded);
  };

  const accentClasses = {
    primary: 'bg-primary',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div ref={sectionRef} className="w-full mb-2 sm:mb-6 clear-both">
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 group cursor-pointer py-1"
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className={`w-0.5 sm:w-1 h-3.5 sm:h-5 ${accentClasses[accentColor as keyof typeof accentClasses] || accentClasses.primary} transition-all ${isExpanded ? 'opacity-100' : 'opacity-50'}`} />
          <span className="text-muted-foreground">{icon}</span>
          <h2 className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
            {title}
          </h2>
        </div>
        {isMobile ? (
          <div className={`text-muted-foreground transition-transform ${isExpanded ? '' : '-rotate-90'}`}>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        ) : (
          <motion.div
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
            className="text-muted-foreground group-hover:text-foreground transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        )}
      </button>
      
      {/* Simplified animation on mobile for better performance */}
      {isMobile ? (
        isExpanded && (
          <div className="overflow-hidden">
            {children}
          </div>
        )
      ) : (
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}


export function AnswerPanel({ question, isCompleted }: AnswerPanelProps) {
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleVisibilityChange = useCallback((id: string, isVisible: boolean) => {
    setVisibleSections(prev => {
      const next = new Set(prev);
      if (isVisible) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const renderMarkdown = (text: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeContent = String(children).replace(/\n$/, '');
            const isInline = !match && !String(children).includes('\n');
            
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[0.85em] font-mono border border-primary/20 whitespace-nowrap" {...props}>
                  {children}
                </code>
              );
            }
            
            if (language === 'mermaid') {
              // Skip invalid mermaid diagrams
              if (!isValidMermaidDiagram(codeContent)) {
                return null;
              }
              return (
                <div className="my-6 sm:my-8 w-full clear-both mb-8">
                  <EnhancedMermaid chart={codeContent} />
                </div>
              );
            }
            
            return (
              <div className="my-3 sm:my-8 w-full rounded-lg overflow-hidden border border-border shadow-lg clear-both mb-3 sm:mb-6">
                <div className="flex items-center justify-between px-2 sm:px-4 py-1 sm:py-2 bg-muted border-b border-border">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Code2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
                    <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-muted-foreground">{language || 'code'}</span>
                  </div>
                </div>
                <SyntaxHighlighter
                  language={language || 'text'}
                  style={vscDarkPlus}
                  customStyle={{ 
                    margin: 0, 
                    padding: window.innerWidth < 640 ? '0.5rem' : '0.75rem', 
                    background: '#0a0a0a',
                    fontSize: window.innerWidth < 640 ? '0.6rem' : '0.7rem',
                    lineHeight: '1.4',
                    overflowX: 'auto'
                  }}
                  showLineNumbers={codeContent.split('\n').length > 5 && window.innerWidth >= 640}
                  wrapLines={true}
                  wrapLongLines={true}
                >
                  {codeContent}
                </SyntaxHighlighter>
              </div>
            );
          },
          p({ children }) {
            return <p className="mb-2 sm:mb-4 leading-relaxed text-foreground/85 clear-both">{children}</p>;
          },
          h1({ children }) {
            return <h1 className="text-sm sm:text-xl md:text-2xl font-bold mb-2 sm:mb-4 mt-3 sm:mt-6 md:mt-8 text-foreground border-b border-border pb-1.5 sm:pb-2 clear-both">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-xs sm:text-lg md:text-xl font-bold mb-1.5 sm:mb-3 mt-3 sm:mt-6 text-foreground clear-both">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-[11px] sm:text-base md:text-lg font-bold mb-1.5 sm:mb-2 mt-2 sm:mt-4 text-foreground/90 clear-both">{children}</h3>;
          },
          strong({ children }) {
            return <strong className="font-bold text-foreground">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-primary/90">{children}</em>;
          },
          ul({ children }) {
            return <ul className="list-none space-y-1 sm:space-y-2 mb-2 sm:mb-4 ml-2 sm:ml-4 clear-both">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-none space-y-1 sm:space-y-2 mb-2 sm:mb-4 ml-2 sm:ml-4 counter-reset-list clear-both">{children}</ol>;
          },
          li({ children, node }) {
            const isOrdered = node?.tagName === 'ol';
            return (
              <li className="flex gap-1.5 sm:gap-3 text-foreground/80 clear-both">
                <span className="text-primary shrink-0 mt-0.5 text-[10px] sm:text-sm">
                  {isOrdered ? '→' : '•'}
                </span>
                <span className="flex-1 break-words">{children}</span>
              </li>
            );
          },
          a({ href, children }) {
            return (
              <a 
                href={href} 
                className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 transition-colors" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 sm:border-l-4 border-primary/50 pl-2 sm:pl-4 py-1.5 sm:py-2 my-2 sm:my-4 bg-primary/5 text-muted-foreground italic text-[10px] sm:text-sm clear-both">
                {children}
              </blockquote>
            );
          },
          hr() {
            return <hr className="my-2 sm:my-6 md:my-8 border-border clear-both" />;
          },
          table({ children }) {
            return (
              <div className="my-3 sm:my-6 overflow-x-auto clear-both">
                <table className="w-full border-collapse text-[10px] sm:text-sm">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-muted">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-border">{children}</tbody>;
          },
          tr({ children }) {
            return <tr className="border-b border-border hover:bg-muted/50 transition-colors">{children}</tr>;
          },
          th({ children }) {
            return (
              <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-left font-semibold text-foreground/90 border border-border bg-muted">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-foreground/80 border border-border">
                {children}
              </td>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };


  const isMobileView = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <motion.div
      ref={scrollContainerRef}
      initial={isMobileView ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: isMobileView ? 0 : 0.3 }}
      className="w-full h-full overflow-y-auto custom-scrollbar"
    >
      <div className="max-w-4xl mx-auto px-2 sm:px-6 md:px-8 py-2 sm:py-4 md:py-6 space-y-1 sm:space-y-2">
        {/* Companies Section - Non-collapsible, compact on mobile */}
        {question.companies && question.companies.length > 0 && (
          <div className="w-full mb-2 sm:mb-6 clear-both">
            <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-3 bg-blue-500/10 dark:bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <span className="text-[9px] sm:text-xs text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider">Asked at:</span>
                {question.companies.map((company, idx) => (
                  <span 
                    key={idx}
                    className="px-1.5 sm:px-2 py-0.5 bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[9px] sm:text-xs font-medium rounded-full border border-blue-500/30"
                  >
                    {company}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Video Explanations - Collapsible, compact on mobile */}
        {(question.videos?.shortVideo || question.videos?.longVideo) && (
          <CollapsibleSection
            id="videos"
            title="Videos"
            icon={<Code2 className="w-3 h-3 sm:w-4 sm:h-4" />}
            accentColor="red"
            onVisibilityChange={handleVisibilityChange}
          >
            <YouTubePlayer 
              shortVideo={question.videos.shortVideo} 
              longVideo={question.videos.longVideo} 
            />
          </CollapsibleSection>
        )}

        {/* Diagram Section - Hidden on mobile, collapsible on desktop */}
        {isValidMermaidDiagram(question.diagram) && (
          <div className="hidden sm:block">
            <CollapsibleSection
              id="diagram"
              title="Diagram"
              icon={<Code2 className="w-3 h-3 sm:w-4 sm:h-4" />}
              accentColor="primary"
              onVisibilityChange={handleVisibilityChange}
            >
              <div className="w-full">
                <EnhancedMermaid chart={question.diagram!} />
              </div>
            </CollapsibleSection>
          </div>
        )}

        {/* TLDR Section - Collapsible, compact on mobile */}
        {question.answer && question.answer !== question.explanation && (
          <CollapsibleSection
            id="quick-answer"
            title="TLDR"
            icon={<Lightbulb className="w-3 h-3 sm:w-4 sm:h-4" />}
            accentColor="yellow"
            onVisibilityChange={handleVisibilityChange}
          >
            <div className="p-2 sm:p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-[11px] sm:text-sm text-foreground/90 leading-relaxed">
                {question.answer}
              </p>
            </div>
          </CollapsibleSection>
        )}

        {/* ELI5 Section - Explain Like I'm 5 */}
        {question.eli5 && (
          <CollapsibleSection
            id="eli5"
            title="Explain Like I'm 5"
            icon={<Baby className="w-3 h-3 sm:w-4 sm:h-4" />}
            accentColor="green"
            defaultExpanded={false}
            onVisibilityChange={handleVisibilityChange}
          >
            <div className="p-2 sm:p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-start gap-2 sm:gap-3">
                <span className="text-lg sm:text-2xl shrink-0">🧒</span>
                <p className="text-[11px] sm:text-sm text-foreground/90 leading-relaxed">
                  {question.eli5}
                </p>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Detailed Explanation - Collapsible, compact on mobile */}
        <CollapsibleSection
          id="explanation"
          title="Explanation"
          icon={<BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />}
          accentColor="primary"
          onVisibilityChange={handleVisibilityChange}
        >
          <div className="prose prose-invert max-w-none text-[11px] sm:text-sm leading-relaxed">
            {renderMarkdown(question.explanation)}
          </div>
        </CollapsibleSection>

        {/* Tags - Non-collapsible, compact on mobile */}
        {question.tags && question.tags.length > 0 && (
          <div className="w-full pt-2 sm:pt-6 border-t border-border">
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {question.tags.slice(0, window.innerWidth < 640 ? 4 : question.tags.length).map(tag => (
                <span 
                  key={tag} 
                  className="px-1.5 sm:px-3 py-0.5 sm:py-1 bg-muted hover:bg-muted/80 text-[9px] sm:text-xs font-mono text-muted-foreground border border-border rounded-full transition-colors"
                >
                  #{tag}
                </span>
              ))}
              {window.innerWidth < 640 && question.tags.length > 4 && (
                <span className="text-[9px] text-muted-foreground py-0.5">+{question.tags.length - 4}</span>
              )}
            </div>
          </div>
        )}

        {/* Source Link - Non-collapsible, compact on mobile */}
        {question.sourceUrl && (
          <div className="w-full pt-2 sm:pt-6 border-t border-border">
            <a
              href={question.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-muted hover:bg-muted/80 border border-border rounded-lg transition-colors group"
            >
              <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-[10px] sm:text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                Source
              </span>
            </a>
          </div>
        )}

        {/* Discussion Section - Giscus Comments */}
        <div className="w-full pt-2 sm:pt-6 border-t border-border">
          <GiscusComments questionId={question.id} />
        </div>
      </div>
    </motion.div>
  );
}
