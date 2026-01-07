/**
 * LangGraph-based Adaptive Learning Pipeline
 * 
 * Personalizes learning paths based on user performance, strengths, and weaknesses.
 * Uses spaced repetition science + AI to optimize learning efficiency.
 * Now enhanced with Vector DB for semantic question discovery.
 * 
 * Flow:
 *   analyze_performance → identify_gaps → generate_path → prioritize → recommend → end
 */

import { StateGraph, END, START } from '@langchain/langgraph';
import { Annotation } from '@langchain/langgraph';
import vectorDB from '../services/vector-db.js';

// Define the state schema
const AdaptiveLearningState = Annotation.Root({
  // Input
  userId: Annotation({ reducer: (_, b) => b, default: () => '' }),
  channelId: Annotation({ reducer: (_, b) => b, default: () => '' }),
  
  // User performance data
  answeredQuestions: Annotation({ reducer: (_, b) => b, default: () => [] }),
  correctAnswers: Annotation({ reducer: (_, b) => b, default: () => [] }),
  incorrectAnswers: Annotation({ reducer: (_, b) => b, default: () => [] }),
  timeSpent: Annotation({ reducer: (_, b) => b, default: () => {} }),
  streakData: Annotation({ reducer: (_, b) => b, default: () => {} }),
  
  // Analysis results
  strengthAreas: Annotation({ reducer: (_, b) => b, default: () => [] }),
  weaknessAreas: Annotation({ reducer: (_, b) => b, default: () => [] }),
  knowledgeGaps: Annotation({ reducer: (_, b) => b, default: () => [] }),
  masteryLevels: Annotation({ reducer: (_, b) => b, default: () => {} }),
  
  // Learning path
  recommendedPath: Annotation({ reducer: (_, b) => b, default: () => [] }),
  nextQuestions: Annotation({ reducer: (_, b) => b, default: () => [] }),
  reviewQueue: Annotation({ reducer: (_, b) => b, default: () => [] }),
  
  // Spaced repetition
  srsSchedule: Annotation({ reducer: (_, b) => b, default: () => {} }),
  dueForReview: Annotation({ reducer: (_, b) => b, default: () => [] }),
  
  // Output
  status: Annotation({ reducer: (_, b) => b, default: () => 'pending' }),
  error: Annotation({ reducer: (_, b) => b, default: () => null })
});

// Spaced repetition intervals (in hours)
const SRS_INTERVALS = [
  4,      // Level 0: 4 hours
  24,     // Level 1: 1 day
  72,     // Level 2: 3 days
  168,    // Level 3: 1 week
  336,    // Level 4: 2 weeks
  720,    // Level 5: 1 month
  2160,   // Level 6: 3 months
  4320    // Level 7: 6 months (mastered)
];

// Topic difficulty weights (used in path generation scoring)
const DIFFICULTY_WEIGHTS = {
  beginner: 1,
  intermediate: 2,
  advanced: 3
};

// Helper to get difficulty weight
function getDifficultyWeight(difficulty) {
  return DIFFICULTY_WEIGHTS[difficulty] || 2;
}

/**
 * Node: Analyze user performance
 */
