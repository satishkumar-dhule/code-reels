/**
 * Documentation Page - Polished Version
 * Comprehensive technical documentation with Mermaid diagrams
 */
import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { 
  BookOpen, Code, Database, Cpu, Layers, GitBranch, 
  Zap, Shield, BarChart3, Palette, ChevronRight, ChevronDown,
  Terminal, Server, Globe, Brain, FileCode, Copy, Check,
  ExternalLink, Search, Menu, X, Home, Sparkles, Box
} from 'lucide-react';
import { EnhancedMermaid } from '@/components/EnhancedMermaid';

// Documentation sections
const sections = [
  { id: 'overview', title: 'Architecture Overview', icon: Layers, color: '#58a6ff' },
  { id: 'ai-pipeline', title: 'AI Pipeline', icon: Brain, color: '#a371f7' },
  { id: 'database', title: 'Database & Storage', icon: Database, color: '#3fb950' },
  { id: 'frontend', title: 'Frontend Patterns', icon: Code, color: '#f78166' },
  { id: 'illustrations', title: 'Illustration System', icon: Palette, color: '#f778ba' },
  { id: 'api', title: 'API Reference', icon: Server, color: '#39c5cf' },
  { id: 'deployment', title: 'Deployment', icon: Globe, color: '#d29922' },
];

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Close sidebar on section change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [activeSection]);

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#30363d] bg-[#0d1117]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-[#21262d] rounded-lg transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/">
              <a className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#58a6ff] to-[#a371f7] flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <div className="font-semibold text-white">Documentation</div>
                  <div className="text-xs text-[#8b949e]">Reel-LearnHub</div>
                </div>
              </a>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#21262d] rounded-lg border border-[#30363d]">
              <Search className="w-4 h-4 text-[#8b949e]" />
              <input
                type="text"
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm w-40 focus:w-56 transition-all outline-none placeholder:text-[#6e7681]"
              />
              <kbd className="text-[10px] text-[#6e7681] bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d]">⌘K</kbd>
            </div>
            <Link href="/">
              <a className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-lg transition-colors">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Back to App</span>
              </a>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)] w-72 
          bg-[#0d1117] lg:bg-transparent border-r border-[#30363d] lg:border-0
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <nav className="p-4 space-y-1 overflow-y-auto h-full">
            <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider px-3 mb-3">
              Documentation
            </div>
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
                    ${isActive 
                      ? 'bg-[#21262d] text-white' 
                      : 'text-[#8b949e] hover:text-white hover:bg-[#161b22]'
                    }
                  `}
                >
                  <div 
                    className={`p-1.5 rounded-md transition-colors ${isActive ? 'bg-[#30363d]' : ''}`}
                    style={{ color: isActive ? section.color : undefined }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">{section.title}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto text-[#6e7681]" />}
                </button>
              );
            })}
            
            {/* Quick Links */}
            <div className="pt-6 mt-6 border-t border-[#21262d]">
              <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider px-3 mb-3">
                Quick Links
              </div>
              <a href="https://github.com" target="_blank" rel="noopener" 
                className="flex items-center gap-3 px-3 py-2 text-sm text-[#8b949e] hover:text-white rounded-lg hover:bg-[#161b22] transition-colors">
                <GitBranch className="w-4 h-4" />
                <span>GitHub Repository</span>
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
              <a href="/whats-new"
                className="flex items-center gap-3 px-3 py-2 text-sm text-[#8b949e] hover:text-white rounded-lg hover:bg-[#161b22] transition-colors">
                <Sparkles className="w-4 h-4" />
                <span>What's New</span>
              </a>
            </div>
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 px-4 lg:px-8 py-8 lg:py-12">
          <div className="max-w-4xl">
            {activeSection === 'overview' && <OverviewSection />}
            {activeSection === 'ai-pipeline' && <AIPipelineSection />}
            {activeSection === 'database' && <DatabaseSection />}
            {activeSection === 'frontend' && <FrontendSection />}
            {activeSection === 'illustrations' && <IllustrationSection />}
            {activeSection === 'api' && <APISection />}
            {activeSection === 'deployment' && <DeploymentSection />}
          </div>
        </main>
      </div>
    </div>
  );
}

// ============== SHARED COMPONENTS ==============

function SectionHeader({ icon: Icon, title, description, color = '#58a6ff' }: { 
  icon: any; title: string; description: string; color?: string 
}) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-4 mb-3">
        <div className="p-3 rounded-xl" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-7 h-7" style={{ color }} />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">{title}</h1>
        </div>
      </div>
      <p className="text-lg text-[#8b949e] leading-relaxed">{description}</p>
    </div>
  );
}

function CodeBlock({ code, language = 'typescript', title, copyable = true }: { 
  code: string; language?: string; title?: string; copyable?: boolean 
}) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-[#30363d] my-6 group">
      {title && (
        <div className="bg-[#161b22] px-4 py-2.5 border-b border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-[#8b949e]" />
            <span className="text-sm text-[#8b949e] font-mono">{title}</span>
          </div>
          {copyable && (
            <button 
              onClick={handleCopy}
              className="p-1.5 hover:bg-[#30363d] rounded transition-colors"
              title="Copy code"
            >
              {copied ? <Check className="w-4 h-4 text-[#3fb950]" /> : <Copy className="w-4 h-4 text-[#6e7681]" />}
            </button>
          )}
        </div>
      )}
      <pre className="bg-[#0d1117] p-4 overflow-x-auto">
        <code className={`language-${language} text-sm text-[#e6edf3] font-mono leading-relaxed`}>
          {code.trim()}
        </code>
      </pre>
    </div>
  );
}

