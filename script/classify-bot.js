import {
  getAllUnifiedQuestions,
  saveQuestion,
  runWithCircuitBreaker,
  parseJson,
  writeGitHubOutput,
  dbClient,
  addWorkItem,
  initWorkQueue,
  getWorkQueueStats
} from './utils.js';

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100', 10);
const RATE_LIMIT_MS = 2000;

// Channel structure for classification
const CHANNEL_STRUCTURE = {
  'system-design': ['infrastructure', 'distributed-systems', 'api-design', 'caching', 'load-balancing', 'message-queues'],
  'algorithms': ['data-structures', 'sorting', 'dynamic-programming', 'graphs', 'trees'],
  'frontend': ['react', 'javascript', 'css', 'performance', 'web-apis'],
  'backend': ['apis', 'microservices', 'caching', 'authentication', 'server-architecture'],
  'database': ['sql', 'nosql', 'indexing', 'transactions', 'query-optimization'],
  'devops': ['cicd', 'docker', 'automation', 'gitops'],
  'sre': ['observability', 'reliability', 'incident-management', 'chaos-engineering', 'capacity-planning'],
  'kubernetes': ['pods', 'services', 'deployments', 'helm', 'operators'],
  'aws': ['compute', 'storage', 'serverless', 'database', 'networking'],
  'terraform': ['basics', 'modules', 'state-management', 'best-practices'],
  'data-engineering': ['etl', 'data-pipelines', 'warehousing', 'streaming'],
  'machine-learning': ['algorithms', 'model-training', 'deployment', 'deep-learning', 'evaluation'],
  'generative-ai': ['llm-fundamentals', 'fine-tuning', 'rag', 'agents', 'evaluation'],
  'prompt-engineering': ['techniques', 'optimization', 'safety', 'structured-output'],
  'llm-ops': ['deployment', 'optimization', 'monitoring', 'infrastructure'],
  'computer-vision': ['image-classification', 'object-detection', 'segmentation', 'multimodal'],
  'nlp': ['text-processing', 'embeddings', 'sequence-models', 'transformers'],
  'python': ['fundamentals', 'libraries', 'best-practices', 'async'],
  'security': ['application-security', 'owasp', 'encryption', 'authentication'],
  'networking': ['tcp-ip', 'dns', 'load-balancing', 'cdn'],
  'operating-systems': ['processes', 'memory', 'file-systems', 'scheduling'],
  'linux': ['commands', 'shell-scripting', 'system-administration', 'networking'],
  'unix': ['fundamentals', 'commands', 'system-programming'],
  'ios': ['swift', 'uikit', 'swiftui', 'architecture'],
  'android': ['kotlin', 'jetpack-compose', 'architecture', 'lifecycle'],
  'react-native': ['components', 'native-modules', 'performance', 'architecture'],
  'testing': ['unit-testing', 'integration-testing', 'tdd', 'test-strategies'],
  'e2e-testing': ['playwright', 'cypress', 'selenium', 'visual-testing'],
  'api-testing': ['rest-testing', 'contract-testing', 'graphql-testing', 'mocking'],
  'performance-testing': ['load-testing', 'stress-testing', 'profiling', 'benchmarking'],
  'engineering-management': ['team-leadership', 'one-on-ones', 'hiring', 'project-management'],
  'behavioral': ['star-method', 'leadership-principles', 'soft-skills', 'conflict-resolution']
};

