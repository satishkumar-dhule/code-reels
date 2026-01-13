#!/usr/bin/env node
/**
 * Convert Multiple-Choice Questions to Text Answers
 * 
 * This script finds questions with JSON multiple-choice format in the answer field
 * and converts them to proper text-based answers using AI.
 * 
 * Instead of deleting these questions, we:
 * 1. Extract the correct answer from the JSON
 * 2. Use AI to generate a proper text-based answer
 * 3. Update the question in place
 * 4. Optionally create a test question version
 */

import 'dotenv/config';
import { dbClient } from './utils.js';
import { runWithRetries, parseJson } from './utils.js';
import { validateBeforeInsert, sanitizeQuestion } from './bots/shared/validation.js';

const DRY_RUN = process.argv.includes('--dry-run');
const CREATE_TESTS = process.argv.includes('--create-tests');

console.log('=== Convert MCQ to Text Answers ===\n');
console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '✍️  LIVE (will update database)'}`);
console.log(`Create Tests: ${CREATE_TESTS ? 'Yes' : 'No'}\n`);

/**
 * Detect if answer contains multiple-choice JSON
 */
function hasMCQFormat(answer) {
  if (!answer || typeof answer !== 'string') return false;
  
  // Check for JSON array with options
  if (answer.trim().startsWith('[{')) {
    try {
      const parsed = JSON.parse(answer);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Check if it has multiple-choice structure
        return parsed.some(opt => 
          opt.hasOwnProperty('isCorrect') || 
          opt.hasOwnProperty('text') ||
          opt.hasOwnProperty('id')
        );
      }
    } catch (e) {
      // Not valid JSON
    }
  }
  
  return false;
}

/**
 * Extract options from MCQ JSON
 */
function extractOptions(answer) {
  try {
    const parsed = JSON.parse(answer);
    if (Array.isArray(parsed)) {
      return parsed.map(opt => ({
        id: opt.id || '',
        text: opt.text || '',
        isCorrect: opt.isCorrect === true
      }));
    }
  } catch (e) {
    console.error('Failed to parse options:', e.message);
  }
  return [];
}

/**
 * Generate text-based answer from MCQ using AI
 */
async function generateTextAnswer(question, options, explanation) {
  const correctOptions = options.filter(o => o.isCorrect);
  const incorrectOptions = options.filter(o => !o.isCorrect);
  
  const prompt = `You are converting a multiple-choice question to a text-based interview question.

QUESTION: "${question}"

MULTIPLE-CHOICE OPTIONS:
${options.map(o => `${o.isCorrect ? '✓' : '✗'} ${o.id}: ${o.text}`).join('\n')}

CURRENT EXPLANATION: "${explanation?.substring(0, 500) || 'None provided'}"

Your task:
1. Write a comprehensive 2-3 sentence answer that directly addresses the question
2. The answer should incorporate the correct option(s) naturally
3. Make it suitable for verbal delivery in an interview
4. Include key technical terms and concepts
5. Minimum 50 characters, maximum 200 characters

