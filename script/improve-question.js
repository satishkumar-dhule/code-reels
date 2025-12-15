import {
  loadUnifiedQuestions,
  saveUnifiedQuestions,
  loadChannelMappings,
  saveChannelMappings,
  getAllUnifiedQuestions,
  runWithRetries,
  parseJson,
  validateQuestion,
  updateUnifiedIndexFile,
  writeGitHubOutput,
  logQuestionsImproved,
  validateYouTubeVideos,
  normalizeCompanies
} from './utils.js';

// Available channels and their subchannels for remapping
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

// Get all channels from mappings
function getAllChannels() {
  const mappings = loadChannelMappings();
  return Object.keys(mappings);
}

// Get questions that belong to a specific channel
function getQuestionsForChannel(channel) {
  const questions = loadUnifiedQuestions();
  const mappings = loadChannelMappings();
  
  const channelMapping = mappings[channel];
  if (!channelMapping) return [];
  
  const questionIds = new Set();
  Object.values(channelMapping.subChannels || {}).forEach(ids => {
    ids.forEach(id => questionIds.add(id));
  });
  
  return Array.from(questionIds)
    .map(id => ({ ...questions[id], _channel: channel }))
    .filter(q => q.id != null);
}

function needsImprovement(q) {
  const issues = [];
  if (!q.answer || q.answer.length < 20) issues.push('short_answer');
  if (!q.answer || q.answer.length > 300) issues.push('long_answer');
  if (!q.explanation || q.explanation.length < 50) issues.push('short_explanation');
  if (!q.diagram || q.diagram.length < 10) issues.push('no_diagram');
  if (q.explanation && q.explanation.includes('[truncated')) issues.push('truncated');
  if (!q.question.endsWith('?')) issues.push('no_question_mark');
  if (!q.sourceUrl) issues.push('no_source_url');
  if (!q.videos?.shortVideo) issues.push('no_short_video');
  if (!q.videos?.longVideo) issues.push('no_long_video');
  if (!q.companies || q.companies.length === 0) issues.push('no_companies');
  return issues;
}

