#!/usr/bin/env node
/**
 * Verifier Bot - Advanced Analysis Engine
 * 
 * Comprehensive quality analysis for interview content:
 * - Multi-dimensional quality scoring
 * - Technical accuracy verification
 * - Content structure analysis
 * - Difficulty calibration
 * - Voice interview readiness
 * - SEO & discoverability analysis
 * - Duplicate & similarity detection (using Qdrant Vector DB)
 * - Actionable improvement recommendations
 * 
 * LangGraph Pipeline:
 * Fetch → Deep Analyze → Multi-Score → Duplicate Check → Generate Report → Create Work Items
 */

import 'dotenv/config';
import { getDb, initBotTables } from './shared/db.js';
import { logAction } from './shared/ledger.js';
import { addToQueue, getNextWorkItem, completeWorkItem } from './shared/queue.js';
import { startRun, completeRun, failRun, updateRunStats } from './shared/runs.js';
import { runWithRetries, parseJson, calculateSimilarity } from '../utils.js';

// Import vector DB service
let vectorDB = null;
async function getVectorDB() {
  if (!vectorDB) {
    try {
      vectorDB = (await import('../ai/services/vector-db.js')).default;
    } catch (error) {
      console.log('Vector DB not available:', error.message);
    }
  }
  return vectorDB;
}

const BOT_NAME = 'verifier';
const db = getDb();

// ============================================
// ANALYSIS CONFIGURATION
// ============================================

const CONFIG = {
  // Quality thresholds
  thresholds: {
    minQuestionLength: 30,
    minAnswerLength: 50,
    minExplanationLength: 200,
    idealExplanationLength: 500,
    duplicateSimilarity: 0.75,
    minQualityScore: 65,
    minVoiceKeywords: 5,
    maxVoiceKeywords: 12
  },
  
  // Scoring weights for overall score
  weights: {
    technicalAccuracy: 0.25,
    clarity: 0.15,
    completeness: 0.20,
    practicalRelevance: 0.15,
    structureQuality: 0.10,
    difficultyCalibration: 0.10,
    voiceReadiness: 0.05
  }
};

// Issue severity levels and their impact
const SEVERITY = {
  critical: { level: 4, action: 'delete', priority: 1 },
  high: { level: 3, action: 'improve', priority: 2 },
  medium: { level: 2, action: 'improve', priority: 3 },
  low: { level: 1, action: 'improve', priority: 4 },
  info: { level: 0, action: null, priority: 5 }
};

// ============================================
// ANALYSIS PATTERNS
// ============================================

