/**
 * Progressive Quiz System with RAG-based Question Selection
 * 
 * Selects questions that:
 * 1. Are semantically related to previous questions
 * 2. Progressively increase in difficulty based on performance
 * 3. Adapt to user's knowledge level
 */

import { Test, TestQuestion } from './tests';

export interface QuizSession {
  questions: TestQuestion[];
  currentIndex: number;
  correctCount: number;
  totalAnswered: number;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  performanceHistory: boolean[]; // true = correct, false = wrong
}

export interface QuestionWithContext {
  question: TestQuestion;
  test: Test;
  relevanceScore: number;
}

/**
 * Select next question based on performance and semantic similarity
 */
export function selectNextQuestion(
  availableTests: Test[],
  session: QuizSession,
  previousQuestion?: TestQuestion
): QuestionWithContext | null {
  if (availableTests.length === 0) return null;

  // Calculate current performance
  const recentPerformance = session.performanceHistory.slice(-3);
  const recentAccuracy = recentPerformance.length > 0
    ? recentPerformance.filter(Boolean).length / recentPerformance.length
    : 0.5;

  // Determine target difficulty based on performance
  const targetDifficulty = determineTargetDifficulty(
    session.difficultyLevel,
    recentAccuracy,
    session.totalAnswered
  );

  // Get all available questions
  const allQuestions: QuestionWithContext[] = [];
  availableTests.forEach(test => {
    test.questions.forEach(q => {
      // Skip if already answered in this session
      if (session.questions.some(sq => sq.id === q.id)) return;

      allQuestions.push({
        question: q,
        test,
        relevanceScore: 0
      });
    });
  });

  if (allQuestions.length === 0) return null;

  // Calculate relevance scores if we have a previous question
  if (previousQuestion) {
    allQuestions.forEach(item => {
      item.relevanceScore = calculateSemanticSimilarity(
        previousQuestion,
        item.question
      );
    });
  }

  // Filter by target difficulty
  const difficultyFiltered = allQuestions.filter(
    item => item.question.difficulty === targetDifficulty
  );

  // If no questions at target difficulty, use any difficulty
  const candidatePool = difficultyFiltered.length > 0 
    ? difficultyFiltered 
    : allQuestions;

  // Select question with highest relevance (or random if no previous question)
  if (previousQuestion) {
    // Sort by relevance and pick from top 5 to add some randomness
    const topCandidates = candidatePool
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
    
    return topCandidates[Math.floor(Math.random() * topCandidates.length)];
  } else {
    // First question: random from candidate pool
    return candidatePool[Math.floor(Math.random() * candidatePool.length)];
  }
}

/**
 * Determine target difficulty based on performance
 */
function determineTargetDifficulty(
  currentLevel: 'beginner' | 'intermediate' | 'advanced',
  recentAccuracy: number,
  totalAnswered: number
): 'beginner' | 'intermediate' | 'advanced' {
  // Start with beginner for first few questions
  if (totalAnswered < 2) return 'beginner';

  // If doing well (>70% accuracy), increase difficulty
  if (recentAccuracy > 0.7) {
    if (currentLevel === 'beginner') return 'intermediate';
    if (currentLevel === 'intermediate') return 'advanced';
    return 'advanced';
  }

  // If struggling (<40% accuracy), decrease difficulty
  if (recentAccuracy < 0.4) {
    if (currentLevel === 'advanced') return 'intermediate';
    if (currentLevel === 'intermediate') return 'beginner';
    return 'beginner';
  }

  // Otherwise maintain current level
  return currentLevel;
}

/**
 * Calculate semantic similarity between two questions
 * Uses simple keyword matching and tag overlap
 * In production, this would use vector embeddings
 */
function calculateSemanticSimilarity(
  q1: TestQuestion,
  q2: TestQuestion
): number {
  let score = 0;

  // Same difficulty: +0.2
  if (q1.difficulty === q2.difficulty) {
    score += 0.2;
  }

  // Extract keywords from questions
  const keywords1 = extractKeywords(q1.question);
  const keywords2 = extractKeywords(q2.question);

  // Keyword overlap
  const commonKeywords = keywords1.filter(k => keywords2.includes(k));
  const keywordScore = commonKeywords.length / Math.max(keywords1.length, keywords2.length);
  score += keywordScore * 0.5;

  // Question length similarity (prefer similar complexity)
  const lengthRatio = Math.min(q1.question.length, q2.question.length) / 
                      Math.max(q1.question.length, q2.question.length);
  score += lengthRatio * 0.3;

  return Math.min(score, 1.0);
}

/**
 * Generic similarity calculation for any question type
 */
function calculateGenericSimilarity<T extends { question: string; difficulty?: string }>(
  q1: T,
  q2: T
): number {
  let score = 0;

  // Same difficulty: +0.2
  if (q1.difficulty && q2.difficulty && q1.difficulty === q2.difficulty) {
    score += 0.2;
  }

  // Extract keywords from questions
  const keywords1 = extractKeywords(q1.question);
  const keywords2 = extractKeywords(q2.question);

  // Keyword overlap
  const commonKeywords = keywords1.filter(k => keywords2.includes(k));
  const keywordScore = commonKeywords.length / Math.max(keywords1.length, keywords2.length, 1);
  score += keywordScore * 0.5;

  // Question length similarity (prefer similar complexity)
  const lengthRatio = Math.min(q1.question.length, q2.question.length) / 
                      Math.max(q1.question.length, q2.question.length);
  score += lengthRatio * 0.3;

  return Math.min(score, 1.0);
}