// AI-powered remapping function
async function remapQuestionsWithAI(questionsToRemap, mappings) {
  console.log('\n=== AI-Powered Question Remapping ===\n');
  
  const remappedQuestions = [];
  const failedRemaps = [];
  
  // Build channel structure string for prompt
  const channelStructureStr = Object.entries(CHANNEL_STRUCTURE)
    .map(([ch, subs]) => `${ch}: [${subs.join(', ')}]`)
    .join('\n');
  
  for (let i = 0; i < questionsToRemap.length; i++) {
    const question = questionsToRemap[i];
    console.log(`\nRemapping ${i + 1}/${questionsToRemap.length}: ${question.id}`);
    console.log(`  Current: ${question.channel}/${question.subChannel}`);
    console.log(`  Q: ${question.question.substring(0, 60)}...`);
    
    const prompt = `You are a technical interview question categorizer. Analyze this question and determine the BEST channel and subchannel for it.

Question ID: ${question.id}
Question: "${question.question}"
Answer: "${question.answer}"
Tags: ${(question.tags || []).join(', ')}
Current Channel: ${question.channel}
Current SubChannel: ${question.subChannel}

Available Channels and SubChannels:
${channelStructureStr}

Rules:
1. Choose the MOST relevant channel based on the question's core topic
2. Choose the MOST specific subchannel within that channel
3. If the current mapping is already optimal, return the same values
4. Consider the question content, not just keywords

Return ONLY valid JSON (no markdown, no explanation):
{"channel": "channel-id", "subChannel": "subchannel-id", "reason": "brief reason for this mapping"}`;

    const response = await runWithRetries(prompt);
    
    if (!response) {
      console.log('  ❌ AI failed after retries');
      failedRemaps.push({ id: question.id, reason: 'AI timeout' });
      continue;
    }
    
    const data = parseJson(response);
    
    if (!data || !data.channel || !data.subChannel) {
      console.log('  ❌ Invalid response format');
      failedRemaps.push({ id: question.id, reason: 'Invalid JSON' });
      continue;
    }
    
    // Validate channel and subchannel exist
    if (!CHANNEL_STRUCTURE[data.channel]) {
      console.log(`  ❌ Invalid channel: ${data.channel}`);
      failedRemaps.push({ id: question.id, reason: `Invalid channel: ${data.channel}` });
      continue;
    }
    
    if (!CHANNEL_STRUCTURE[data.channel].includes(data.subChannel) && data.subChannel !== 'general') {
      console.log(`  ⚠️ SubChannel ${data.subChannel} not in ${data.channel}, using 'general'`);
      data.subChannel = 'general';
    }
    
    const changed = data.channel !== question.channel || data.subChannel !== question.subChannel;
    
    if (changed) {
      // Remove from old location
      const oldChannel = mappings[question.channel];
      if (oldChannel?.subChannels) {
        for (const ids of Object.values(oldChannel.subChannels)) {
          const idx = ids.indexOf(question.id);
          if (idx !== -1) {
            ids.splice(idx, 1);
            break;
          }
        }
      }
      
      // Add to new location
      if (!mappings[data.channel]) {
        mappings[data.channel] = { subChannels: {} };
      }
      if (!mappings[data.channel].subChannels[data.subChannel]) {
        mappings[data.channel].subChannels[data.subChannel] = [];
      }
      if (!mappings[data.channel].subChannels[data.subChannel].includes(question.id)) {
        mappings[data.channel].subChannels[data.subChannel].push(question.id);
      }
      
      remappedQuestions.push({
        id: question.id,
        from: `${question.channel}/${question.subChannel}`,
        to: `${data.channel}/${data.subChannel}`,
        reason: data.reason
      });
      
      console.log(`  ✅ Remapped: ${question.channel}/${question.subChannel} → ${data.channel}/${data.subChannel}`);
      console.log(`     Reason: ${data.reason}`);
    } else {
      console.log(`  ✓ Already optimal`);
    }
  }
  
  return { remappedQuestions, failedRemaps };
}

