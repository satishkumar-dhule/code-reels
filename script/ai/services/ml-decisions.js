/**
 * ML Decision Service
 * 
 * Uses OpenCode free models to make intelligent decisions about:
 * - Question relevance
 * - Duplicate detection
 * - Content quality
 * - Channel classification
 */

import { spawn } from 'child_process';
import config from '../config.js';
import embeddings from '../providers/embeddings.js';
import vectorDB from './vector-db.js';

// Decision thresholds
const THRESHOLDS = {
  DUPLICATE: 0.92,        // Very high similarity = definite duplicate
  NEAR_DUPLICATE: 0.85,   // High similarity = needs review
  SIMILAR: 0.70,          // Moderate similarity = related content
  RELEVANT: 0.50,         // Minimum relevance for channel fit
  LOW_QUALITY: 0.30       // Below this = likely poor quality
};

class MLDecisionService {
  constructor() {
    this.model = process.env.DECISION_MODEL || config.defaultModel;
  }

  /**
   * Analyze a question for relevance, quality, and duplicates
   */
  async analyzeQuestion(question, options = {}) {
    const analysis = {
      questionId: question.id,
      timestamp: new Date().toISOString(),
      checks: {}
    };

    // 1. Check for duplicates
    analysis.checks.duplicates = await this.checkDuplicates(question);

    // 2. Check channel relevance
    analysis.checks.channelFit = await this.checkChannelFit(question);

    // 3. Check content quality
    analysis.checks.quality = await this.checkQuality(question);

    // 4. Generate overall recommendation
    analysis.recommendation = this.generateRecommendation(analysis.checks);

    return analysis;
  }

  /**
   * Check for duplicate questions
   */
  async checkDuplicates(question) {
    const duplicates = await vectorDB.findDuplicates(question, THRESHOLDS.NEAR_DUPLICATE);
    
    const exactDuplicates = duplicates.filter(d => d.score >= THRESHOLDS.DUPLICATE);
    const nearDuplicates = duplicates.filter(
      d => d.score >= THRESHOLDS.NEAR_DUPLICATE && d.score < THRESHOLDS.DUPLICATE
    );

    return {
      hasDuplicates: exactDuplicates.length > 0,
      hasNearDuplicates: nearDuplicates.length > 0,
      exactDuplicates: exactDuplicates.map(d => ({
        id: d.id,
        similarity: Math.round(d.score * 100),
        question: d.question
      })),
      nearDuplicates: nearDuplicates.map(d => ({
        id: d.id,
        similarity: Math.round(d.score * 100),
        question: d.question
      })),
      action: exactDuplicates.length > 0 ? 'reject' : 
              nearDuplicates.length > 0 ? 'review' : 'pass'
    };
  }

  /**
   * Check if question fits its assigned channel
   */
  async checkChannelFit(question) {
    const relevance = await vectorDB.analyzeRelevance(question);
    
    return {
      channelFitScore: relevance.channelFit,
      similarInChannel: relevance.similarQuestions,
      isGoodFit: relevance.channelFit >= THRESHOLDS.RELEVANT * 100,
      recommendation: relevance.recommendation,
      action: relevance.channelFit < THRESHOLDS.LOW_QUALITY * 100 ? 'reclassify' :
              relevance.channelFit < THRESHOLDS.RELEVANT * 100 ? 'review' : 'pass'
    };
  }

  /**
   * Check content quality using local LLM
   */
  async checkQuality(question) {
    try {
      const prompt = this.buildQualityPrompt(question);
      const response = await this.callLLM(prompt);
      const quality = this.parseQualityResponse(response);

      return {
        ...quality,
        action: quality.overallScore < 40 ? 'improve' :
                quality.overallScore < 70 ? 'review' : 'pass'
      };
    } catch (error) {
      console.error('Quality check failed:', error.message);
      return {
        overallScore: null,
        error: error.message,
        action: 'manual_review'
      };
    }
  }

  /**
   * Build prompt for quality assessment
   */
  buildQualityPrompt(question) {
    return `Analyze this interview question for quality. Return JSON only.

Question: ${question.question}
Answer: ${question.answer?.substring(0, 1000) || 'N/A'}
Channel: ${question.channel}
Difficulty: ${question.difficulty}

Evaluate on these criteria (score 1-10 each):
1. clarity: Is the question clear and unambiguous?
2. relevance: Is it relevant for technical interviews?
3. depth: Does the answer show appropriate depth?
4. accuracy: Is the content technically accurate?
5. actionable: Can candidates learn from this?

Return JSON:
{
  "clarity": <1-10>,
  "relevance": <1-10>,
  "depth": <1-10>,
  "accuracy": <1-10>,
  "actionable": <1-10>,
  "overallScore": <1-100>,
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1"]
}`;
  }

