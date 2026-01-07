/**
 * Qdrant-Enhanced Semantic Duplicate Detection Pipeline
 * 
 * Uses Qdrant vector database and local ML models for accurate
 * duplicate detection and question relevance analysis.
 * 
 * Flow:
 *   fetch_questions → generate_embeddings → store_vectors → 
 *   find_duplicates → analyze_clusters → generate_report → end
 */

import { StateGraph, END, START } from '@langchain/langgraph';
import { Annotation } from '@langchain/langgraph';
import vectorDB from '../services/vector-db.js';
import mlDecisions, { THRESHOLDS } from '../services/ml-decisions.js';
import embeddings from '../providers/embeddings.js';

// Define the state schema
const QdrantDuplicateState = Annotation.Root({
  // Input
  channelId: Annotation({ reducer: (_, b) => b, default: () => '' }),
  questions: Annotation({ reducer: (_, b) => b, default: () => [] }),
  threshold: Annotation({ reducer: (_, b) => b, default: () => 0.85 }),
  
  // Processing
  indexed: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  
  // Results
  duplicateClusters: Annotation({ reducer: (_, b) => b, default: () => [] }),
  nearDuplicates: Annotation({ reducer: (_, b) => b, default: () => [] }),
  uniqueQuestions: Annotation({ reducer: (_, b) => b, default: () => [] }),
  qualityIssues: Annotation({ reducer: (_, b) => b, default: () => [] }),
  
  // Stats
  stats: Annotation({ reducer: (_, b) => b, default: () => {} }),
  
  // Output
  status: Annotation({ reducer: (_, b) => b, default: () => 'pending' }),
  error: Annotation({ reducer: (_, b) => b, default: () => null })
});

/**
 * Node: Index questions in Qdrant
 */
async function indexQuestionsNode(state) {
  console.log('\n📥 [INDEX_QUESTIONS] Storing vectors in Qdrant...');
  
  const { questions } = state;
  
  try {
    const result = await vectorDB.indexQuestions(questions);
    console.log(`   Indexed ${result.indexed} questions`);
    
    return { indexed: result.indexed };
  } catch (error) {
    console.error('   Indexing failed:', error.message);
    return { error: error.message, status: 'failed' };
  }
}

/**
 * Node: Find duplicates using Qdrant similarity search
 */
async function findDuplicatesNode(state) {
  console.log('\n🔍 [FIND_DUPLICATES] Searching for similar questions...');
  
  const { questions, threshold } = state;
  const duplicatePairs = [];
  const nearDuplicatePairs = [];
  const processed = new Set();
  
  for (const question of questions) {
    if (processed.has(question.id)) continue;
    
    try {
      const duplicates = await vectorDB.findDuplicates(question, threshold);
      
      for (const dup of duplicates) {
        if (processed.has(dup.id)) continue;
        
        const pair = {
          id1: question.id,
          id2: dup.id,
          question1: question.question.substring(0, 60),
          question2: dup.question?.substring(0, 60),
          similarity: Math.round(dup.score * 100),
          channel: question.channel
        };
        
        if (dup.score >= THRESHOLDS.DUPLICATE) {
          duplicatePairs.push(pair);
        } else if (dup.score >= THRESHOLDS.NEAR_DUPLICATE) {
          nearDuplicatePairs.push(pair);
        }
      }
    } catch (error) {
      console.error(`   Error checking ${question.id}:`, error.message);
    }
    
    processed.add(question.id);
  }
  
  console.log(`   Found ${duplicatePairs.length} exact duplicates`);
  console.log(`   Found ${nearDuplicatePairs.length} near-duplicates`);
  
  return { 
    duplicatePairs,
    nearDuplicates: nearDuplicatePairs
  };
}

/**
 * Node: Cluster duplicates using Union-Find
 */
function clusterDuplicatesNode(state) {
  console.log('\n🔗 [CLUSTER_DUPLICATES] Grouping duplicate clusters...');
  
  const { questions, duplicatePairs } = state;
  
  // Union-Find
  const parent = {};
  const rank = {};
  
  for (const q of questions) {
    parent[q.id] = q.id;
    rank[q.id] = 0;
  }
  
  function find(x) {
    if (parent[x] !== x) {
      parent[x] = find(parent[x]);
    }
    return parent[x];
  }
  
  function union(x, y) {
    const px = find(x);
    const py = find(y);
    if (px === py) return;
    if (rank[px] < rank[py]) parent[px] = py;
    else if (rank[px] > rank[py]) parent[py] = px;
    else { parent[py] = px; rank[px]++; }
  }
  
  // Union duplicate pairs
  for (const pair of duplicatePairs || []) {
    union(pair.id1, pair.id2);
  }
  
  // Group by root
  const clusters = {};
  for (const q of questions) {
    const root = find(q.id);
    if (!clusters[root]) clusters[root] = [];
    clusters[root].push(q);
  }
  
  // Filter to clusters with duplicates
  const duplicateClusters = Object.values(clusters)
    .filter(c => c.length > 1)
    .map((cluster, idx) => ({
      clusterId: idx + 1,
      size: cluster.length,
      questions: cluster.map(q => ({
        id: q.id,
        question: q.question.substring(0, 80),
        difficulty: q.difficulty,
        channel: q.channel
      })),
      recommendation: cluster.length > 2 ? 'merge' : 'review'
    }));
  
  // Identify unique questions
  const duplicateIds = new Set(
    duplicateClusters.flatMap(c => c.questions.map(q => q.id))
  );
  const uniqueQuestions = questions
    .filter(q => !duplicateIds.has(q.id))
    .map(q => q.id);
  
  console.log(`   Found ${duplicateClusters.length} duplicate clusters`);
  console.log(`   ${uniqueQuestions.length} unique questions`);
  
  return { duplicateClusters, uniqueQuestions };
}

