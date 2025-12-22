/**
 * Relevance Scoring Prompt Template
 */

import { jsonOutputRule, buildSystemContext } from './base.js';

export const schema = {
  interviewFrequency: 8,
  practicalRelevance: 7,
  conceptDepth: 6,
  industryDemand: 8,
  difficultyAppropriate: 9,
  questionClarity: 8,
  answerQuality: 7,
  reasoning: "Brief 1-2 sentence explanation",
  recommendation: "keep|improve|retire",
  improvements: {
    questionIssues: [],
    answerIssues: [],
    missingTopics: [],
    suggestedAdditions: [],
    difficultyAdjustment: "none|increase|decrease"
  }
};

export const scoringWeights = {
  interviewFrequency: 0.25,
  practicalRelevance: 0.20,
  conceptDepth: 0.15,
  industryDemand: 0.15,
  difficultyAppropriate: 0.10,
  questionClarity: 0.10,
  answerQuality: 0.05
};

export const scoringCriteria = {
  interviewFrequency: {
    weight: '25%',
    description: 'How often is this exact question or similar asked in real FAANG/top-tier interviews?',
    scale: {
      10: 'Asked in almost every interview for this role',
      '7-9': 'Commonly asked, appears frequently',
      '4-6': 'Sometimes asked, moderate frequency',
      '1-3': 'Rarely asked, niche topic'
    }
  },
  practicalRelevance: {
    weight: '20%',
    description: 'How applicable is this to real-world engineering work?',
    scale: {
      10: 'Essential daily skill',
      '7-9': 'Frequently used in production',
      '4-6': 'Occasionally useful',
      '1-3': 'Mostly theoretical'
    }
  },
  conceptDepth: {
    weight: '15%',
    description: 'Does this test deep understanding vs surface knowledge?',
    scale: {
      10: 'Requires deep expertise and critical thinking',
      '7-9': 'Tests solid understanding',
      '4-6': 'Tests basic knowledge',
      '1-3': 'Trivial/memorization only'
    }
  },
  industryDemand: {
    weight: '15%',
    description: 'Current market demand for this skill (2024-2025)?',
    scale: {
      10: 'Extremely hot skill, high demand',
      '7-9': 'Strong demand',
      '4-6': 'Moderate demand',
      '1-3': 'Declining or niche demand'
    }
  },
  difficultyAppropriate: {
    weight: '10%',
    description: 'Does the question match its stated difficulty level?',
    scale: { 10: 'Perfect match', 5: 'Somewhat mismatched', 1: 'Completely wrong difficulty' }
  },
  questionClarity: {
    weight: '10%',
    description: 'Is the question clear, specific, and well-formed?',
    scale: { 10: 'Crystal clear, specific', 5: 'Somewhat ambiguous', 1: 'Confusing or vague' }
  },
  answerQuality: {
    weight: '5%',
    description: 'Is the provided answer comprehensive and interview-worthy (200+ chars with specific details)?',
    scale: { 10: 'Excellent, comprehensive with specific technologies/patterns', 5: 'Too high-level or generic', 1: 'Incorrect, too short, or unhelpful' }
  }
};

export const guidelines = [
  'Score each criterion from 1-10 based on the scale provided',
  'Provide specific improvement suggestions if score is below 80',
  'Recommendation should be: keep (80+), improve (40-79), retire (<40)',
  'Be specific about what topics are missing or need improvement'
];

export function build(context) {
  const { question, answer, explanation, channel, difficulty, tags, companies } = context;
  
  const criteriaText = Object.entries(scoringCriteria)
    .map(([key, c]) => {
      const scaleText = Object.entries(c.scale)
        .map(([score, desc]) => `   - ${score}: ${desc}`)
        .join('\n');
      return `${key.toUpperCase()} (${c.weight}): ${c.description}\n${scaleText}`;
    })
    .join('\n\n');

  return `${buildSystemContext('relevance')}

Analyze this interview question and score its relevance for real technical interviews.

Question: "${question}"
Answer: "${(answer || '').substring(0, 500)}"
Explanation: "${(explanation || '').substring(0, 300)}"
Channel: ${channel}
Difficulty: ${difficulty}
Tags: ${(tags || []).join(', ') || 'N/A'}
Companies: ${(companies || []).join(', ') || 'N/A'}

Score each criterion from 1-10:

${criteriaText}

Also provide specific improvement suggestions if the score is below 80.

Guidelines:
${guidelines.map(g => `- ${g}`).join('\n')}

Output this exact JSON structure:
${JSON.stringify(schema, null, 2)}

${jsonOutputRule}`;
}

// Calculate weighted score from individual scores
export function calculateWeightedScore(scores) {
  return Math.round(
    (scores.interviewFrequency * scoringWeights.interviewFrequency +
     scores.practicalRelevance * scoringWeights.practicalRelevance +
     scores.conceptDepth * scoringWeights.conceptDepth +
     scores.industryDemand * scoringWeights.industryDemand +
     scores.difficultyAppropriate * scoringWeights.difficultyAppropriate +
     scores.questionClarity * scoringWeights.questionClarity +
     scores.answerQuality * scoringWeights.answerQuality) * 10
  );
}

export default { schema, scoringWeights, scoringCriteria, guidelines, build, calculateWeightedScore };
