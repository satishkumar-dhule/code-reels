/**
 * Mermaid Bot - Using the new AI Framework
 * Generates and improves Mermaid diagrams for questions
 */

import ai from './ai/index.js';
import {
  saveQuestion,
  writeGitHubOutput,
  getQuestionsNeedingDiagrams,
  postBotCommentToDiscussion,
  BaseBotRunner
} from './utils.js';

// Validate mermaid diagram syntax
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
  
  return validTypes.some(pattern => pattern.test(diagram.trim()));
}

// Check if diagram is trivial/placeholder
function isTrivialDiagram(diagram) {
  if (!diagram) return true;
  
  const lines = diagram.trim().toLowerCase().split('\n').filter(line => {
    const l = line.trim();
    return l && !l.startsWith('%%') && 
           !l.startsWith('graph') && !l.startsWith('flowchart') &&
           !l.startsWith('sequencediagram') && !l.startsWith('classdiagram');
  });
  
  if (lines.length < 4) return true;
  
  const content = lines.join(' ');
  const trivialPatterns = [
    /\bstart\b.*\bend\b/i,
    /\bstep\s*1\b.*\bstep\s*2\b.*\bstep\s*3\b/i,
    /\bconcept\b.*\bimplementation\b/i,
    /\binput\b.*\boutput\b/i
  ];
  
  const nodeCount = (diagram.match(/\[.*?\]|\(.*?\)|{.*?}/g) || []).length;
  return nodeCount <= 3 && trivialPatterns.some(p => p.test(content));
}

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

  needsProcessing(question) {
    const diagram = question.diagram;
    
    if (!diagram || diagram.length < 20) return { needs: true, reason: 'missing' };
    if (!isValidMermaidSyntax(diagram)) return { needs: true, reason: 'invalid_syntax' };
    if (isTrivialDiagram(diagram)) return { needs: true, reason: 'trivial_placeholder' };
    
    const nodeCount = (diagram.match(/\[.*?\]|\(.*?\)|{.*?}/g) || []).length;
    if (nodeCount < 4) return { needs: true, reason: 'too_simple' };
    
    return { needs: false, reason: 'valid' };
  }

  async processItem(question) {
    const check = this.needsProcessing(question);
    console.log(`🔧 Generating new diagram (reason: ${check.reason})...`);
    
    try {
      // Use the new AI framework
      const result = await ai.run('diagram', {
        question: question.question,
        answer: question.answer,
        tags: question.tags
      });
      
      if (!result || !result.diagram) {
        console.log('❌ Failed to generate diagram');
        return false;
      }
      
      // Additional validation
      if (!isValidMermaidSyntax(result.diagram)) {
        console.log('⚠️ Generated diagram has invalid syntax');
        return false;
      }
      
      if (isTrivialDiagram(result.diagram)) {
        console.log('⚠️ Generated diagram is too trivial');
        return false;
      }
      
      console.log(`✅ Generated ${result.diagramType || 'flowchart'} diagram (confidence: ${result.confidence})`);
      
      const wasEmpty = !question.diagram || question.diagram.length < 20;
      const oldDiagram = question.diagram;
      
      question.diagram = result.diagram;
      question.lastUpdated = new Date().toISOString();
      
      await saveQuestion(question);
      console.log('💾 Saved to database');
      
      if (wasEmpty) {
        this.diagramsAdded++;
      } else {
        this.diagramsImproved++;
      }
      
      await postBotCommentToDiscussion(question.id, 'Mermaid Bot', wasEmpty ? 'diagram_added' : 'diagram_updated', {
        summary: wasEmpty ? 'Added new diagram visualization' : 'Improved existing diagram',
        changes: [
          `Diagram type: ${result.diagramType || 'flowchart'}`,
          `Confidence: ${result.confidence}`,
          wasEmpty ? 'Created new diagram' : `Replaced ${check.reason} diagram`
        ],
        before: oldDiagram || '(no diagram)',
        after: result.diagram
      });
      
      return true;
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      return false;
    }
  }

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
    console.log('=== END ===\n');
    
    // Print AI metrics
    ai.printMetrics();
  }
}

async function main() {
  const bot = new MermaidBot();
  await bot.run({ fallbackQuery: getQuestionsNeedingDiagrams });
}

main().catch(e => {
  console.error('Fatal:', e);
  writeGitHubOutput({ error: e.message, processed: 0 });
  process.exit(1);
});
