import {
  getAllUnifiedQuestions,
  addUnifiedQuestion,
  generateUnifiedId,
  isDuplicateUnified,
  runWithRetries,
  parseJson,
  validateQuestion,
  writeGitHubOutput,
  logQuestionsAdded,
  validateYouTubeVideos,
  normalizeCompanies
} from './utils.js';

// Channel structure for mapping
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
  'generative-ai': ['llm-fundamentals', 'fine-tuning', 'rag', 'agents', 'evaluation'],
  'machine-learning': ['algorithms', 'model-training', 'deployment', 'deep-learning', 'evaluation'],
  'security': ['application-security', 'owasp', 'encryption', 'authentication'],
  'testing': ['unit-testing', 'integration-testing', 'tdd', 'test-strategies'],
  'behavioral': ['star-method', 'leadership-principles', 'soft-skills', 'conflict-resolution']
};

const difficulties = ['beginner', 'intermediate', 'advanced'];

async function main() {
  console.log('=== Random Question Processor (Database Mode) ===\n');
  
  const inputQuestion = process.env.INPUT_QUESTION;
  
  if (!inputQuestion || inputQuestion.trim().length < 10) {
    console.error('❌ Error: INPUT_QUESTION environment variable is required (min 10 chars)');
    process.exit(1);
  }
  
  console.log('📥 Input Question:');
  console.log(`"${inputQuestion}"\n`);
  
  if (await isDuplicateUnified(inputQuestion)) {
    console.log('❌ This question appears to be a duplicate.');
    writeGitHubOutput({ success: 'false', reason: 'duplicate', added_count: 0 });
    process.exit(0);
  }
  
  const allQuestions = await getAllUnifiedQuestions();
  console.log(`📊 Current database: ${allQuestions.length} questions\n`);
  
  const channelList = Object.entries(CHANNEL_STRUCTURE)
    .map(([ch, subs]) => `${ch}: [${subs.join(', ')}]`)
    .join('\n');
  
  console.log('🔄 Mapping to channel and refining question...\n');
  
  const mappingPrompt = `You are a JSON generator. Output ONLY valid JSON, no explanations, no markdown, no text before or after.

Analyze this interview question and map it to the best channel/subchannel, refine it, and generate a complete answer.

Input Question: "${inputQuestion}"

Available channels and subchannels:
${channelList}

Output this exact JSON structure:
{"channel":"channel-id","subChannel":"subchannel-id","question":"refined professional interview question ending with ?","answer":"concise answer under 150 chars","explanation":"## Why Asked\\nInterview context\\n## Key Concepts\\nCore knowledge\\n## Code Example\\n\`\`\`\\nImplementation if applicable\\n\`\`\`\\n## Follow-up Questions\\nCommon follow-ups","diagram":"flowchart TD\\n  A[Start] --> B[End]","companies":["Google","Amazon","Meta"],"difficulty":"beginner|intermediate|advanced","tags":["tag1","tag2","tag3"],"sourceUrl":null,"videos":{"shortVideo":null,"longVideo":null},"relatedChannels":["other-channel-1","other-channel-2"]}

IMPORTANT: Return ONLY the JSON object. No other text.`;

  console.log('📝 PROMPT:');
  console.log('─'.repeat(50));
  console.log(mappingPrompt);
  console.log('─'.repeat(50));
  
  const response = await runWithRetries(mappingPrompt);
  
  if (!response) {
    console.log('❌ OpenCode failed after all retries.');
    writeGitHubOutput({ success: 'false', reason: 'opencode_timeout', added_count: 0 });
    process.exit(1);
  }
  
  const data = parseJson(response);
  
  if (!data) {
    console.log('❌ Failed to parse JSON response.');
    writeGitHubOutput({ success: 'false', reason: 'invalid_json', added_count: 0 });
    process.exit(1);
  }
  
  if (!data.channel || !CHANNEL_STRUCTURE[data.channel]) {
    console.log(`❌ Invalid channel: ${data.channel}`);
    writeGitHubOutput({ success: 'false', reason: 'invalid_channel', added_count: 0 });
    process.exit(1);
  }
  
  if (!data.subChannel || !CHANNEL_STRUCTURE[data.channel].includes(data.subChannel)) {
    console.log(`⚠️ SubChannel "${data.subChannel}" not valid, using first available`);
    data.subChannel = CHANNEL_STRUCTURE[data.channel][0];
  }
  
  if (!validateQuestion(data)) {
    console.log('❌ Invalid question format.');
    writeGitHubOutput({ success: 'false', reason: 'invalid_format', added_count: 0 });
    process.exit(1);
  }
  
  if (await isDuplicateUnified(data.question)) {
    console.log('❌ Refined question is a duplicate.');
    writeGitHubOutput({ success: 'false', reason: 'duplicate_refined', added_count: 0 });
    process.exit(0);
  }
  
  console.log('\n✅ Mapping successful!');
  console.log(`   Channel: ${data.channel}`);
  console.log(`   SubChannel: ${data.subChannel}`);
  console.log(`   Difficulty: ${data.difficulty || 'intermediate'}`);
  
  console.log('\n🎬 Validating YouTube videos...');
  const validatedVideos = await validateYouTubeVideos(data.videos);
  
  const newQuestion = {
    id: await generateUnifiedId(),
    question: data.question,
    answer: data.answer.substring(0, 200),
    explanation: data.explanation,
    tags: data.tags || [data.channel, data.subChannel],
    difficulty: difficulties.includes(data.difficulty) ? data.difficulty : 'intermediate',
    diagram: data.diagram || 'graph TD\n    A[Concept] --> B[Implementation]',
    sourceUrl: data.sourceUrl || null,
    videos: {
      shortVideo: validatedVideos.shortVideo,
      longVideo: validatedVideos.longVideo
    },
    companies: normalizeCompanies(data.companies),
    lastUpdated: new Date().toISOString()
  };
  
  const channelMappings = [{ channel: data.channel, subChannel: data.subChannel }];
  
  if (data.relatedChannels && Array.isArray(data.relatedChannels)) {
    data.relatedChannels.forEach(relatedChannel => {
      if (CHANNEL_STRUCTURE[relatedChannel] && relatedChannel !== data.channel) {
        channelMappings.push({ 
          channel: relatedChannel, 
          subChannel: CHANNEL_STRUCTURE[relatedChannel][0] 
        });
      }
    });
  }
  
  console.log('\n💾 Adding question to database...');
  await addUnifiedQuestion(newQuestion, channelMappings);
  
  console.log(`\n✅ Question added successfully!`);
  console.log(`   ID: ${newQuestion.id}`);
  console.log(`   Primary: ${data.channel}/${data.subChannel}`);
  
  logQuestionsAdded(1, channelMappings.map(m => m.channel), [newQuestion.id]);
  
  const totalQuestions = (await getAllUnifiedQuestions()).length;
  console.log('\n=== SUMMARY ===');
  console.log(`Original: "${inputQuestion.substring(0, 50)}..."`);
  console.log(`Refined:  "${newQuestion.question.substring(0, 50)}..."`);
  console.log(`Channel:  ${data.channel}/${data.subChannel}`);
  console.log(`ID:       ${newQuestion.id}`);
  console.log(`Total Questions: ${totalQuestions}`);
  console.log('=== END ===\n');
  
  writeGitHubOutput({
    success: 'true',
    question_id: newQuestion.id,
    channel: data.channel,
    subchannel: data.subChannel,
    added_count: 1,
    total_questions: totalQuestions
  });
}

main().catch(e => { 
  console.error('Fatal:', e); 
  writeGitHubOutput({ success: 'false', reason: 'fatal_error', error: e.message });
  process.exit(1); 
});