function analyzePerformanceNode(state) {
  console.log('\n📊 [ANALYZE_PERFORMANCE] Analyzing user learning data...');
  
  const { answeredQuestions, correctAnswers, timeSpent } = state;
  
  // Factor in time spent for mastery calculation
  const avgTimePerQuestion = Object.values(timeSpent).length > 0
    ? Object.values(timeSpent).reduce((a, b) => a + b, 0) / Object.values(timeSpent).length
    : 0;
  console.log(`   Avg time per question: ${Math.round(avgTimePerQuestion)}ms`);
  
  // Calculate accuracy by tag/topic
  const tagAccuracy = {};
  const tagAttempts = {};
  
  for (const q of answeredQuestions) {
    const tags = q.tags || [];
    const isCorrect = correctAnswers.includes(q.id);
    
    for (const tag of tags) {
      tagAttempts[tag] = (tagAttempts[tag] || 0) + 1;
      if (isCorrect) {
        tagAccuracy[tag] = (tagAccuracy[tag] || 0) + 1;
      }
    }
  }
  
  // Calculate mastery levels (0-100)
  const masteryLevels = {};
  for (const tag of Object.keys(tagAttempts)) {
    const attempts = tagAttempts[tag];
    const correct = tagAccuracy[tag] || 0;
    const accuracy = attempts > 0 ? (correct / attempts) * 100 : 0;
    
    // Mastery = accuracy * confidence factor (more attempts = more confidence)
    const confidenceFactor = Math.min(1, attempts / 10);
    masteryLevels[tag] = Math.round(accuracy * confidenceFactor);
  }
  
  // Identify strengths (mastery > 70) and weaknesses (mastery < 50)
  const strengthAreas = Object.entries(masteryLevels)
    .filter(([, level]) => level >= 70)
    .map(([tag]) => tag);
  
  const weaknessAreas = Object.entries(masteryLevels)
    .filter(([, level]) => level < 50)
    .map(([tag]) => tag);
  
  console.log(`   Strengths: ${strengthAreas.join(', ') || 'None identified yet'}`);
  console.log(`   Weaknesses: ${weaknessAreas.join(', ') || 'None identified yet'}`);
  console.log(`   Topics analyzed: ${Object.keys(masteryLevels).length}`);
  
  return {
    masteryLevels,
    strengthAreas,
    weaknessAreas
  };
}

/**
 * Node: Identify knowledge gaps
 */
function identifyGapsNode(state) {
  console.log('\n🔍 [IDENTIFY_GAPS] Finding knowledge gaps...');
  
  const { weaknessAreas, incorrectAnswers } = state;
  const masteryLevels = state.masteryLevels || {};
  
  // Analyze incorrect answers to find patterns
  const errorPatterns = {};
  
  for (const q of incorrectAnswers) {
    const tags = q.tags || [];
    const difficulty = q.difficulty || 'intermediate';
    
    for (const tag of tags) {
      if (!errorPatterns[tag]) {
        errorPatterns[tag] = { count: 0, difficulties: [] };
      }
      errorPatterns[tag].count++;
      errorPatterns[tag].difficulties.push(difficulty);
    }
  }
  
  // Identify gaps: topics with high error rates or no attempts
  const knowledgeGaps = [];
  
  // Add weakness areas with error analysis
  for (const tag of weaknessAreas) {
    const errors = errorPatterns[tag] || { count: 0, difficulties: [] };
    const mastery = masteryLevels[tag] || 0;
    
    knowledgeGaps.push({
      topic: tag,
      severity: mastery < 30 ? 'critical' : mastery < 50 ? 'high' : 'medium',
      errorCount: errors.count,
      commonDifficulty: getMostCommon(errors.difficulties) || 'intermediate',
      recommendation: getGapRecommendation(mastery, errors.count)
    });
  }
  
  // Sort by severity
  knowledgeGaps.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  console.log(`   Found ${knowledgeGaps.length} knowledge gaps`);
  knowledgeGaps.slice(0, 3).forEach(gap => {
    console.log(`   - ${gap.topic}: ${gap.severity} (${gap.recommendation})`);
  });
  
  return { knowledgeGaps };
}

