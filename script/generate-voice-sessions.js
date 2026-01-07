#!/usr/bin/env node
/**
 * Generate Voice Sessions from Existing Questions
 * 
 * This script processes questions with voiceKeywords and generates
 * micro-question sessions for the session-based voice interview.
 * Enhanced with Vector DB for finding semantically related follow-up questions.
 * 
 * Usage:
 *   node script/generate-voice-sessions.js
 *   node script/generate-voice-sessions.js --channel=system-design
 *   node script/generate-voice-sessions.js --limit=10
 *   node script/generate-voice-sessions.js --use-vector-db
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  channel: null,
  limit: 50,
  dryRun: false,
  useVectorDB: false
};

for (const arg of args) {
  if (arg.startsWith('--channel=')) {
    options.channel = arg.split('=')[1];
  } else if (arg.startsWith('--limit=')) {
    options.limit = parseInt(arg.split('=')[1]);
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--use-vector-db') {
    options.useVectorDB = true;
  }
}

// Lazy load vector DB only when needed
let vectorDB = null;
async function getVectorDB() {
  if (!vectorDB) {
    const module = await import('./ai/services/vector-db.js');
    vectorDB = module.default;
    await vectorDB.init();
  }
  return vectorDB;
}

// Question templates for different channels
const QUESTION_TEMPLATES = {
  'system-design': [
    "What is the purpose of {keywords} in system design?",
    "How does {keywords} help with scalability?",
    "When would you use {keywords}?",
    "What are the trade-offs of {keywords}?",
    "How do {keywords} work together?",
    "What problems does {keywords} solve?"
  ],
  'behavioral': [
    "Describe a situation involving {keywords}.",
    "How did you handle {keywords}?",
    "What was the outcome of {keywords}?",
    "What did you learn about {keywords}?",
    "How would you approach {keywords} differently?",
    "Give an example of {keywords}."
  ],
  'devops': [
    "What is {keywords} used for?",
    "How do you implement {keywords}?",
    "What are the benefits of {keywords}?",
    "How does {keywords} improve reliability?",
    "When should you use {keywords}?",
    "What tools support {keywords}?"
  ],
  'sre': [
    "How does {keywords} affect reliability?",
    "What metrics relate to {keywords}?",
    "How do you monitor {keywords}?",
    "What's the impact of {keywords} on SLOs?",
    "How do you troubleshoot {keywords}?",
    "What's the relationship between {keywords}?"
  ],
  'default': [
    "What is {keywords}?",
    "How does {keywords} work?",
    "Why is {keywords} important?",
    "When would you use {keywords}?",
    "What are the benefits of {keywords}?",
    "Explain {keywords} briefly."
  ]
};

// Common abbreviations and synonyms
const ABBREVIATIONS = {
  'kubernetes': ['k8s', 'kube'],
  'continuous integration': ['ci', 'ci/cd'],
  'continuous deployment': ['cd', 'ci/cd'],
  'load balancer': ['lb', 'load balancing'],
  'database': ['db', 'data store'],
  'availability': ['uptime', 'high availability', 'ha'],
  'latency': ['response time', 'delay'],
  'throughput': ['bandwidth', 'capacity'],
  'microservices': ['micro services', 'microservice'],
  'authentication': ['auth', 'authn'],
  'authorization': ['authz', 'permissions']
};

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function extractTopic(question) {
  const cleaned = question
    .replace(/^(what|how|why|when|explain|describe|tell me about)\s+/i, '')
    .replace(/\?$/, '')
    .trim();
  
  const endIndex = Math.min(
    cleaned.length,
    50,
    cleaned.indexOf(',') > 0 ? cleaned.indexOf(',') : cleaned.length,
    cleaned.indexOf('.') > 0 ? cleaned.indexOf('.') : cleaned.length
  );
  
  return cleaned.substring(0, endIndex).trim();
}

function extractRelevantAnswer(keywords, answer, explanation) {
  const fullText = `${answer} ${explanation}`.toLowerCase();
  const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  const relevantSentences = sentences.filter(sentence => 
    keywords.some(kw => sentence.includes(kw.toLowerCase()))
  );
  
  if (relevantSentences.length > 0) {
    return relevantSentences.slice(0, 2).join('. ').trim() + '.';
  }
  
  return answer.split(/[.!?]+/)[0].trim() + '.';
}

function generateAcceptablePhrases(keywords) {
  const phrases = [];
  
  for (const keyword of keywords) {
    const kw = keyword.toLowerCase();
    
    // Plural/singular variations
    if (kw.endsWith('s')) {
      phrases.push(kw.slice(0, -1));
    } else {
      phrases.push(kw + 's');
    }
    
    // Common abbreviations
    if (ABBREVIATIONS[kw]) {
      phrases.push(...ABBREVIATIONS[kw]);
    }
  }
  
  return [...new Set(phrases)];
}

function createMicroQuestion(questionId, index, keywords, answer, explanation, channel) {
  const templates = QUESTION_TEMPLATES[channel] || QUESTION_TEMPLATES['default'];
  const template = templates[index % templates.length];
  
  const microQuestion = template.replace('{keywords}', keywords.join(' and '));
  const expectedAnswer = extractRelevantAnswer(keywords, answer, explanation);
  const acceptablePhrases = generateAcceptablePhrases(keywords);
  
  return {
    id: `${questionId}-micro-${index + 1}`,
    question: microQuestion,
    expectedAnswer,
    keywords,
    acceptablePhrases,
    difficulty: index < 2 ? 'easy' : index < 4 ? 'medium' : 'hard',
    order: index + 1
  };
}

function generateSessionFromQuestion(question) {
  const keywords = question.voiceKeywords || [];
  
  if (keywords.length < 4) {
    return null;
  }
  
  const microQuestions = [];
  const keywordGroups = chunkArray(keywords, 2);
  
  keywordGroups.forEach((group, index) => {
    const microQ = createMicroQuestion(
      question.id,
      index,
      group,
      question.answer || '',
      question.explanation || '',
      question.channel
    );
    if (microQ) {
      microQuestions.push(microQ);
    }
  });
  
  if (microQuestions.length < 3) {
    return null;
  }
  
  return {
    id: `session-${question.id}`,
    topic: extractTopic(question.question),
    channel: question.channel,
    difficulty: question.difficulty,
    contextQuestion: question.question,
    microQuestions: microQuestions.slice(0, 6),
    totalQuestions: Math.min(microQuestions.length, 6),
    sourceQuestionId: question.id,
    relatedQuestionIds: [] // Will be populated by vector DB
  };
}

/**
 * Find related questions using Vector DB for session enrichment
 */
