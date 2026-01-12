import {
  addUnifiedQuestion,
  generateUnifiedId,
  isDuplicateUnified,
  validateQuestion,
  writeGitHubOutput,
  logQuestionsAdded,
  normalizeCompanies,
  logBotActivity,
  getChannelQuestionCounts,
  getQuestionCount,
  postBotCommentToDiscussion,
  getAllChannelsFromDb,
  getQuestionsForChannel,
  getSubChannelQuestionCounts
} from './utils.js';
import { generateQuestion as generateQuestionGraph } from './ai/graphs/question-graph.js';
import { runQualityGate } from './ai/graphs/quality-gate-graph.js';
import { channelConfigs, topCompanies as TOP_TECH_COMPANIES, realScenarios as REAL_SCENARIOS } from './ai/prompts/templates/generate.js';
import { certificationDomains } from './ai/prompts/templates/certification-question.js';
import ragService from './ai/services/rag-enhanced-generation.js';

// Channel configurations - imported from AI framework template (used for sub-channel info)

const difficulties = ['beginner', 'intermediate', 'advanced'];

// Certification channel IDs (channels that are certification prep)
const CERTIFICATION_CHANNELS = Object.keys(certificationDomains);

// Top 100 tech companies - imported from AI framework template

// Get random companies from the top list (2-4 companies)
function getRandomTopCompanies(count = 3) {
  const shuffled = [...TOP_TECH_COMPANIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, Math.floor(Math.random() * 3) + 2));
}

// Get all channels - fetches from database AND includes all configured channels (including certifications)
async function getAllChannels() {
  const dbChannels = await getAllChannelsFromDb();
  // Merge with hardcoded configs to ensure we have sub-channel info
  const hardcodedChannels = Object.keys(channelConfigs);
  // Include certification channels from certificationDomains
  const certificationChannels = CERTIFICATION_CHANNELS;
  
  // Also include fundamentals channels that might not be in channelConfigs
  const fundamentalsChannels = [
    'data-structures', 'complexity-analysis', 'dynamic-programming', 
    'bit-manipulation', 'design-patterns', 'concurrency', 'math-logic', 'low-level'
  ];
  
  // Return unique channels from all sources
  const allChannels = new Set([
    ...dbChannels, 
    ...hardcodedChannels, 
    ...certificationChannels,
    ...fundamentalsChannels
  ]);
  
  console.log(`Channel sources: DB=${dbChannels.length}, Config=${hardcodedChannels.length}, Certs=${certificationChannels.length}, Fundamentals=${fundamentalsChannels.length}`);
  console.log(`Total unique channels: ${allChannels.size}`);
  
  return Array.from(allChannels);
}

function getRandomSubChannel(channel) {
  const configs = channelConfigs[channel];
  if (!configs || configs.length === 0) {
    return { subChannel: 'general', tags: [channel] };
  }
  return configs[Math.floor(Math.random() * configs.length)];
}

/**
 * Get sub-channel with fewest questions for a given channel
 * Prioritizes sub-channels that have no questions or fewer questions
 */
async function getPrioritizedSubChannel(channel, subChannelCounts) {
  const configs = channelConfigs[channel];
  if (!configs || configs.length === 0) {
    return { subChannel: 'general', tags: [channel] };
  }
  
  // Get counts for this channel's sub-channels
  const channelSubCounts = subChannelCounts[channel] || {};
  
  // Sort sub-channels by question count (ascending)
  const sortedConfigs = [...configs].map(config => ({
    ...config,
    count: channelSubCounts[config.subChannel] || 0
  })).sort((a, b) => a.count - b.count);
  
  // Prioritize sub-channels with 0 questions first
  const emptySubChannels = sortedConfigs.filter(c => c.count === 0);
  if (emptySubChannels.length > 0) {
    // Random selection among empty sub-channels
    return emptySubChannels[Math.floor(Math.random() * emptySubChannels.length)];
  }
  
  // Otherwise, weighted selection favoring lower counts
  const minCount = sortedConfigs[0].count;
  const lowCountSubChannels = sortedConfigs.filter(c => c.count <= minCount * 1.5);
  return lowCountSubChannels[Math.floor(Math.random() * lowCountSubChannels.length)];
}