function getMostCommon(arr) {
  if (!arr || arr.length === 0) return null;
  const counts = {};
  arr.forEach(item => counts[item] = (counts[item] || 0) + 1);
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function getGapRecommendation(mastery, errorCount) {
  if (mastery < 20) return 'Start with fundamentals';
  if (mastery < 40) return 'Review core concepts';
  if (errorCount > 5) return 'Practice more examples';
  return 'Focus on advanced topics';
}

/**
 * Node: Generate personalized learning path
 */
function generatePathNode(state) {
  console.log('\n🛤️ [GENERATE_PATH] Creating personalized learning path...');
  
  const { knowledgeGaps, strengthAreas, channelId } = state;
  const masteryLevels = state.masteryLevels || {};
  
  // Log channel context if provided
  if (channelId) {
    console.log(`   Focusing on channel: ${channelId}`);
  }
  
  // Calculate weighted priority using difficulty weights
  const weightedGaps = knowledgeGaps.map(gap => ({
    ...gap,
    weight: getDifficultyWeight(gap.commonDifficulty) * (gap.severity === 'critical' ? 3 : gap.severity === 'high' ? 2 : 1)
  })).sort((a, b) => b.weight - a.weight);
  
  console.log(`   Weighted ${weightedGaps.length} gaps by difficulty`);
  
  const recommendedPath = [];
  
  // Phase 1: Address critical gaps first
  const criticalGaps = knowledgeGaps.filter(g => g.severity === 'critical');
  if (criticalGaps.length > 0) {
    recommendedPath.push({
      phase: 1,
      name: 'Foundation Building',
      focus: criticalGaps.map(g => g.topic),
      difficulty: 'beginner',
      estimatedTime: '2-3 days',
      goal: 'Build fundamental understanding'
    });
  }
  
  // Phase 2: Address high-priority gaps
  const highGaps = knowledgeGaps.filter(g => g.severity === 'high');
  if (highGaps.length > 0) {
    recommendedPath.push({
      phase: 2,
      name: 'Core Concepts',
      focus: highGaps.map(g => g.topic),
      difficulty: 'intermediate',
      estimatedTime: '1 week',
      goal: 'Master core concepts'
    });
  }
  
  // Phase 3: Strengthen medium gaps
  const mediumGaps = knowledgeGaps.filter(g => g.severity === 'medium');
  if (mediumGaps.length > 0) {
    recommendedPath.push({
      phase: 3,
      name: 'Skill Refinement',
      focus: mediumGaps.map(g => g.topic),
      difficulty: 'intermediate',
      estimatedTime: '1-2 weeks',
      goal: 'Refine understanding'
    });
  }
  
  // Phase 4: Advanced topics in strength areas
  if (strengthAreas.length > 0) {
    recommendedPath.push({
      phase: 4,
      name: 'Advanced Mastery',
      focus: strengthAreas,
      difficulty: 'advanced',
      estimatedTime: '2-4 weeks',
      goal: 'Achieve expert-level knowledge'
    });
  }
  
  console.log(`   Generated ${recommendedPath.length}-phase learning path`);
  recommendedPath.forEach(phase => {
    console.log(`   Phase ${phase.phase}: ${phase.name} (${phase.focus.length} topics)`);
  });
  
  return { recommendedPath };
}

/**
 * Node: Prioritize and select next questions using Vector DB
 */
async function prioritizeNode(state) {
  console.log('\n🎯 [PRIORITIZE] Selecting optimal next questions with Vector DB...');
  
  const { knowledgeGaps, dueForReview, recommendedPath, answeredQuestions, channelId } = state;
  const masteryLevels = state.masteryLevels || {};
  
  // Log mastery context
  const avgMastery = Object.values(masteryLevels).length > 0
    ? Object.values(masteryLevels).reduce((a, b) => a + b, 0) / Object.values(masteryLevels).length
    : 0;
  console.log(`   Current avg mastery: ${Math.round(avgMastery)}%`);
  
  const nextQuestions = [];
  const reviewQueue = [];
  const answeredIds = answeredQuestions.map(q => q.id);
  
  // Priority 1: Due for SRS review (spaced repetition)
  if (dueForReview.length > 0) {
    reviewQueue.push(...dueForReview.slice(0, 5));
    console.log(`   ${reviewQueue.length} questions due for review`);
  }
  
  // Priority 2: Use Vector DB to find semantically similar questions for gap-filling
  try {
    for (const gap of knowledgeGaps.slice(0, 3)) {
      // Build a semantic query from the gap topic
      const searchQuery = `${gap.topic} ${gap.commonDifficulty} interview question`;
      
      const similar = await vectorDB.semanticSearch(searchQuery, {
        limit: 10,
        threshold: 0.15, // Lower threshold for TF-IDF
        channel: channelId || null,
        difficulty: gap.commonDifficulty
      });
      
      // Filter out already answered questions
      const newQuestions = similar.filter(q => !answeredIds.includes(q.id));
      
      if (newQuestions.length > 0) {
        nextQuestions.push({
          questions: newQuestions.slice(0, 5),
          reason: `Address ${gap.severity} gap in ${gap.topic}`,
          source: 'vector_db_semantic'
        });
        console.log(`   Found ${newQuestions.length} questions for gap: ${gap.topic}`);
      }
    }
  } catch (error) {
    console.log(`   ⚠️ Vector DB search failed: ${error.message}`);
    // Fallback to criteria-based approach
    for (const gap of knowledgeGaps.slice(0, 3)) {
      nextQuestions.push({
        criteria: {
          tags: [gap.topic],
          difficulty: gap.commonDifficulty,
          excludeAnswered: false
        },
        reason: `Address ${gap.severity} gap in ${gap.topic}`,
        source: 'criteria_fallback'
      });
    }
  }
  
  // Priority 3: Questions from current learning phase
  const currentPhase = recommendedPath[0];
  if (currentPhase) {
    const phaseTopics = currentPhase.focus;
    const phaseDifficulty = currentPhase.difficulty;
    
    try {
      // Use vector DB to find questions matching phase topics
      const phaseQuery = phaseTopics.join(' ') + ' ' + phaseDifficulty;
      const phaseQuestions = await vectorDB.semanticSearch(phaseQuery, {
        limit: 15,
        threshold: 0.1,
        channel: channelId || null
      });
      
      const newPhaseQuestions = phaseQuestions.filter(q => !answeredIds.includes(q.id));
      
      if (newPhaseQuestions.length > 0) {
        nextQuestions.push({
          questions: newPhaseQuestions.slice(0, 10),
          reason: `Phase ${currentPhase.phase}: ${currentPhase.name}`,
          source: 'vector_db_phase'
        });
        console.log(`   Found ${newPhaseQuestions.length} questions for phase: ${currentPhase.name}`);
      }
    } catch (error) {
      console.log(`   ⚠️ Phase search failed: ${error.message}`);
      nextQuestions.push({
        criteria: {
          tags: phaseTopics,
          difficulty: phaseDifficulty,
          excludeAnswered: true
        },
        reason: `Phase ${currentPhase.phase}: ${currentPhase.name}`,
        source: 'criteria_fallback'
      });
    }
  }
  
  console.log(`   Recommended ${nextQuestions.length} question sets`);
  
  return { nextQuestions, reviewQueue };
}

/**
 * Node: Calculate SRS schedule
 */
function calculateSRSNode(state) {
  console.log('\n⏰ [CALCULATE_SRS] Updating spaced repetition schedule...');
  
  const { answeredQuestions, correctAnswers, srsSchedule } = state;
  const now = Date.now();
  const updatedSchedule = { ...srsSchedule };
  const dueForReview = [];
  
  for (const q of answeredQuestions) {
    const questionId = q.id;
    const isCorrect = correctAnswers.includes(questionId);
    
    // Get or initialize SRS data for this question
    const srsData = updatedSchedule[questionId] || {
      level: 0,
      nextReview: now,
      easeFactor: 2.5,
      interval: SRS_INTERVALS[0]
    };
    
    if (isCorrect) {
      // Move up a level (max level 7)
      srsData.level = Math.min(7, srsData.level + 1);
      srsData.easeFactor = Math.min(3.0, srsData.easeFactor + 0.1);
    } else {
      // Move down a level (min level 0)
      srsData.level = Math.max(0, srsData.level - 2);
      srsData.easeFactor = Math.max(1.3, srsData.easeFactor - 0.2);
    }
    
    // Calculate next review time
    const baseInterval = SRS_INTERVALS[srsData.level];
    srsData.interval = Math.round(baseInterval * srsData.easeFactor);
    srsData.nextReview = now + (srsData.interval * 60 * 60 * 1000); // Convert hours to ms
    
    updatedSchedule[questionId] = srsData;
    
    // Check if due for review
    if (srsData.nextReview <= now) {
      dueForReview.push({
        questionId,
        level: srsData.level,
        overdueDays: Math.floor((now - srsData.nextReview) / (24 * 60 * 60 * 1000))
      });
    }
  }
  
  // Sort due items by overdue time (most overdue first)
  dueForReview.sort((a, b) => b.overdueDays - a.overdueDays);
  
  console.log(`   Updated SRS for ${Object.keys(updatedSchedule).length} questions`);
  console.log(`   ${dueForReview.length} questions due for review`);
  
  return { srsSchedule: updatedSchedule, dueForReview };
}

/**
 * Node: Finalize recommendations
 */
function finalizeNode(state) {
  console.log('\n✅ [FINALIZE] Preparing final recommendations...');
  
  const { 
    recommendedPath, 
    nextQuestions, 
    reviewQueue, 
    knowledgeGaps,
    masteryLevels,
    strengthAreas,
    weaknessAreas
  } = state;
  
  // Calculate overall readiness score
  const masteryValues = Object.values(masteryLevels);
  const avgMastery = masteryValues.length > 0 
    ? masteryValues.reduce((a, b) => a + b, 0) / masteryValues.length 
    : 0;
  
  const readinessScore = Math.round(avgMastery);
  
  console.log(`   Overall readiness: ${readinessScore}%`);
  console.log(`   Strengths: ${strengthAreas.length} topics`);
  console.log(`   Areas to improve: ${weaknessAreas.length} topics`);
  console.log(`   Learning path: ${recommendedPath.length} phases`);
  
  return {
    status: 'completed',
    summary: {
      readinessScore,
      strengthCount: strengthAreas.length,
      weaknessCount: weaknessAreas.length,
      gapCount: knowledgeGaps.length,
      reviewDue: reviewQueue.length,
      pathPhases: recommendedPath.length
    }
  };
}

/**
 * Build and compile the adaptive learning graph
 */
export function createAdaptiveLearningGraph() {
  const graph = new StateGraph(AdaptiveLearningState);
  
  graph.addNode('analyze_performance', analyzePerformanceNode);
  graph.addNode('identify_gaps', identifyGapsNode);
  graph.addNode('generate_path', generatePathNode);
  graph.addNode('calculate_srs', calculateSRSNode);
  graph.addNode('prioritize', prioritizeNode);
  graph.addNode('finalize', finalizeNode);
  
  graph.addEdge(START, 'analyze_performance');
  graph.addEdge('analyze_performance', 'identify_gaps');
  graph.addEdge('identify_gaps', 'generate_path');
  graph.addEdge('generate_path', 'calculate_srs');
  graph.addEdge('calculate_srs', 'prioritize');
  graph.addEdge('prioritize', 'finalize');
  graph.addEdge('finalize', END);
  
  return graph.compile();
}

/**
 * Run the adaptive learning pipeline
 */
export async function generateLearningPath(userData) {
  const graph = createAdaptiveLearningGraph();
  
  console.log('\n' + '═'.repeat(60));
  console.log('🧠 ADAPTIVE LEARNING PIPELINE');
  console.log('═'.repeat(60));
  console.log(`User: ${userData.userId}`);
  console.log(`Channel: ${userData.channelId || 'all'}`);
  console.log(`Questions answered: ${userData.answeredQuestions?.length || 0}`);
  
  const initialState = {
    userId: userData.userId,
    channelId: userData.channelId || '',
    answeredQuestions: userData.answeredQuestions || [],
    correctAnswers: userData.correctAnswers || [],
    incorrectAnswers: userData.incorrectAnswers || [],
    timeSpent: userData.timeSpent || {},
    streakData: userData.streakData || {},
    srsSchedule: userData.srsSchedule || {},
    strengthAreas: [],
    weaknessAreas: [],
    knowledgeGaps: [],
    masteryLevels: {},
    recommendedPath: [],
    nextQuestions: [],
    reviewQueue: [],
    dueForReview: [],
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
    console.log('📋 LEARNING PATH RESULT');
    console.log('═'.repeat(60));
    console.log(`Status: ${finalResult.status}`);
    console.log(`Readiness Score: ${finalResult.summary?.readinessScore}%`);
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

export default { createAdaptiveLearningGraph, generateLearningPath };
