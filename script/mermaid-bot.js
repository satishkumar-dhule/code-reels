import {
  saveQuestion,
  getAllUnifiedQuestions,
  runWithRetries,
  parseJson,
  writeGitHubOutput,
  dbClient,
  getQuestionsNeedingDiagrams,
  getPendingWork,
  startWorkItem,
  completeWorkItem,
  failWorkItem,
  initWorkQueue
} from './utils.js';

const USE_WORK_QUEUE = process.env.USE_WORK_QUEUE !== 'false'; // Default to true

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100', 10);
const RATE_LIMIT_MS = 2000; // NFR: Rate limiting between API calls

// Load bot state from database
async function loadState() {
  try {
    const result = await dbClient.execute({
      sql: "SELECT value FROM bot_state WHERE bot_name = ?",
      args: ['mermaid-bot']
    });
    if (result.rows.length > 0) {
      return JSON.parse(result.rows[0].value);
    }
  } catch (e) {
    // Table might not exist yet
  }
  return {
    lastProcessedIndex: 0,
    lastRunDate: null,
    totalProcessed: 0,
    totalDiagramsAdded: 0,
    totalDiagramsImproved: 0
  };
}

// Save bot state to database
async function saveState(state) {
  state.lastRunDate = new Date().toISOString();
  try {
    // Create table if not exists
    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS bot_state (
        bot_name TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT
      )
    `);
    await dbClient.execute({
      sql: "INSERT OR REPLACE INTO bot_state (bot_name, value, updated_at) VALUES (?, ?, ?)",
      args: ['mermaid-bot', JSON.stringify(state), new Date().toISOString()]
    });
  } catch (e) {
    console.error('Failed to save state:', e.message);
  }
}

// NFR: Validate mermaid diagram syntax and quality
function isValidMermaidSyntax(diagram) {
  if (!diagram || diagram.length < 20) return false;
  
  // Check for valid mermaid diagram types
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

// NFR: Check if diagram is trivial/placeholder (should be rejected)
function isTrivialDiagram(diagram) {
  if (!diagram) return true;
  
  const trimmed = diagram.trim().toLowerCase();
  const lines = trimmed.split('\n').filter(line => {
    const l = line.trim();
    // Skip empty lines, comments, and diagram type declarations
    return l && !l.startsWith('%%') && 
           !l.startsWith('graph') && !l.startsWith('flowchart') &&
           !l.startsWith('sequencediagram') && !l.startsWith('classdiagram');
  });
  
  // Must have at least 4 meaningful lines
  if (lines.length < 4) return true;
  
  // Check for trivial "Start -> End" patterns
  const content = lines.join(' ');
  if (content.includes('start') && content.includes('end') && lines.length <= 3) {
    return true;
  }
  
  // Check for generic placeholder patterns
  const placeholderPatterns = [
    /\bstart\b.*\bend\b/i,
    /\bbegin\b.*\bfinish\b/i,
    /\bstep\s*1\b.*\bstep\s*2\b.*\bstep\s*3\b/i,
    /\bconcept\b.*\bimplementation\b/i,
    /\binput\b.*\boutput\b/i,
  ];
  
  // If matches placeholder pattern AND has few nodes, it's trivial
  const nodeCount = (diagram.match(/\[.*?\]|\(.*?\)|{.*?}|>.*?]/g) || []).length;
  if (nodeCount <= 3 && placeholderPatterns.some(p => p.test(content))) {
    return true;
  }
  
  return false;
}

// Check if diagram needs improvement
function needsDiagramWork(question) {
  const diagram = question.diagram;
  
  // No diagram at all
  if (!diagram || diagram.length < 20) return { needs: true, reason: 'missing' };
  
  // Invalid syntax
  if (!isValidMermaidSyntax(diagram)) return { needs: true, reason: 'invalid_syntax' };
  
  // Trivial/placeholder diagram
  if (isTrivialDiagram(diagram)) return { needs: true, reason: 'trivial_placeholder' };
  
  // Too simple (less than 4 nodes)
  const nodeCount = (diagram.match(/\[.*?\]|\(.*?\)|{.*?}|>.*?]/g) || []).length;
  if (nodeCount < 4) return { needs: true, reason: 'too_simple' };
  
  // Generic placeholder diagram
  if (diagram.includes('Concept') && diagram.includes('Implementation') && nodeCount <= 3) {
    return { needs: true, reason: 'placeholder' };
  }
  
  return { needs: false, reason: 'valid' };
}

// Generate improved mermaid diagram using AI
async function generateDiagram(question) {
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

  const response = await runWithRetries(prompt);
  if (!response) return null;
  
  const data = parseJson(response);
  if (!data || !data.diagram) return null;
  
  // NFR: Validate the generated diagram
  if (!isValidMermaidSyntax(data.diagram)) {
    console.log('  ⚠️ Generated diagram has invalid syntax');
    return null;
  }
  
  // NFR: Reject trivial diagrams
  if (isTrivialDiagram(data.diagram)) {
    console.log('  ⚠️ Generated diagram is too trivial/generic');
    return null;
  }
  
  return data;
}

// NFR: Rate limiting helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== 🎨 Visualizer Bot - Drawing It Out ===\n');
  
  await initWorkQueue();
  
  const state = await loadState();
  const allQuestions = await getAllUnifiedQuestions();
  
  console.log(`📊 Database: ${allQuestions.length} questions`);
  console.log(`📍 Last processed index: ${state.lastProcessedIndex}`);
  console.log(`📅 Last run: ${state.lastRunDate || 'Never'}`);
  console.log(`⚙️ Batch size: ${BATCH_SIZE}\n`);
  
  let batch = [];
  let workItems = [];
  let startIndex = state.lastProcessedIndex;
  let endIndex;
  let totalQuestionsCount = allQuestions.length;
  let usingPrioritized = false;
  let usingWorkQueue = false;
  
  // First try work queue
  if (USE_WORK_QUEUE) {
    console.log('📋 Checking work queue for mermaid tasks...');
    workItems = await getPendingWork('mermaid', BATCH_SIZE);
    if (workItems.length > 0) {
      batch = workItems.map(w => ({ ...w.question, workId: w.workId, workReason: w.reason }));
      endIndex = startIndex + batch.length;
      usingWorkQueue = true;
      console.log(`📦 Found ${batch.length} mermaid tasks in work queue\n`);
    }
  }
  
  // Sort all questions for sequential processing (used as fallback)
  const sortedQuestions = [...allQuestions].sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
    return numA - numB;
  });
  
  // Fallback to prioritized query if no work queue items
  if (batch.length === 0) {
    console.log('🔍 Querying database for questions needing diagrams...');
    const prioritizedQuestions = await getQuestionsNeedingDiagrams(BATCH_SIZE * 3);
    
    if (prioritizedQuestions.length > 0) {
      console.log(`✅ Found ${prioritizedQuestions.length} questions needing diagrams (prioritized)`);
      batch = prioritizedQuestions.slice(0, BATCH_SIZE);
      endIndex = startIndex + batch.length;
      usingPrioritized = true;
      console.log(`📦 Processing ${batch.length} prioritized questions\n`);
    } else {
      // Fall back to sequential processing if no prioritized questions
      console.log('ℹ️ No prioritized questions found, using sequential processing');
      
      totalQuestionsCount = sortedQuestions.length;
      
      if (startIndex >= sortedQuestions.length) {
        startIndex = 0;
        console.log('🔄 Wrapped around to beginning\n');
      }
      
      endIndex = Math.min(startIndex + BATCH_SIZE, sortedQuestions.length);
      batch = sortedQuestions.slice(startIndex, endIndex);
      console.log(`📦 Processing: questions ${startIndex + 1} to ${endIndex} of ${sortedQuestions.length}\n`);
    }
  }
  
  // Build a map from allQuestions for quick lookup (reuse already fetched data)
  const questionsMap = {};
  allQuestions.forEach(q => { questionsMap[q.id] = q; });
  
  const results = {
    processed: 0,
    diagramsAdded: 0,
    diagramsImproved: 0,
    skipped: 0,
    failed: 0
  };
  
  for (let i = 0; i < batch.length; i++) {
    const question = batch[i];
    const workId = question.workId; // From work queue if applicable
    
    console.log(`\n--- [${i + 1}/${batch.length}] ${question.id} ---`);
    console.log(`Q: ${question.question.substring(0, 50)}...`);
    if (workId) console.log(`Work ID: ${workId} (${question.workReason})`);
    
    // Mark work as started
    if (workId) await startWorkItem(workId);
    
    const check = needsDiagramWork(question);
    console.log(`Status: ${check.reason}`);
    
    if (!check.needs) {
      console.log('✅ Diagram is good, skipping');
      if (workId) await completeWorkItem(workId, { status: 'already_valid' });
      results.skipped++;
      results.processed++;
      
      // NFR: Update state after each question
      if (!usingWorkQueue) {
        await saveState({
          ...state,
          lastProcessedIndex: startIndex + i + 1,
          totalProcessed: state.totalProcessed + results.processed
        });
      }
      continue;
    }
    
    console.log(`🔧 Generating new diagram (reason: ${check.reason})...`);
    
    // NFR: Rate limiting
    if (i > 0) await sleep(RATE_LIMIT_MS);
    
    const generated = await generateDiagram(question);
    
    if (!generated) {
      console.log('❌ Failed to generate diagram');
      if (workId) await failWorkItem(workId, 'Failed to generate diagram');
      results.failed++;
      results.processed++;
      
      if (!usingWorkQueue) {
        await saveState({
          ...state,
          lastProcessedIndex: startIndex + i + 1,
          totalProcessed: state.totalProcessed + results.processed
        });
      }
      continue;
    }
    
    console.log(`✅ Generated ${generated.diagramType || 'flowchart'} diagram (confidence: ${generated.confidence})`);
    
    // Update question
    const wasEmpty = !question.diagram || question.diagram.length < 20;
    const updatedQuestion = {
      ...questionsMap[question.id],
      diagram: generated.diagram,
      lastUpdated: new Date().toISOString()
    };
    questionsMap[question.id] = updatedQuestion;
    
    // NFR: Save immediately after each update
    await saveQuestion(updatedQuestion);
    console.log('💾 Saved to database');
    
    // Mark work as completed
    if (workId) await completeWorkItem(workId, { 
      action: wasEmpty ? 'added' : 'improved',
      diagramType: generated.diagramType 
    });
    
    if (wasEmpty) {
      results.diagramsAdded++;
    } else {
      results.diagramsImproved++;
    }
    
    results.processed++;
    
    // NFR: Update state after each question (only for non-work-queue mode)
    if (!usingWorkQueue) {
      await saveState({
        ...state,
        lastProcessedIndex: startIndex + i + 1,
        totalProcessed: state.totalProcessed + results.processed,
        totalDiagramsAdded: state.totalDiagramsAdded + results.diagramsAdded,
        totalDiagramsImproved: state.totalDiagramsImproved + results.diagramsImproved
      });
    }
  }
  
  const newState = {
    lastProcessedIndex: usingPrioritized ? state.lastProcessedIndex : (endIndex >= totalQuestionsCount ? 0 : endIndex),
    lastRunDate: new Date().toISOString(),
    totalProcessed: state.totalProcessed + results.processed,
    totalDiagramsAdded: state.totalDiagramsAdded + results.diagramsAdded,
    totalDiagramsImproved: state.totalDiagramsImproved + results.diagramsImproved
  };
  await saveState(newState);
  
  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`Processed: ${results.processed}`);
  console.log(`Diagrams Added: ${results.diagramsAdded}`);
  console.log(`Diagrams Improved: ${results.diagramsImproved}`);
  console.log(`Skipped (valid): ${results.skipped}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`\nNext run starts at: ${newState.lastProcessedIndex}`);
  console.log(`All-time diagrams: ${newState.totalDiagramsAdded + newState.totalDiagramsImproved}`);
  console.log('=== END ===\n');
  
  writeGitHubOutput({
    processed: results.processed,
    diagrams_added: results.diagramsAdded,
    diagrams_improved: results.diagramsImproved,
    skipped: results.skipped,
    failed: results.failed,
    next_index: newState.lastProcessedIndex
  });
}

main().catch(e => {
  console.error('Fatal:', e);
  writeGitHubOutput({ error: e.message, processed: 0 });
  process.exit(1);
});