const PATTERNS = {
  // Content that should be flagged for deletion
  irrelevant: [
    /how did the candidate/i,
    /tell me about yourself/i,
    /what are your strengths/i,
    /where do you see yourself/i,
    /why should we hire you/i,
    /what is your salary/i
  ],
  
  // Placeholder content indicators
  placeholders: [
    'TODO', 'FIXME', 'TBD', 'placeholder', 'lorem ipsum',
    'example here', 'add more', 'needs work', '[insert'
  ],
  
  // Truncation indicators
  truncated: [
    /\.{3,}$/,
    /\.\.\s*$/,
    /continues\s*$/i,
    /etc\.?\s*$/i,
    /and so on\s*$/i,
    /\[truncated/i,
    /\[continued/i
  ],
  
  // Code block patterns
  codeBlocks: /```[\s\S]*?```|`[^`]+`/g,
  
  // Technical terms for different channels
  channelTerms: {
    'system-design': ['scalability', 'availability', 'consistency', 'partition', 'latency', 'throughput', 'load balancer', 'caching', 'database', 'microservices'],
    'devops': ['ci/cd', 'kubernetes', 'docker', 'terraform', 'ansible', 'monitoring', 'deployment', 'pipeline', 'infrastructure'],
    'frontend': ['react', 'vue', 'angular', 'css', 'javascript', 'dom', 'component', 'state', 'rendering', 'accessibility'],
    'backend': ['api', 'rest', 'graphql', 'database', 'authentication', 'authorization', 'middleware', 'orm'],
    'data-engineering': ['etl', 'pipeline', 'spark', 'kafka', 'warehouse', 'lake', 'batch', 'streaming'],
    'ml-ai': ['model', 'training', 'inference', 'neural', 'transformer', 'embedding', 'fine-tuning', 'llm']
  }
};

// ============================================
// LANGGRAPH NODE DEFINITIONS
// ============================================

/**
 * Node 1: Fetch Items
 */
async function fetchNode(state) {
  console.log('\n📥 [Fetch] Getting items to analyze...');
  
  const { mode, limit, channel } = state;
  let items = [];
  
  if (mode === 'queue') {
    const workItem = await getNextWorkItem(BOT_NAME);
    if (workItem) {
      const question = await getQuestionById(workItem.itemId);
      if (question) {
        items.push({ ...question, workId: workItem.id, workAction: workItem.action });
      }
    }
  } else {
    items = await getUnverifiedQuestions(limit, channel);
  }
  
  console.log(`   Found ${items.length} items to analyze`);
  return { ...state, items, currentIndex: 0, results: [], stats: initStats() };
}

function initStats() {
  return {
    totalAnalyzed: 0,
    passed: 0,
    flagged: 0,
    byIssueType: {},
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    byChannel: {},
    avgScores: { technical: 0, clarity: 0, completeness: 0, overall: 0 }
  };
}

/**
 * Node 2: Deep Content Analysis
 * Performs comprehensive structural and content analysis
 */
async function deepAnalyzeNode(state) {
  const { items, currentIndex } = state;
  if (currentIndex >= items.length) return state;
  
  const item = items[currentIndex];
  console.log(`\n🔬 [${currentIndex + 1}/${items.length}] Analyzing: ${item.question?.substring(0, 50)}...`);
  
  const analysis = {
    id: item.id,
    channel: item.channel,
    subChannel: item.subChannel,
    issues: [],
    scores: {},
    metrics: {},
    recommendations: []
  };
  
  // 1. Structure Analysis
  const structureIssues = analyzeStructure(item);
  analysis.issues.push(...structureIssues);
  
  // 2. Content Quality Analysis
  const contentIssues = analyzeContent(item);
  analysis.issues.push(...contentIssues);
  
  // 3. Technical Relevance Analysis
  const relevanceIssues = analyzeRelevance(item);
  analysis.issues.push(...relevanceIssues);
  
  // 4. Voice Interview Readiness
  const voiceIssues = analyzeVoiceReadiness(item);
  analysis.issues.push(...voiceIssues);
  
  // 5. Calculate metrics
  analysis.metrics = calculateMetrics(item);
  
  console.log(`   📋 Found ${analysis.issues.length} issues in structural analysis`);
  
  return { ...state, currentAnalysis: analysis };
}

function analyzeStructure(item) {
  const issues = [];
  const { thresholds } = CONFIG;
  
  // Question analysis
  if (!item.question) {
    issues.push({ type: 'missing_question', severity: 'critical', message: 'Question is missing' });
  } else {
    if (item.question.length < thresholds.minQuestionLength) {
      issues.push({ type: 'short_question', severity: 'high', message: `Question too short (${item.question.length} chars, min ${thresholds.minQuestionLength})` });
    }
    if (!item.question.trim().endsWith('?')) {
      issues.push({ type: 'missing_question_mark', severity: 'low', message: 'Question should end with ?' });
    }
    if (item.question.split(' ').length < 5) {
      issues.push({ type: 'vague_question', severity: 'medium', message: 'Question lacks specificity' });
    }
  }
  
  // Answer analysis
  if (!item.answer) {
    issues.push({ type: 'missing_answer', severity: 'critical', message: 'Answer is missing' });
  } else {
    if (item.answer.length < thresholds.minAnswerLength) {
      issues.push({ type: 'short_answer', severity: 'high', message: `Answer too short (${item.answer.length} chars, min ${thresholds.minAnswerLength})` });
    }
    if (PATTERNS.truncated.some(p => p.test(item.answer))) {
      issues.push({ type: 'truncated_answer', severity: 'high', message: 'Answer appears truncated' });
    }
  }
  
  // Explanation analysis
  if (!item.explanation) {
    issues.push({ type: 'missing_explanation', severity: 'high', message: 'Explanation is missing' });
  } else {
    if (item.explanation.length < thresholds.minExplanationLength) {
      issues.push({ type: 'short_explanation', severity: 'medium', message: `Explanation too short (${item.explanation.length} chars, min ${thresholds.minExplanationLength})` });
    }
    if (PATTERNS.truncated.some(p => p.test(item.explanation))) {
      issues.push({ type: 'truncated_explanation', severity: 'high', message: 'Explanation appears truncated' });
    }
    
    // Check for code examples in technical content
    const hasCode = PATTERNS.codeBlocks.test(item.explanation);
    const technicalChannels = ['system-design', 'devops', 'frontend', 'backend', 'data-engineering'];
    if (technicalChannels.includes(item.channel) && !hasCode && item.explanation.length > 300) {
      issues.push({ type: 'missing_code_example', severity: 'low', message: 'Technical content could benefit from code examples' });
    }
  }
  
  return issues;
}

function analyzeContent(item) {
  const issues = [];
  const content = `${item.question || ''} ${item.answer || ''} ${item.explanation || ''}`.toLowerCase();
  
  // Check for placeholder content
  for (const placeholder of PATTERNS.placeholders) {
    if (content.includes(placeholder.toLowerCase())) {
      issues.push({ type: 'placeholder_content', severity: 'high', message: `Contains placeholder: "${placeholder}"` });
      break;
    }
  }
  
  // Check for irrelevant behavioral questions
  for (const pattern of PATTERNS.irrelevant) {
    if (pattern.test(item.question || '')) {
      issues.push({ type: 'irrelevant_behavioral', severity: 'critical', message: 'Non-technical behavioral question' });
      break;
    }
  }
  
  // Check answer-question alignment
  if (item.question && item.answer) {
    const questionWords = new Set(item.question.toLowerCase().split(/\W+/).filter(w => w.length > 3));
    const answerWords = new Set(item.answer.toLowerCase().split(/\W+/).filter(w => w.length > 3));
    const overlap = [...questionWords].filter(w => answerWords.has(w)).length;
    
    if (overlap < 2 && questionWords.size > 5) {
      issues.push({ type: 'answer_mismatch', severity: 'medium', message: 'Answer may not directly address the question' });
    }
  }
  
  // Check for repetitive content
  if (item.answer && item.explanation) {
    const similarity = calculateSimilarity(item.answer, item.explanation.substring(0, item.answer.length * 2));
    if (similarity > 0.8) {
      issues.push({ type: 'repetitive_content', severity: 'medium', message: 'Answer and explanation are too similar' });
    }
  }
  
  // Check difficulty alignment
  if (item.difficulty && item.explanation) {
    const wordCount = item.explanation.split(/\s+/).length;
    const hasAdvancedTerms = /\b(distributed|consensus|sharding|replication|eventual consistency|cap theorem)\b/i.test(item.explanation);
    
    if (item.difficulty === 'beginner' && hasAdvancedTerms) {
      issues.push({ type: 'difficulty_mismatch', severity: 'low', message: 'Beginner question uses advanced terminology' });
    }
    if (item.difficulty === 'advanced' && wordCount < 100 && !hasAdvancedTerms) {
      issues.push({ type: 'difficulty_mismatch', severity: 'low', message: 'Advanced question lacks depth' });
    }
  }
  
  return issues;
}

function analyzeRelevance(item) {
  const issues = [];
  
  // Check channel-specific terminology
  const channelTerms = PATTERNS.channelTerms[item.channel] || [];
  if (channelTerms.length > 0) {
    const content = `${item.question || ''} ${item.answer || ''} ${item.explanation || ''}`.toLowerCase();
    const matchedTerms = channelTerms.filter(term => content.includes(term.toLowerCase()));
    
    if (matchedTerms.length === 0) {
      issues.push({ type: 'low_channel_relevance', severity: 'medium', message: `No ${item.channel} specific terms found` });
    }
  }
  
  // Check tags relevance
  if (!item.tags || item.tags.length === 0) {
    issues.push({ type: 'missing_tags', severity: 'low', message: 'No tags assigned' });
  } else if (item.tags.length < 3) {
    issues.push({ type: 'insufficient_tags', severity: 'info', message: 'Could use more tags for discoverability' });
  }
  
  return issues;
}

function analyzeVoiceReadiness(item) {
  const issues = [];
  const { thresholds } = CONFIG;
  
  // Check voice suitability flag
  if (item.voiceSuitable === true) {
    // Validate voice keywords
    if (!item.voiceKeywords || item.voiceKeywords.length === 0) {
      issues.push({ type: 'missing_voice_keywords', severity: 'medium', message: 'Marked voice-suitable but no keywords' });
    } else if (item.voiceKeywords.length < thresholds.minVoiceKeywords) {
      issues.push({ type: 'insufficient_voice_keywords', severity: 'low', message: `Only ${item.voiceKeywords.length} voice keywords (min ${thresholds.minVoiceKeywords})` });
    } else if (item.voiceKeywords.length > thresholds.maxVoiceKeywords) {
      issues.push({ type: 'excessive_voice_keywords', severity: 'info', message: `${item.voiceKeywords.length} voice keywords may be too many` });
    }
    
    // Check keyword quality (should be 2+ words for meaningful matching)
    if (item.voiceKeywords) {
      const singleWordKeywords = item.voiceKeywords.filter(k => k.split(/\s+/).length === 1);
      if (singleWordKeywords.length > item.voiceKeywords.length * 0.5) {
        issues.push({ type: 'weak_voice_keywords', severity: 'low', message: 'Too many single-word keywords' });
      }
    }
    
    // Check if answer is concise enough for voice
    if (item.answer && item.answer.split(/[.!?]+/).length > 4) {
      issues.push({ type: 'verbose_for_voice', severity: 'info', message: 'Answer may be too long for voice practice' });
    }
  }
  
  return issues;
}

function calculateMetrics(item) {
  return {
    questionLength: item.question?.length || 0,
    answerLength: item.answer?.length || 0,
    explanationLength: item.explanation?.length || 0,
    wordCount: `${item.question || ''} ${item.answer || ''} ${item.explanation || ''}`.split(/\s+/).length,
    hasCode: PATTERNS.codeBlocks.test(item.explanation || ''),
    hasDiagram: !!item.diagram,
    tagCount: item.tags?.length || 0,
    voiceKeywordCount: item.voiceKeywords?.length || 0
  };
}

/**
 * Node 3: AI-Powered Multi-Dimensional Scoring
 */
async function multiScoreNode(state) {
  const { currentAnalysis, items, currentIndex } = state;
  if (!currentAnalysis) return state;
  
  const item = items[currentIndex];
  console.log('   🤖 [AI Score] Running multi-dimensional analysis...');
  
  const prompt = `You are an expert technical interview content reviewer. Analyze this interview question comprehensively.

QUESTION: "${item.question}"
ANSWER: "${item.answer?.substring(0, 300)}"
EXPLANATION: "${item.explanation?.substring(0, 800)}"
CHANNEL: ${item.channel}
SUB-CHANNEL: ${item.subChannel || 'general'}
DIFFICULTY: ${item.difficulty || 'intermediate'}

Score each dimension 0-100 and provide specific feedback:

1. TECHNICAL ACCURACY: Is the content factually correct? Are best practices followed?
2. CLARITY: Is the question clear? Is the answer easy to understand?
3. COMPLETENESS: Does the answer fully address the question? Are edge cases covered?
4. PRACTICAL RELEVANCE: Is this asked in real interviews? Is it useful for candidates?
5. STRUCTURE QUALITY: Is content well-organized? Good use of examples?
6. DIFFICULTY CALIBRATION: Does complexity match the stated difficulty level?

Return ONLY valid JSON:
{
  "technicalAccuracy": { "score": 0-100, "feedback": "specific issue or strength" },
  "clarity": { "score": 0-100, "feedback": "specific issue or strength" },
  "completeness": { "score": 0-100, "feedback": "what's missing or well-covered" },
  "practicalRelevance": { "score": 0-100, "feedback": "interview relevance assessment" },
  "structureQuality": { "score": 0-100, "feedback": "organization feedback" },
  "difficultyCalibration": { "score": 0-100, "feedback": "difficulty match assessment" },
  "overallAssessment": "2-3 sentence summary of content quality",
  "topImprovements": ["improvement 1", "improvement 2", "improvement 3"]
}`;

  try {
    const response = await runWithRetries(prompt);
    const scores = parseJson(response);
    
    if (scores) {
      currentAnalysis.scores = scores;
      
      // Calculate weighted overall score
      const { weights } = CONFIG;
      let weightedScore = 0;
      let totalWeight = 0;
      
      const dimensions = ['technicalAccuracy', 'clarity', 'completeness', 'practicalRelevance', 'structureQuality', 'difficultyCalibration'];
      
      for (const dim of dimensions) {
        if (scores[dim]?.score !== undefined) {
          const weight = weights[dim] || 0.1;
          weightedScore += scores[dim].score * weight;
          totalWeight += weight;
        }
      }
      
      currentAnalysis.overallScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 50;
      currentAnalysis.recommendations = scores.topImprovements || [];
      
      // Add issues based on low scores
      for (const dim of dimensions) {
        if (scores[dim]?.score < 60) {
          currentAnalysis.issues.push({
            type: `low_${dim.replace(/([A-Z])/g, '_$1').toLowerCase()}`,
            severity: scores[dim].score < 40 ? 'high' : 'medium',
            message: scores[dim].feedback
          });
        }
      }
      
      console.log(`   📊 Overall Score: ${currentAnalysis.overallScore}/100`);
      console.log(`      Technical: ${scores.technicalAccuracy?.score || 'N/A'} | Clarity: ${scores.clarity?.score || 'N/A'} | Complete: ${scores.completeness?.score || 'N/A'}`);
    }
  } catch (error) {
    console.error('   ⚠️ AI scoring failed:', error.message);
    currentAnalysis.overallScore = 50;
  }
  
  return { ...state, currentAnalysis };
}

/**
 * Node 4: Duplicate & Similarity Detection
 */
async function duplicateCheckNode(state) {
  const { currentAnalysis, items, currentIndex } = state;
  if (!currentAnalysis) return state;
  
  const item = items[currentIndex];
  console.log('   🔄 [Duplicate] Checking for similar content...');
  
  const similar = await findSimilarQuestions(item.id, item.question, item.channel);
  
  if (similar.length > 0) {
    const highSimilarity = similar.filter(s => s.similarity >= 0.85);
    const mediumSimilarity = similar.filter(s => s.similarity >= 0.75 && s.similarity < 0.85);
    
    if (highSimilarity.length > 0) {
      currentAnalysis.issues.push({
        type: 'likely_duplicate',
        severity: 'high',
        message: `Very similar to: ${highSimilarity.map(s => `${s.id} (${Math.round(s.similarity * 100)}%)`).join(', ')}`
      });
    } else if (mediumSimilarity.length > 0) {
      currentAnalysis.issues.push({
        type: 'potential_duplicate',
        severity: 'medium',
        message: `Similar to: ${mediumSimilarity.map(s => `${s.id} (${Math.round(s.similarity * 100)}%)`).join(', ')}`
      });
    }
    
    currentAnalysis.duplicates = similar;
    console.log(`   Found ${similar.length} similar questions (${highSimilarity.length} high similarity)`);
  }
  
  return { ...state, currentAnalysis };
}

/**
 * Node 5: Generate Analysis Report & Create Work Items
 */
async function reportAndQueueNode(state) {
  const { currentAnalysis, items, currentIndex, results, stats } = state;
  if (!currentAnalysis) return state;
  
  const item = items[currentIndex];
  
  // Categorize issues by severity
  const issuesBySeverity = {
    critical: currentAnalysis.issues.filter(i => i.severity === 'critical'),
    high: currentAnalysis.issues.filter(i => i.severity === 'high'),
    medium: currentAnalysis.issues.filter(i => i.severity === 'medium'),
    low: currentAnalysis.issues.filter(i => i.severity === 'low'),
    info: currentAnalysis.issues.filter(i => i.severity === 'info')
  };
  
  // Determine action
  let action = null;
  let priority = 5;
  
  if (issuesBySeverity.critical.length > 0) {
    action = 'delete';
    priority = 1;
  } else if (issuesBySeverity.high.length >= 2 || (issuesBySeverity.high.length >= 1 && issuesBySeverity.medium.length >= 2)) {
    action = 'improve';
    priority = 2;
  } else if (issuesBySeverity.high.length > 0 || issuesBySeverity.medium.length >= 2) {
    action = 'improve';
    priority = 3;
  } else if (issuesBySeverity.medium.length > 0 || issuesBySeverity.low.length >= 3) {
    action = 'improve';
    priority = 4;
  }
  
  // Build detailed reason
  const buildReason = () => {
    const parts = [];
    
    // Issue summary
    const issueSummary = currentAnalysis.issues
      .filter(i => i.severity !== 'info')
      .slice(0, 5)
      .map(i => i.type)
      .join(', ');
    if (issueSummary) parts.push(`Issues: ${issueSummary}`);
    
    // AI feedback
    if (currentAnalysis.scores?.overallAssessment) {
      parts.push(`AI: ${currentAnalysis.scores.overallAssessment.substring(0, 150)}`);
    }
    
    // Top improvements
    if (currentAnalysis.recommendations?.length > 0) {
      parts.push(`Fix: ${currentAnalysis.recommendations.slice(0, 2).join('; ')}`);
    }
    
    // Score
    parts.push(`Score: ${currentAnalysis.overallScore}/100`);
    
    return parts.join(' | ').substring(0, 500);
  };
  
  if (action) {
    await addToQueue({
      itemType: 'question',
      itemId: item.id,
      action,
      priority,
      reason: buildReason(),
      createdBy: BOT_NAME,
      assignedTo: 'processor'
    });
    
    await logAction({
      botName: BOT_NAME,
      action: 'flag',
      itemType: 'question',
      itemId: item.id,
      afterState: {
        score: currentAnalysis.overallScore,
        issueCount: currentAnalysis.issues.length,
        issues: currentAnalysis.issues.slice(0, 10),
        recommendations: currentAnalysis.recommendations
      },
      reason: `Flagged for ${action}: ${currentAnalysis.issues.length} issues, score ${currentAnalysis.overallScore}/100`
    });
    
    console.log(`   📋 Created work item: ${action} (priority ${priority})`);
    stats.flagged++;
  } else {
    await markAsVerified(item.id, currentAnalysis.overallScore);
    console.log(`   ✅ Verified - score ${currentAnalysis.overallScore}/100`);
    stats.passed++;
  }
  
  // Update stats
  stats.totalAnalyzed++;
  for (const issue of currentAnalysis.issues) {
    stats.byIssueType[issue.type] = (stats.byIssueType[issue.type] || 0) + 1;
    stats.bySeverity[issue.severity] = (stats.bySeverity[issue.severity] || 0) + 1;
  }
  stats.byChannel[item.channel] = (stats.byChannel[item.channel] || 0) + 1;
  
  // Complete work item if from queue
  if (item.workId) {
    await completeWorkItem(item.workId, { 
      verified: true, 
      score: currentAnalysis.overallScore,
      issues: currentAnalysis.issues.length 
    });
  }
  
  // Store result
  results.push({
    id: item.id,
    channel: item.channel,
    score: currentAnalysis.overallScore,
    issueCount: currentAnalysis.issues.length,
    action,
    priority,
    topIssues: currentAnalysis.issues.slice(0, 3).map(i => i.type)
  });
  
  return { 
    ...state, 
    results, 
    stats,
    currentIndex: currentIndex + 1,
    currentAnalysis: null 
  };
}

// ============================================
// DATABASE HELPERS
// ============================================

async function getQuestionById(id) {
  const result = await db.execute({
    sql: 'SELECT * FROM questions WHERE id = ?',
    args: [id]
  });
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    explanation: row.explanation,
    channel: row.channel,
    subChannel: row.sub_channel,
    difficulty: row.difficulty,
    diagram: row.diagram,
    tags: row.tags ? JSON.parse(row.tags) : [],
    voiceKeywords: row.voice_keywords ? JSON.parse(row.voice_keywords) : null,
    voiceSuitable: row.voice_suitable === 1,
    status: row.status
  };
}

async function getUnverifiedQuestions(limit = 100, channel = null) {
  let sql = `SELECT * FROM questions 
             WHERE status = 'active' 
             AND id NOT IN (
               SELECT DISTINCT item_id FROM bot_ledger 
               WHERE bot_name = 'verifier' 
               AND action IN ('verify', 'flag')
               AND created_at > datetime('now', '-7 days')
             )`;
  
  const args = [];
  
  if (channel) {
    sql += ' AND channel = ?';
    args.push(channel);
  }
  
  sql += ' ORDER BY RANDOM() LIMIT ?';
  args.push(limit);
  
  const result = await db.execute({ sql, args });
  
  return result.rows.map(row => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    explanation: row.explanation,
    channel: row.channel,
    subChannel: row.sub_channel,
    difficulty: row.difficulty,
    diagram: row.diagram,
    tags: row.tags ? JSON.parse(row.tags) : [],
    voiceKeywords: row.voice_keywords ? JSON.parse(row.voice_keywords) : null,
    voiceSuitable: row.voice_suitable === 1,
    status: row.status
  }));
}

async function findSimilarQuestions(excludeId, questionText, channel) {
  const similar = [];
  
  // Try vector DB first for semantic similarity
  const vdb = await getVectorDB();
  if (vdb) {
    try {
      const vectorResults = await vdb.findSimilar(questionText, {
        limit: 10,
        threshold: 0.3, // Lower for TF-IDF embeddings
        channel,
        excludeIds: [excludeId]
      });
      
      for (const r of vectorResults) {
        if (r.similarity >= CONFIG.thresholds.duplicateSimilarity * 100) {
          similar.push({
            id: r.id,
            similarity: r.similarity / 100,
            question: r.question?.substring(0, 80)
          });
        }
      }
      
      if (similar.length > 0) {
        console.log(`   Vector DB found ${similar.length} similar questions`);
        return similar.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
      }
    } catch (error) {
      console.log(`   Vector DB search failed: ${error.message}, using fallback`);
    }
  }
  
  // Fallback to TF-IDF comparison
  const result = await db.execute({
    sql: 'SELECT id, question FROM questions WHERE channel = ? AND id != ? AND status = ? LIMIT 150',
    args: [channel, excludeId, 'active']
  });
  
  for (const row of result.rows) {
    const similarity = calculateSimilarity(questionText, row.question);
    if (similarity >= CONFIG.thresholds.duplicateSimilarity) {
      similar.push({ id: row.id, similarity, question: row.question.substring(0, 80) });
    }
  }
  
  return similar.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
}

async function markAsVerified(id, score) {
  await logAction({
    botName: BOT_NAME,
    action: 'verify',
    itemType: 'question',
    itemId: id,
    afterState: { score },
    reason: `Passed verification with score ${score}/100`
  });
}

// ============================================
// PIPELINE EXECUTOR
// ============================================

async function runPipeline(options = {}) {
  const { mode = 'scan', limit = 100, channel = null } = options;
  
  let state = { mode, limit, channel };
  
  // Fetch items
  state = await fetchNode(state);
  
  if (state.items.length === 0) {
    console.log('No items to analyze');
    return { processed: 0, flagged: 0, stats: state.stats };
  }
  
  // Process each item through the pipeline
  while (state.currentIndex < state.items.length) {
    try {
      state = await deepAnalyzeNode(state);
      state = await multiScoreNode(state);
      state = await duplicateCheckNode(state);
      state = await reportAndQueueNode(state);
    } catch (error) {
      console.error(`   ❌ Error processing item: ${error.message}`);
      state.currentIndex++;
    }
    
    // Rate limiting
    if (state.currentIndex < state.items.length) {
      await new Promise(r => setTimeout(r, 800));
    }
  }
  
  return {
    processed: state.results.length,
    flagged: state.stats.flagged,
    passed: state.stats.passed,
    stats: state.stats,
    results: state.results
  };
}

// ============================================
// REPORT GENERATION
// ============================================

function generateReport(stats, results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION REPORT');
  console.log('='.repeat(60));
  
  console.log(`\n📈 SUMMARY`);
  console.log(`   Total Analyzed: ${stats.totalAnalyzed}`);
  console.log(`   ✅ Passed: ${stats.passed} (${Math.round(stats.passed / stats.totalAnalyzed * 100)}%)`);
  console.log(`   🚩 Flagged: ${stats.flagged} (${Math.round(stats.flagged / stats.totalAnalyzed * 100)}%)`);
  
  console.log(`\n⚠️ ISSUES BY SEVERITY`);
  for (const [severity, count] of Object.entries(stats.bySeverity)) {
    if (count > 0) {
      const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
      console.log(`   ${icon} ${severity}: ${count}`);
    }
  }
  
  console.log(`\n🏷️ TOP ISSUE TYPES`);
  const sortedIssues = Object.entries(stats.byIssueType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [type, count] of sortedIssues) {
    console.log(`   • ${type}: ${count}`);
  }
  
  console.log(`\n📁 BY CHANNEL`);
  for (const [channel, count] of Object.entries(stats.byChannel)) {
    console.log(`   • ${channel}: ${count}`);
  }
  
  // Show worst performing items
  const worstItems = results
    .filter(r => r.score !== undefined)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);
  
  if (worstItems.length > 0) {
    console.log(`\n🔻 LOWEST SCORING ITEMS`);
    for (const item of worstItems) {
      console.log(`   • ${item.id}: ${item.score}/100 - ${item.topIssues.join(', ')}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('=== 🔬 Verifier Bot - Advanced Analysis Engine ===\n');
  
  await initBotTables();
  
  const run = await startRun(BOT_NAME);
  const runStats = { processed: 0, created: 0, updated: 0, deleted: 0 };
  
  try {
    const mode = process.env.MODE || 'scan';
    const limit = parseInt(process.env.LIMIT || '100');
    const channel = process.env.CHANNEL || null;
    
    console.log(`Mode: ${mode}`);
    console.log(`Limit: ${limit}`);
    if (channel) console.log(`Channel: ${channel}`);
    console.log('');
    
    const result = await runPipeline({ mode, limit, channel });
    
    runStats.processed = result.processed;
    runStats.created = result.flagged;
    
    await updateRunStats(run.id, runStats);
    await completeRun(run.id, runStats, { 
      message: 'Verifier Bot completed',
      passed: result.passed,
      flagged: result.flagged,
      stats: result.stats
    });
    
    // Generate detailed report
    generateReport(result.stats, result.results);
    
  } catch (error) {
    console.error('Fatal error:', error);
    await failRun(run.id, error);
    process.exit(1);
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(console.error);
}

export { runPipeline, CONFIG };
export default { runPipeline, CONFIG };