/**
 * Extract keywords from question text
 */
function extractKeywords(text: string): string[] {
  // Remove common words and extract meaningful terms
  const stopWords = new Set([
    'what', 'how', 'why', 'when', 'where', 'which', 'who',
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
    'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'should', 'could',
    'can', 'may', 'might', 'must', 'shall'
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 10); // Top 10 keywords
}

/**
 * Initialize a new quiz session
 */
export function initializeQuizSession(): QuizSession {
  return {
    questions: [],
    currentIndex: 0,
    correctCount: 0,
    totalAnswered: 0,
    difficultyLevel: 'beginner',
    performanceHistory: []
  };
}

/**
 * Update session after answering a question
 */
export function updateSession(
  session: QuizSession,
  question: TestQuestion,
  isCorrect: boolean
): QuizSession {
  return {
    ...session,
    questions: [...session.questions, question],
    currentIndex: session.currentIndex + 1,
    correctCount: session.correctCount + (isCorrect ? 1 : 0),
    totalAnswered: session.totalAnswered + 1,
    performanceHistory: [...session.performanceHistory, isCorrect],
    difficultyLevel: determineTargetDifficulty(
      session.difficultyLevel,
      [...session.performanceHistory, isCorrect].slice(-3).filter(Boolean).length / 
        Math.min([...session.performanceHistory, isCorrect].length, 3),
      session.totalAnswered + 1
    )
  };
}

/**
 * Generate a progressive quiz from available tests
 */
export function generateProgressiveQuiz(
  tests: Test[],
  maxQuestions: number = 10
): TestQuestion[] {
  const session = initializeQuizSession();
  const questions: TestQuestion[] = [];
  let previousQuestion: TestQuestion | undefined;

  for (let i = 0; i < maxQuestions; i++) {
    const next = selectNextQuestion(tests, session, previousQuestion);
    if (!next) break;

    questions.push(next.question);
    previousQuestion = next.question;

    // Simulate session update for next selection
    // In real usage, this would be based on actual user answers
    const mockCorrect = Math.random() > 0.5;
    Object.assign(session, updateSession(session, next.question, mockCorrect));
  }

  return questions;
}


/**
 * Generate progressive question sequence from any question array
 * Works with regular Question type (not just TestQuestion)
 * 
 * IMPORTANT: Uses Set to track selected question IDs to prevent duplicates
 */
export function generateProgressiveSequence<T extends { 
  id: string; 
  question: string; 
  difficulty?: string;
}>(
  questions: T[],
  count: number = 20
): T[] {
  const maxCount = Math.min(count, questions.length);
  if (maxCount === 0) return [];

  const selectedQuestions: T[] = [];
  const selectedIds = new Set<string>(); // Track selected question IDs to prevent duplicates
  let currentDifficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
  let performanceHistory: boolean[] = [];

  // Helper to get available questions (not yet selected)
  const getAvailable = () => questions.filter(q => !selectedIds.has(q.id));

  for (let i = 0; i < maxCount; i++) {
    const availableQuestions = getAvailable();
    if (availableQuestions.length === 0) break;

    let nextQuestion: T;

    if (i === 0) {
      // First question: random beginner or intermediate
      const easyQuestions = availableQuestions.filter(
        q => !q.difficulty || q.difficulty === 'beginner' || q.difficulty === 'intermediate'
      );
      const pool = easyQuestions.length > 0 ? easyQuestions : availableQuestions;
      nextQuestion = pool[Math.floor(Math.random() * pool.length)];
    } else {
      // Calculate recent accuracy
      const recentPerformance = performanceHistory.slice(-3);
      const recentAccuracy = recentPerformance.length > 0
        ? recentPerformance.filter(Boolean).length / recentPerformance.length
        : 0.5;

      // Determine target difficulty
      const targetDifficulty = determineTargetDifficulty(
        currentDifficulty,
        recentAccuracy,
        i
      );
      currentDifficulty = targetDifficulty;

      // Filter by difficulty from available questions only
      const difficultyFiltered = availableQuestions.filter(
        q => q.difficulty === targetDifficulty
      );
      const candidatePool = difficultyFiltered.length > 0 
        ? difficultyFiltered 
        : availableQuestions;

      // Calculate similarity scores with previous question
      const previousQuestion = selectedQuestions[i - 1];
      const scored = candidatePool.map(q => ({
        question: q,
        score: calculateGenericSimilarity(previousQuestion, q)
      }));

      // Sort by relevance and pick from top 5 to add variety
      scored.sort((a, b) => b.score - a.score);
      const topCandidates = scored.slice(0, Math.min(5, scored.length));
      nextQuestion = topCandidates[Math.floor(Math.random() * topCandidates.length)].question;
    }

    // Add to selected and mark as used
    selectedQuestions.push(nextQuestion);
    selectedIds.add(nextQuestion.id);

    // Simulate performance for next selection (assume 60% success rate)
    performanceHistory.push(Math.random() > 0.4);
  }

  return selectedQuestions;
}
