import { motion } from 'framer-motion';
import { EnhancedMermaid } from './EnhancedMermaid';
import { UnifiedDiagram } from './UnifiedDiagram';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import { Check, BookOpen, Code2, Lightbulb } from 'lucide-react';
import type { Question } from '../lib/data';

interface AnswerPanelProps {
  question: Question;
  isCompleted: boolean;
}

export function AnswerPanel({ question, isCompleted }: AnswerPanelProps) {
  const renderMarkdown = (text: string) => {
    return (
      <ReactMarkdown
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
              return (
                <div className="my-6 sm:my-8 w-full clear-both mb-8">
                  <EnhancedMermaid chart={codeContent} />
                </div>
              );
            }
            
            return (
              <div className="my-6 sm:my-8 w-full rounded-lg overflow-hidden border border-white/10 shadow-lg clear-both mb-6">
                <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 bg-white/5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white/50">{language || 'code'}</span>
                  </div>
                </div>
                <SyntaxHighlighter
                  language={language || 'text'}
                  style={vscDarkPlus}
                  customStyle={{ 
                    margin: 0, 
                    padding: '0.75rem', 
                    background: '#0a0a0a',
                    fontSize: '0.7rem',
                    lineHeight: '1.5',
                    overflowX: 'auto'
                  }}
                  showLineNumbers={codeContent.split('\n').length > 5}
                  wrapLines={true}
                  wrapLongLines={true}
                >
                  {codeContent}
                </SyntaxHighlighter>
              </div>
            );
          },
          p({ children }) {
            return <p className="mb-3 sm:mb-4 leading-relaxed text-white/85 clear-both">{children}</p>;
          },
          h1({ children }) {
            return <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 mt-4 sm:mt-6 md:mt-8 text-white border-b border-white/10 pb-2 clear-both">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-base sm:text-lg md:text-xl font-bold mb-2 sm:mb-3 mt-4 sm:mt-6 text-white clear-both">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-sm sm:text-base md:text-lg font-bold mb-2 mt-3 sm:mt-4 text-white/90 clear-both">{children}</h3>;
          },
          strong({ children }) {
            return <strong className="font-bold text-white">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-primary/90">{children}</em>;
          },
          ul({ children }) {
            return <ul className="list-none space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 ml-3 sm:ml-4 clear-both">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-none space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 ml-3 sm:ml-4 counter-reset-list clear-both">{children}</ol>;
          },
          li({ children, node }) {
            const isOrdered = node?.tagName === 'ol';
            return (
              <li className="flex gap-2 sm:gap-3 text-white/80 clear-both">
                <span className="text-primary shrink-0 mt-0.5 text-sm">
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
              <blockquote className="border-l-4 border-primary/50 pl-3 sm:pl-4 py-2 my-3 sm:my-4 bg-primary/5 text-white/70 italic text-xs sm:text-sm clear-both">
                {children}
              </blockquote>
            );
          },
          hr() {
            return <hr className="my-4 sm:my-6 md:my-8 border-white/10 clear-both" />;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full h-full overflow-y-auto custom-scrollbar"
    >
      <div className="max-w-4xl mx-auto px-3 sm:px-6 md:px-8 py-3 sm:py-4 md:py-6 space-y-4 sm:space-y-5 md:space-y-7">
        {/* Diagram Section - Full width, clear spacing */}
        {question.diagram && (
          <div className="w-full mb-6 sm:mb-8 clear-both">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 sm:h-5 bg-primary" />
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-white/70">
                Diagram
                {(question as any).diagramType && (question as any).diagramType !== 'mermaid' && (
                  <span className="ml-2 text-[9px] text-primary/70">
                    ({(question as any).diagramType})
                  </span>
                )}
              </h2>
            </div>
            <div className="w-full mb-6">
              <UnifiedDiagram question={question} />
            </div>
          </div>
        )}

        {/* Quick Answer Section - Clear separation */}
        {question.answer && question.answer !== question.explanation && (
          <div className="w-full p-3 sm:p-4 bg-primary/5 border border-primary/20 rounded-lg mb-6 sm:mb-8 clear-both">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-primary">Quick Answer</h2>
            </div>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
              {question.answer}
            </p>
          </div>
        )}

        {/* Detailed Explanation - Clear spacing */}
        <div className="w-full mb-6 sm:mb-8 clear-both">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/70 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-white/70">Explanation</h2>
          </div>
          <div className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed">
            {renderMarkdown(question.explanation)}
          </div>
        </div>

        {/* Completion Badge */}
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full flex items-center gap-3 p-3 sm:p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-green-400 uppercase tracking-wide">Completed</div>
              <div className="text-[10px] sm:text-xs text-green-400/70">You've reviewed this question</div>
            </div>
          </motion.div>
        )}

        {/* Tags */}
        {question.tags && question.tags.length > 0 && (
          <div className="w-full pt-4 sm:pt-6 border-t border-white/10">
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {question.tags.map(tag => (
                <span 
                  key={tag} 
                  className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/5 hover:bg-white/10 text-[10px] sm:text-xs font-mono text-white/60 border border-white/10 rounded-full transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
