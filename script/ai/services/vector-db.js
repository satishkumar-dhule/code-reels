/**
 * Vector Database Service
 * 
 * High-level service for managing question vectors in Qdrant
 * Handles embedding generation, storage, and similarity search
 */

import qdrant, { COLLECTIONS, VECTOR_DIMENSIONS } from '../providers/qdrant.js';
import embeddings from '../providers/embeddings.js';

class VectorDBService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize the vector database with required collections
   */
  async init() {
    if (this.initialized) return;

    const vectorSize = embeddings.getDimensions();
    
    // Create questions collection
    await qdrant.ensureCollection(COLLECTIONS.QUESTIONS, vectorSize);
    
    // Create payload indexes for filtering
    await qdrant.createPayloadIndex(COLLECTIONS.QUESTIONS, 'channel', 'keyword');
    await qdrant.createPayloadIndex(COLLECTIONS.QUESTIONS, 'subChannel', 'keyword');
    await qdrant.createPayloadIndex(COLLECTIONS.QUESTIONS, 'difficulty', 'keyword');
    await qdrant.createPayloadIndex(COLLECTIONS.QUESTIONS, 'status', 'keyword');

    this.initialized = true;
    console.log('✅ Vector DB service initialized');
  }

  /**
   * Index a single question
   */
  async indexQuestion(question) {
    await this.init();

    // Generate embedding from question text + answer + tags
    const textToEmbed = this.buildEmbeddingText(question);
    const vector = await embeddings.embed(textToEmbed);

    // Upsert to Qdrant
    await qdrant.upsert(COLLECTIONS.QUESTIONS, [{
      id: question.id,
      vector,
      payload: {
        id: question.id,
        question: question.question,
        answer: question.answer?.substring(0, 500),
        channel: question.channel,
        subChannel: question.subChannel,
        difficulty: question.difficulty,
        tags: question.tags,
        status: question.status || 'active',
        relevanceScore: question.relevanceScore,
        createdAt: question.createdAt
      }
    }]);

    return { id: question.id, indexed: true };
  }

  /**
   * Index multiple questions in batch
   */
  async indexQuestions(questions, options = {}) {
    await this.init();

    const batchSize = options.batchSize || 20;
    const results = { indexed: 0, failed: 0, errors: [] };

    console.log(`📥 Indexing ${questions.length} questions...`);

    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      
      // Retry logic
      let retries = 3;
      let success = false;
      
      while (retries > 0 && !success) {
        try {
          // Generate embeddings for batch
          const texts = batch.map(q => this.buildEmbeddingText(q));
          const vectors = await embeddings.embedBatch(texts);

          // Prepare points for upsert
          const points = batch.map((q, idx) => ({
            id: q.id,
            vector: vectors[idx],
            payload: {
              id: q.id,
              question: q.question,
              answer: q.answer?.substring(0, 500),
              channel: q.channel,
              subChannel: q.subChannel,
              difficulty: q.difficulty,
              tags: q.tags,
              status: q.status || 'active',
              relevanceScore: q.relevanceScore,
              createdAt: q.createdAt
            }
          }));

          await qdrant.upsert(COLLECTIONS.QUESTIONS, points);
          results.indexed += batch.length;
          success = true;

          console.log(`   Indexed ${results.indexed}/${questions.length}`);
        } catch (error) {
          retries--;
          if (retries > 0) {
            await new Promise(r => setTimeout(r, 1000)); // Wait before retry
          } else {
            results.failed += batch.length;
            results.errors.push({ batch: i, error: error.message });
            console.error(`   Batch ${i} failed:`, error.message);
          }
        }
      }
      
      // Small delay between batches
      await new Promise(r => setTimeout(r, 100));
    }

    return results;
  }

  /**
   * Find similar questions
   */
  async findSimilar(questionText, options = {}) {
    await this.init();

    const {
      limit = 10,
      threshold = 0.7,
      channel = null,
      excludeIds = []
    } = options;

    // Generate embedding for query
    const vector = await embeddings.embed(questionText);

    // Build filter
    let filter = null;
    if (channel || excludeIds.length > 0) {
      filter = { must: [], must_not: [] };
      
      if (channel) {
        filter.must.push({ key: 'channel', match: { value: channel } });
      }
      
      if (excludeIds.length > 0) {
        excludeIds.forEach(id => {
          filter.must_not.push({ key: 'originalId', match: { value: id } });
        });
      }
    }

    const results = await qdrant.search(COLLECTIONS.QUESTIONS, vector, {
      limit,
      scoreThreshold: threshold,
      filter
    });

    return results.map(r => ({
      id: r.payload.originalId || r.payload.id,
      question: r.payload.question,
      channel: r.payload.channel,
      similarity: Math.round(r.score * 100) / 100
    }));
  }

  /**
   * Find duplicate questions for a given question
   */
  async findDuplicates(question, threshold = 0.85) {
    await this.init();

    const textToEmbed = this.buildEmbeddingText(question);
    const vector = await embeddings.embed(textToEmbed);

    return await qdrant.findDuplicates(
      COLLECTIONS.QUESTIONS,
      vector,
      question.id,
      threshold
    );
  }

  /**
   * Analyze question relevance using vector similarity
   */
  async analyzeRelevance(question, channelQuestions) {
    await this.init();

    const textToEmbed = this.buildEmbeddingText(question);
    const vector = await embeddings.embed(textToEmbed);

    // Find similar questions in the same channel
    let similar = [];
    try {
      similar = await qdrant.search(COLLECTIONS.QUESTIONS, vector, {
        limit: 20,
        scoreThreshold: 0.1, // Lower threshold for TF-IDF
        filter: {
          must: [
            { key: 'channel', match: { value: question.channel } }
          ],
          must_not: [
            { key: 'originalId', match: { value: question.id } }
          ]
        }
      });
    } catch (error) {
      // If filter fails, try without filter
      console.warn('Filtered search failed, trying without filter:', error.message);
      similar = await qdrant.search(COLLECTIONS.QUESTIONS, vector, {
        limit: 20,
        scoreThreshold: 0.1
      });
      // Manually filter
      similar = similar.filter(r => 
        r.payload?.channel === question.channel && 
        r.payload?.originalId !== question.id
      );
    }

    // Calculate relevance metrics
    const avgSimilarity = similar.length > 0
      ? similar.reduce((sum, r) => sum + r.score, 0) / similar.length
      : 0;

    const highSimilarityCount = similar.filter(r => r.score > 0.5).length;
    const duplicateRisk = similar.filter(r => r.score > 0.8).length;

    return {
      questionId: question.id,
      channelFit: Math.round(avgSimilarity * 100),
      similarQuestions: similar.length,
      highSimilarityCount,
      duplicateRisk,
      potentialDuplicates: similar
        .filter(r => r.score > 0.7)
        .map(r => ({
          id: r.payload?.originalId || r.payload?.id,
          question: r.payload?.question,
          similarity: Math.round(r.score * 100)
        })),
      recommendation: this.getRelevanceRecommendation(avgSimilarity, duplicateRisk)
    };
  }

  /**
   * Get relevance recommendation based on metrics
   */
  getRelevanceRecommendation(avgSimilarity, duplicateRisk) {
    if (duplicateRisk > 0) {
      return 'review_duplicates';
    }
    if (avgSimilarity < 0.3) {
      return 'low_channel_fit';
    }
    if (avgSimilarity > 0.7) {
      return 'good_fit';
    }
    return 'acceptable';
  }

  /**
   * Build text for embedding from question object
   */
  buildEmbeddingText(question) {
    const parts = [
      question.question,
      question.answer || '',
      question.explanation || '',
      question.tldr || ''
    ];

    // Add tags if available
    if (question.tags) {
      const tags = typeof question.tags === 'string' 
        ? JSON.parse(question.tags) 
        : question.tags;
      if (Array.isArray(tags)) {
        parts.push(tags.join(' '));
      }
    }

    return parts.filter(Boolean).join(' ').substring(0, 8000);
  }

  /**
   * Remove question from vector index
   */
  async removeQuestion(questionId) {
    await this.init();
    await qdrant.delete(COLLECTIONS.QUESTIONS, [questionId]);
    return { id: questionId, removed: true };
  }

  /**
   * Remove multiple questions from vector index
   */
  async removeQuestions(questionIds) {
    await this.init();
    await qdrant.delete(COLLECTIONS.QUESTIONS, questionIds);
    return { removed: questionIds.length };
  }

  /**
   * Get collection statistics
   */
  async getStats() {
    await this.init();
    return await qdrant.getCollectionInfo(COLLECTIONS.QUESTIONS);
  }

  /**
   * Semantic search across all questions
   */
  async semanticSearch(query, options = {}) {
    await this.init();

    const {
      limit = 20,
      threshold = 0.5,
      channel = null,
      difficulty = null
    } = options;

    const vector = await embeddings.embed(query);

    // Build filter
    let filter = null;
    if (channel || difficulty) {
      filter = { must: [] };
      if (channel) {
        filter.must.push({ key: 'channel', match: { value: channel } });
      }
      if (difficulty) {
        filter.must.push({ key: 'difficulty', match: { value: difficulty } });
      }
    }

    const results = await qdrant.search(COLLECTIONS.QUESTIONS, vector, {
      limit,
      scoreThreshold: threshold,
      filter
    });

    return results.map(r => ({
      id: r.payload.id,
      question: r.payload.question,
      answer: r.payload.answer,
      channel: r.payload.channel,
      difficulty: r.payload.difficulty,
      relevance: Math.round(r.score * 100)
    }));
  }
}

// Singleton instance
const vectorDB = new VectorDBService();

export default vectorDB;