// Prioritize channels with fewer questions using weighted selection
// ALWAYS selects channels with 0 questions first before using weighted selection
function selectChannelsWeighted(channelCounts, allChannels, limit) {
  // Sort channels by question count
  const sortedByCount = [...allChannels].map(ch => ({
    channel: ch,
    count: channelCounts[ch] || 0,
    isCertification: CERTIFICATION_CHANNELS.includes(ch)
  })).sort((a, b) => a.count - b.count);
  
  // Calculate statistics
  const counts = sortedByCount.map(c => c.count);
  const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
  const medianCount = counts[Math.floor(counts.length / 2)];
  const maxCount = Math.max(...counts, 1);
  
  // PRIORITY 1: ALWAYS select ALL channels with 0 questions first (MANDATORY)
  const emptyChannels = sortedByCount.filter(c => c.count === 0).map(c => c.channel);
  if (emptyChannels.length > 0) {
    console.log(`\n🎯 CRITICAL PRIORITY: Found ${emptyChannels.length} channels with 0 questions - MUST ADD AT LEAST 1 EACH`);
    emptyChannels.forEach(ch => {
      const isCert = CERTIFICATION_CHANNELS.includes(ch);
      console.log(`   ${ch}${isCert ? ' (certification)' : ''} - NEEDS IMMEDIATE ATTENTION`);
    });
    
    // If we have empty channels, they take absolute priority
    // Allocate at least 1 question per empty channel
    const emptyChannelAllocation = Math.min(emptyChannels.length, limit);
    
    // Prioritize certifications among empty channels
    const emptyCerts = emptyChannels.filter(ch => CERTIFICATION_CHANNELS.includes(ch));
    const emptyNonCerts = emptyChannels.filter(ch => !CERTIFICATION_CHANNELS.includes(ch));
    const prioritizedEmpty = [...emptyCerts, ...emptyNonCerts];
    
    // If we have more empty channels than limit, select the most important ones
    if (emptyChannels.length >= limit) {
      console.log(`   ⚠️  ${emptyChannels.length} empty channels but only ${limit} slots available`);
      console.log(`   Selecting ${limit} highest priority empty channels (certifications first)`);
      return prioritizedEmpty.slice(0, limit);
    }
    
    // Otherwise, allocate 1 question to each empty channel, then fill remaining slots
    console.log(`   Allocating 1 question to each of ${emptyChannels.length} empty channels`);
    console.log(`   Remaining ${limit - emptyChannels.length} slots for weighted selection`);
    
    const selected = [...prioritizedEmpty];
    const remainingLimit = limit - selected.length;
    
    if (remainingLimit > 0) {
      // Fill remaining slots with weighted selection from non-empty channels
      const nonEmptyChannels = sortedByCount.filter(c => c.count > 0).map(c => c.channel);
      const additionalSelections = selectFromNonEmpty(channelCounts, nonEmptyChannels, remainingLimit, maxCount);
      selected.push(...additionalSelections);
    }
    
    return selected;
  }
  
  // No empty channels - proceed with normal weighted selection
  return selectFromNonEmpty(channelCounts, allChannels, limit, maxCount);
}

// Helper function for weighted selection from non-empty channels
function selectFromNonEmpty(channelCounts, channels, limit, maxCount) {
  // Exclude channels in top 25% (those with most questions)
  const sortedByCount = [...channels].map(ch => ({
    channel: ch,
    count: channelCounts[ch] || 0
  })).sort((a, b) => a.count - b.count);
  
  const counts = sortedByCount.map(c => c.count);
  const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
  const excludeThreshold = counts[Math.floor(counts.length * 0.75)];
  
  const eligibleChannels = sortedByCount
    .filter(c => c.count <= excludeThreshold)
    .map(c => c.channel);
  
  console.log(`\n📈 Weighted Selection Statistics:`);
  console.log(`   Average: ${avgCount.toFixed(1)} questions`);
  console.log(`   Exclude threshold (top 25%): >${excludeThreshold} questions`);
  console.log(`   Eligible channels: ${eligibleChannels.length}/${channels.length}`);
  
  // If all channels are excluded (unlikely), fall back to bottom half
  const channelsToUse = eligibleChannels.length > 0 
    ? eligibleChannels 
    : sortedByCount.slice(0, Math.ceil(sortedByCount.length / 2)).map(c => c.channel);
  
  // Calculate weights - exponential preference for channels with fewer questions
  // Weight formula: (maxCount - count + 1)^3 / maxCount^2
  const weights = channelsToUse.map(ch => {
    const count = channelCounts[ch] || 0;
    const deficit = maxCount - count + 1;
    // Cubic weight for strong preference toward low-count channels
    let weight = Math.pow(deficit, 3) / Math.pow(maxCount, 2);
    
    // Extra boost for certifications (they need more content)
    if (CERTIFICATION_CHANNELS.includes(ch)) {
      weight *= 2;
    }
    
    return weight;
  });
  
  const selected = [];
  const available = [...channelsToUse];
  const availableWeights = [...weights];
  
  while (selected.length < limit && available.length > 0) {
    // Weighted random selection
    const totalWeight = availableWeights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    let idx = 0;
    
    for (let i = 0; i < availableWeights.length; i++) {
      random -= availableWeights[i];
      if (random <= 0) {
        idx = i;
        break;
      }
    }
    
    selected.push(available[idx]);
    available.splice(idx, 1);
    availableWeights.splice(idx, 1);
  }
  
  return selected;
}