function DiagramCard({ title, description, diagram }: { title: string; description: string; diagram: string }) {
  const [expanded, setExpanded] = useState(true);
  
  return (
    <div className="rounded-xl border border-[#30363d] bg-[#161b22]/50 overflow-hidden my-8">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-[#21262d]/50 transition-colors"
      >
        <div className="text-left">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Box className="w-4 h-4 text-[#58a6ff]" />
            {title}
          </h3>
          <p className="text-sm text-[#8b949e] mt-1">{description}</p>
        </div>
        <ChevronDown className={`w-5 h-5 text-[#6e7681] transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="p-4 pt-0 border-t border-[#30363d]/50">
          <div className="bg-[#0d1117] rounded-lg p-4 overflow-x-auto">
            <EnhancedMermaid chart={diagram} />
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-6">{children}</div>;
}

function FeatureCard({ icon: Icon, title, description, color = '#58a6ff' }: { 
  icon: any; title: string; description: string; color?: string 
}) {
  return (
    <div className="p-4 rounded-xl border border-[#30363d] bg-[#161b22]/30 hover:bg-[#161b22] hover:border-[#58a6ff]/30 transition-all group">
      <div className="p-2 rounded-lg w-fit mb-3" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <h4 className="font-semibold text-white mb-1 group-hover:text-[#58a6ff] transition-colors">{title}</h4>
      <p className="text-sm text-[#8b949e] leading-relaxed">{description}</p>
    </div>
  );
}

function InfoBox({ type = 'info', title, children }: { type?: 'info' | 'warning' | 'success' | 'tip'; title: string; children: React.ReactNode }) {
  const styles = {
    info: { bg: 'bg-[#58a6ff]/10', border: 'border-[#58a6ff]/30', icon: '💡', color: 'text-[#58a6ff]' },
    warning: { bg: 'bg-[#d29922]/10', border: 'border-[#d29922]/30', icon: '⚠️', color: 'text-[#d29922]' },
    success: { bg: 'bg-[#3fb950]/10', border: 'border-[#3fb950]/30', icon: '✅', color: 'text-[#3fb950]' },
    tip: { bg: 'bg-[#a371f7]/10', border: 'border-[#a371f7]/30', icon: '🎯', color: 'text-[#a371f7]' },
  };
  const s = styles[type];
  
  return (
    <div className={`${s.bg} ${s.border} border rounded-xl p-4 my-6`}>
      <div className={`font-semibold ${s.color} mb-2 flex items-center gap-2`}>
        <span>{s.icon}</span> {title}
      </div>
      <div className="text-sm text-[#8b949e] leading-relaxed">{children}</div>
    </div>
  );
}

function SectionDivider() {
  return <hr className="border-[#21262d] my-10" />;
}

// ============== OVERVIEW SECTION ==============

function OverviewSection() {
  const architectureDiagram = `
graph TB
    subgraph Client["Frontend - React + Vite"]
        UI[UI Components]
        Hooks[Custom Hooks]
        Context[Context Providers]
    end
    
    subgraph Server["Backend - Express"]
        API[REST API]
        Auth[Auth Middleware]
        Storage[Storage Layer]
    end
    
    subgraph DB["Databases"]
        Turso[(Turso SQLite)]
        Qdrant[(Qdrant Vectors)]
    end
    
    subgraph AI["AI Pipeline - LangGraph"]
        Graphs[State Graphs]
        Prompts[Prompt Templates]
    end
    
    Client --> Server
    Server --> DB
    Server --> AI
    AI --> DB
    
    style Client fill:#1f6feb,stroke:#58a6ff,color:#fff
    style Server fill:#238636,stroke:#3fb950,color:#fff
    style DB fill:#8957e5,stroke:#a371f7,color:#fff
    style AI fill:#bf8700,stroke:#d29922,color:#fff
`;

  return (
    <div>
      <SectionHeader 
        icon={Layers} 
        title="Architecture Overview" 
        description="A modern full-stack application built with React, Express, and AI-powered content generation using LangGraph pipelines."
        color="#58a6ff"
      />
      
      <DiagramCard
        title="System Architecture"
        description="High-level overview of the main components and their interactions"
        diagram={architectureDiagram}
      />
      
      <h2 className="text-xl font-semibold text-white mt-10 mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-[#f1c40f]" />
        Tech Stack
      </h2>
      
      <FeatureGrid>
        <FeatureCard icon={Code} title="React 18 + TypeScript" description="Modern frontend with hooks, suspense, and full type safety" color="#61dafb" />
        <FeatureCard icon={Zap} title="Vite" description="Lightning-fast HMR and optimized production builds" color="#646cff" />
        <FeatureCard icon={Server} title="Express.js" description="Robust REST API with middleware architecture" color="#68a063" />
        <FeatureCard icon={Database} title="Turso (LibSQL)" description="Edge-ready SQLite with global replication" color="#00e5ff" />
        <FeatureCard icon={Brain} title="LangGraph" description="Stateful AI pipelines with retry logic and validation" color="#a371f7" />
        <FeatureCard icon={Palette} title="Tailwind CSS" description="Utility-first styling with custom dark theme" color="#38bdf8" />
      </FeatureGrid>
      
      <SectionDivider />
      
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-[#3fb950]" />
        Design Principles
      </h2>
      
      <div className="space-y-4">
        <InfoBox type="tip" title="Single Responsibility">
          Each module handles one concern. AI graphs are separate from UI components, and database operations are isolated in their own layer.
        </InfoBox>
        
        <InfoBox type="info" title="Composable Pipelines">
          LangGraph nodes can be reused across different workflows. The same validation node works for blogs, questions, and social posts.
        </InfoBox>
        
        <InfoBox type="success" title="Type Safety">
          Full TypeScript coverage with strict mode. Zod schemas validate API inputs, and Drizzle ORM provides type-safe database queries.
        </InfoBox>
      </div>
      
      <SectionDivider />
      
      <h2 className="text-xl font-semibold text-white mb-4">Project Structure</h2>
      <CodeBlock
        title="Directory Layout"
        language="bash"
        code={`├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── context/        # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Route pages
│   │   └── lib/            # Utilities
│   └── index.html
├── server/                 # Express backend
│   ├── routes.ts           # API routes
│   ├── db.ts               # Database setup
│   └── storage.ts          # Data layer
├── script/                 # CLI tools & AI
│   ├── ai/
│   │   ├── graphs/         # LangGraph pipelines
│   │   ├── prompts/        # AI prompt templates
│   │   ├── services/       # Vector DB, RAG
│   │   └── utils/          # SVG generators
│   └── generate-blog.js    # Blog generator
└── shared/                 # Shared types`}
      />
    </div>
  );
}

// ============== AI PIPELINE SECTION ==============

function AIPipelineSection() {
  const blogGraphDiagram = `
graph LR
    A([Start]) --> B[Find Case]
    B --> C{Valid URL?}
    C -->|Yes| D{Score >= 6?}
    C -->|No| E{Retry?}
    E -->|Yes| B
    E -->|No| F[Skip]
    D -->|Yes| G[Generate Blog]
    D -->|No| F
    G --> H[Validate Citations]
    H --> I[Generate Images]
    I --> J[Final Check]
    F --> J
    J --> K([End])
    
    style B fill:#1f6feb,color:#fff
    style G fill:#238636,color:#fff
    style I fill:#a371f7,color:#fff
    style F fill:#da3633,color:#fff
`;

  const questionGraphDiagram = `
graph TB
    subgraph Input["Input Processing"]
        A[Parse Question]
        B[Classify Difficulty]
        C[Extract Topics]
    end
    
    subgraph Enhance["Enhancement"]
        D[RAG Search]
        E[Find Similar]
        F[Deduplicate]
    end
    
    subgraph Generate["Generation"]
        G[Generate Answer]
        H[Add Explanation]
        I[Create Diagram]
    end
    
    subgraph Quality["Quality Gate"]
        J[Validate]
        K[Score]
    end
    
    Input --> Enhance --> Generate --> Quality
    Quality -->|Pass| L([Save])
    Quality -->|Fail| Generate
    
    style Input fill:#1f6feb,color:#fff
    style Enhance fill:#bf8700,color:#fff
    style Generate fill:#238636,color:#fff
    style Quality fill:#a371f7,color:#fff
`;

  return (
    <div>
      <SectionHeader 
        icon={Brain} 
        title="AI Pipeline (LangGraph)" 
        description="Stateful AI workflows with automatic retry, validation gates, and quality scoring. Built on LangGraph for reliable, observable AI operations."
        color="#a371f7"
      />
      
      <InfoBox type="tip" title="Why LangGraph?">
        LangGraph provides stateful, graph-based workflows that are easier to debug, test, and extend than simple prompt chains. Each node can be retried independently, and the state is fully observable.
      </InfoBox>
      
      <DiagramCard
        title="Blog Generation Pipeline"
        description="Multi-step workflow for generating blog posts with real-world case studies"
        diagram={blogGraphDiagram}
      />
      
      <h2 className="text-xl font-semibold text-white mt-10 mb-4">Pipeline Nodes</h2>
      
      <div className="space-y-4">
        <div className="p-4 rounded-xl border border-[#30363d] bg-[#161b22]/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#1f6feb]/20 flex items-center justify-center text-[#58a6ff] font-mono text-sm">1</div>
            <h4 className="font-semibold text-white">Find Real-World Case</h4>
          </div>
          <p className="text-sm text-[#8b949e] ml-11">Searches for compelling case studies from major tech companies. Validates source URLs and scores relevance (minimum 6/10 to proceed).</p>
        </div>
        
        <div className="p-4 rounded-xl border border-[#30363d] bg-[#161b22]/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#238636]/20 flex items-center justify-center text-[#3fb950] font-mono text-sm">2</div>
            <h4 className="font-semibold text-white">Generate Blog Content</h4>
          </div>
          <p className="text-sm text-[#8b949e] ml-11">Creates structured blog with introduction, sections, code examples, and conclusion. Uses RAG to find related questions for enrichment.</p>
        </div>
        
        <div className="p-4 rounded-xl border border-[#30363d] bg-[#161b22]/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#a371f7]/20 flex items-center justify-center text-[#a371f7] font-mono text-sm">3</div>
            <h4 className="font-semibold text-white">Generate Pixel Art</h4>
          </div>
          <p className="text-sm text-[#8b949e] ml-11">Auto-detects scene type from content and generates 16-bit pixel art SVG illustrations with CSS animations.</p>
        </div>
      </div>
      
      <DiagramCard
        title="Question Processing Pipeline"
        description="How interview questions are processed, enhanced with RAG, and validated"
        diagram={questionGraphDiagram}
      />
      
      <SectionDivider />
      
      <h2 className="text-xl font-semibold text-white mb-4">Available Graphs</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { name: 'blog-graph.js', desc: 'Blog post generation with real-world cases' },
          { name: 'question-graph.js', desc: 'Interview question enhancement' },
          { name: 'quality-gate-graph.js', desc: 'Content quality validation' },
          { name: 'semantic-duplicate-graph.js', desc: 'Vector-based duplicate detection' },
          { name: 'improvement-graph.js', desc: 'Content improvement suggestions' },
          { name: 'linkedin-graph.js', desc: 'LinkedIn post generation' },
        ].map(g => (
          <div key={g.name} className="flex items-center gap-3 p-3 rounded-lg border border-[#30363d] bg-[#161b22]/30">
            <FileCode className="w-4 h-4 text-[#8b949e] shrink-0" />
            <div className="min-w-0">
              <div className="font-mono text-sm text-[#58a6ff] truncate">{g.name}</div>
              <div className="text-xs text-[#6e7681] truncate">{g.desc}</div>
            </div>
          </div>
        ))}
      </div>
      
      <SectionDivider />
      
      <h2 className="text-xl font-semibold text-white mb-4">State Management</h2>
      <CodeBlock
        title="LangGraph State Definition"
        language="typescript"
        code={`import { StateGraph, Annotation } from '@langchain/langgraph';

// Define state schema with reducers
const BlogState = Annotation.Root({
  questionId: Annotation({ reducer: (_, b) => b, default: () => '' }),
  realWorldCase: Annotation({ reducer: (_, b) => b, default: () => null }),
  caseScore: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  blogContent: Annotation({ reducer: (_, b) => b, default: () => null }),
  status: Annotation({ reducer: (_, b) => b, default: () => 'pending' }),
  // Retry tracking
  caseAttempts: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  maxCaseAttempts: Annotation({ reducer: (_, b) => b, default: () => 3 }),
});

// Build graph with conditional routing
const graph = new StateGraph(BlogState);
graph.addNode('find_case', findRealWorldCaseNode);
graph.addNode('generate_blog', generateBlogNode);
graph.addConditionalEdges('validate', routeAfterValidation, {
  'generate': 'generate_blog',
  'retry': 'find_case',
  'skip': 'final_validate'
});`}
      />
    </div>
  );
}

