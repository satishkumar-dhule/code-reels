/**
 * Embedding Provider
 * 
 * Generates embeddings using:
 * 1. Ollama (local ML models - recommended)
 * 2. OpenCode (free models via CLI)
 * 3. TF-IDF (offline fallback)
 */

import { spawn } from 'child_process';
import config from '../config.js';

// Embedding model configurations
const MODELS = {
  // Ollama models (local)
  'nomic-embed-text': {
    provider: 'ollama',
    dimensions: 768,
    maxTokens: 8192
  },
  'mxbai-embed-large': {
    provider: 'ollama',
    dimensions: 1024,
    maxTokens: 512
  },
  'all-minilm': {
    provider: 'ollama',
    dimensions: 384,
    maxTokens: 256
  },
  // OpenCode (uses free models)
  'opencode': {
    provider: 'opencode',
    dimensions: 384,
    maxTokens: 8000
  },
  // Fallback TF-IDF (no external service needed)
  'tfidf': {
    provider: 'tfidf',
    dimensions: 384,
    maxTokens: 10000
  }
};

class EmbeddingProvider {
  constructor() {
    this.model = process.env.EMBEDDING_MODEL || 'tfidf';
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.cache = new Map();
    this.cacheEnabled = true;
    // IDF values for TF-IDF (built from corpus)
    this.idfValues = new Map();
    this.documentCount = 0;
  }

  /**
   * Get model configuration
   */
  getModelConfig() {
    return MODELS[this.model] || MODELS['tfidf'];
  }

  /**
   * Generate embedding for text
   */
  async embed(text, options = {}) {
    const modelConfig = this.getModelConfig();
    
    // Check cache
    const cacheKey = `${this.model}:${text.substring(0, 100)}`;
    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let embedding;
    
    try {
      switch (modelConfig.provider) {
        case 'ollama':
          embedding = await this.embedWithOllama(text);
          break;
        case 'opencode':
          embedding = await this.embedWithOpenCode(text);
          break;
        case 'tfidf':
        default:
          embedding = this.embedWithTFIDF(text, modelConfig.dimensions);
          break;
      }
    } catch (error) {
      // Fallback to TF-IDF if primary provider fails
      console.warn(`Primary embedding failed (${modelConfig.provider}): ${error.message}`);
      console.warn('Using TF-IDF fallback');
      embedding = this.embedWithTFIDF(text, MODELS['tfidf'].dimensions);
    }

    // Cache result
    if (this.cacheEnabled) {
      this.cache.set(cacheKey, embedding);
    }

    return embedding;
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async embedBatch(texts, options = {}) {
    const batchSize = options.batchSize || 32;
    const results = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(text => this.embed(text))
      );
      results.push(...batchResults);

      // Rate limiting between batches
      if (i + batchSize < texts.length) {
        await new Promise(r => setTimeout(r, 50));
      }
    }

    return results;
  }

  /**
   * Embed using Ollama (local)
   */
  async embedWithOllama(text) {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: text
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      throw new Error(`Ollama embedding failed: ${error.message}`);
    }
  }

  /**
   * Embed using OpenCode CLI (free models)
   */
  async embedWithOpenCode(text) {
    const dimensions = MODELS['opencode'].dimensions;
    
    // OpenCode doesn't have native embedding support, so we use a prompt-based approach
    // to generate a semantic hash that we convert to a vector
    const prompt = `Generate a semantic fingerprint for this text. Return ONLY a JSON array of ${dimensions} numbers between -1 and 1 representing the semantic meaning. No explanation.

Text: "${text.substring(0, 2000)}"

Return format: [0.1, -0.2, 0.3, ...]`;

    return new Promise((resolve, reject) => {
      let output = '';
      const model = config.defaultModel;
      
      const proc = spawn('opencode', ['run', '--model', model, '--format', 'json', prompt], {
        timeout: 60000,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { output += data.toString(); });
      
      proc.on('close', (code) => {
        try {
          // Parse the output to extract the array
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
          
          const text = fullText || output;
          
          // Try to extract array
          const arrayMatch = text.match(/\[[\d\s,.\-e]+\]/);
          if (arrayMatch) {
            const arr = JSON.parse(arrayMatch[0]);
            if (Array.isArray(arr) && arr.length > 0) {
              // Normalize to target dimensions
              const normalized = this.normalizeVector(arr, dimensions);
              resolve(normalized);
              return;
            }
          }
          
          // Fallback to TF-IDF
          resolve(this.embedWithTFIDF(text, dimensions));
        } catch (error) {
          reject(error);
        }
      });
      
      proc.on('error', reject);
    });
  }

  /**
   * Embed using TF-IDF (offline fallback)
   * Creates a deterministic vector based on term frequencies
   */
  embedWithTFIDF(text, dimensions = 384) {
    // Tokenize and normalize
    const tokens = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
    
    if (tokens.length === 0) {
      return new Array(dimensions).fill(0);
    }
    
    // Calculate term frequencies
    const tf = {};
    tokens.forEach(token => {
      tf[token] = (tf[token] || 0) + 1;
    });
    
    // Normalize TF
    const maxTf = Math.max(...Object.values(tf));
    Object.keys(tf).forEach(key => {
      tf[key] = tf[key] / maxTf;
    });
    
    // Create vector using hash-based projection
    const vector = new Array(dimensions).fill(0);
    
    for (const [token, freq] of Object.entries(tf)) {
      // Use multiple hash functions for better distribution
      const hash1 = this.hashString(token);
      const hash2 = this.hashString(token + '_2');
      const hash3 = this.hashString(token + '_3');
      
      // Project to multiple dimensions
      const idx1 = Math.abs(hash1) % dimensions;
      const idx2 = Math.abs(hash2) % dimensions;
      const idx3 = Math.abs(hash3) % dimensions;
      
      // Add weighted contribution
      const sign1 = hash1 > 0 ? 1 : -1;
      const sign2 = hash2 > 0 ? 1 : -1;
      
      vector[idx1] += freq * sign1;
      vector[idx2] += freq * sign2 * 0.5;
      vector[idx3] += freq * 0.25;
    }
    
    // L2 normalize
    return this.l2Normalize(vector);
  }

  /**
   * Hash string to integer
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  /**
   * L2 normalize a vector
   */
  l2Normalize(vector) {
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (norm === 0) return vector;
    return vector.map(v => v / norm);
  }

  /**
   * Normalize vector to target dimensions
   */
  normalizeVector(vector, targetDim) {
    if (vector.length === targetDim) {
      return this.l2Normalize(vector);
    }
    
    // Resize by interpolation or truncation
    const result = new Array(targetDim).fill(0);
    const ratio = vector.length / targetDim;
    
    for (let i = 0; i < targetDim; i++) {
      const srcIdx = Math.floor(i * ratio);
      result[i] = vector[srcIdx] || 0;
    }
    
    return this.l2Normalize(result);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  /**
   * Get embedding dimensions for current model
   */
  getDimensions() {
    return this.getModelConfig().dimensions;
  }

  /**
   * Clear embedding cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      enabled: this.cacheEnabled
    };
  }

  /**
   * Set embedding model
   */
  setModel(model) {
    if (!MODELS[model]) {
      throw new Error(`Unknown model: ${model}. Available: ${Object.keys(MODELS).join(', ')}`);
    }
    this.model = model;
    this.clearCache();
  }
}

// Singleton instance
const embeddings = new EmbeddingProvider();

export default embeddings;
export { MODELS };
