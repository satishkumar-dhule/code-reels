/**
 * Adaptive Learning Hook
 * 
 * Client-side personalized learning system that:
 * - Analyzes user performance by topic/tag
 * - Identifies strengths and weaknesses
 * - Generates personalized learning paths
 * - Integrates with existing SRS system
 * 
 * All data stored in localStorage for static site compatibility.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAllCards, getSRSStats, type ReviewCard } from '../lib/spaced-repetition';
import { storage } from '../services/storage.service';

// ============================================
// TYPES
// ============================================

export interface TopicMastery {
  topic: string;
  correct: number;
  total: number;
  accuracy: number;
  mastery: number; // 0-100, weighted by confidence
  lastPracticed: string | null;
}

export interface KnowledgeGap {
  topic: string;
  severity: 'critical' | 'high' | 'medium';
  mastery: number;
  recommendation: string;
}

export interface LearningPhase {
  phase: number;
  name: string;
  focus: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  goal: string;
}

export interface LearningPath {
  readinessScore: number;
  strengthAreas: string[];
  weaknessAreas: string[];
  knowledgeGaps: KnowledgeGap[];
  recommendedPath: LearningPhase[];
  nextTopics: string[];
}

export interface AnswerRecord {
  questionId: string;
  channel: string;
  tags: string[];
  difficulty: string;
  correct: boolean;
  timestamp: number;
}

export interface SimilarQuestion {
  id: string;
  question: string;
  channel: string;
  similarity: number;
}

export interface SimilarQuestionsData {
  generated: string;
  totalQuestions: number;
  questionsWithSimilar: number;
  threshold: number;
  topK: number;
  similarities: Record<string, SimilarQuestion[]>;
}

export interface AdaptiveLearningState {
  answerHistory: AnswerRecord[];
  topicMastery: Record<string, TopicMastery>;
  learningPath: LearningPath;
  lastUpdated: string;
}

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'adaptive-learning-state';
const MIN_ANSWERS_FOR_ANALYSIS = 5;

// Default learning path for new users who haven't answered enough questions
const DEFAULT_LEARNING_PATH: LearningPath = {
  readinessScore: 0,
  strengthAreas: [],
  weaknessAreas: [],
  knowledgeGaps: [],
  recommendedPath: [
    {
      phase: 1,
      name: 'Getting Started',
      focus: ['fundamentals', 'problem-solving', 'data-structures'],
      difficulty: 'beginner',
      estimatedTime: '1-2 days',
      goal: 'Build your foundation with core concepts'
    },
    {
      phase: 2,
      name: 'Core Skills',
      focus: ['system-design', 'algorithms', 'databases'],
      difficulty: 'intermediate',
      estimatedTime: '1 week',
      goal: 'Master essential interview topics'
    }
  ],
  nextTopics: ['system-design', 'algorithms', 'frontend']
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getGapRecommendation(mastery: number, total: number): string {
  if (mastery < 20) return 'Start with fundamentals';
  if (mastery < 40) return 'Review core concepts';
  if (total < 5) return 'Need more practice';
  return 'Focus on advanced topics';
}

function calculateMastery(correct: number, total: number): number {
  if (total === 0) return 0;
  const accuracy = (correct / total) * 100;
  // Confidence factor: more attempts = more reliable score
  const confidence = Math.min(1, total / 10);
  return Math.round(accuracy * confidence);
}

// ============================================
// MAIN HOOK
// ============================================

export function useAdaptiveLearning(channelId?: string) {
  const [state, setState] = useState<AdaptiveLearningState>(() => {
    const saved = storage.get<AdaptiveLearningState>(STORAGE_KEY, {
      answerHistory: [],
      topicMastery: {},
      learningPath: DEFAULT_LEARNING_PATH,
      lastUpdated: new Date().toISOString()
    });
    return saved;
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    storage.set(STORAGE_KEY, state);
  }, [state]);

  // Filter history by channel if specified
  const filteredHistory = useMemo(() => {
    if (!channelId) return state.answerHistory;
    return state.answerHistory.filter(a => a.channel === channelId);
  }, [state.answerHistory, channelId]);

  // Calculate topic mastery from answer history
  const topicMastery = useMemo(() => {
    const mastery: Record<string, TopicMastery> = {};
    
    for (const answer of filteredHistory) {
      for (const tag of answer.tags) {
        if (!mastery[tag]) {
          mastery[tag] = {
            topic: tag,
            correct: 0,
            total: 0,
            accuracy: 0,
            mastery: 0,
            lastPracticed: null
          };
        }
        
        mastery[tag].total++;
        if (answer.correct) mastery[tag].correct++;
        mastery[tag].lastPracticed = new Date(answer.timestamp).toISOString();
      }
    }
    
    // Calculate accuracy and mastery for each topic
    for (const topic of Object.keys(mastery)) {
      const m = mastery[topic];
      m.accuracy = m.total > 0 ? Math.round((m.correct / m.total) * 100) : 0;
      m.mastery = calculateMastery(m.correct, m.total);
    }
    
    return mastery;
  }, [filteredHistory]);

  // Generate learning path
  const learningPath = useMemo((): LearningPath => {
    const topics = Object.values(topicMastery);
    
    // Return default path for new users - they still get guidance!
    if (topics.length < MIN_ANSWERS_FOR_ANALYSIS) {
      return DEFAULT_LEARNING_PATH;
    }

    // Identify strengths and weaknesses
    const strengthAreas = topics
      .filter(t => t.mastery >= 70)
      .map(t => t.topic);
    
    const weaknessAreas = topics
      .filter(t => t.mastery < 50)
      .map(t => t.topic);

    // Identify knowledge gaps
    const knowledgeGaps: KnowledgeGap[] = weaknessAreas.map(topic => {
      const m = topicMastery[topic];
      const severity: 'critical' | 'high' | 'medium' = 
        m.mastery < 30 ? 'critical' : m.mastery < 50 ? 'high' : 'medium';
      return {
        topic,
        severity,
        mastery: m.mastery,
        recommendation: getGapRecommendation(m.mastery, m.total)
      };
    }).sort((a, b) => {
      const severityOrder: Record<'critical' | 'high' | 'medium', number> = { critical: 0, high: 1, medium: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    // Generate learning phases
    const recommendedPath: LearningPhase[] = [];
    
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

    const highGaps = knowledgeGaps.filter(g => g.severity === 'high');
    if (highGaps.length > 0) {
      recommendedPath.push({
        phase: recommendedPath.length + 1,
        name: 'Core Concepts',
        focus: highGaps.map(g => g.topic),
        difficulty: 'intermediate',
        estimatedTime: '1 week',
        goal: 'Master core concepts'
      });
    }

    const mediumGaps = knowledgeGaps.filter(g => g.severity === 'medium');
    if (mediumGaps.length > 0) {
      recommendedPath.push({
        phase: recommendedPath.length + 1,
        name: 'Skill Refinement',
        focus: mediumGaps.map(g => g.topic),
        difficulty: 'intermediate',
        estimatedTime: '1-2 weeks',
        goal: 'Refine understanding'
      });
    }

    if (strengthAreas.length > 0) {
      recommendedPath.push({
        phase: recommendedPath.length + 1,
        name: 'Advanced Mastery',
        focus: strengthAreas,
        difficulty: 'advanced',
        estimatedTime: '2-4 weeks',
        goal: 'Achieve expert-level knowledge'
      });
    }

    // Calculate readiness score
    const masteryValues = topics.map(t => t.mastery);
    const readinessScore = masteryValues.length > 0
      ? Math.round(masteryValues.reduce((a, b) => a + b, 0) / masteryValues.length)
      : 0;

    // Determine next topics to focus on
    const nextTopics = knowledgeGaps.slice(0, 3).map(g => g.topic);

    return {
      readinessScore,
      strengthAreas,
      weaknessAreas,
      knowledgeGaps,
      recommendedPath,
      nextTopics
    };
  }, [topicMastery]);

  // Record an answer
  const recordAnswer = useCallback((
    questionId: string,
    channel: string,
    tags: string[],
    difficulty: string,
    correct: boolean
  ) => {
    const record: AnswerRecord = {
      questionId,
      channel,
      tags,
      difficulty,
      correct,
      timestamp: Date.now()
    };

    setState(prev => ({
      ...prev,
      answerHistory: [...prev.answerHistory, record],
      lastUpdated: new Date().toISOString()
    }));
  }, []);

  // Get recommended questions based on learning path
  const getRecommendedTopics = useCallback((): string[] => {
    if (!learningPath) return [];
    
    // Priority: current phase topics > knowledge gaps > strengths for advanced
    const currentPhase = learningPath.recommendedPath[0];
    if (currentPhase) {
      return currentPhase.focus;
    }
    
    return learningPath.nextTopics;
  }, [learningPath]);

  // Get SRS integration data
  const srsIntegration = useMemo(() => {
    const cards = getAllCards();
    const stats = getSRSStats();
    
    // Map SRS cards to topics
    const cardsByTopic: Record<string, ReviewCard[]> = {};
    
    cards.forEach((card) => {
      // Use channel as a proxy for topic if tags aren't available
      const topic = card.channel;
      if (!cardsByTopic[topic]) cardsByTopic[topic] = [];
      cardsByTopic[topic].push(card);
    });

    return {
      totalCards: stats.totalCards,
      dueToday: stats.dueToday,
      mastered: stats.mastered,
      cardsByTopic
    };
  }, []);

  // Get overall stats
  const stats = useMemo(() => {
    const totalAnswers = filteredHistory.length;
    const correctAnswers = filteredHistory.filter(a => a.correct).length;
    const accuracy = totalAnswers > 0 
      ? Math.round((correctAnswers / totalAnswers) * 100) 
      : 0;
    
    const topicsAnalyzed = Object.keys(topicMastery).length;
    const strongTopics = Object.values(topicMastery).filter(t => t.mastery >= 70).length;
    const weakTopics = Object.values(topicMastery).filter(t => t.mastery < 50).length;

    return {
      totalAnswers,
      correctAnswers,
      accuracy,
      topicsAnalyzed,
      strongTopics,
      weakTopics,
      readinessScore: learningPath?.readinessScore ?? 0
    };
  }, [filteredHistory, topicMastery, learningPath]);

  // Clear all data
  const clearData = useCallback(() => {
    setState({
      answerHistory: [],
      topicMastery: {},
      learningPath: DEFAULT_LEARNING_PATH,
      lastUpdated: new Date().toISOString()
    });
  }, []);

  // Get similar questions from pre-computed data (static JSON)
  const getSimilarQuestions = useCallback(async (questionId: string): Promise<SimilarQuestion[]> => {
    try {
      // Fetch the pre-computed similar questions data
      const response = await fetch('/data/similar-questions.json');
      if (!response.ok) return [];
      
      const data: SimilarQuestionsData = await response.json();
      return data.similarities[questionId] || [];
    } catch {
      // File might not exist yet
      return [];
    }
  }, []);

  // Get recommended questions based on learning path and similar questions
  const getSmartRecommendations = useCallback(async (currentQuestionId?: string): Promise<string[]> => {
    const recommendations: string[] = [];
    
    // 1. Get similar questions if we have a current question
    if (currentQuestionId) {
      const similar = await getSimilarQuestions(currentQuestionId);
      // Filter out already answered questions
      const answeredIds = new Set(filteredHistory.map(a => a.questionId));
      const newSimilar = similar.filter(s => !answeredIds.has(s.id));
      recommendations.push(...newSimilar.slice(0, 3).map(s => s.id));
    }
    
    // 2. Add questions from knowledge gaps (would need question data to filter)
    // This is handled by getRecommendedTopics() which returns topic names
    
    return recommendations;
  }, [filteredHistory, getSimilarQuestions]);

  return {
    // State
    answerHistory: filteredHistory,
    topicMastery,
    learningPath,
    stats,
    srsIntegration,
    
    // Actions
    recordAnswer,
    getRecommendedTopics,
    getSimilarQuestions,
    getSmartRecommendations,
    clearData,
    
    // Helpers
    hasEnoughData: filteredHistory.length >= MIN_ANSWERS_FOR_ANALYSIS
  };
}

export default useAdaptiveLearning;