// Get channels that are significantly below average (need the most help)
function getLaggingChannels(channelCounts, allChannels, targetPerChannel = 20) {
  const sortedByCount = [...allChannels].map(ch => ({
    channel: ch,
    count: channelCounts[ch] || 0,
    deficit: Math.max(0, targetPerChannel - (channelCounts[ch] || 0))
  })).sort((a, b) => b.deficit - a.deficit);
  
  // Return channels that are below target, sorted by how far below they are
  return sortedByCount.filter(c => c.deficit > 0);
}

async function main() {
  console.log('=== 🚀 Creator Bot - Crafting New Questions ===\n');

  const inputDifficulty = process.env.INPUT_DIFFICULTY || 'random';
  const inputLimit = parseInt(process.env.INPUT_LIMIT || '0', 10);
  const inputChannelRaw = process.env.INPUT_CHANNEL || null; // Specific channel(s) to generate for
  const balanceChannels = process.env.BALANCE_CHANNELS !== 'false'; // Default to true
  
  // Get all channels from database (not hardcoded list)
  const allChannels = await getAllChannels();
  console.log(`Found ${allChannels.length} channels in database`);
  
  // Parse input channels (can be comma-separated list)
  let inputChannels = null;
  if (inputChannelRaw) {
    inputChannels = inputChannelRaw.split(',').map(ch => ch.trim()).filter(Boolean);
    
    // Validate all input channels
    const invalidChannels = inputChannels.filter(ch => !allChannels.includes(ch));
    if (invalidChannels.length > 0) {
      console.error(`❌ Invalid channels: ${invalidChannels.join(', ')}`);
      console.log(`Available channels: ${allChannels.join(', ')}`);
      process.exit(1);
    }
    console.log(`Input channels: ${inputChannels.join(', ')}`);
  }
  
  // Get channel question counts efficiently (single query instead of fetching all questions)
  const channelCounts = await getChannelQuestionCounts();
  const totalQuestionCount = Object.values(channelCounts).reduce((a, b) => a + b, 0);
  console.log(`Database has ${totalQuestionCount} existing questions`);
  
  // Get sub-channel counts for prioritization
  let subChannelCounts = {};
  try {
    subChannelCounts = await getSubChannelQuestionCounts();
    console.log('Loaded sub-channel question counts for prioritization');
  } catch (e) {
    console.log('Sub-channel counts not available, using random selection');
  }
  
  // Show channel distribution
  console.log('\n📊 Channel Distribution:');
  const sortedChannels = [...allChannels].sort((a, b) => (channelCounts[a] || 0) - (channelCounts[b] || 0));
  sortedChannels.slice(0, 5).forEach(ch => {
    console.log(`   ${ch}: ${channelCounts[ch] || 0} questions (LOW)`);
  });
  console.log('   ...');
  sortedChannels.slice(-3).forEach(ch => {
    console.log(`   ${ch}: ${channelCounts[ch] || 0} questions`);
  });
  
  let channels;
  const limit = inputLimit > 0 ? inputLimit : allChannels.length;
  
  // Show lagging channels that need the most attention
  const laggingChannels = getLaggingChannels(channelCounts, allChannels, 20);
  if (laggingChannels.length > 0) {
    console.log(`\n⚠️  Channels below target (20 questions):`);
    laggingChannels.slice(0, 8).forEach(c => {
      console.log(`   ${c.channel}: ${c.count} questions (need ${c.deficit} more)`);
    });
    if (laggingChannels.length > 8) {
      console.log(`   ... and ${laggingChannels.length - 8} more`);
    }
  }
  
  // If specific channel(s) provided, use those channels
  if (inputChannels && inputChannels.length > 0) {
    if (inputChannels.length === 1) {
      // Single channel: repeat it for the limit
      channels = Array(limit).fill(inputChannels[0]);
      console.log(`\n🎯 Specific channel selected: ${inputChannels[0]} (generating ${limit} question(s))`);
      console.log(`   Current count: ${channelCounts[inputChannels[0]] || 0} questions`);
    } else {
      // Multiple channels: use weighted selection among them
      channels = selectChannelsWeighted(channelCounts, inputChannels, limit);
      console.log(`\n🎯 Target channels (${inputChannels.length} specified):`);
      channels.forEach(ch => {
        const count = channelCounts[ch] || 0;
        console.log(`   ${ch}: ${count} questions`);
      });
    }
  } else if (balanceChannels && inputLimit > 0) {
    // Use weighted selection to prioritize channels with fewer questions
    // This will EXCLUDE channels in the top 25% by question count
    channels = selectChannelsWeighted(channelCounts, allChannels, limit);
    console.log(`\n🎯 Weighted selection (excluding top 25%, prioritizing lagging channels):`);
    channels.forEach(ch => {
      const count = channelCounts[ch] || 0;
      const avgCount = Object.values(channelCounts).reduce((a, b) => a + b, 0) / allChannels.length;
      const status = count < avgCount * 0.5 ? '🔴 CRITICAL' : count < avgCount ? '🟡 LOW' : '🟢';
      console.log(`   ${ch}: ${count} questions ${status}`);
    });
  } else if (inputLimit > 0) {
    channels = allChannels.sort(() => Math.random() - 0.5).slice(0, limit);
    console.log(`\nRandom selection: ${channels.join(', ')}`);
  } else {
    channels = allChannels;
    console.log(`\nProcessing all ${channels.length} channels`);
  }

  const addedQuestions = [];
  const failedAttempts = [];

  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i];
    // Use prioritized sub-channel selection (favors sub-channels with fewer questions)
    const subChannelConfig = Object.keys(subChannelCounts).length > 0
      ? await getPrioritizedSubChannel(channel, subChannelCounts)
      : getRandomSubChannel(channel);
    
    console.log(`\n--- Channel ${i + 1}/${channels.length}: ${channel} ---`);
    
    const difficulty = inputDifficulty === 'random'
      ? difficulties[Math.floor(Math.random() * difficulties.length)]
      : inputDifficulty;

    console.log(`Sub-channel: ${subChannelConfig.subChannel}`);
    console.log(`Difficulty: ${difficulty}`);

    // Select random top companies for this question
    const targetCompanies = getRandomTopCompanies(3);
    console.log(`Target companies: ${targetCompanies.join(', ')}`);

    // Real interview scenarios by channel - used to provide context in prompts