// ============== DATABASE SECTION ==============

function DatabaseSection() {
  const schemaDiagram = `
erDiagram
    QUESTIONS {
        string id PK
        string question
        string answer
        string explanation
        string diagram
        string channel
        string difficulty
        json tags
    }
    
    BLOG_POSTS {
        int id PK
        string question_id FK
        string title
        string slug
        json sections
        json sources
        json images
    }
    
    USER_PROGRESS {
        int id PK
        string user_id
        string question_id FK
        int interval
        datetime next_review
    }
    
    QUESTIONS ||--o{ BLOG_POSTS : generates
    QUESTIONS ||--o{ USER_PROGRESS : tracks
`;

  const vectorDiagram = `
graph LR
    subgraph Ingest["Ingestion"]
        A[Question Text] --> B[Embed]
        B --> C[Vector]
    end
    
    subgraph Store["Qdrant"]
        D[(Collection)]
        E[HNSW Index]
    end
    
    subgraph Query["Search"]
        F[Query] --> G[Top K]
    end
    
    C --> D --> E
    F --> E --> G
    
    style Ingest fill:#1f6feb,color:#fff
    style Store fill:#8957e5,color:#fff
    style Query fill:#238636,color:#fff
`;

  return (
    <div>
      <SectionHeader 
        icon={Database} 
        title="Database & Storage" 
        description="Dual database architecture: Turso (LibSQL) for relational data and Qdrant for vector embeddings and semantic search."
        color="#3fb950"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="p-5 rounded-xl border border-[#30363d] bg-[#161b22]/30">
          <div className="flex items-center gap-3 mb-3">
            <Database className="w-6 h-6 text-[#00e5ff]" />
            <h3 className="font-semibold text-white">Turso (LibSQL)</h3>
          </div>
          <ul className="text-sm text-[#8b949e] space-y-2">
            <li className="flex items-start gap-2"><span className="text-[#3fb950]">•</span> Edge-ready SQLite with global replication</li>
            <li className="flex items-start gap-2"><span className="text-[#3fb950]">•</span> Drizzle ORM for type-safe queries</li>
            <li className="flex items-start gap-2"><span className="text-[#3fb950]">•</span> Automatic schema migrations</li>
            <li className="flex items-start gap-2"><span className="text-[#3fb950]">•</span> Read replicas for performance</li>
          </ul>
        </div>
        
        <div className="p-5 rounded-xl border border-[#30363d] bg-[#161b22]/30">
          <div className="flex items-center gap-3 mb-3">
            <Cpu className="w-6 h-6 text-[#a371f7]" />
            <h3 className="font-semibold text-white">Qdrant Vector DB</h3>
          </div>
          <ul className="text-sm text-[#8b949e] space-y-2">
            <li className="flex items-start gap-2"><span className="text-[#a371f7]">•</span> Semantic similarity search</li>
            <li className="flex items-start gap-2"><span className="text-[#a371f7]">•</span> Duplicate detection (85% threshold)</li>
            <li className="flex items-start gap-2"><span className="text-[#a371f7]">•</span> Related content discovery</li>
            <li className="flex items-start gap-2"><span className="text-[#a371f7]">•</span> HNSW indexing for fast queries</li>
          </ul>
        </div>
      </div>
      
      <DiagramCard
        title="Entity Relationship Diagram"
        description="Core database tables and their relationships"
        diagram={schemaDiagram}
      />
      
      <DiagramCard
        title="Vector Database Flow"
        description="How questions are embedded and searched using Qdrant"
        diagram={vectorDiagram}
      />
      
      <SectionDivider />
      
      <h2 className="text-xl font-semibold text-white mb-4">Usage Examples</h2>
      
      <CodeBlock
        title="Vector DB Service"
        language="typescript"
        code={`import vectorDB from './services/vector-db.js';

// Find similar questions
const similar = await vectorDB.findSimilar(searchQuery, {
  limit: 5,
  threshold: 0.1,
  channel: 'system-design',
  excludeIds: [currentQuestionId]
});

// Check for duplicates before inserting
const duplicates = await vectorDB.findDuplicates(newQuestion, {
  threshold: 0.85  // 85% similarity = duplicate
});

// Upsert question embedding
await vectorDB.upsert({
  id: question.id,
  text: question.question,
  metadata: { channel: question.channel, difficulty: question.difficulty }
});`}
      />
      
      <CodeBlock
        title="Drizzle ORM Query"
        language="typescript"
        code={`import { db } from './db';
import { questions, blogPosts } from './schema';
import { eq, desc, sql } from 'drizzle-orm';

// Get questions with blog posts
const results = await db
  .select()
  .from(questions)
  .leftJoin(blogPosts, eq(questions.id, blogPosts.questionId))
  .where(eq(questions.channel, 'system-design'))
  .orderBy(desc(questions.createdAt))
  .limit(10);

// Aggregate stats by channel
const stats = await db
  .select({
    channel: questions.channel,
    count: sql<number>\`count(*)\`,
  })
  .from(questions)
  .groupBy(questions.channel);`}
      />
    </div>
  );
}