// Load bot state from database
async function loadState() {
  try {
    const result = await dbClient.execute({
      sql: "SELECT value FROM bot_state WHERE bot_name = ?",
      args: ['classify-bot']
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
    totalReclassified: 0,
    totalConfirmed: 0
  };
}

// Save bot state to database
async function saveState(state) {
  state.lastRunDate = new Date().toISOString();
  try {
    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS bot_state (
        bot_name TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT
      )
    `);
    await dbClient.execute({
      sql: "INSERT OR REPLACE INTO bot_state (bot_name, value, updated_at) VALUES (?, ?, ?)",
      args: ['classify-bot', JSON.stringify(state), new Date().toISOString()]
    });
  } catch (e) {
    console.error('Failed to save state:', e.message);
  }
}

// Check if question might need reclassification
function mightNeedReclassification(question) {
  // No channel assigned
  if (!question.channel) return true;
  
  // Channel not in our structure
  if (!CHANNEL_STRUCTURE[question.channel]) return true;
  
  // No subchannel or invalid subchannel
  if (!question.subChannel || !CHANNEL_STRUCTURE[question.channel]?.includes(question.subChannel)) return true;
  
  // Never been classified by AI (check lastRemapped field)
  if (!question.lastRemapped) return true;
  
  return false;
}

// Classify a question using AI - supports multiple channels
async function classifyQuestion(question) {
  const channelList = Object.entries(CHANNEL_STRUCTURE)
    .map(([ch, subs]) => `${ch}: [${subs.join(', ')}]`)
    .join('\n');

  const prompt = `You are a JSON generator. Output ONLY valid JSON, no explanations, no markdown, no text before or after.

Analyze this technical interview question and determine ALL relevant channel and subchannel classifications.
A question can belong to MULTIPLE channels if it spans different topics.

Question: "${question.question}"
Answer: "${(question.answer || '').substring(0, 200)}"
Tags: ${(question.tags || []).slice(0, 5).join(', ')}
Current Channel: ${question.channel || 'none'}
Current SubChannel: ${question.subChannel || 'none'}

Available channels and subchannels:
${channelList}

Rules:
1. Return the PRIMARY channel first (most relevant)
2. Include SECONDARY channels if the question genuinely spans multiple topics
3. Maximum 3 channels per question
4. Only add secondary channels if they are truly relevant (confidence > medium)

Output this exact JSON structure:
{"classifications":[{"channel":"channel-id","subChannel":"subchannel-id","isPrimary":true},{"channel":"secondary-channel","subChannel":"subchannel","isPrimary":false}],"confidence":"high|medium|low","reasoning":"brief explanation"}

IMPORTANT: Return ONLY the JSON object. No other text.`;

  const response = await runWithCircuitBreaker(prompt);
  if (!response) return null;
  
  const data = parseJson(response);
  if (!data || !data.classifications || !Array.isArray(data.classifications)) return null;
  
  // Validate and filter classifications
  const validClassifications = data.classifications.filter(c => {
    if (!CHANNEL_STRUCTURE[c.channel]) {
      console.log(`  ⚠️ Invalid channel suggested: ${c.channel}`);
      return false;
    }
    if (!CHANNEL_STRUCTURE[c.channel].includes(c.subChannel)) {
      // Use first subchannel as fallback
      c.subChannel = CHANNEL_STRUCTURE[c.channel][0];
    }
    return true;
  });
  
  if (validClassifications.length === 0) return null;
  
  // Ensure at least one is marked as primary
  if (!validClassifications.some(c => c.isPrimary)) {
    validClassifications[0].isPrimary = true;
  }
  
  return {
    classifications: validClassifications,
    confidence: data.confidence,
    reasoning: data.reasoning
  };
}

// Rate limiting helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check what work is needed for a question and create work items (OPTIMIZED: parallel creation)
async function createWorkItemsForQuestion(question) {
  const workItemPromises = [];
  const workTypes = [];
  
  // Check if needs videos
  const videos = question.videos || {};
  const hasShort = videos.shortVideo && videos.shortVideo.length > 10;
  const hasLong = videos.longVideo && videos.longVideo.length > 10;
  if (!hasShort || !hasLong) {
    workItemPromises.push(addWorkItem(question.id, 'video', `Missing ${!hasShort ? 'short' : ''}${!hasShort && !hasLong ? ' and ' : ''}${!hasLong ? 'long' : ''} video`, 'classify-bot', 5));
    workTypes.push('video');
  }
  
  // Check if needs diagram
  const diagram = question.diagram;
  if (!diagram || diagram.length < 20) {
    workItemPromises.push(addWorkItem(question.id, 'mermaid', 'Missing or short diagram', 'classify-bot', 4));
    workTypes.push('mermaid');
  }
  
  // Check if needs companies
  const companies = question.companies || [];
  if (!Array.isArray(companies) || companies.length < 3) {
    workItemPromises.push(addWorkItem(question.id, 'company', `Only ${companies.length || 0} companies`, 'classify-bot', 6));
    workTypes.push('company');
  }
  
  // Check if needs ELI5
  if (!question.eli5 || question.eli5.length < 50) {
    workItemPromises.push(addWorkItem(question.id, 'eli5', 'Missing ELI5 explanation', 'classify-bot', 7));
    workTypes.push('eli5');
  }
  
  // Check if needs TLDR
  if (!question.tldr || question.tldr.length < 20) {
    workItemPromises.push(addWorkItem(question.id, 'tldr', 'Missing TLDR summary', 'classify-bot', 8));
    workTypes.push('tldr');
  }
  
  // Check if needs general improvement (short answer/explanation)
  const needsImprove = 
    (!question.answer || question.answer.length < 20) ||
    (!question.explanation || question.explanation.length < 50);
  if (needsImprove) {
    workItemPromises.push(addWorkItem(question.id, 'improve', 'Short answer or explanation', 'classify-bot', 3));
    workTypes.push('improve');
  }
  
  // Execute all work item creations in parallel
  if (workItemPromises.length > 0) {
    await Promise.all(workItemPromises);
  }
  
  return workTypes;
}

async function main() {
  console.log('=== 🗂️ Sorter Bot - Organizing Into Channels ===\n');
  
  // Initialize work queue
  await initWorkQueue();
  
  const state = await loadState();
  const allQuestions = await getAllUnifiedQuestions();
  
  console.log(`📊 Database: ${allQuestions.length} questions`);
  console.log(`📍 Last processed index: ${state.lastProcessedIndex}`);
  console.log(`📅 Last run: ${state.lastRunDate || 'Never'}`);
  console.log(`⚙️ Batch size: ${BATCH_SIZE}\n`);
  
  // Sort questions by ID for consistent ordering
  const sortedQuestions = [...allQuestions].sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
    return numA - numB;
  });
  
  // Calculate start index (wrap around if needed)
  let startIndex = state.lastProcessedIndex;
  if (startIndex >= sortedQuestions.length) {
    startIndex = 0;
    console.log('🔄 Wrapped around to beginning\n');
  }
  
  const endIndex = Math.min(startIndex + BATCH_SIZE, sortedQuestions.length);
  const batch = sortedQuestions.slice(startIndex, endIndex);
  
  console.log(`📦 Processing: questions ${startIndex + 1} to ${endIndex} of ${sortedQuestions.length}\n`);
  
  const results = {
    processed: 0,
    reclassified: 0,
    confirmed: 0,
    skipped: 0,
    failed: 0
  };
  
  for (let i = 0; i < batch.length; i++) {
    const question = batch[i];
    
    console.log(`\n--- [${i + 1}/${batch.length}] ${question.id} ---`);
    console.log(`Q: ${question.question.substring(0, 60)}...`);
    console.log(`Current: ${question.channel}/${question.subChannel}`);
    
    // Check if needs classification
    const needsCheck = mightNeedReclassification(question);
    console.log(`Needs check: ${needsCheck ? 'Yes' : 'No (recently classified)'}`);
    
    if (!needsCheck) {
      console.log('✅ Skipping - recently classified');
      results.skipped++;
      results.processed++;
      continue;
    }
    
    // Rate limiting
    if (i > 0) await sleep(RATE_LIMIT_MS);
    
    console.log('🔍 Classifying with AI...');
    const classification = await classifyQuestion(question);
    
    if (!classification) {
      console.log('❌ Failed to classify');
      results.failed++;
      results.processed++;
      continue;
    }
    
    // Get primary classification
    const primary = classification.classifications.find(c => c.isPrimary) || classification.classifications[0];
    const secondary = classification.classifications.filter(c => !c.isPrimary);
    
    console.log(`AI Result: ${primary.channel}/${primary.subChannel} (${classification.confidence})`);
    if (secondary.length > 0) {
      console.log(`Secondary: ${secondary.map(s => `${s.channel}/${s.subChannel}`).join(', ')}`);
    }
    console.log(`Reasoning: ${classification.reasoning}`);
    
    // Check if primary changed
    const primaryChanged = primary.channel !== question.channel || 
                           primary.subChannel !== question.subChannel;
    
    // Get existing mappings to compare
    const existingMappings = await dbClient.execute({
      sql: 'SELECT channel_id, sub_channel FROM channel_mappings WHERE question_id = ?',
      args: [question.id]
    });
    const existingSet = new Set(existingMappings.rows.map(r => `${r.channel_id}/${r.sub_channel}`));
    const newSet = new Set(classification.classifications.map(c => `${c.channel}/${c.subChannel}`));
    
    // Check if mappings changed
    const mappingsChanged = existingSet.size !== newSet.size || 
                            [...existingSet].some(m => !newSet.has(m)) ||
                            [...newSet].some(m => !existingSet.has(m));
    
    const wasChanged = primaryChanged || mappingsChanged;
    
    if (wasChanged) {
      console.log(`📝 Reclassifying: ${question.channel}/${question.subChannel} → ${primary.channel}/${primary.subChannel}`);
      if (classification.classifications.length > 1) {
        console.log(`   + ${classification.classifications.length - 1} secondary channel(s)`);
      }
      
      // Update question with primary channel
      question.channel = primary.channel;
      question.subChannel = primary.subChannel;
      question.lastRemapped = new Date().toISOString();
      question.lastUpdated = new Date().toISOString();
      
      await saveQuestion(question);
      
      // Update channel mappings - delete old and insert all new
      await dbClient.execute({
        sql: 'DELETE FROM channel_mappings WHERE question_id = ?',
        args: [question.id]
      });
      
      // Insert all classifications (primary + secondary)
      for (const c of classification.classifications) {
        await dbClient.execute({
          sql: 'INSERT INTO channel_mappings (channel_id, sub_channel, question_id) VALUES (?, ?, ?)',
          args: [c.channel, c.subChannel, question.id]
        });
      }
      
      results.reclassified++;
      console.log(`💾 Saved to database (${classification.classifications.length} channel(s))`);
    } else {
      console.log('✅ Classification confirmed - no change needed');
      
      // Mark as classified even if no change
      question.lastRemapped = new Date().toISOString();
      await saveQuestion(question);
      
      results.confirmed++;
    }
    
    // Create work items for other bots if needed
    console.log('📋 Checking for additional work needed...');
    const workCreated = await createWorkItemsForQuestion(question);
    if (workCreated.length > 0) {
      console.log(`   Created ${workCreated.length} work items: ${workCreated.join(', ')}`);
    } else {
      console.log('   ✅ No additional work needed');
    }
    
    results.processed++;
    
    // Update state after each question
    await saveState({
      ...state,
      lastProcessedIndex: startIndex + i + 1,
      totalProcessed: state.totalProcessed + 1,
      totalReclassified: state.totalReclassified + (wasChanged ? 1 : 0),
      totalConfirmed: state.totalConfirmed + (wasChanged ? 0 : 1)
    });
  }
  
  // Final state update
  const newState = {
    lastProcessedIndex: endIndex >= sortedQuestions.length ? 0 : endIndex,
    lastRunDate: new Date().toISOString(),
    totalProcessed: state.totalProcessed + results.processed,
    totalReclassified: state.totalReclassified + results.reclassified,
    totalConfirmed: state.totalConfirmed + results.confirmed
  };
  await saveState(newState);
  
  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`Processed: ${results.processed}`);
  console.log(`Reclassified: ${results.reclassified}`);
  console.log(`Confirmed: ${results.confirmed}`);
  console.log(`Skipped: ${results.skipped}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`\nNext run starts at: ${newState.lastProcessedIndex}`);
  console.log(`All-time processed: ${newState.totalProcessed}`);
  console.log(`All-time reclassified: ${newState.totalReclassified}`);
  
  // Show work queue stats
  console.log('\n📋 Work Queue Status:');
  const workStats = await getWorkQueueStats();
  for (const [botType, statuses] of Object.entries(workStats)) {
    const pending = statuses.pending || 0;
    const completed = statuses.completed || 0;
    const failed = statuses.failed || 0;
    console.log(`  ${botType}: ${pending} pending, ${completed} completed, ${failed} failed`);
  }
  
  console.log('=== END ===\n');
  
  writeGitHubOutput({
    processed: results.processed,
    reclassified: results.reclassified,
    confirmed: results.confirmed,
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