async function main() {
  console.log('=== Question Improvement Bot (Unified Storage) ===\n');
  console.log('Mode: 1 question per channel + 20 question remapping\n');

  const channels = getAllChannels();
  const allQuestions = getAllUnifiedQuestions();
  let mappings = loadChannelMappings();
  
  console.log(`Loaded ${allQuestions.length} questions from ${channels.length} channels`);

  // ========== PHASE 1: AI-POWERED REMAPPING (20 questions) ==========
  console.log('\n========== PHASE 1: AI-POWERED REMAPPING ==========');
  
  // Sort questions by lastUpdated to remap oldest first
  const sortedForRemap = [...allQuestions].sort((a, b) => {
    const dateA = new Date(a.lastUpdated || 0).getTime();
    const dateB = new Date(b.lastUpdated || 0).getTime();
    return dateA - dateB;
  });
  
  // Take 20 questions for remapping
  const questionsToRemap = sortedForRemap.slice(0, 20);
  console.log(`Selected ${questionsToRemap.length} questions for remapping check`);
  
  const { remappedQuestions, failedRemaps } = await remapQuestionsWithAI(questionsToRemap, mappings);
  
  // Save updated mappings if any changes
  if (remappedQuestions.length > 0) {
    saveChannelMappings(mappings);
    console.log(`\n📁 Saved ${remappedQuestions.length} remapping changes to channel-mappings.json`);
  }
  
  // ========== PHASE 2: QUESTION IMPROVEMENT ==========
  console.log('\n========== PHASE 2: QUESTION IMPROVEMENT ==========');

  // Find improvable questions
  const improvableQuestions = allQuestions.filter(q => needsImprovement(q).length > 0);
  console.log(`Found ${improvableQuestions.length} questions needing improvement\n`);

  if (improvableQuestions.length === 0) {
    console.log('✅ All questions are in good shape!');
    writeGitHubOutput({
      improved_count: 0,
      failed_count: 0,
      remapped_count: remappedQuestions.length,
      total_questions: allQuestions.length
    });
    return;
  }

  // Sort by lastUpdated (oldest first)
  improvableQuestions.sort((a, b) => {
    const dateA = new Date(a.lastUpdated || 0).getTime();
    const dateB = new Date(b.lastUpdated || 0).getTime();
    return dateA - dateB;
  });

  const improvedQuestions = [];
  const failedAttempts = [];
  const processedIds = new Set();

  // Process 1 question per channel
  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i];
    const channelQuestions = getQuestionsForChannel(channel);
    
    console.log(`\n--- Channel ${i + 1}/${channels.length}: ${channel} ---`);
    
    // Find improvable question for this channel that hasn't been processed
    const channelImprovable = channelQuestions
      .filter(q => needsImprovement(q).length > 0 && !processedIds.has(q.id))
      .sort((a, b) => new Date(a.lastUpdated || 0).getTime() - new Date(b.lastUpdated || 0).getTime());
    
    if (channelImprovable.length === 0) {
      console.log('✅ No questions need improvement in this channel');
      continue;
    }

    const question = channelImprovable[0];
    processedIds.add(question.id);
    const issues = needsImprovement(question);
    
    console.log(`ID: ${question.id}`);
    console.log(`Issues: ${issues.join(', ')}`);
    console.log(`Current Q: ${question.question.substring(0, 60)}...`);

    const prompt = `You are a senior technical interviewer improving interview questions for quality.

Current Question: "${question.question}"
Current Answer: "${question.answer}"
Current Explanation: "${question.explanation?.substring(0, 500) || 'None'}"
Issues to fix: ${issues.join(', ')}

Improvement Guidelines:
- Make the question more specific and technically precise
- Answer must be concise (under 150 chars) but technically accurate
- Explanation should include:
  * ## Concept Overview - what and why
  * ## Implementation - how it works with code examples
  * ## Trade-offs - pros/cons and when to use
  * ## Common Pitfalls - mistakes to avoid
- Diagram should clearly visualize the concept using mermaid

Return ONLY valid JSON:
{
  "question": "improved specific technical question ending with ?",
  "answer": "concise technical answer under 150 chars",
  "explanation": "detailed markdown with ## headers, \`\`\`code blocks\`\`\`, and bullet points",
  "diagram": "mermaid diagram code starting with graph TD or flowchart LR",
  "sourceUrl": "URL to a real interview resource, blog post, or documentation where this question topic is discussed (e.g., LeetCode, HackerRank, company engineering blog, official docs)",
  "videos": {
    "shortVideo": "YouTube Shorts URL (under 60 seconds) explaining this concept quickly - must be a real, existing video",
    "longVideo": "YouTube video URL (5-20 minutes) with in-depth explanation - must be a real, existing video from channels like Fireship, Traversy Media, Tech With Tim, NeetCode, etc."
  },
  "companies": ["Company names where this question has been asked in interviews - e.g., Google, Amazon, Meta, Microsoft, Apple, Netflix, Uber, Airbnb, etc."]
}`;

    const response = await runWithRetries(prompt);
    
    if (!response) {
      console.log('❌ OpenCode failed after retries.');
      failedAttempts.push({ id: question.id, channel, reason: 'OpenCode timeout' });
      continue;
    }

    const data = parseJson(response);
    
    if (!validateQuestion(data)) {
      console.log('❌ Invalid response format.');
      failedAttempts.push({ id: question.id, channel, reason: 'Invalid JSON' });
      continue;
    }

    // Update question in unified storage
    const questions = loadUnifiedQuestions();
    
    if (!questions[question.id]) {
      console.log('❌ Question not found in unified storage.');
      failedAttempts.push({ id: question.id, channel, reason: 'Not found' });
      continue;
    }

    // Validate YouTube videos if provided
    console.log('🎬 Validating YouTube videos...');
    const validatedVideos = await validateYouTubeVideos(data.videos);
    const existingVideos = questions[question.id].videos || {};

    const existingCompanies = questions[question.id].companies || [];
    const newCompanies = normalizeCompanies(data.companies);

    questions[question.id] = {
      ...questions[question.id],
      question: data.question,
      answer: data.answer.substring(0, 200),
      explanation: data.explanation,
      diagram: data.diagram || questions[question.id].diagram,
      sourceUrl: data.sourceUrl || questions[question.id].sourceUrl || null,
      videos: {
        shortVideo: validatedVideos.shortVideo || existingVideos.shortVideo || null,
        longVideo: validatedVideos.longVideo || existingVideos.longVideo || null
      },
      companies: newCompanies.length > 0 ? newCompanies : existingCompanies,
      lastUpdated: new Date().toISOString()
    };

    saveUnifiedQuestions(questions);
    updateUnifiedIndexFile();
    
    improvedQuestions.push(questions[question.id]);
    console.log(`✅ Improved: ${question.id}`);
  }

  // Print summary
  const totalQuestions = getAllUnifiedQuestions().length;
  console.log('\n\n=== SUMMARY ===');
  console.log(`Channels Processed: ${channels.length}`);
  console.log(`Total Questions Improved: ${improvedQuestions.length}`);
  console.log(`Total Questions Remapped: ${remappedQuestions.length}`);
  
  if (remappedQuestions.length > 0) {
    console.log('\n🔄 Remapped Questions:');
    remappedQuestions.forEach((r, idx) => {
      console.log(`  ${idx + 1}. [${r.id}] ${r.from} → ${r.to}`);
    });
  }
  
  if (improvedQuestions.length > 0) {
    console.log('\n✅ Successfully Improved Questions:');
    improvedQuestions.forEach((q, idx) => {
      console.log(`  ${idx + 1}. [${q.id}]`);
      console.log(`     Q: ${q.question.substring(0, 70)}${q.question.length > 70 ? '...' : ''}`);
    });
  }

  if (failedAttempts.length > 0) {
    console.log(`\n❌ Failed Improvement Attempts: ${failedAttempts.length}`);
    failedAttempts.forEach(f => {
      console.log(`  - [${f.channel}] ${f.id}: ${f.reason}`);
    });
  }
  
  if (failedRemaps.length > 0) {
    console.log(`\n❌ Failed Remap Attempts: ${failedRemaps.length}`);
    failedRemaps.forEach(f => {
      console.log(`  - ${f.id}: ${f.reason}`);
    });
  }

  console.log(`\nTotal Questions in Database: ${totalQuestions}`);
  console.log('=== END SUMMARY ===\n');

  // Log to changelog
  if (improvedQuestions.length > 0 || remappedQuestions.length > 0) {
    // Get channels for improved questions from mappings
    const currentMappings = loadChannelMappings();
    const channelsAffected = new Set();
    
    improvedQuestions.forEach(q => {
      Object.entries(currentMappings).forEach(([channel, data]) => {
        const allIds = Object.values(data.subChannels || {}).flat();
        if (allIds.includes(q.id)) {
          channelsAffected.add(channel);
        }
      });
    });
    
    // Add remapped channels
    remappedQuestions.forEach(r => {
      const [fromCh] = r.from.split('/');
      const [toCh] = r.to.split('/');
      channelsAffected.add(fromCh);
      channelsAffected.add(toCh);
    });
    
    logQuestionsImproved(
      improvedQuestions.length,
      Array.from(channelsAffected),
      [...improvedQuestions.map(q => q.id), ...remappedQuestions.map(r => r.id)]
    );
    console.log('📝 Changelog updated with improved and remapped questions');
  }

  writeGitHubOutput({
    improved_count: improvedQuestions.length,
    failed_count: failedAttempts.length,
    remapped_count: remappedQuestions.length,
    total_questions: totalQuestions,
    improved_ids: improvedQuestions.map(q => q.id).join(','),
    remapped_ids: remappedQuestions.map(r => r.id).join(',')
  });
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
