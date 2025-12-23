/**
 * Mermaid Diagram Prompt Template
 */

import { jsonOutputRule, qualityRules, buildSystemContext } from './base.js';
import config from '../../config.js';

export const schema = {
  diagram: "flowchart TD\\n  A[Step 1] --> B[Step 2]",
  diagramType: "flowchart|sequence|class|state",
  confidence: "high|medium|low"
};

export const examples = [
  {
    input: { question: "How does DNS resolution work?", tags: ["networking", "dns"] },
    output: {
      diagram: `flowchart TD
  subgraph Client["🖥️ Client Side"]
    A[("🌐 Browser")]
    B[("💾 Local Cache")]
  end
  
  subgraph DNS["☁️ DNS Infrastructure"]
    C[("🔄 Recursive Resolver")]
    D[("🌍 Root Server")]
    E[("📍 TLD Server")]
    F[("✅ Authoritative Server")]
  end
  
  A -->|"1. Query domain"| B
  B -->|"2. Cache miss"| C
  C -->|"3. Where is .com?"| D
  D -->|"4. Ask TLD"| E
  E -->|"5. Ask authoritative"| F
  F -->|"6. IP: 93.184.216.34"| C
  C -->|"7. Return IP"| A
  
  style A fill:#e1f5fe,stroke:#01579b
  style F fill:#c8e6c9,stroke:#2e7d32
  style C fill:#fff3e0,stroke:#ef6c00`,
      diagramType: "flowchart",
      confidence: "high"
    }
  },
  {
    input: { question: "Explain OAuth 2.0 flow", tags: ["security", "authentication"] },
    output: {
      diagram: `sequenceDiagram
  participant U as 👤 User
  participant C as 📱 Client App
  participant A as 🔐 Auth Server
  participant R as 🗄️ Resource Server
  
  rect rgb(240, 248, 255)
    Note over U,C: Authorization Request
    U->>+C: Click "Login with Google"
    C->>A: Redirect to /authorize
    A->>U: Show login form
    U->>A: Enter credentials
  end
  
  rect rgb(240, 255, 240)
    Note over A,C: Token Exchange
    A->>C: Authorization code
    C->>+A: Exchange code + client_secret
    A->>-C: Access token + Refresh token
  end
  
  rect rgb(255, 248, 240)
    Note over C,R: API Access
    C->>+R: Request + Bearer token
    R->>R: Validate token
    R->>-C: Protected resource
  end`,
      diagramType: "sequence",
      confidence: "high"
    }
  },
  {
    input: { question: "Explain microservices architecture", tags: ["architecture", "distributed-systems"] },
    output: {
      diagram: `flowchart TB
  subgraph Gateway["🚪 API Gateway"]
    GW[("🔀 Load Balancer")]
  end
  
  subgraph Services["⚙️ Microservices"]
    direction LR
    US[("👤 User Service")]
    OS[("📦 Order Service")]
    PS[("💳 Payment Service")]
    NS[("📧 Notification")]
  end
  
  subgraph Data["💾 Data Layer"]
    direction LR
    DB1[("🗄️ Users DB")]
    DB2[("🗄️ Orders DB")]
    MQ[("📨 Message Queue")]
    CACHE[("⚡ Redis Cache")]
  end
  
  GW -->|"REST/gRPC"| US
  GW -->|"REST/gRPC"| OS
  GW -->|"REST/gRPC"| PS
  
  US --> DB1
  US --> CACHE
  OS --> DB2
  OS -->|"publish"| MQ
  PS -->|"subscribe"| MQ
  NS -->|"subscribe"| MQ
  
  style GW fill:#bbdefb,stroke:#1976d2
  style US fill:#c8e6c9,stroke:#388e3c
  style OS fill:#fff9c4,stroke:#fbc02d
  style PS fill:#ffccbc,stroke:#e64a19
  style NS fill:#e1bee7,stroke:#7b1fa2
  style MQ fill:#b2ebf2,stroke:#00838f`,
      diagramType: "flowchart",
      confidence: "high"
    }
  }
];

export const badExamples = [
  'A[Start] --> B[End]',
  'A[Input] --> B[Process] --> C[Output]',
  'A[Step 1] --> B[Step 2] --> C[Step 3]',
  'A[Concept] --> B[Implementation]',
  'Plain diagrams without any styling or colors',
  'Generic labels without context'
];

// Use centralized guidelines from config
export const guidelines = [
  `Create a diagram with ${config.qualityThresholds.diagram.minNodes}-10 specific nodes`,
  ...config.guidelines.diagram,
  'DO NOT create trivial diagrams like "Start -> End"',
  'DO NOT use generic labels like "Step 1", "Concept", "Implementation"',
  'ALWAYS add visual styling with colors and shapes'
];

export function build(context) {
  const { question, answer, tags } = context;
  
  return `${buildSystemContext('diagram')}

Create a VIBRANT, visually appealing Mermaid diagram for this interview question.

Question: "${question}"
Answer: "${(answer || '').substring(0, 300)}"
Tags: ${(tags || []).slice(0, 4).join(', ') || 'technical'}

CRITICAL REQUIREMENTS:
${guidelines.map(g => `- ${g}`).join('\n')}

STYLING REQUIREMENTS (MANDATORY):
- Use subgraphs to group related components with descriptive titles
- Add emojis in node labels (🔒 🌐 💾 📦 ⚙️ 🔄 ✅ 📨 etc.)
- Use different node shapes: [] rounded, ([]) stadium, [()] cylinder for DBs, {} diamond for decisions
- Add style lines with colors: style NodeId fill:#color,stroke:#color
- For sequence diagrams: use rect rgb() blocks to highlight phases
- Use descriptive edge labels with action verbs

COLOR PALETTE TO USE:
- Blue (#bbdefb, #1976d2) - networking, APIs, gateways
- Green (#c8e6c9, #388e3c) - success, validation, databases
- Orange (#fff9c4, #fbc02d) - processing, services
- Red (#ffccbc, #e64a19) - errors, security, payments
- Purple (#e1bee7, #7b1fa2) - notifications, async
- Cyan (#b2ebf2, #00838f) - caching, queues

EXAMPLES OF BAD DIAGRAMS (DO NOT CREATE):
${badExamples.map(e => `- ${e}`).join('\n')}

${qualityRules.technical}

Output this exact JSON structure:
${JSON.stringify(schema, null, 2)}

${jsonOutputRule}`;
}

export default { schema, examples, badExamples, guidelines, build };
