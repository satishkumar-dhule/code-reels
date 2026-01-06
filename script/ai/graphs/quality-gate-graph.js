/**
 * LangGraph-based Quality Gate Pipeline
 * 
 * Comprehensive quality checks for any new question before it enters the system.
 * All questions must pass through this gate.
 * 
 * Flow:
 *   validate_structure → check_duplicates → validate_content → validate_difficulty → 
 *   validate_relevance → validate_media → score_quality → decide → end
 */

import { StateGraph, END, START } from '@langchain/langgraph';
import { Annotation } from '@langchain/langgraph';

// Define the state schema
const QualityGateState = Annotation.Root({
  // Input question
  question: Annotation({ reducer: (_, b) => b, default: () => null }),
  channel: Annotation({ reducer: (_, b) => b, default: () => '' }),
  subChannel: Annotation({ reducer: (_, b) => b, default: () => '' }),
  difficulty: Annotation({ reducer: (_, b) => b, default: () => '' }),
  
  // Existing questions for duplicate check
  existingQuestions: Annotation({ reducer: (_, b) => b, default: () => [] }),
  
  // Validation results
  structureValid: Annotation({ reducer: (_, b) => b, default: () => false }),
  duplicateScore: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  potentialDuplicates: Annotation({ reducer: (_, b) => b, default: () => [] }),
  contentScore: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  difficultyScore: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  relevanceScore: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  mediaScore: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  
  // Issues found
  issues: Annotation({ reducer: (a, b) => [...a, ...b], default: () => [] }),
  warnings: Annotation({ reducer: (a, b) => [...a, ...b], default: () => [] }),
  
  // Final scores
  overallScore: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  passThreshold: Annotation({ reducer: (_, b) => b, default: () => 70 }),
  
  // Output
  status: Annotation({ reducer: (_, b) => b, default: () => 'pending' }),
  decision: Annotation({ reducer: (_, b) => b, default: () => 'pending' }),
  error: Annotation({ reducer: (_, b) => b, default: () => null })
});

// ============================================
// VALIDATION NODES
// ============================================

/**
 * Node: Validate question structure
 */
function validateStructureNode(state) {
  console.log('\n📋 [VALIDATE_STRUCTURE] Checking question structure...');
  
  const q = state.question;
  const issues = [];
  
  // Required fields
  if (!q.question || typeof q.question !== 'string') {
    issues.push('Missing or invalid question text');
  }
  
  if (!q.answer || typeof q.answer !== 'string') {
    issues.push('Missing or invalid answer');
  }
  
  // Question format
  if (q.question) {
    if (q.question.length < 20) {
      issues.push('Question too short (min 20 chars)');
    }
    if (q.question.length > 1000) {
      issues.push('Question too long (max 1000 chars)');
    }
    if (!q.question.trim().endsWith('?')) {
      issues.push('Question must end with ?');
    }
  }
  
  // Answer format
  if (q.answer) {
    if (q.answer.length < 50) {
      issues.push('Answer too short (min 50 chars)');
    }
    if (q.answer.length > 5000) {
      issues.push('Answer too long (max 5000 chars)');
    }
  }
  
  // Tags validation
  if (q.tags && !Array.isArray(q.tags)) {
    issues.push('Tags must be an array');
  }
  
  const structureValid = issues.length === 0;
  console.log(`   Structure valid: ${structureValid ? '✅' : '❌'}`);
  if (issues.length > 0) {
    console.log(`   Issues: ${issues.join(', ')}`);
  }
  
  return { structureValid, issues };
}

/**
 * Node: Check for duplicates using TF-IDF similarity
 */