// ============== FRONTEND SECTION ==============

function FrontendSection() {
  const componentDiagram = `
graph TB
    subgraph Pages["Pages"]
        A[Home]
        B[Question]
        C[Docs]
    end
    
    subgraph Core["Core Components"]
        D[QuestionPanel]
        E[AnswerPanel]
        F[Mermaid]
    end
    
    subgraph UI["UI Primitives"]
        G[Button]
        H[Card]
        I[Badge]
    end
    
    subgraph State["State Management"]
        J[Hooks]
        K[Context]
    end
    
    Pages --> Core
    Core --> UI
    Core --> State
    
    style Pages fill:#1f6feb,color:#fff
    style Core fill:#a371f7,color:#fff
    style UI fill:#bf8700,color:#fff
    style State fill:#da3633,color:#fff
`;

  return (
    <div>
      <SectionHeader 
        icon={Code} 
        title="Frontend Patterns" 
        description="React component architecture with custom hooks, context providers, and a consistent design system built on Tailwind CSS."
        color="#f78166"
      />
      
      <DiagramCard
        title="Component Hierarchy"
        description="Organization of React components by responsibility"
        diagram={componentDiagram}
      />
      
      <h2 className="text-xl font-semibold text-white mt-10 mb-4">Component Categories</h2>
      
      <FeatureGrid>
        <FeatureCard icon={Layers} title="Layout Components" description="Header, Sidebar, Footer - structural components that define page layout" color="#58a6ff" />
        <FeatureCard icon={Code} title="Core Components" description="QuestionPanel, AnswerPanel, Mermaid - main feature components" color="#a371f7" />
        <FeatureCard icon={Box} title="UI Primitives" description="Button, Card, Badge, Modal - reusable building blocks" color="#f1c40f" />
        <FeatureCard icon={Zap} title="Custom Hooks" description="useQuestion, useProgress, useAchievements - shared logic" color="#3fb950" />
        <FeatureCard icon={Database} title="Context Providers" description="Theme, User Preferences, Credits - global state" color="#f78166" />
        <FeatureCard icon={Shield} title="Error Boundaries" description="Graceful error handling with fallback UI" color="#da3633" />
      </FeatureGrid>
      
      <SectionDivider />
      
      <h2 className="text-xl font-semibold text-white mb-4">Custom Hook Pattern</h2>
      
      <CodeBlock
        title="useQuestion Hook"
        language="typescript"
        code={`import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export function useQuestion(id: string) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    async function fetchQuestion() {
      try {
        setLoading(true);
        const data = await api.getQuestion(id);
        if (!cancelled) setQuestion(data);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    
    fetchQuestion();
    return () => { cancelled = true; };
  }, [id]);

  return { question, loading, error, refetch: () => fetchQuestion() };
}`}
      />
      
      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Context Provider Pattern</h2>
      
      <CodeBlock
        title="Achievement Context"
        language="typescript"
        code={`import { createContext, useContext, useCallback, useState } from 'react';

interface AchievementContextType {
  achievements: Achievement[];
  unlockAchievement: (type: string, metadata?: any) => void;
  notifications: Notification[];
}

const AchievementContext = createContext<AchievementContextType | null>(null);

export function AchievementProvider({ children }: { children: ReactNode }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unlockAchievement = useCallback((type: string, metadata?: any) => {
    // Check if already unlocked
    if (achievements.some(a => a.type === type)) return;
    
    const newAchievement = { type, metadata, unlockedAt: new Date() };
    setAchievements(prev => [...prev, newAchievement]);
    setNotifications(prev => [...prev, { ...newAchievement, id: Date.now() }]);
  }, [achievements]);

  return (
    <AchievementContext.Provider value={{ achievements, unlockAchievement, notifications }}>
      {children}
    </AchievementContext.Provider>
  );
}

export const useAchievements = () => {
  const ctx = useContext(AchievementContext);
  if (!ctx) throw new Error('useAchievements must be used within AchievementProvider');
  return ctx;
};`}
      />
      
      <SectionDivider />
      
      <h2 className="text-xl font-semibold text-white mb-4">Styling Approach</h2>
      
      <InfoBox type="info" title="Tailwind + CSS Variables">
        We use Tailwind for utility classes combined with CSS custom properties for theming. This allows easy theme switching while maintaining Tailwind's productivity benefits.
      </InfoBox>
      
      <CodeBlock
        title="Theme Variables"
        language="css"
        code={`:root {
  --bg: #0d1117;
  --bg-secondary: #161b22;
  --bg-elevated: #21262d;
  --text: #f0f6fc;
  --text-secondary: #8b949e;
  --accent: #58a6ff;
  --border: #30363d;
  --success: #3fb950;
  --warning: #d29922;
  --error: #f85149;
}

/* Component example */
.card {
  @apply rounded-xl border p-4 transition-colors;
  background: var(--bg-secondary);
  border-color: var(--border);
}

.card:hover {
  border-color: var(--accent);
}`}
      />
    </div>
  );
}