const REAL_SCENARIOS = {
  'system-design': [
    { scenario: 'Design Twitter/X feed', scale: '500M users, 10K tweets/sec', focus: 'fan-out, caching, real-time' },
    { scenario: 'Design Uber ride matching', scale: '1M concurrent rides', focus: 'geospatial, real-time, matching' },
    { scenario: 'Design Netflix video streaming', scale: '200M subscribers', focus: 'CDN, encoding, recommendations' },
    { scenario: 'Design Slack messaging', scale: '10M concurrent users', focus: 'websockets, presence, search' },
    { scenario: 'Design payment processing', scale: '$1B daily transactions', focus: 'consistency, idempotency, fraud' },
    { scenario: 'Design notification system', scale: '1B push notifications/day', focus: 'delivery, batching, preferences' },
    { scenario: 'Design rate limiter', scale: '10M requests/minute', focus: 'distributed, algorithms, fairness' },
    { scenario: 'Design URL shortener', scale: '100M URLs', focus: 'hashing, redirection, analytics' },
  ],
  'algorithms': [
    { problem: 'LRU Cache', pattern: 'HashMap + Doubly Linked List', complexity: 'O(1) get/put' },
    { problem: 'Merge K sorted lists', pattern: 'Min Heap', complexity: 'O(N log K)' },
    { problem: 'Word ladder', pattern: 'BFS', complexity: 'O(M² × N)' },
    { problem: 'Meeting rooms II', pattern: 'Interval + Heap', complexity: 'O(N log N)' },
    { problem: 'Serialize binary tree', pattern: 'Preorder DFS', complexity: 'O(N)' },
    { problem: 'Median finder', pattern: 'Two Heaps', complexity: 'O(log N) insert' },
    { problem: 'Trapping rain water', pattern: 'Two Pointers', complexity: 'O(N)' },
    { problem: 'Course schedule', pattern: 'Topological Sort', complexity: 'O(V + E)' },
  ],
  'frontend': [
    { topic: 'Virtual DOM diffing', context: 'React reconciliation algorithm' },
    { topic: 'State management', context: 'Redux vs Context vs Zustand trade-offs' },
    { topic: 'Bundle optimization', context: 'Code splitting, tree shaking, lazy loading' },
    { topic: 'Accessibility', context: 'ARIA, keyboard navigation, screen readers' },
    { topic: 'SSR vs CSR vs SSG', context: 'Next.js rendering strategies' },
  ],
  'devops': [
    { scenario: 'Blue-green deployment', context: 'Zero-downtime releases' },
    { scenario: 'GitOps workflow', context: 'ArgoCD, Flux, declarative infrastructure' },
    { scenario: 'Secret management', context: 'Vault, AWS Secrets Manager, rotation' },
    { scenario: 'Multi-stage Docker builds', context: 'Image optimization, security' },
  ],
  'sre': [
    { scenario: 'Production incident', context: 'On-call response, root cause analysis' },
    { scenario: 'Error budget exhaustion', context: 'SLO negotiation, feature freeze' },
    { scenario: 'Capacity planning', context: 'Load testing, forecasting, autoscaling' },
    { scenario: 'Chaos experiment', context: 'Failure injection, blast radius' },
  ],
  'database': [
    { topic: 'Query optimization', context: 'EXPLAIN plans, index selection' },
    { topic: 'Sharding strategy', context: 'Horizontal partitioning, consistent hashing' },
    { topic: 'ACID vs BASE', context: 'Consistency trade-offs, CAP theorem' },
    { topic: 'Connection pooling', context: 'PgBouncer, HikariCP, connection limits' },
  ],
  'behavioral': [
    { scenario: 'Technical disagreement', context: 'Conflict resolution, influence without authority' },
    { scenario: 'Project failure', context: 'Learning from mistakes, accountability' },
    { scenario: 'Tight deadline', context: 'Prioritization, scope negotiation' },
    { scenario: 'Mentoring junior', context: 'Knowledge transfer, patience' },
  ],
};