function checkDuplicatesNode(state) {
  console.log('\n🔍 [CHECK_DUPLICATES] Scanning for similar questions...');
  
  const { question, existingQuestions } = state;
  
  if (!existingQuestions || existingQuestions.length === 0) {
    console.log('   No existing questions to compare');
    return { duplicateScore: 100, potentialDuplicates: [] };
  }
  
  // Tokenize and create TF vectors
  function tokenize(text) {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }
  
  function createTF(tokens) {
    const tf = {};
    tokens.forEach(t => tf[t] = (tf[t] || 0) + 1);
    const len = tokens.length || 1;
    Object.keys(tf).forEach(k => tf[k] /= len);
    return tf;
  }
  
  function cosineSimilarity(tf1, tf2) {
    const keys = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);
    let dot = 0, norm1 = 0, norm2 = 0;
    for (const k of keys) {
      const v1 = tf1[k] || 0;
      const v2 = tf2[k] || 0;
      dot += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    }
    const mag = Math.sqrt(norm1) * Math.sqrt(norm2);
    return mag > 0 ? dot / mag : 0;
  }
  
  const newTokens = tokenize(question.question);
  const newTF = createTF(newTokens);
  
  const potentialDuplicates = [];
  let maxSimilarity = 0;
  
  for (const existing of existingQuestions) {
    const existingTokens = tokenize(existing.question || '');
    const existingTF = createTF(existingTokens);
    const similarity = cosineSimilarity(newTF, existingTF);
    
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
    }
    
    if (similarity > 0.7) {
      potentialDuplicates.push({
        id: existing.id,
        question: existing.question?.substring(0, 80),
        similarity: Math.round(similarity * 100)
      });
    }
  }
  
  // Score: 100 = no duplicates, 0 = exact duplicate
  const duplicateScore = Math.round((1 - maxSimilarity) * 100);
  
  console.log(`   Max similarity: ${Math.round(maxSimilarity * 100)}%`);
  console.log(`   Potential duplicates: ${potentialDuplicates.length}`);
  console.log(`   Duplicate score: ${duplicateScore}/100`);
  
  const issues = [];
  const warnings = [];
  
  if (maxSimilarity > 0.9) {
    issues.push(`Very similar to existing question (${Math.round(maxSimilarity * 100)}% match)`);
  } else if (maxSimilarity > 0.8) {
    warnings.push(`Similar to existing question (${Math.round(maxSimilarity * 100)}% match)`);
  }
  
  return { duplicateScore, potentialDuplicates, issues, warnings };
}

/**
 * Node: Validate content quality
 */
