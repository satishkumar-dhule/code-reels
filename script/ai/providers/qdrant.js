/**
 * Qdrant Vector Database Provider
 * 
 * Manages vector storage and similarity search for questions
 * Uses Qdrant Cloud: https://cloud.qdrant.io
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import crypto from 'crypto';

// Collection names
const COLLECTIONS = {
  QUESTIONS: 'questions',
  QUESTION_CHUNKS: 'question_chunks'
};

// Vector dimensions (depends on embedding model)
const VECTOR_DIMENSIONS = {
  'all-MiniLM-L6-v2': 384,
  'nomic-embed-text': 768,
  'mxbai-embed-large': 1024,
  'default': 384
};

class QdrantProvider {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  /**
   * Initialize Qdrant client
   */
  async init() {
    if (this.initialized) return;

    const url = process.env.QDRANT_URL;
    const apiKey = process.env.QDRANT_API_KEY;

    if (!url) {
      throw new Error('QDRANT_URL environment variable is required');
    }

    this.client = new QdrantClient({
      url,
      apiKey,
      timeout: 30000
    });

    this.initialized = true;
    console.log('✅ Qdrant client initialized');
  }

  /**
   * Ensure collection exists with proper schema
   */
  async ensureCollection(collectionName, vectorSize = 384) {
    await this.init();

    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === collectionName);

      if (!exists) {
        await this.client.createCollection(collectionName, {
          vectors: {
            size: vectorSize,
            distance: 'Cosine'
          },
          optimizers_config: {
            indexing_threshold: 10000
          },
          on_disk_payload: true
        });
        console.log(`✅ Created collection: ${collectionName}`);
      }

      return true;
    } catch (error) {
      console.error(`Failed to ensure collection ${collectionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Convert string ID to UUID format for Qdrant
   * Qdrant requires either unsigned integers or UUIDs
   */
  stringToUUID(str) {
    // Use crypto to create a proper UUID v5-like hash
    const hash = crypto.createHash('md5').update(str).digest('hex');
    // Format as UUID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  }

  /**
   * Upsert vectors with payloads
   */
  async upsert(collectionName, points) {
    await this.init();

    try {
      // Validate and filter points
      const validPoints = points.filter(p => {
        if (!Array.isArray(p.vector)) return false;
        if (p.vector.length === 0) return false;
        if (p.vector.some(v => typeof v !== 'number' || isNaN(v) || !isFinite(v))) return false;
        return true;
      });

      if (validPoints.length === 0) {
        console.warn('No valid points to upsert');
        return { status: 'skipped' };
      }

      if (validPoints.length < points.length) {
        console.warn(`Filtered out ${points.length - validPoints.length} invalid points`);
      }

      const formattedPoints = validPoints.map(p => ({
        id: this.stringToUUID(p.id),
        vector: p.vector,
        payload: { ...p.payload, originalId: p.id }
      }));

      const result = await this.client.upsert(collectionName, {
        wait: true,
        points: formattedPoints
      });

      return result;
    } catch (error) {
      // Log more details about the error
      if (error.data) {
        console.error('Upsert failed:', error.data.status?.error || error.message);
      } else {
        console.error('Upsert failed:', error.message);
      }
      throw error;
    }
  }

  /**
   * Search for similar vectors
   */
  async search(collectionName, vector, options = {}) {
    await this.init();

    const {
      limit = 10,
      scoreThreshold = 0.7,
      filter = null,
      withPayload = true,
      withVector = false
    } = options;

    try {
      const results = await this.client.search(collectionName, {
        vector,
        limit,
        score_threshold: scoreThreshold,
        filter,
        with_payload: withPayload,
        with_vector: withVector
      });

      return results;
    } catch (error) {
      console.error('Search failed:', error.message);
      throw error;
    }
  }

  /**
   * Find duplicates by searching for similar vectors
   */
  async findDuplicates(collectionName, vector, questionId, threshold = 0.85) {
    const results = await this.search(collectionName, vector, {
      limit: 20,
      scoreThreshold: threshold,
      filter: {
        must_not: [
          { key: 'originalId', match: { value: questionId } }
        ]
      }
    });

    return results.map(r => ({
      id: r.payload.originalId || r.payload.id,
      score: r.score,
      question: r.payload.question,
      channel: r.payload.channel
    }));
  }

  /**
   * Batch search for multiple vectors
   */
  async batchSearch(collectionName, vectors, options = {}) {
    await this.init();

    const searches = vectors.map(v => ({
      vector: v.vector,
      limit: options.limit || 10,
      score_threshold: options.scoreThreshold || 0.7,
      filter: v.filter || null,
      with_payload: true
    }));

    try {
      const results = await this.client.searchBatch(collectionName, { searches });
      return results;
    } catch (error) {
      console.error('Batch search failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete points by IDs
   */
  async delete(collectionName, ids) {
    await this.init();

    try {
      await this.client.delete(collectionName, {
        wait: true,
        points: ids.map(id => this.stringToUUID(id))
      });
      return true;
    } catch (error) {
      console.error('Delete failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete points by filter
   */
  async deleteByFilter(collectionName, filter) {
    await this.init();

    try {
      await this.client.delete(collectionName, {
        wait: true,
        filter
      });
      return true;
    } catch (error) {
      console.error('Delete by filter failed:', error.message);
      throw error;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(collectionName) {
    await this.init();

    try {
      const info = await this.client.getCollection(collectionName);
      return {
        name: collectionName,
        vectorsCount: info.vectors_count,
        pointsCount: info.points_count,
        status: info.status,
        config: info.config
      };
    } catch (error) {
      console.error('Get collection info failed:', error.message);
      throw error;
    }
  }

  /**
   * Scroll through all points in collection
   */
  async scroll(collectionName, options = {}) {
    await this.init();

    const {
      limit = 100,
      offset = null,
      filter = null,
      withPayload = true,
      withVector = false
    } = options;

    try {
      const result = await this.client.scroll(collectionName, {
        limit,
        offset,
        filter,
        with_payload: withPayload,
        with_vector: withVector
      });

      return {
        points: result.points,
        nextOffset: result.next_page_offset
      };
    } catch (error) {
      console.error('Scroll failed:', error.message);
      throw error;
    }
  }

  /**
   * Create payload index for filtering
   */
  async createPayloadIndex(collectionName, fieldName, fieldType = 'keyword') {
    await this.init();

    try {
      await this.client.createPayloadIndex(collectionName, {
        field_name: fieldName,
        field_schema: fieldType
      });
      console.log(`✅ Created index on ${collectionName}.${fieldName}`);
      return true;
    } catch (error) {
      // Index might already exist
      if (!error.message.includes('already exists')) {
        console.error('Create index failed:', error.message);
      }
      return false;
    }
  }

  /**
   * Get point by ID
   */
  async getPoint(collectionName, id) {
    await this.init();

    try {
      const result = await this.client.retrieve(collectionName, {
        ids: [this.stringToUUID(id)],
        with_payload: true,
        with_vector: true
      });

      return result[0] || null;
    } catch (error) {
      console.error('Get point failed:', error.message);
      return null;
    }
  }

  /**
   * Check if point exists
   */
  async exists(collectionName, id) {
    const point = await this.getPoint(collectionName, id);
    return point !== null;
  }
}

// Singleton instance
const qdrant = new QdrantProvider();

export default qdrant;
export { COLLECTIONS, VECTOR_DIMENSIONS };
