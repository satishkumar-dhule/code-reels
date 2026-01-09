/**
 * LinkedIn Story Generation Template
 * Creates engaging story-style posts for LinkedIn with proper formatting
 * Prioritizes recent technology updates, tools, and patterns
 */

// Simple schema format expected by validator: { fieldName: 'type' }
export const schema = {
  story: 'string'
};

// Recent tech trends to prioritize (updated regularly)
const RECENT_TECH_TRENDS = [
  // AI/ML (2024-2025)
  { keyword: 'ai', trend: 'AI agents, RAG patterns, LangGraph, Claude 3.5, GPT-4o, Gemini 2.0' },
  { keyword: 'llm', trend: 'Fine-tuning, prompt engineering, AI coding assistants, Cursor, Copilot' },
  { keyword: 'ml', trend: 'MLOps maturity, feature stores, model monitoring, LLMOps' },
  
  // Cloud & Infrastructure
  { keyword: 'kubernetes', trend: 'Gateway API GA, Karpenter, cilium, eBPF networking' },
  { keyword: 'aws', trend: 'Bedrock agents, Aurora Limitless, EKS Auto Mode' },
  { keyword: 'terraform', trend: 'OpenTofu adoption, Terraform stacks, CDK for Terraform' },
  { keyword: 'docker', trend: 'Docker Build Cloud, Wasm support, Docker Scout' },
  
  // Languages & Frameworks
  { keyword: 'react', trend: 'React 19, Server Components, React Compiler' },
  { keyword: 'node', trend: 'Node.js 22, native TypeScript support, built-in test runner' },
  { keyword: 'python', trend: 'Python 3.13, free-threading, JIT compiler' },
  { keyword: 'rust', trend: 'Rust in Linux kernel, async improvements, embedded growth' },
  { keyword: 'typescript', trend: 'TypeScript 5.5+, isolated declarations, config improvements' },
  
  // Databases
  { keyword: 'database', trend: 'Vector databases, pgvector, Turso, PlanetScale, Neon' },
  { keyword: 'postgres', trend: 'PostgreSQL 17, pgvector for AI, logical replication improvements' },
  
  // DevOps & Platform
  { keyword: 'devops', trend: 'Platform engineering, Internal Developer Platforms, Backstage' },
  { keyword: 'observability', trend: 'OpenTelemetry maturity, eBPF tracing, AI-powered observability' },
  { keyword: 'security', trend: 'Zero trust, SBOM requirements, supply chain security' },
  
  // Architecture
  { keyword: 'microservice', trend: 'Service mesh simplification, modular monoliths comeback' },
  { keyword: 'system-design', trend: 'Event-driven architecture, CQRS patterns, edge computing' },
  { keyword: 'api', trend: 'GraphQL federation, tRPC, API-first design' }
];

export function build(context) {
  const { title, excerpt, channel, tags: rawTags } = context;
  
  // Parse tags if it's a string
  let tags = rawTags;
  if (typeof tags === 'string') {
    try {
      tags = JSON.parse(tags);
    } catch {
      tags = tags.includes(',') ? tags.split(',').map(t => t.trim()) : [tags];
    }
  }
  tags = Array.isArray(tags) ? tags : [];
  
  // Find relevant recent trends
  const contentText = `${title} ${excerpt} ${channel} ${tags.join(' ')}`.toLowerCase();
  const relevantTrends = RECENT_TECH_TRENDS.filter(t => contentText.includes(t.keyword));
  
  const trendContext = relevantTrends.length > 0 
    ? `\nRECENT TECH CONTEXT (mention if relevant):
${relevantTrends.map(t => `- ${t.keyword.toUpperCase()}: ${t.trend}`).join('\n')}`
    : '';

  return `Create an ENGAGING LinkedIn post for a technical blog article.

Article Title: ${title}
Topic/Channel: ${channel || 'tech'}
Summary: ${excerpt || 'Technical interview preparation content'}
${trendContext}

═══════════════════════════════════════════════════════════════
CRITICAL: LINKEDIN FORMATTING RULES
═══════════════════════════════════════════════════════════════

LinkedIn renders posts as plain text. To create visual structure:

1. USE BLANK LINES to separate paragraphs (\\n\\n)
2. USE BULLET POINTS with emojis at line start
3. KEEP PARAGRAPHS SHORT (2-3 sentences max)
4. USE LINE BREAKS between distinct ideas

═══════════════════════════════════════════════════════════════
REQUIRED POST STRUCTURE (follow this EXACTLY)
═══════════════════════════════════════════════════════════════

SECTION 1 - HOOK (1-2 lines)
Start with an attention-grabbing hook. Examples:
• "It was 3am when the pager went off..."
• "Everyone says X. They're wrong."
• "This single change reduced latency by 90%."

SECTION 2 - CONTEXT (2-3 lines, separated by blank line)
Brief explanation of the problem or situation.

SECTION 3 - KEY INSIGHTS (3-5 bullet points)
Use emoji bullets for each point:
• 🔍 First insight
• ⚡ Second insight  
• 🎯 Third insight

SECTION 4 - TAKEAWAY (1-2 lines)
End with actionable insight or curiosity gap.

═══════════════════════════════════════════════════════════════
EXAMPLE OUTPUT FORMAT
═══════════════════════════════════════════════════════════════

It was 3am when the pager went off: OOM errors everywhere.

Memory metrics looked fine. CPU was stable. But containers kept dying.

The root cause? Hidden memory pressure in cgroups that standard monitoring misses.

Here's what we learned:

🔍 Memory limits ≠ actual memory available
⚡ Kernel memory accounting is often overlooked
🎯 Per-container metrics are essential, not optional
🛡️ Proactive reservations beat reactive scaling

The fix wasn't more memory—it was better visibility.

═══════════════════════════════════════════════════════════════
FORMATTING RULES
═══════════════════════════════════════════════════════════════

✅ DO:
- Use \\n\\n (double newline) between paragraphs
- Start bullet points with emoji + space
- Keep each bullet on its own line
- Use 4-6 emojis total (🔍 ⚡ 🎯 🛡️ 💡 🚀 ✅ ❌ 📈)
- Total length: 500-800 characters

❌ DON'T:
- Write wall-of-text paragraphs
- Use ASCII art or box characters
- Include hashtags (added separately)
- Include URLs (added separately)
- Use markdown formatting (**, ##, etc.)

═══════════════════════════════════════════════════════════════
OUTPUT
═══════════════════════════════════════════════════════════════

Output ONLY valid JSON with the story field containing properly formatted text:

{
  "story": "Hook line here.\\n\\nContext paragraph here.\\n\\nKey insights:\\n\\n🔍 Point one\\n⚡ Point two\\n🎯 Point three\\n\\nTakeaway line here."
}

IMPORTANT: Use \\n for line breaks and \\n\\n for paragraph breaks in the JSON string.`;
}

export default { schema, build };