function validateContentNode(state) {
  console.log('\n📝 [VALIDATE_CONTENT] Analyzing content quality...');
  
  const { question } = state;
  let score = 100;
  const issues = [];
  const warnings = [];
  
  const q = question.question || '';
  const a = question.answer || '';
  
  // Check for placeholder content
  const placeholderPatterns = [
    /lorem ipsum/i,
    /\[insert.*\]/i,
    /TODO/i,
    /FIXME/i,
    /xxx/i,
    /placeholder/i
  ];
  
  for (const pattern of placeholderPatterns) {
    if (pattern.test(q) || pattern.test(a)) {
      issues.push('Contains placeholder content');
      score -= 50;
      break;
    }
  }
  
  // Check question specificity
  const vagueStarters = [
    /^what is /i,
    /^define /i,
    /^explain /i,
    /^describe /i
  ];
  
  const isVague = vagueStarters.some(p => p.test(q)) && q.length < 60;
  if (isVague && state.difficulty !== 'beginner') {
    warnings.push('Question may be too generic');
    score -= 15;
  }
  
  // Check answer quality
  if (a.length < 100) {
    warnings.push('Answer could be more detailed');
    score -= 10;
  }
  
  // Check for code examples in technical questions
  const technicalChannels = ['algorithms', 'frontend', 'backend', 'database'];
  if (technicalChannels.includes(state.channel)) {
    const hasCode = /```|`[^`]+`|function|const |let |var |class |def |import /.test(a);
    if (!hasCode && a.length > 200) {
      warnings.push('Technical answer could benefit from code examples');
      score -= 5;
    }
  }
  
  // Check for explanation
  if (!question.explanation && a.length < 300) {
    warnings.push('Consider adding an explanation');
    score -= 5;
  }
  
  console.log(`   Content score: ${score}/100`);
  
  return { contentScore: Math.max(0, score), issues, warnings };
}

/**
 * Node: Validate difficulty alignment
 */
function validateDifficultyNode(state) {
  console.log('\n📊 [VALIDATE_DIFFICULTY] Checking difficulty alignment...');
  
  const { question, difficulty } = state;
  let score = 100;
  const warnings = [];
  
  const q = question.question || '';
  const a = question.answer || '';
  
  // Difficulty indicators
  const beginnerIndicators = ['what is', 'define', 'basic', 'simple', 'introduction'];
  const advancedIndicators = ['optimize', 'scale', 'distributed', 'trade-off', 'architecture', 'design pattern', 'complexity'];
  
  const qLower = q.toLowerCase();
  const aLower = a.toLowerCase();
  const combined = qLower + ' ' + aLower;
  
  const beginnerCount = beginnerIndicators.filter(i => combined.includes(i)).length;
  const advancedCount = advancedIndicators.filter(i => combined.includes(i)).length;
  
  if (difficulty === 'beginner') {
    if (advancedCount > 2 && beginnerCount === 0) {
      warnings.push('Content seems too advanced for beginner level');
      score -= 20;
    }
    if (q.length > 200) {
      warnings.push('Beginner questions should be concise');
      score -= 10;
    }
  } else if (difficulty === 'advanced') {
    if (beginnerCount > 2 && advancedCount === 0) {
      warnings.push('Content seems too basic for advanced level');
      score -= 20;
    }
    if (q.length < 50) {
      warnings.push('Advanced questions should be more detailed');
      score -= 10;
    }
    if (a.length < 200) {
      warnings.push('Advanced answers should be comprehensive');
      score -= 10;
    }
  }
  
  console.log(`   Difficulty score: ${score}/100`);
  
  return { difficultyScore: Math.max(0, score), warnings };
}

/**
 * Node: Validate channel relevance
 */
function validateRelevanceNode(state) {
  console.log('\n🎯 [VALIDATE_RELEVANCE] Checking channel relevance...');
  
  const { question, channel } = state;
  let score = 100;
  const warnings = [];
  
  const channelKeywords = {
    'system-design': ['design', 'scale', 'architecture', 'distributed', 'load', 'cache', 'database', 'api', 'microservice'],
    'algorithms': ['array', 'string', 'tree', 'graph', 'sort', 'search', 'dynamic', 'recursion', 'complexity', 'optimize'],
    'frontend': ['react', 'javascript', 'css', 'html', 'component', 'state', 'dom', 'browser', 'render', 'hook'],
    'backend': ['api', 'server', 'database', 'authentication', 'rest', 'graphql', 'middleware', 'request', 'response'],
    'devops': ['deploy', 'pipeline', 'ci/cd', 'docker', 'kubernetes', 'terraform', 'aws', 'cloud', 'infrastructure'],
    'sre': ['incident', 'monitoring', 'slo', 'sli', 'availability', 'reliability', 'alert', 'on-call', 'postmortem'],
    'database': ['sql', 'query', 'index', 'transaction', 'nosql', 'schema', 'normalization', 'join', 'acid'],
    'security': ['authentication', 'authorization', 'encryption', 'vulnerability', 'oauth', 'jwt', 'xss', 'csrf'],
    'behavioral': ['team', 'project', 'challenge', 'conflict', 'leadership', 'decision', 'situation', 'experience'],
    'ai-ml': ['model', 'training', 'neural', 'machine learning', 'deep learning', 'tensor', 'prediction', 'classification']
  };
  
  const keywords = channelKeywords[channel] || [];
  if (keywords.length === 0) {
    console.log(`   No keywords defined for channel: ${channel}`);
    return { relevanceScore: 80, warnings: ['Channel keywords not defined'] };
  }
  
  const combined = (question.question + ' ' + question.answer).toLowerCase();
  const matchedKeywords = keywords.filter(kw => combined.includes(kw));
  const matchRatio = matchedKeywords.length / keywords.length;
  
  if (matchRatio < 0.1) {
    warnings.push('Question may not be relevant to this channel');
    score -= 30;
  } else if (matchRatio < 0.2) {
    warnings.push('Question has limited channel-specific content');
    score -= 15;
  }
  
  console.log(`   Matched keywords: ${matchedKeywords.length}/${keywords.length}`);
  console.log(`   Relevance score: ${score}/100`);
  
  return { relevanceScore: Math.max(0, score), warnings };
}

/**
 * Node: Validate media (videos, diagrams)
 */
async function validateMediaNode(state) {
  console.log('\n🎬 [VALIDATE_MEDIA] Checking media quality...');
  
  const { question } = state;
  let score = 100;
  const warnings = [];
  
  // Check diagram
  if (question.diagram) {
    const diagram = question.diagram.trim();
    const lines = diagram.split('\n').filter(l => l.trim() && !l.trim().startsWith('%%'));
    
    if (lines.length < 4) {
      warnings.push('Diagram is too simple');
      score -= 10;
    }
    
    // Check for valid mermaid syntax
    const validStarters = ['graph', 'flowchart', 'sequencediagram', 'classdiagram', 'statediagram', 'erdiagram', 'gantt', 'pie'];
    const firstLine = lines[0]?.toLowerCase() || '';
    const hasValidStart = validStarters.some(s => firstLine.includes(s));
    
    if (!hasValidStart) {
      warnings.push('Diagram may have invalid syntax');
      score -= 15;
    }
  }
  
  // Check videos
  if (question.videos) {
    const { shortVideo, longVideo } = question.videos;
    
    if (shortVideo && !isValidYouTubeUrl(shortVideo)) {
      warnings.push('Short video URL may be invalid');
      score -= 5;
    }
    
    if (longVideo && !isValidYouTubeUrl(longVideo)) {
      warnings.push('Long video URL may be invalid');
      score -= 5;
    }
  }
  
  console.log(`   Media score: ${score}/100`);
  
  return { mediaScore: Math.max(0, score), warnings };
}

function isValidYouTubeUrl(url) {
  if (!url) return false;
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/.test(url);
}

/**
 * Node: Calculate overall quality score
 */
function scoreQualityNode(state) {
  console.log('\n📈 [SCORE_QUALITY] Calculating overall score...');
  
  const {
    structureValid,
    duplicateScore,
    contentScore,
    difficultyScore,
    relevanceScore,
    mediaScore,
    issues
  } = state;
  
  // If structure is invalid, fail immediately
  if (!structureValid) {
    console.log('   ❌ Structure invalid - automatic fail');
    return { overallScore: 0 };
  }
  
  // If there are critical issues, fail
  if (issues.length > 0) {
    console.log(`   ❌ Critical issues found: ${issues.length}`);
    return { overallScore: Math.min(40, duplicateScore) };
  }
  
  // Weighted average of scores
  const weights = {
    duplicate: 0.25,    // 25% - uniqueness is important
    content: 0.30,      // 30% - content quality is most important
    difficulty: 0.15,   // 15% - difficulty alignment
    relevance: 0.20,    // 20% - channel relevance
    media: 0.10         // 10% - media quality
  };
  
  const overallScore = Math.round(
    duplicateScore * weights.duplicate +
    contentScore * weights.content +
    difficultyScore * weights.difficulty +
    relevanceScore * weights.relevance +
    mediaScore * weights.media
  );
  
  console.log(`   Duplicate: ${duplicateScore} × ${weights.duplicate}`);
  console.log(`   Content: ${contentScore} × ${weights.content}`);
  console.log(`   Difficulty: ${difficultyScore} × ${weights.difficulty}`);
  console.log(`   Relevance: ${relevanceScore} × ${weights.relevance}`);
  console.log(`   Media: ${mediaScore} × ${weights.media}`);
  console.log(`   ═══════════════════════`);
  console.log(`   Overall: ${overallScore}/100`);
  
  return { overallScore };
}

/**
 * Node: Make final decision
 */
function decideNode(state) {
  console.log('\n⚖️ [DECIDE] Making final decision...');
  
  const { overallScore, passThreshold, issues, warnings } = state;
  
  let decision;
  let status;
  
  if (overallScore >= passThreshold) {
    decision = 'approved';
    status = 'completed';
    console.log(`   ✅ APPROVED (${overallScore} >= ${passThreshold})`);
  } else if (overallScore >= passThreshold - 15) {
    decision = 'needs_review';
    status = 'completed';
    console.log(`   ⚠️ NEEDS REVIEW (${overallScore} close to ${passThreshold})`);
  } else {
    decision = 'rejected';
    status = 'completed';
    console.log(`   ❌ REJECTED (${overallScore} < ${passThreshold})`);
  }
  
  if (warnings.length > 0) {
    console.log(`   Warnings: ${warnings.length}`);
  }
  if (issues.length > 0) {
    console.log(`   Issues: ${issues.length}`);
  }
  
  return { decision, status };
}

/**
 * Build and compile the quality gate graph
 */
export function createQualityGateGraph() {
  const graph = new StateGraph(QualityGateState);
  
  graph.addNode('validate_structure', validateStructureNode);
  graph.addNode('check_duplicates', checkDuplicatesNode);
  graph.addNode('validate_content', validateContentNode);
  graph.addNode('validate_difficulty', validateDifficultyNode);
  graph.addNode('validate_relevance', validateRelevanceNode);
  graph.addNode('validate_media', validateMediaNode);
  graph.addNode('score_quality', scoreQualityNode);
  graph.addNode('decide', decideNode);
  
  graph.addEdge(START, 'validate_structure');
  graph.addEdge('validate_structure', 'check_duplicates');
  graph.addEdge('check_duplicates', 'validate_content');
  graph.addEdge('validate_content', 'validate_difficulty');
  graph.addEdge('validate_difficulty', 'validate_relevance');
  graph.addEdge('validate_relevance', 'validate_media');
  graph.addEdge('validate_media', 'score_quality');
  graph.addEdge('score_quality', 'decide');
  graph.addEdge('decide', END);
  
  return graph.compile();
}

/**
 * Run the quality gate pipeline
 */
export async function runQualityGate(question, options = {}) {
  const graph = createQualityGateGraph();
  
  const {
    channel = '',
    subChannel = '',
    difficulty = 'intermediate',
    existingQuestions = [],
    passThreshold = 70
  } = options;
  
  console.log('\n' + '═'.repeat(60));
  console.log('🚦 QUALITY GATE PIPELINE');
  console.log('═'.repeat(60));
  console.log(`Channel: ${channel}`);
  console.log(`Difficulty: ${difficulty}`);
  console.log(`Pass threshold: ${passThreshold}`);
  console.log(`Existing questions: ${existingQuestions.length}`);
  
  const initialState = {
    question,
    channel,
    subChannel,
    difficulty,
    existingQuestions,
    structureValid: false,
    duplicateScore: 0,
    potentialDuplicates: [],
    contentScore: 0,
    difficultyScore: 0,
    relevanceScore: 0,
    mediaScore: 0,
    issues: [],
    warnings: [],
    overallScore: 0,
    passThreshold,
    status: 'pending',
    decision: 'pending',
    error: null
  };
  
  try {
    let finalResult = initialState;
    
    for await (const step of await graph.stream(initialState)) {
      const [, nodeState] = Object.entries(step)[0];
      finalResult = { ...finalResult, ...nodeState };
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('📋 QUALITY GATE RESULT');
    console.log('═'.repeat(60));
    console.log(`Decision: ${finalResult.decision.toUpperCase()}`);
    console.log(`Score: ${finalResult.overallScore}/100`);
    console.log(`Issues: ${finalResult.issues.length}`);
    console.log(`Warnings: ${finalResult.warnings.length}`);
    console.log('═'.repeat(60) + '\n');
    
    return {
      success: finalResult.decision === 'approved',
      decision: finalResult.decision,
      score: finalResult.overallScore,
      issues: finalResult.issues,
      warnings: finalResult.warnings,
      potentialDuplicates: finalResult.potentialDuplicates,
      scores: {
        duplicate: finalResult.duplicateScore,
        content: finalResult.contentScore,
        difficulty: finalResult.difficultyScore,
        relevance: finalResult.relevanceScore,
        media: finalResult.mediaScore
      }
    };
    
  } catch (error) {
    console.error('Quality gate error:', error);
    return { 
      success: false, 
      decision: 'error',
      error: error.message,
      score: 0,
      issues: [error.message],
      warnings: []
    };
  }
}

export default { createQualityGateGraph, runQualityGate };