Return ONLY a JSON object:
{
  "answer": "Your comprehensive 2-3 sentence answer here",
  "explanation": "Enhanced explanation (300-500 words) that expands on the answer with examples, best practices, and technical details"
}`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (!result || !result.answer) {
    // Fallback: use correct option text
    return {
      answer: correctOptions.map(o => o.text).join('; '),
      explanation: explanation || 'No explanation provided.'
    };
  }
  
  return result;
}

/**
 * Create test question from MCQ
 */
function createTestQuestion(originalQuestion, options) {
  return {
    questionId: originalQuestion.id,
    question: originalQuestion.question,
    type: 'multiple-choice',
    options: options,
    explanation: originalQuestion.explanation,
    difficulty: originalQuestion.difficulty,
    tags: originalQuestion.tags
  };
}

/**
 * Main conversion process
 */
async function main() {
  console.log('📥 Fetching questions with MCQ format...\n');
  
  // Fetch all questions
  const result = await dbClient.execute('SELECT * FROM questions WHERE status = "active"');
  const allQuestions = result.rows;
  
  console.log(`   Found ${allQuestions.length} total questions`);
  
  // Filter questions with MCQ format
  const mcqQuestions = allQuestions.filter(q => hasMCQFormat(q.answer));
  
  console.log(`   Found ${mcqQuestions.length} questions with MCQ format\n`);
  
  if (mcqQuestions.length === 0) {
    console.log('✅ No questions to convert!');
    return;
  }
  
  // Group by channel
  const byChannel = {};
  for (const q of mcqQuestions) {
    if (!byChannel[q.channel]) byChannel[q.channel] = [];
    byChannel[q.channel].push(q);
  }
  
  console.log('📊 Questions by channel:');
  for (const [channel, questions] of Object.entries(byChannel)) {
    console.log(`   ${channel}: ${questions.length}`);
  }
  console.log('');
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN - Showing first 3 examples:\n');
    
    for (let i = 0; i < Math.min(3, mcqQuestions.length); i++) {
      const q = mcqQuestions[i];
      const options = extractOptions(q.answer);
      
      console.log(`Example ${i + 1}:`);
      console.log(`   ID: ${q.id}`);
      console.log(`   Channel: ${q.channel}`);
      console.log(`   Question: ${q.question.substring(0, 80)}...`);
      console.log(`   Options: ${options.length}`);
      console.log(`   Correct: ${options.filter(o => o.isCorrect).map(o => o.text).join(', ')}`);
      console.log('');
    }
    
    console.log('\n💡 To convert these questions, run:');
    console.log('   node script/convert-mcq-to-text-answers.js');
    console.log('\n💡 To also create test questions, run:');
    console.log('   node script/convert-mcq-to-text-answers.js --create-tests');
    
    return;
  }
  
  // Live conversion
  console.log('🔄 Converting questions...\n');
  
  const stats = {
    converted: 0,
    failed: 0,
    testsCreated: 0
  };
  
  const testQuestions = [];
  
  for (let i = 0; i < mcqQuestions.length; i++) {
    const q = mcqQuestions[i];
    const options = extractOptions(q.answer);
    
    console.log(`[${i + 1}/${mcqQuestions.length}] Converting ${q.id} (${q.channel})...`);
    
    try {
      // Generate text-based answer
      const converted = await generateTextAnswer(q.question, options, q.explanation);
      
      // Create updated question
      const updatedQuestion = {
        id: q.id,
        question: q.question,
        answer: converted.answer,
        explanation: converted.explanation || q.explanation,
        diagram: q.diagram,
        difficulty: q.difficulty,
        tags: q.tags ? JSON.parse(q.tags) : [],
        channel: q.channel,
        subChannel: q.sub_channel,
        companies: q.companies ? JSON.parse(q.companies) : [],
        voiceKeywords: q.voice_keywords ? JSON.parse(q.voice_keywords) : null,
        voiceSuitable: q.voice_suitable === 1,
        status: 'active',
        lastUpdated: new Date().toISOString()
      };
      
      // Validate the converted question
      try {
        validateBeforeInsert(updatedQuestion, 'convert-mcq');
      } catch (validationError) {
        console.log(`   ❌ Validation failed: ${validationError.message}`);
        stats.failed++;
        continue;
      }
      
      // Update in database
      await dbClient.execute({
        sql: `UPDATE questions 
              SET answer = ?, explanation = ?, last_updated = ?
              WHERE id = ?`,
        args: [
          updatedQuestion.answer,
          updatedQuestion.explanation,
          updatedQuestion.lastUpdated,
          q.id
        ]
      });
      
      console.log(`   ✅ Converted: "${converted.answer.substring(0, 60)}..."`);
      stats.converted++;
      
      // Create test question if requested
      if (CREATE_TESTS) {
        const testQ = createTestQuestion(q, options);
        testQuestions.push(testQ);
        stats.testsCreated++;
      }
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 1500));
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      stats.failed++;
    }
  }
  
  // Save test questions if created
  if (CREATE_TESTS && testQuestions.length > 0) {
    console.log(`\n📝 Saving ${testQuestions.length} test questions...`);
    
    // Group by channel
    const testsByChannel = {};
    for (const tq of testQuestions) {
      const channel = tq.tags?.[0] || 'general';
      if (!testsByChannel[channel]) {
        testsByChannel[channel] = {
          channelId: channel,
          channelName: channel.toUpperCase(),
          title: `${channel.toUpperCase()} Practice Test`,
          description: `Practice test for ${channel}`,
          questions: []
        };
      }
      testsByChannel[channel].questions.push(tq);
    }
    
    // Insert or update tests
    for (const [channel, test] of Object.entries(testsByChannel)) {
      try {
        await dbClient.execute({
          sql: `INSERT INTO tests (id, channel_id, channel_name, title, description, questions, passing_score, created_at, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  questions = json_insert(questions, '$[#]', json(?)),
                  last_updated = ?`,
          args: [
            `test-${channel}-converted`,
            test.channelId,
            test.channelName,
            test.title,
            test.description,
            JSON.stringify(test.questions),
            70,
            new Date().toISOString(),
            new Date().toISOString(),
            JSON.stringify(test.questions[0]),
            new Date().toISOString()
          ]
        });
        console.log(`   ✅ Created test for ${channel}`);
      } catch (e) {
        console.log(`   ⚠️  Test creation failed for ${channel}: ${e.message}`);
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 CONVERSION SUMMARY');
  console.log('='.repeat(50));
  console.log(`   Total MCQ Questions: ${mcqQuestions.length}`);
  console.log(`   ✅ Converted: ${stats.converted}`);
  console.log(`   ❌ Failed: ${stats.failed}`);
  if (CREATE_TESTS) {
    console.log(`   📝 Test Questions Created: ${stats.testsCreated}`);
  }
  console.log('='.repeat(50));
  
  console.log('\n✅ Conversion complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Rebuild static files: node script/fetch-questions-for-build.js');
  console.log('   2. Verify questions in channels');
  console.log('   3. Test the converted questions');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