// Get a random scenario hint for the channel
function getScenarioHint(channel) {
  const scenarios = REAL_SCENARIOS[channel];
  if (!scenarios || scenarios.length === 0) return '';
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  return JSON.stringify(scenario);
}

const scenarioHint = getScenarioHint(channel);

    // Get RAG context for better generation
    let ragContext = null;
    try {
      console.log('\n🔍 Retrieving RAG context...');
      ragContext = await ragService.getGenerationContext(
        `${channel} ${subChannelConfig.subChannel} ${difficulty}`,
        { channel, limit: 5, includeAnswers: false }
      );
      if (ragContext.hasContext) {
        console.log(`   Found ${ragContext.related.length} related questions`);
        console.log(`   Key concepts: ${ragContext.concepts.slice(0, 5).join(', ')}`);
      } else {
        console.log('   No existing context found (new topic area)');
      }
    } catch (e) {
      console.log(`   RAG context unavailable: ${e.message}`);
    }

    // Use LangGraph pipeline for question generation
    console.log('\n📝 Generating question using LangGraph pipeline...');
    console.log('─'.repeat(50));
    
    const result = await generateQuestionGraph({
      channel,
      subChannel: subChannelConfig.subChannel,
      difficulty,
      tags: subChannelConfig.tags,
      targetCompanies,
      scenarioHint,
      ragContext // Pass RAG context to the generation pipeline
    });
    
    if (!result.success) {
      console.log(`❌ Generation failed: ${result.error}`);
      failedAttempts.push({ channel, reason: result.error || 'Generation failed' });
      continue;
    }
    
    const data = result.question;
    
    if (!validateQuestion(data)) {
      console.log('❌ Invalid response format.');
      failedAttempts.push({ channel, reason: 'Invalid JSON format' });
      continue;
    }

    if (await isDuplicateUnified(data.question)) {
      console.log('❌ Duplicate question detected.');
      failedAttempts.push({ channel, reason: 'Duplicate detected' });
      continue;
    }

    // Run quality gate - all questions must pass
    console.log('\n🚦 Running Quality Gate...');
    console.log('─'.repeat(50));
    
    // Get existing questions for duplicate detection
    const existingQuestions = await getQuestionsForChannel(channel);
    
    const qualityResult = await runQualityGate(data, {
      channel,
      subChannel: subChannelConfig.subChannel,
      difficulty,
      existingQuestions,
      passThreshold: 70
    });
    
    if (!qualityResult.success) {
      console.log(`❌ Quality gate failed: ${qualityResult.decision}`);
      console.log(`   Score: ${qualityResult.score}/100`);
      if (qualityResult.issues.length > 0) {
        console.log(`   Issues: ${qualityResult.issues.join(', ')}`);
      }
      if (qualityResult.warnings.length > 0) {
        console.log(`   Warnings: ${qualityResult.warnings.join(', ')}`);
      }
      failedAttempts.push({ 
        channel, 
        reason: `Quality gate: ${qualityResult.decision} (score: ${qualityResult.score})`,
        issues: qualityResult.issues,
        warnings: qualityResult.warnings
      });
      continue;
    }
    
    console.log(`✅ Quality gate passed (score: ${qualityResult.score}/100)`);
    if (qualityResult.warnings.length > 0) {
      console.log(`   Warnings: ${qualityResult.warnings.join(', ')}`);
    }

    const newQuestion = {
      id: await generateUnifiedId(),
      question: data.question,
      answer: data.answer?.substring(0, 200) || '',
      explanation: data.explanation || '',
      tags: subChannelConfig.tags,
      difficulty: difficulty,
      diagram: data.diagram || null,
      sourceUrl: data.sourceUrl || null,
      videos: data.videos || { shortVideo: null, longVideo: null },
      companies: normalizeCompanies(data.companies),
      lastUpdated: new Date().toISOString()
    };

    const channelMappings = [{ channel, subChannel: subChannelConfig.subChannel }];

    await addUnifiedQuestion(newQuestion, channelMappings);
    
    // Log bot activity
    await logBotActivity(newQuestion.id, 'generate', 'new question created', 'completed', {
      channel,
      subChannel: subChannelConfig.subChannel,
      difficulty
    });
    
    // Post comment to Giscus discussion
    await postBotCommentToDiscussion(newQuestion.id, 'Question Generator Bot', 'generated', {
      summary: `New ${difficulty} question generated for ${channel}/${subChannelConfig.subChannel}`,
      changes: [
        `Channel: ${channel}`,
        `Sub-channel: ${subChannelConfig.subChannel}`,
        `Difficulty: ${difficulty}`,
        `Tags: ${newQuestion.tags.join(', ')}`,
        newQuestion.diagram ? 'Includes diagram' : 'No diagram',
        newQuestion.companies?.length > 0 ? `Companies: ${newQuestion.companies.join(', ')}` : null
      ].filter(Boolean)
    });
    
    addedQuestions.push({ ...newQuestion, mappedChannels: channelMappings });

    console.log(`✅ Added: ${newQuestion.id}`);
    console.log(`Q: ${newQuestion.question.substring(0, 60)}...`);
  }

  const totalQuestions = await getQuestionCount();
  console.log('\n\n=== SUMMARY ===');
  console.log(`Total Questions Added: ${addedQuestions.length}/${channels.length}`);
  
  if (addedQuestions.length > 0) {
    console.log('\n✅ Successfully Added Questions:');
    addedQuestions.forEach((q, idx) => {
      console.log(`  ${idx + 1}. [${q.id}] (${q.difficulty})`);
      console.log(`     Q: ${q.question.substring(0, 70)}...`);
    });
  }

  if (failedAttempts.length > 0) {
    console.log(`\n❌ Failed Attempts: ${failedAttempts.length}`);
    failedAttempts.forEach(f => console.log(`  - ${f.channel}: ${f.reason}`));
  }

  console.log(`\nTotal Questions in Database: ${totalQuestions}`);
  console.log('=== END SUMMARY ===\n');

  if (addedQuestions.length > 0) {
    const channelsAffected = addedQuestions.flatMap(q => q.mappedChannels.map(m => m.channel));
    logQuestionsAdded(addedQuestions.length, channelsAffected, addedQuestions.map(q => q.id));
  }

  writeGitHubOutput({
    added_count: addedQuestions.length,
    failed_count: failedAttempts.length,
    total_questions: totalQuestions,
    added_ids: addedQuestions.map(q => q.id).join(',')
  });
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
