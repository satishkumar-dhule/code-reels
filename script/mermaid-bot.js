import {
  saveQuestion,
  runWithCircuitBreaker,
  parseJson,
  writeGitHubOutput,
  getQuestionsNeedingDiagrams,
  postBotCommentToDiscussion,
  BaseBotRunner
} from './utils.js';

// Validate mermaid diagram syntax and quality
function isValidMermaidSyntax(diagram) {
  if (!diagram || diagram.length < 20) return false;
  
  const validTypes = [
    /^(graph|flowchart)\s+(TD|TB|BT|RL|LR)/i,
    /^sequenceDiagram/i,
    /^classDiagram/i,
    /^stateDiagram/i,
    /^erDiagram/i,
    /^gantt/i,
    /^pie/i,
    /^mindmap/i
  ];
  
  const trimmed = diagram.trim();
  return validTypes.some(pattern => pattern.test(trimmed));
}

// Check if diagram is trivial/placeholder
function isTrivialDiagram(diagram) {
  if (!diagram) return true;
  
  const trimmed = diagram.trim().toLowerCase();
  const lines = trimmed.split('\n').filter(line => {
    const l = line.trim();
    return l && !l.startsWith('%%') && 
           !l.startsWith('graph') && !l.startsWith('flowchart') &&
           !l.startsWith('sequencediagram') && !l.startsWith('classdiagram');
  });
  
  if (lines.length < 4) return true;
  
  const content = lines.join(' ');
  if (content.includes('start') && content.includes('end') && lines.length <= 3) {
    return true;
  }
  
  const placeholderPatterns = [
    /\bstart\b.*\bend\b/i,
    /\bbegin\b.*\bfinish\b/i,
    /\bstep\s*1\b.*\bstep\s*2\b.*\bstep\s*3\b/i,
    /\bconcept\b.*\bimplementation\b/i,
    /\binput\b.*\boutput\b/i,
  ];
  
  const nodeCount = (diagram.match(/\[.*?\]|\(.*?\)|{.*?}|>.*?]/g) || []).length;
  if (nodeCount <= 3 && placeholderPatterns.some(p => p.test(content))) {
    return true;
  }
  
  return false;
}

/**
 * Mermaid Bot - Refactored to use BaseBotRunner
 * Generates and improves Mermaid diagrams for questions
 */
class MermaidBot extends BaseBotRunner {
  constructor() {
    super('mermaid-bot', {
      workQueueBotType: 'mermaid',
      rateLimitMs: 2000,
      defaultBatchSize: '100'
    });
    this.diagramsAdded = 0;
    this.diagramsImproved = 0;
  }

  getEmoji() { return '🎨'; }
  getDisplayName() { return 'Visualizer Bot - Drawing It Out'; }

  getDefaultState() {
    return {
      lastProcessedIndex: 0,
      lastRunDate: null,
      totalProcessed: 0,
      totalDiagramsAdded: 0,
      totalDiagramsImproved: 0
    };
  }

  // Check if diagram needs work
  needsProcessing(question) {
    const diagram = question.diagram;
    
    if (!diagram || diagram.length < 20) return { needs: true, reason: 'missing' };
    if (!isValidMermaidSyntax(diagram)) return { needs: true, reason: 'invalid_syntax' };
    if (isTrivialDiagram(diagram)) return { needs: true, reason: 'trivial_placeholder' };
    
    const nodeCount = (diagram.match(/\[.*?\]|\(.*?\)|{.*?}|>.*?]/g) || []).length;
    if (nodeCount < 4) return { needs: true, reason: 'too_simple' };
    
    if (diagram.includes('Concept') && diagram.includes('Implementation') && nodeCount <= 3) {
      return { needs: true, reason: 'placeholder' };
    }
    