// ============== ILLUSTRATION SECTION ==============

function IllustrationSection() {
  const flowDiagram = `
graph LR
    A[Blog Title] --> B[Keyword Match]
    B --> C[Select Scene]
    C --> D[Draw Background]
    D --> E[Add Objects]
    E --> F[Add Characters]
    F --> G[CSS Animations]
    G --> H[SVG Output]
    
    style B fill:#bf8700,color:#fff
    style C fill:#1f6feb,color:#fff
    style F fill:#a371f7,color:#fff
    style H fill:#238636,color:#fff
`;

  const sceneTypes = [
    { name: 'collaboration', keywords: 'team, together, pair', color: '#58a6ff' },
    { name: 'devops', keywords: 'deploy, ci/cd, docker', color: '#3fb950' },
    { name: 'api', keywords: 'rest, graphql, endpoint', color: '#a371f7' },
    { name: 'database', keywords: 'sql, nosql, postgres', color: '#bf8700' },
    { name: 'security', keywords: 'auth, encrypt, ssl', color: '#f85149' },
    { name: 'testing', keywords: 'test, qa, coverage', color: '#39c5cf' },
    { name: 'debugging', keywords: 'bug, fix, error', color: '#d29922' },
    { name: 'performance', keywords: 'speed, optimize, cache', color: '#f778ba' },
    { name: 'mobile', keywords: 'ios, android, app', color: '#61dafb' },
    { name: 'cloud', keywords: 'aws, azure, serverless', color: '#ff9900' },
    { name: 'git', keywords: 'branch, merge, commit', color: '#f05032' },
    { name: 'architecture', keywords: 'design, system, pattern', color: '#6366f1' },
  ];

  return (
    <div>
      <SectionHeader 
        icon={Palette} 
        title="Illustration System" 
        description="16-bit pixel art SVG generator with 27 scene types, automatic content detection, and CSS animations for engaging blog illustrations."
        color="#f778ba"
      />
      
      <InfoBox type="tip" title="Why Pixel Art?">
        Pixel art SVGs are lightweight (3-5KB), infinitely scalable, and have a distinctive retro aesthetic that stands out. The CSS animations add life without requiring JavaScript or heavy assets.
      </InfoBox>
      
      <DiagramCard
        title="Generation Flow"
        description="How blog content is analyzed and converted to pixel art illustrations"
        diagram={flowDiagram}
      />
      
      <h2 className="text-xl font-semibold text-white mt-10 mb-4">Scene Types (27 Total)</h2>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
        {sceneTypes.map((scene) => (
          <div key={scene.name} className="p-3 rounded-lg bg-[#161b22]/50 border border-[#30363d] hover:border-[#58a6ff]/50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: scene.color }} />
              <span className="font-medium text-white text-sm">{scene.name}</span>
            </div>
            <p className="text-xs text-[#6e7681]">{scene.keywords}</p>
          </div>
        ))}
        <div className="p-3 rounded-lg bg-[#21262d]/50 border border-dashed border-[#30363d] flex items-center justify-center">
          <span className="text-xs text-[#6e7681]">+15 more scenes</span>
        </div>
      </div>
      
      <SectionDivider />
      
      <h2 className="text-xl font-semibold text-white mb-4">Character System</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-xl border border-[#30363d] bg-[#161b22]/30">
          <h4 className="font-semibold text-white mb-2">Character Dimensions</h4>
          <ul className="text-sm text-[#8b949e] space-y-1">
            <li>• Grid: 200×125 units (4px per unit)</li>
            <li>• Character: 12 units wide × 20 units tall</li>
            <li>• Minimum spacing: 30-40 units between characters</li>
            <li>• Floor position: y=100 (standing/sitting)</li>
          </ul>
        </div>
        <div className="p-4 rounded-xl border border-[#30363d] bg-[#161b22]/30">
          <h4 className="font-semibold text-white mb-2">Poses Available</h4>
          <ul className="text-sm text-[#8b949e] space-y-1">
            <li>• <code className="text-[#58a6ff]">stand</code> - Default standing pose</li>
            <li>• <code className="text-[#58a6ff]">sit</code> - Sitting at desk/chair</li>
            <li>• <code className="text-[#58a6ff]">wave</code> - Waving hand</li>
            <li>• <code className="text-[#58a6ff]">cheer</code> - Arms raised celebrating</li>
          </ul>
        </div>
      </div>
      
      <CodeBlock
        title="Character Generation"
        language="javascript"
        code={`// Character positioned by center-bottom (feet position)
function person(cx, by, opts = {}) {
  const { skin, hair, shirt, pose = 'stand', anim = null } = opts;
  
  // Character bounds: 12 units wide x 20 units tall
  const x = cx - 6;
  const y = by - 20;
  
  let s = '<g>';
  
  // Shadow under character
  s += \`<ellipse cx="\${cx*UNIT}" cy="\${by*UNIT}" 
         rx="\${5*UNIT}" ry="\${1.5*UNIT}" fill="rgba(0,0,0,0.2)"/>\`;
  
  // Body parts using box() helper (x, y, width, height, color)
  s += box(x+3, y, 6, 3, hair);      // hair
  s += box(x+3, y+3, 6, 4, skin);    // head
  s += box(x+4, y+4, 1, 1, '#000');  // eye
  s += box(x+7, y+4, 1, 1, '#000');  // eye
  s += box(x+2, y+7, 8, 6, shirt);   // body
  // ... legs, arms, shoes
  
  s += '</g>';
  return s;
}`}
      />
      
      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Scene Detection</h2>
      
      <CodeBlock
        title="Keyword Matching Algorithm"
        language="javascript"
        code={`const KEYWORDS = {
  devops: ['devops', 'deploy', 'ci/cd', 'docker', 'kubernetes', 'k8s'],
  api: ['api', 'rest', 'graphql', 'endpoint', 'microservice'],
  database: ['database', 'sql', 'nosql', 'postgres', 'mongo', 'redis'],
  security: ['security', 'auth', 'encrypt', 'ssl', 'vulnerability'],
  testing: ['test', 'qa', 'unit', 'coverage', 'jest', 'cypress'],
  // ... 22 more scene types
};

function detectScene(title, content = '') {
  const text = \`\${title} \${content}\`.toLowerCase();
  let best = 'default', score = 0;
  
  for (const [scene, keywords] of Object.entries(KEYWORDS)) {
    const matches = keywords.filter(k => text.includes(k)).length;
    if (matches > score) {
      score = matches;
      best = scene;
    }
  }
  return best;
}`}
      />
      
      <h2 className="text-xl font-semibold text-white mt-8 mb-4">CSS Animations</h2>
      
      <CodeBlock
        title="Character Animations"
        language="css"
        code={`/* Subtle float for idle characters */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

/* Bounce for celebrating characters */
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

/* Usage in SVG */
<g style="animation: float 2s ease-in-out infinite">
  <!-- character elements -->
</g>`}
      />
    </div>
  );
}

// ============== API SECTION ==============

function APISection() {
  const flowDiagram = `
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as Turso
    participant V as Qdrant
    
    C->>S: GET /api/questions/:id
    S->>DB: SELECT question
    DB-->>S: Question data
    S->>V: Find similar
    V-->>S: Similar IDs
    S->>DB: Get similar
    DB-->>S: Similar data
    S-->>C: Response
`;

  const endpoints = [
    { method: 'GET', path: '/api/questions', desc: 'List questions with filters', params: 'channel, difficulty, limit' },
    { method: 'GET', path: '/api/questions/:id', desc: 'Get single question with similar', params: 'id' },
    { method: 'POST', path: '/api/questions', desc: 'Create new question', params: 'body: Question' },
    { method: 'PATCH', path: '/api/questions/:id', desc: 'Update question', params: 'id, body: Partial<Question>' },
    { method: 'GET', path: '/api/channels', desc: 'List all channels with stats', params: '-' },
    { method: 'GET', path: '/api/progress/:userId', desc: 'Get user SRS progress', params: 'userId' },
    { method: 'POST', path: '/api/progress', desc: 'Update SRS progress', params: 'body: ProgressUpdate' },
    { method: 'GET', path: '/api/achievements/:userId', desc: 'Get user achievements', params: 'userId' },
    { method: 'POST', path: '/api/search', desc: 'Full-text search', params: 'body: { query, filters }' },
  ];

  return (
    <div>
      <SectionHeader 
        icon={Server} 
        title="API Reference" 
        description="REST API endpoints for questions, progress tracking, achievements, and search. All responses are JSON with consistent error handling."
        color="#39c5cf"
      />
      
      <DiagramCard
        title="Request Flow"
        description="Typical request flow from client through server to databases"
        diagram={flowDiagram}
      />
      
      <h2 className="text-xl font-semibold text-white mt-10 mb-4">Endpoints</h2>
      
      <div className="rounded-xl border border-[#30363d] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#161b22]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[#8b949e]">Method</th>
                <th className="px-4 py-3 text-left font-medium text-[#8b949e]">Path</th>
                <th className="px-4 py-3 text-left font-medium text-[#8b949e] hidden md:table-cell">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d]">
              {endpoints.map((ep, i) => (
                <tr key={i} className="hover:bg-[#161b22]/50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-mono font-medium ${
                      ep.method === 'GET' ? 'bg-[#238636]/20 text-[#3fb950]' :
                      ep.method === 'POST' ? 'bg-[#1f6feb]/20 text-[#58a6ff]' :
                      'bg-[#bf8700]/20 text-[#d29922]'
                    }`}>
                      {ep.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[#e6edf3]">{ep.path}</td>
                  <td className="px-4 py-3 text-[#8b949e] hidden md:table-cell">{ep.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <SectionDivider />
      
      <h2 className="text-xl font-semibold text-white mb-4">Request/Response Examples</h2>
      
      <CodeBlock
        title="GET /api/questions/:id - Response"
        language="json"
        code={`{
  "id": "q-123",
  "question": "Explain the CAP theorem in distributed systems",
  "answer": "The CAP theorem states that a distributed system...",
  "explanation": "In distributed systems, you must choose between...",
  "diagram": "graph LR\\n  C[Consistency]\\n  A[Availability]\\n  P[Partition Tolerance]",
  "channel": "system-design",
  "difficulty": "intermediate",
  "tags": ["distributed-systems", "databases", "theory"],
  "companies": ["Google", "Amazon", "Netflix"],
  "similar": [
    { "id": "q-456", "question": "What is eventual consistency?" },
    { "id": "q-789", "question": "How does Cassandra handle partitions?" }
  ]
}`}
      />
      
      <CodeBlock
        title="POST /api/progress - Request & Response"
        language="json"
        code={`// Request
{
  "userId": "user-abc123",
  "questionId": "q-123",
  "quality": 4,      // 0-5 SRS quality rating
  "timeSpent": 45    // seconds spent on question
}

// Response
{
  "success": true,
  "nextReview": "2024-01-15T10:00:00Z",
  "interval": 4,     // days until next review
  "easeFactor": 2.5, // SM-2 ease factor
  "streak": 7        // consecutive correct answers
}`}
      />
      
      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Error Handling</h2>
      
      <CodeBlock
        title="Error Response Format"
        language="json"
        code={`// 400 Bad Request
{
  "error": "Validation failed",
  "details": [
    { "field": "difficulty", "message": "Must be one of: beginner, intermediate, advanced" }
  ]
}

// 404 Not Found
{
  "error": "Question not found",
  "questionId": "q-999"
}

// 500 Internal Server Error
{
  "error": "Internal server error",
  "requestId": "req-abc123"  // For debugging
}`}
      />
    </div>
  );
}

// ============== DEPLOYMENT SECTION ==============

function DeploymentSection() {
  const pipelineDiagram = `
graph LR
    A[Push to main] --> B[GitHub Actions]
    B --> C[Run Tests]
    C --> D[Build]
    D --> E[Deploy]
    E --> F[Vercel]
    E --> G[Static Assets]
    
    style B fill:#bf8700,color:#fff
    style C fill:#a371f7,color:#fff
    style F fill:#238636,color:#fff
`;

  const envVars = [
    { name: 'TURSO_DATABASE_URL', desc: 'Turso database connection URL', required: true },
    { name: 'TURSO_AUTH_TOKEN', desc: 'Turso authentication token', required: true },
    { name: 'QDRANT_URL', desc: 'Qdrant vector database URL', required: true },
    { name: 'QDRANT_API_KEY', desc: 'Qdrant API key', required: true },
    { name: 'OPENAI_API_KEY', desc: 'OpenAI API key for AI features', required: true },
    { name: 'ANTHROPIC_API_KEY', desc: 'Anthropic API key (Claude)', required: false },
    { name: 'GA_MEASUREMENT_ID', desc: 'Google Analytics ID', required: false },
  ];

  return (
    <div>
      <SectionHeader 
        icon={Globe} 
        title="Deployment" 
        description="CI/CD pipeline with GitHub Actions, environment configuration, and production infrastructure on Vercel with edge databases."
        color="#d29922"
      />
      
      <DiagramCard
        title="CI/CD Pipeline"
        description="Automated deployment flow from code push to production"
        diagram={pipelineDiagram}
      />
      
      <h2 className="text-xl font-semibold text-white mt-10 mb-4">Environment Variables</h2>
      
      <div className="rounded-xl border border-[#30363d] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#161b22]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[#8b949e]">Variable</th>
                <th className="px-4 py-3 text-left font-medium text-[#8b949e] hidden sm:table-cell">Description</th>
                <th className="px-4 py-3 text-left font-medium text-[#8b949e]">Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d]">
              {envVars.map((env, i) => (
                <tr key={i} className="hover:bg-[#161b22]/50">
                  <td className="px-4 py-3 font-mono text-[#58a6ff] text-xs">{env.name}</td>
                  <td className="px-4 py-3 text-[#8b949e] hidden sm:table-cell">{env.desc}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      env.required 
                        ? 'bg-[#da3633]/20 text-[#f85149]' 
                        : 'bg-[#30363d] text-[#8b949e]'
                    }`}>
                      {env.required ? 'Required' : 'Optional'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <SectionDivider />
      
      <h2 className="text-xl font-semibold text-white mb-4">Quick Start</h2>
      
      <div className="space-y-4">
        <div className="p-4 rounded-xl border border-[#30363d] bg-[#161b22]/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#3fb950]/20 flex items-center justify-center text-[#3fb950] font-mono text-sm">1</div>
            <h4 className="font-semibold text-white">Clone & Install</h4>
          </div>
          <CodeBlock
            language="bash"
            code={`git clone https://github.com/your-repo/reel-learnhub.git
cd reel-learnhub
pnpm install`}
            copyable
          />
        </div>
        
        <div className="p-4 rounded-xl border border-[#30363d] bg-[#161b22]/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#3fb950]/20 flex items-center justify-center text-[#3fb950] font-mono text-sm">2</div>
            <h4 className="font-semibold text-white">Configure Environment</h4>
          </div>
          <CodeBlock
            language="bash"
            code={`cp .env.example .env
# Edit .env with your credentials`}
            copyable
          />
        </div>
        
        <div className="p-4 rounded-xl border border-[#30363d] bg-[#161b22]/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#3fb950]/20 flex items-center justify-center text-[#3fb950] font-mono text-sm">3</div>
            <h4 className="font-semibold text-white">Start Development</h4>
          </div>
          <CodeBlock
            language="bash"
            code={`pnpm dev
# Open http://localhost:5000`}
            copyable
          />
        </div>
      </div>
      
      <SectionDivider />
      
      <h2 className="text-xl font-semibold text-white mb-4">Available Scripts</h2>
      
      <CodeBlock
        title="package.json scripts"
        language="json"
        code={`{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "generate:blog": "node script/generate-blog.js",
    "generate:questions": "node script/generate-questions.js",
    "test": "vitest",
    "test:e2e": "playwright test",
    "db:migrate": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}`}
      />
      
      <InfoBox type="warning" title="Production Checklist">
        Before deploying to production, ensure you have: configured all required environment variables, run database migrations, set up Qdrant collection with proper indexes, and tested the AI pipeline with your API keys.
      </InfoBox>
    </div>
  );
}