  /**
   * Parse quality response from LLM
   */
  parseQualityResponse(response) {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      return {
        overallScore: 50,
        issues: ['Could not parse quality assessment'],
        suggestions: []
      };
    }
  }

  /**
   * Call LLM via OpenCode CLI
   */
  async callLLM(prompt) {
    return new Promise((resolve, reject) => {
      let output = '';
      
      const proc = spawn('opencode', ['run', '--model', this.model, '--format', 'json', prompt], {
        timeout: 120000,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { output += data.toString(); });
      
      proc.on('close', (code) => {
        try {
          // Parse JSON event stream
          const lines = output.split('\n').filter(l => l.trim());
          let fullText = '';
          
          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              if (event.type === 'text' && event.part?.text) {
                fullText += event.part.text;
              }
            } catch {
              // Not JSON event
            }
          }
          
          resolve(fullText || output);
        } catch (error) {
          reject(error);
        }
      });
      
      proc.on('error', reject);
    });
  }

  /**
   * Generate overall recommendation based on all checks
   */
  generateRecommendation(checks) {
    const actions = [
      checks.duplicates?.action,
      checks.channelFit?.action,
      checks.quality?.action
    ].filter(Boolean);

    // Priority: reject > reclassify > improve > review > pass
    if (actions.includes('reject')) {
      return {
        action: 'reject',
        reason: 'Duplicate question detected',
        priority: 'high'
      };
    }

    if (actions.includes('reclassify')) {
      return {
        action: 'reclassify',
        reason: 'Question does not fit assigned channel',
        priority: 'medium'
      };
    }

    if (actions.includes('improve')) {
      return {
        action: 'improve',
        reason: 'Content quality needs improvement',
        priority: 'medium'
      };
    }

    if (actions.includes('review')) {
      return {
        action: 'review',
        reason: 'Manual review recommended',
        priority: 'low'
      };
    }

    return {
      action: 'approve',
      reason: 'All checks passed',
      priority: 'none'
    };
  }

  /**
   * Batch analyze multiple questions
   */
  async batchAnalyze(questions, options = {}) {
    const results = {
      analyzed: 0,
      approved: 0,
      needsReview: 0,
      rejected: 0,
      details: []
    };

    for (const question of questions) {
      try {
        const analysis = await this.analyzeQuestion(question, options);
        results.analyzed++;

        switch (analysis.recommendation.action) {
          case 'approve':
            results.approved++;
            break;
          case 'reject':
            results.rejected++;
            break;
          default:
            results.needsReview++;
        }

        results.details.push({
          id: question.id,
          action: analysis.recommendation.action,
          reason: analysis.recommendation.reason
        });

        // Rate limiting
        await new Promise(r => setTimeout(r, 100));
      } catch (error) {
        console.error(`Analysis failed for ${question.id}:`, error.message);
        results.details.push({
          id: question.id,
          action: 'error',
          reason: error.message
        });
      }
    }

    return results;
  }

  /**
   * Suggest best channel for a question
   */
  async suggestChannel(question, availableChannels) {
    try {
      const prompt = `Given this interview question, suggest the best channel from the list.

Question: ${question.question}
Answer: ${question.answer?.substring(0, 500) || 'N/A'}

Available channels: ${availableChannels.join(', ')}

Return JSON only:
{
  "suggestedChannel": "<channel>",
  "confidence": <1-100>,
  "alternativeChannels": ["<channel2>"],
  "reasoning": "<brief explanation>"
}`;

      const response = await this.callLLM(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return { suggestedChannel: question.channel, confidence: 50 };
    } catch (error) {
      console.error('Channel suggestion failed:', error.message);
      return { suggestedChannel: question.channel, confidence: 0, error: error.message };
    }
  }

  /**
   * Detect redundant content across questions
   */
  async detectRedundancy(questions) {
    const redundancyGroups = [];
    const processed = new Set();

    for (const question of questions) {
      if (processed.has(question.id)) continue;

      const similar = await vectorDB.findSimilar(question.question, {
        limit: 10,
        threshold: THRESHOLDS.SIMILAR,
        excludeIds: [question.id]
      });

      if (similar.length > 0) {
        const group = {
          primary: question.id,
          related: similar.map(s => s.id),
          avgSimilarity: similar.reduce((sum, s) => sum + s.similarity, 0) / similar.length,
          recommendation: this.getRedundancyRecommendation(similar)
        };

        redundancyGroups.push(group);
        similar.forEach(s => processed.add(s.id));
      }

      processed.add(question.id);
    }

    return {
      totalGroups: redundancyGroups.length,
      groups: redundancyGroups,
      questionsInGroups: processed.size
    };
  }

  /**
   * Get recommendation for redundancy group
   */
  getRedundancyRecommendation(similar) {
    const highSimilarity = similar.filter(s => s.similarity >= 85);
    
    if (highSimilarity.length >= 2) {
      return 'merge_or_remove';
    }
    if (highSimilarity.length === 1) {
      return 'review_for_merge';
    }
    return 'keep_as_related';
  }
}

// Singleton instance
const mlDecisions = new MLDecisionService();

export default mlDecisions;
export { THRESHOLDS };