async function findRelatedQuestions(session, allQuestions) {
  if (!options.useVectorDB) {
    return session;
  }
  
  try {
    const vdb = await getVectorDB();
    const searchQuery = `${session.topic} ${session.contextQuestion}`;
    
    const similar = await vdb.findSimilar(searchQuery, {
      limit: 5,
      threshold: 0.1,
      channel: session.channel,
      excludeIds: [session.sourceQuestionId]
    });
    
    session.relatedQuestionIds = similar.map(s => s.id);
    console.log(`   Found ${similar.length} related questions for session`);
  } catch (error) {
    console.log(`   ⚠️ Vector DB search failed: ${error.message}`);
  }
  
  return session;
}

async function main() {
  console.log('=== Voice Session Generator ===\n');
  console.log('Options:', options);
  
  // Load questions from data files
  const dataDir = path.join(__dirname, '..', 'client', 'public', 'data', 'questions');
  
  if (!fs.existsSync(dataDir)) {
    console.error('Questions directory not found:', dataDir);
    process.exit(1);
  }
  
  const channelFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  console.log(`\nFound ${channelFiles.length} channel files`);
  
  let allQuestions = [];
  
  for (const file of channelFiles) {
    const channelId = file.replace('.json', '');
    
    // Skip if filtering by channel
    if (options.channel && channelId !== options.channel) {
      continue;
    }
    
    const filePath = path.join(dataDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Filter questions suitable for voice sessions
    const suitable = data.questions.filter(q => 
      q.voiceSuitable === true && 
      q.voiceKeywords && 
      q.voiceKeywords.length >= 4
    );
    
    console.log(`  ${channelId}: ${suitable.length} suitable questions`);
    allQuestions.push(...suitable);
  }
  
  console.log(`\nTotal suitable questions: ${allQuestions.length}`);
  
  // Limit questions
  const questionsToProcess = allQuestions.slice(0, options.limit);
  console.log(`Processing ${questionsToProcess.length} questions\n`);
  
  // Generate sessions
  const sessions = [];
  let successCount = 0;
  let failCount = 0;
  
  for (const question of questionsToProcess) {
    let session = generateSessionFromQuestion(question);
    
    if (session) {
      // Enrich with related questions if vector DB is enabled
      if (options.useVectorDB) {
        session = await findRelatedQuestions(session, allQuestions);
      }
      
      sessions.push(session);
      successCount++;
      console.log(`✅ ${question.id}: ${session.totalQuestions} micro-questions`);
    } else {
      failCount++;
      console.log(`❌ ${question.id}: Not enough keywords`);
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Generated: ${successCount} sessions`);
  console.log(`Skipped: ${failCount} questions`);
  
  if (!options.dryRun && sessions.length > 0) {
    // Save sessions to a JSON file for reference
    const outputPath = path.join(__dirname, '..', 'client', 'public', 'data', 'voice-sessions.json');
    fs.writeFileSync(outputPath, JSON.stringify({ sessions }, null, 2));
    console.log(`\nSaved to: ${outputPath}`);
  }
  
  // Show sample session
  if (sessions.length > 0) {
    console.log('\n=== Sample Session ===');
    const sample = sessions[0];
    console.log(`Topic: ${sample.topic}`);
    console.log(`Questions: ${sample.totalQuestions}`);
    console.log('\nMicro-questions:');
    sample.microQuestions.forEach((mq, i) => {
      console.log(`  ${i + 1}. ${mq.question}`);
      console.log(`     Keywords: ${mq.keywords.join(', ')}`);
      console.log(`     Expected: ${mq.expectedAnswer.substring(0, 80)}...`);
    });
  }
}

main().catch(console.error);