    return { needs: false, reason: 'valid' };
  }

  // Generate improved mermaid diagram using AI
  async generateDiagram(question) {
    const prompt = `You are a JSON generator. Output ONLY valid JSON, no explanations, no markdown, no text before or after.

Create a detailed, meaningful Mermaid diagram for this interview question.

Question: "${question.question}"
Answer: "${question.answer?.substring(0, 300) || ''}"
Tags: ${question.tags?.slice(0, 4).join(', ') || 'technical'}

CRITICAL REQUIREMENTS:
1. The diagram MUST have at least 5-8 meaningful nodes with descriptive labels
2. DO NOT create trivial diagrams like "Start -> End" or "Input -> Process -> Output"
3. DO NOT use generic labels like "Step 1", "Step 2", "Concept", "Implementation"
4. Each node should have a specific, descriptive label related to the actual content
5. Show the actual technical flow, architecture, or process being discussed
6. Include decision points, loops, or parallel paths where appropriate
7. Use proper Mermaid syntax with flowchart TD or appropriate diagram type

EXAMPLES OF BAD DIAGRAMS (DO NOT CREATE):
- A[Start] --> B[End]
- A[Input] --> B[Process] --> C[Output]
- A[Step 1] --> B[Step 2] --> C[Step 3]

EXAMPLES OF GOOD DIAGRAMS:
- For "How does DNS work?": Show Client, Resolver, Root Server, TLD Server, Authoritative Server with actual query flow
- For "Explain OAuth flow": Show User, Client App, Auth Server, Resource Server with token exchange steps
- For "Database indexing": Show Query, Index Lookup, B-Tree traversal, Data Page retrieval

Output this exact JSON structure:
{"diagram":"flowchart TD\\n  A[Specific Label] --> B[Another Specific Label]\\n  B --> C{Decision Point}\\n  C -->|Yes| D[Action 1]\\n  C -->|No| E[Action 2]","diagramType":"flowchart|sequence|class|state","confidence":"high|medium|low"}

IMPORTANT: Return ONLY the JSON object. No other text. The diagram must be meaningful and specific to the question.`;

    const response = await runWithCircuitBreaker(prompt);
    if (!response) return null;
    
    const data = parseJson(response);
    if (!data || !data.diagram) return null;
    
    if (!isValidMermaidSyntax(data.diagram)) {
      console.log('  ⚠️ Generated diagram has invalid syntax');
      return null;
    }
    
    if (isTrivialDiagram(data.diagram)) {
      console.log('  ⚠️ Generated diagram is too trivial/generic');
      return null;
    }
    
    return data;
  }

  // Process a single question
  async processItem(question) {
    const check = this.needsProcessing(question);
    console.log(`🔧 Generating new diagram (reason: ${check.reason})...`);
    
    const generated = await this.generateDiagram(question);
    
    if (!generated) {
      console.log('❌ Failed to generate diagram');
      return false;
    }
    
    console.log(`✅ Generated ${generated.diagramType || 'flowchart'} diagram (confidence: ${generated.confidence})`);
    
    const wasEmpty = !question.diagram || question.diagram.length < 20;
    const oldDiagram = question.diagram;
    
    question.diagram = generated.diagram;
    question.lastUpdated = new Date().toISOString();
    
    await saveQuestion(question);
    console.log('💾 Saved to database');
    
    // Track stats
    if (wasEmpty) {
      this.diagramsAdded++;
    } else {
      this.diagramsImproved++;
    }
    
    // Post comment to Giscus discussion
    await postBotCommentToDiscussion(question.id, 'Mermaid Bot', wasEmpty ? 'diagram_added' : 'diagram_updated', {
      summary: wasEmpty ? 'Added new diagram visualization' : 'Improved existing diagram',
      changes: [
        `Diagram type: ${generated.diagramType || 'flowchart'}`,
        `Confidence: ${generated.confidence}`,
        wasEmpty ? 'Created new diagram from scratch' : `Replaced ${check.reason} diagram`
      ],
      before: oldDiagram || '(no diagram)',
      after: generated.diagram
    });
    
    return true;
  }

  // Custom summary
  printSummary(state) {
    console.log('\n\n=== SUMMARY ===');
    console.log(`Processed: ${this.results.processed}`);
    console.log(`Diagrams Added: ${this.diagramsAdded}`);
    console.log(`Diagrams Improved: ${this.diagramsImproved}`);
    console.log(`Skipped (valid): ${this.results.skipped}`);
    console.log(`Failed: ${this.results.failed}`);
    if (state.lastProcessedIndex !== undefined) {
      console.log(`\nNext run starts at: ${state.lastProcessedIndex}`);
    }
    console.log(`All-time diagrams: ${(state.totalDiagramsAdded || 0) + (state.totalDiagramsImproved || 0)}`);
    console.log('=== END ===\n');
  }
}

// Main execution
async function main() {
  const bot = new MermaidBot();
  
  await bot.run({
    // Use targeted query for questions needing diagrams
    fallbackQuery: getQuestionsNeedingDiagrams
  });
}

main().catch(e => {
  console.error('Fatal:', e);
  writeGitHubOutput({ error: e.message, processed: 0 });
  process.exit(1);
});
