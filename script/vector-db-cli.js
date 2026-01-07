#!/usr/bin/env node
/**
 * Vector Database CLI
 * 
 * Manage Qdrant vector database for question embeddings
 * 
 * Usage:
 *   node script/vector-db-cli.js init          - Initialize collections
 *   node script/vector-db-cli.js index         - Index all questions
 *   node script/vector-db-cli.js search <query> - Semantic search
 *   node script/vector-db-cli.js duplicates    - Find all duplicates
 *   node script/vector-db-cli.js analyze <id>  - Analyze single question
 *   node script/vector-db-cli.js stats         - Show collection stats
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import vectorDB from './ai/services/vector-db.js';
import mlDecisions from './ai/services/ml-decisions.js';

// Database connection
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function fetchQuestions(limit = null) {
  const query = limit 
    ? `SELECT * FROM questions WHERE status = 'active' LIMIT ${limit}`
    : `SELECT * FROM questions WHERE status = 'active'`;
  
  const result = await client.execute(query);
  return result.rows.map(row => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    explanation: row.explanation,
    channel: row.channel,
    subChannel: row.sub_channel,
    difficulty: row.difficulty,
    tags: row.tags,
    tldr: row.tldr,
    relevanceScore: row.relevance_score,
    status: row.status,
    createdAt: row.created_at
  }));
}

async function fetchQuestion(id) {
  const result = await client.execute({
    sql: 'SELECT * FROM questions WHERE id = ?',
    args: [id]
  });
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    explanation: row.explanation,
    channel: row.channel,
    subChannel: row.sub_channel,
    difficulty: row.difficulty,
    tags: row.tags,
    tldr: row.tldr,
    relevanceScore: row.relevance_score,
    status: row.status,
    createdAt: row.created_at
  };
}

// Commands
const commands = {
  async init() {
    console.log('🚀 Initializing vector database...\n');
    await vectorDB.init();
    console.log('\n✅ Vector database initialized');
  },

  async index(args) {
    const limit = args[0] ? parseInt(args[0]) : null;
    console.log(`📥 Indexing questions${limit ? ` (limit: ${limit})` : ''}...\n`);
    
    const questions = await fetchQuestions(limit);
    console.log(`Found ${questions.length} questions to index\n`);
    
    const result = await vectorDB.indexQuestions(questions);
    
    console.log('\n📊 Indexing Results:');
    console.log(`   Indexed: ${result.indexed}`);
    console.log(`   Failed: ${result.failed}`);
    if (result.errors.length > 0) {
      console.log('   Errors:', result.errors);
    }
  },

  async search(args) {
    const query = args.join(' ');
    if (!query) {
      console.log('Usage: node script/vector-db-cli.js search <query>');
      return;
    }

    console.log(`🔍 Searching for: "${query}"\n`);
    
    // Lower threshold for TF-IDF embeddings
    const results = await vectorDB.semanticSearch(query, { limit: 10, threshold: 0.1 });
    
    console.log(`Found ${results.length} results:\n`);
    results.forEach((r, i) => {
      console.log(`${i + 1}. [${r.relevance}%] ${r.question.substring(0, 80)}...`);
      console.log(`   Channel: ${r.channel} | Difficulty: ${r.difficulty}`);
      console.log('');
    });
  },

  async duplicates(args) {
    const threshold = args[0] ? parseFloat(args[0]) : 0.85;
    console.log(`🔍 Finding duplicates (threshold: ${threshold * 100}%)...\n`);
    
    const questions = await fetchQuestions(100); // Start with sample
    const duplicateGroups = [];
    const processed = new Set();

    for (const q of questions) {
      if (processed.has(q.id)) continue;

      try {
        const dups = await vectorDB.findDuplicates(q, threshold);
        
        if (dups.length > 0) {
          duplicateGroups.push({
            primary: { id: q.id, question: q.question.substring(0, 60) },
            duplicates: dups.map(d => ({
              id: d.id,
              similarity: Math.round((d.score || 0) * 100),
              question: d.question?.substring(0, 60)
            }))
          });
          
          dups.forEach(d => processed.add(d.id));
        }
      } catch (error) {
        console.error(`Error checking ${q.id}:`, error.message);
      }
      processed.add(q.id);
    }

    console.log(`Found ${duplicateGroups.length} duplicate groups:\n`);
    duplicateGroups.slice(0, 20).forEach((group, i) => {
      console.log(`Group ${i + 1}:`);
      console.log(`  Primary: ${group.primary.question}...`);
      group.duplicates.slice(0, 5).forEach(d => {
        console.log(`  └─ [${d.similarity}%] ${d.question}...`);
      });
      console.log('');
    });
  },

  async analyze(args) {
    const id = args[0];
    if (!id) {
      console.log('Usage: node script/vector-db-cli.js analyze <question-id>');
      return;
    }

    console.log(`🔬 Analyzing question: ${id}\n`);
    
    const question = await fetchQuestion(id);
    if (!question) {
      console.log('Question not found');
      return;
    }

    console.log(`Question: ${question.question.substring(0, 100)}...`);
    console.log(`Channel: ${question.channel}`);
    console.log(`Difficulty: ${question.difficulty}\n`);

    const analysis = await mlDecisions.analyzeQuestion(question);
    
    console.log('📊 Analysis Results:\n');
    
    // Duplicates
    console.log('Duplicates Check:');
    console.log(`  Has duplicates: ${analysis.checks.duplicates.hasDuplicates}`);
    console.log(`  Near duplicates: ${analysis.checks.duplicates.nearDuplicates.length}`);
    console.log(`  Action: ${analysis.checks.duplicates.action}`);
    
    // Channel fit
    console.log('\nChannel Fit:');
    console.log(`  Score: ${analysis.checks.channelFit.channelFitScore}%`);
    console.log(`  Similar in channel: ${analysis.checks.channelFit.similarInChannel}`);
    console.log(`  Action: ${analysis.checks.channelFit.action}`);
    
    // Quality
    if (analysis.checks.quality.overallScore) {
      console.log('\nQuality:');
      console.log(`  Score: ${analysis.checks.quality.overallScore}/100`);
      console.log(`  Action: ${analysis.checks.quality.action}`);
    }
    
    // Recommendation
    console.log('\n📋 Recommendation:');
    console.log(`  Action: ${analysis.recommendation.action}`);
    console.log(`  Reason: ${analysis.recommendation.reason}`);
    console.log(`  Priority: ${analysis.recommendation.priority}`);
  },

  async stats() {
    console.log('📊 Vector Database Statistics\n');
    
    try {
      const stats = await vectorDB.getStats();
      console.log(`Collection: ${stats.name}`);
      console.log(`Points: ${stats.pointsCount}`);
      console.log(`Vectors: ${stats.vectorsCount}`);
      console.log(`Status: ${stats.status}`);
    } catch (error) {
      console.log('Could not fetch stats:', error.message);
    }
  },

  async redundancy(args) {
    const limit = args[0] ? parseInt(args[0]) : 50;
    console.log(`🔍 Detecting redundancy in ${limit} questions...\n`);
    
    const questions = await fetchQuestions(limit);
    const result = await mlDecisions.detectRedundancy(questions);
    
    console.log(`Found ${result.totalGroups} redundancy groups`);
    console.log(`Questions in groups: ${result.questionsInGroups}\n`);
    
    result.groups.slice(0, 10).forEach((group, i) => {
      console.log(`Group ${i + 1}: ${group.related.length + 1} questions`);
      console.log(`  Avg similarity: ${Math.round(group.avgSimilarity)}%`);
      console.log(`  Recommendation: ${group.recommendation}`);
      console.log('');
    });
  },

  help() {
    console.log(`
Vector Database CLI

Commands:
  init              Initialize vector database collections
  index [limit]     Index questions (optional limit)
  search <query>    Semantic search for questions
  duplicates [threshold]  Find duplicate questions (default: 0.85)
  analyze <id>      Analyze a specific question
  redundancy [limit] Detect redundant content
  stats             Show collection statistics
  help              Show this help message

Environment Variables:
  QDRANT_URL        Qdrant Cloud URL
  QDRANT_API_KEY    Qdrant API key
  OLLAMA_URL        Ollama server URL (default: http://localhost:11434)
  EMBEDDING_MODEL   Embedding model (default: nomic-embed-text)
  DECISION_MODEL    Decision model (default: llama3.2)
`);
  }
};

// Main
const [,, command, ...args] = process.argv;

if (!command || !commands[command]) {
  commands.help();
  process.exit(command ? 1 : 0);
}

commands[command](args).catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