/**
 * Node: Analyze quality issues using ML
 */
async function analyzeQualityNode(state) {
  console.log('\n🔬 [ANALYZE_QUALITY] Running ML quality checks...');
  
  const { questions, duplicateClusters } = state;
  const qualityIssues = [];
  
  // Sample questions for quality analysis (limit to avoid long processing)
  const sampleSize = Math.min(20, questions.length);
  const sample = questions.slice(0, sampleSize);
  
  for (const question of sample) {
    try {
      const analysis = await mlDecisions.analyzeQuestion(question);
      
      if (analysis.recommendation.action !== 'approve') {
        qualityIssues.push({
          id: question.id,
          question: question.question.substring(0, 60),
          action: analysis.recommendation.action,
          reason: analysis.recommendation.reason,
          priority: analysis.recommendation.priority
        });
      }
    } catch (error) {
      // Skip quality check errors
    }
  }
  
  console.log(`   Found ${qualityIssues.length} quality issues in sample`);
  
  return { qualityIssues };
}

/**
 * Node: Generate final report
 */
function reportNode(state) {
  console.log('\n📋 [REPORT] Generating analysis report...');
  
  const { 
    questions, 
    duplicateClusters, 
    nearDuplicates, 
    uniqueQuestions,
    qualityIssues,
    threshold,
    indexed
  } = state;
  
  const totalQuestions = questions.length;
  const duplicateCount = duplicateClusters.reduce((sum, c) => sum + c.size, 0);
  const duplicateRate = totalQuestions > 0 
    ? Math.round((duplicateCount / totalQuestions) * 100) 
    : 0;
  
  const stats = {
    totalQuestions,
    indexed,
    uniqueQuestions: uniqueQuestions.length,
    duplicateClusters: duplicateClusters.length,
    duplicateQuestions: duplicateCount,
    nearDuplicates: nearDuplicates.length,
    qualityIssues: qualityIssues.length,
    duplicateRate: `${duplicateRate}%`,
    threshold: `${threshold * 100}%`,
    recommendations: {
      toMerge: duplicateClusters.filter(c => c.recommendation === 'merge').length,
      toReview: duplicateClusters.filter(c => c.recommendation === 'review').length,
      qualityFixes: qualityIssues.filter(i => i.action === 'improve').length
    }
  };
  
  console.log(`   Total: ${totalQuestions} questions`);
  console.log(`   Indexed: ${indexed}`);
  console.log(`   Unique: ${uniqueQuestions.length} (${100 - duplicateRate}%)`);
  console.log(`   Duplicates: ${duplicateCount} in ${duplicateClusters.length} clusters`);
  console.log(`   Quality issues: ${qualityIssues.length}`);
  
  return { stats, status: 'completed' };
}

/**
 * Build and compile the Qdrant duplicate detection graph
 */
export function createQdrantDuplicateGraph() {
  const graph = new StateGraph(QdrantDuplicateState);
  
  graph.addNode('index_questions', indexQuestionsNode);
  graph.addNode('find_duplicates', findDuplicatesNode);
  graph.addNode('cluster_duplicates', clusterDuplicatesNode);
  graph.addNode('analyze_quality', analyzeQualityNode);
  graph.addNode('report', reportNode);
  
  graph.addEdge(START, 'index_questions');
  graph.addEdge('index_questions', 'find_duplicates');
  graph.addEdge('find_duplicates', 'cluster_duplicates');
  graph.addEdge('cluster_duplicates', 'analyze_quality');
  graph.addEdge('analyze_quality', 'report');
  graph.addEdge('report', END);
  
  return graph.compile();
}

/**
 * Run the Qdrant duplicate detection pipeline
 */
export async function detectDuplicatesWithQdrant(questions, options = {}) {
  const graph = createQdrantDuplicateGraph();
  
  const threshold = options.threshold || 0.85;
  const channelId = options.channelId || 'all';
  
  console.log('\n' + '═'.repeat(60));
  console.log('🔍 QDRANT SEMANTIC DUPLICATE DETECTION PIPELINE');
  console.log('═'.repeat(60));
  console.log(`Channel: ${channelId}`);
  console.log(`Questions: ${questions.length}`);
  console.log(`Threshold: ${threshold * 100}%`);
  console.log(`Embedding Model: ${process.env.EMBEDDING_MODEL || 'nomic-embed-text'}`);
  
  const initialState = {
    channelId,
    questions,
    threshold,
    indexed: 0,
    duplicatePairs: [],
    duplicateClusters: [],
    nearDuplicates: [],
    uniqueQuestions: [],
    qualityIssues: [],
    stats: {},
    status: 'pending',
    error: null
  };
  
  try {
    let finalResult = initialState;
    
    for await (const step of await graph.stream(initialState)) {
      const [, nodeState] = Object.entries(step)[0];
      finalResult = { ...finalResult, ...nodeState };
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('📋 QDRANT DUPLICATE DETECTION RESULT');
    console.log('═'.repeat(60));
    console.log(`Status: ${finalResult.status}`);
    console.log(`Duplicate Rate: ${finalResult.stats.duplicateRate}`);
    console.log('═'.repeat(60) + '\n');
    
    return {
      success: true,
      ...finalResult
    };
    
  } catch (error) {
    console.error('Pipeline error:', error);
    return { success: false, error: error.message };
  }
}

export default { createQdrantDuplicateGraph, detectDuplicatesWithQdrant };
