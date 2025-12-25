/**
 * Review Challenges Bot
 * Reviews coding challenges by:
 * 1. Running solutions to verify expected outputs
 * 2. Checking for common issues (missing args, invalid syntax)
 * 3. Marking challenges as reviewed/needs_fix/approved
 * 
 * Usage: node script/review-challenges-bot.js
 * 
 * Environment variables:
 *   BATCH_SIZE - Number of challenges to review per run (default: 20)
 *   CHALLENGE_ID - Review specific challenge by ID (optional)
 *   MARK_ALL_FOR_REVIEW - Set to 'true' to mark all challenges for review
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { writeGitHubOutput } from './utils.js';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '20', 10);
const CHALLENGE_ID = process.env.CHALLENGE_ID || null;
const MARK_ALL_FOR_REVIEW = process.env.MARK_ALL_FOR_REVIEW === 'true';

// Review status enum
const ReviewStatus = {
  PENDING: 'pending',      // Not yet reviewed
  APPROVED: 'approved',    // Passed all checks
  NEEDS_FIX: 'needs_fix',  // Has issues that need fixing
  SKIPPED: 'skipped',      // Cannot be auto-reviewed (e.g., linked list)
};

/**
 * Initialize review columns in coding_challenges table
 */
async function initReviewColumns() {
  console.log('📦 Ensuring review columns exist...');
  
  const columns = [
    { name: 'review_status', type: 'TEXT DEFAULT "pending"' },
    { name: 'review_notes', type: 'TEXT' },
    { name: 'reviewed_at', type: 'TEXT' },
    { name: 'test_execution_verified', type: 'INTEGER DEFAULT 0' },
  ];
  
  for (const col of columns) {
    try {
      await db.execute(`ALTER TABLE coding_challenges ADD COLUMN ${col.name} ${col.type}`);
      console.log(`  ✓ Added column: ${col.name}`);
    } catch (e) {
      // Column already exists
    }
  }
  
  // Create index for review status
  try {
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_review_status ON coding_challenges(review_status)`);
  } catch (e) {}
  
  console.log('✅ Review columns ready\n');
}

/**
 * Mark all challenges for review
 */
async function markAllForReview() {
  console.log('🔄 Marking all challenges for review...');
  
  const result = await db.execute(`
    UPDATE coding_challenges 
    SET review_status = 'pending', 
        review_notes = NULL, 
        reviewed_at = NULL,
        test_execution_verified = 0
  `);
  
  console.log(`✅ Marked ${result.rowsAffected} challenges for review\n`);
  return result.rowsAffected;
}

/**
 * Execute Python code and return the result
 */
async function executePythonCode(code, functionName, input) {
  return new Promise((resolve, reject) => {
    const wrappedCode = `
import json
from collections.abc import Iterator, Iterable

${code}

# Parse input and call function
_args = (${input},)
if len(_args) == 1 and isinstance(_args[0], tuple):
    _args = _args[0]

_result = ${functionName}(*_args)

# Convert to JSON-compatible format
def to_json(obj):
    if obj is None: return None
    if isinstance(obj, bool): return obj
    if isinstance(obj, (int, float, str)): return obj
    if isinstance(obj, (list, tuple)): return [to_json(x) for x in obj]
    if isinstance(obj, dict): return {str(k): to_json(v) for k, v in obj.items()}
    if isinstance(obj, Iterator): return [to_json(x) for x in obj]
    if isinstance(obj, Iterable) and not isinstance(obj, (str, bytes)): return [to_json(x) for x in obj]
    return str(obj)

print(json.dumps(to_json(_result)))
`;

    const tempFile = path.join(os.tmpdir(), `review_challenge_${Date.now()}.py`);
    fs.writeFileSync(tempFile, wrappedCode);

    const python = spawn('python3', [tempFile], { timeout: 10000 });
    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => { stdout += data.toString(); });
    python.stderr.on('data', (data) => { stderr += data.toString(); });

    python.on('close', (code) => {
      try { fs.unlinkSync(tempFile); } catch (e) {}
      
      if (code === 0) {
        resolve({ success: true, output: stdout.trim() });
      } else {
        resolve({ success: false, error: stderr || 'Unknown error' });
      }
    });

    python.on('error', (err) => {
      try { fs.unlinkSync(tempFile); } catch (e) {}
      resolve({ success: false, error: err.message });
    });
  });
}

function extractPythonFunctionName(code) {
  const match = code.match(/def\s+(\w+)\s*\(/);
  return match ? match[1] : null;
}

/**
 * Review a single challenge
 */
async function reviewChallenge(challenge) {
  const issues = [];
  let canAutoReview = true;
  let allTestsPassed = true;
  
  const { id, title, solution_py, test_cases } = challenge;
  
  // Check if solution exists
  if (!solution_py || solution_py.trim().length < 10) {
    issues.push('Missing or empty Python solution');
    return { status: ReviewStatus.NEEDS_FIX, issues, canAutoReview: false };
  }
  
  // Extract function name
  const functionName = extractPythonFunctionName(solution_py);
  if (!functionName) {
    issues.push('Could not extract function name from Python solution');
    return { status: ReviewStatus.NEEDS_FIX, issues, canAutoReview: false };
  }
  
  // Check for linked list / special data structures (can't auto-review)
  if (solution_py.includes('ListNode') || solution_py.includes('.next') || solution_py.includes('.val')) {
    issues.push('Uses linked list data structure - requires manual review');
    return { status: ReviewStatus.SKIPPED, issues, canAutoReview: false };
  }
  
  // Parse test cases
  let testCases;
  try {
    testCases = JSON.parse(test_cases);
  } catch (e) {
    issues.push('Invalid test_cases JSON');
    return { status: ReviewStatus.NEEDS_FIX, issues, canAutoReview: false };
  }
  
  if (!Array.isArray(testCases) || testCases.length === 0) {
    issues.push('No test cases defined');
    return { status: ReviewStatus.NEEDS_FIX, issues, canAutoReview: false };
  }
  
  // Run each test case
  const testResults = [];
  for (const tc of testCases) {
    const result = await executePythonCode(solution_py, functionName, tc.input);
    
    if (!result.success) {
      // Check for common issues
      if (result.error.includes('missing') && result.error.includes('positional argument')) {
        issues.push(`Test ${tc.id}: Function signature mismatch - input format may be wrong`);
        canAutoReview = false;
      } else if (result.error.includes('NameError')) {
        issues.push(`Test ${tc.id}: Undefined variable or class in solution`);
        canAutoReview = false;
      } else {
        issues.push(`Test ${tc.id}: Execution error - ${result.error.substring(0, 100)}`);
      }
      allTestsPassed = false;
      testResults.push({ id: tc.id, passed: false, error: result.error });
    } else {
      // Compare output
      const actualOutput = result.output;
      const expectedOutput = tc.expectedOutput;
      
      if (actualOutput !== expectedOutput) {
        issues.push(`Test ${tc.id}: Output mismatch - expected "${expectedOutput}", got "${actualOutput}"`);
        allTestsPassed = false;
        testResults.push({ id: tc.id, passed: false, expected: expectedOutput, actual: actualOutput });
      } else {
        testResults.push({ id: tc.id, passed: true });
      }
    }
  }
  
  // Determine final status
  if (!canAutoReview) {
    return { status: ReviewStatus.SKIPPED, issues, testResults };
  }
  
  if (allTestsPassed) {
    return { status: ReviewStatus.APPROVED, issues: [], testResults };
  }
  
  return { status: ReviewStatus.NEEDS_FIX, issues, testResults };
}

/**
 * Update challenge review status in database
 */
async function updateReviewStatus(id, status, notes) {
  await db.execute({
    sql: `UPDATE coding_challenges 
          SET review_status = ?, 
              review_notes = ?, 
              reviewed_at = ?,
              test_execution_verified = ?
          WHERE id = ?`,
    args: [
      status,
      notes ? JSON.stringify(notes) : null,
      new Date().toISOString(),
      status === ReviewStatus.APPROVED ? 1 : 0,
      id
    ]
  });
}

/**
 * Get challenges to review
 */
async function getChallengesToReview(limit) {
  if (CHALLENGE_ID) {
    const result = await db.execute({
      sql: 'SELECT * FROM coding_challenges WHERE id = ?',
      args: [CHALLENGE_ID]
    });
    return result.rows;
  }
  
  const result = await db.execute({
    sql: `SELECT * FROM coding_challenges 
          WHERE review_status = 'pending' OR review_status IS NULL
          ORDER BY id
          LIMIT ?`,
    args: [limit]
  });
  return result.rows;
}

/**
 * Get review statistics
 */
async function getReviewStats() {
  const result = await db.execute(`
    SELECT 
      review_status,
      COUNT(*) as count
    FROM coding_challenges
    GROUP BY review_status
  `);
  
  const stats = {
    pending: 0,
    approved: 0,
    needs_fix: 0,
    skipped: 0,
    total: 0
  };
  
  for (const row of result.rows) {
    const status = row.review_status || 'pending';
    stats[status] = row.count;
    stats.total += row.count;
  }
  
  return stats;
}

async function main() {
  console.log('=== 🔍 Coding Challenge Review Bot ===\n');
  
  // Initialize review columns
  await initReviewColumns();
  
  // Mark all for review if requested
  if (MARK_ALL_FOR_REVIEW) {
    await markAllForReview();
  }
  
  // Get initial stats
  const initialStats = await getReviewStats();
  console.log('📊 Current Review Status:');
  console.log(`   Pending: ${initialStats.pending}`);
  console.log(`   Approved: ${initialStats.approved}`);
  console.log(`   Needs Fix: ${initialStats.needs_fix}`);
  console.log(`   Skipped: ${initialStats.skipped}`);
  console.log(`   Total: ${initialStats.total}\n`);
  
  // Get challenges to review
  const challenges = await getChallengesToReview(BATCH_SIZE);
  
  if (challenges.length === 0) {
    console.log('✅ No challenges pending review!');
    writeGitHubOutput({ reviewed: 0, approved: 0, needs_fix: 0, skipped: 0 });
    return;
  }
  
  console.log(`📝 Reviewing ${challenges.length} challenges...\n`);
  
  const results = {
    reviewed: 0,
    approved: 0,
    needs_fix: 0,
    skipped: 0,
    details: []
  };
  
  for (const challenge of challenges) {
    console.log(`\n🔍 ${challenge.id}: ${challenge.title}`);
    
    const review = await reviewChallenge(challenge);
    
    // Update database
    await updateReviewStatus(challenge.id, review.status, review.issues);
    
    results.reviewed++;
    results[review.status]++;
    results.details.push({
      id: challenge.id,
      title: challenge.title,
      status: review.status,
      issues: review.issues
    });
    
    // Log result
    const statusEmoji = {
      [ReviewStatus.APPROVED]: '✅',
      [ReviewStatus.NEEDS_FIX]: '❌',
      [ReviewStatus.SKIPPED]: '⏭️',
      [ReviewStatus.PENDING]: '⏳'
    };
    
    console.log(`   ${statusEmoji[review.status]} ${review.status.toUpperCase()}`);
    if (review.issues.length > 0) {
      review.issues.forEach(issue => console.log(`      - ${issue}`));
    }
  }
  
  // Final stats
  const finalStats = await getReviewStats();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 REVIEW SUMMARY');
  console.log('='.repeat(50));
  console.log(`\nThis run:`);
  console.log(`   Reviewed: ${results.reviewed}`);
  console.log(`   Approved: ${results.approved}`);
  console.log(`   Needs Fix: ${results.needs_fix}`);
  console.log(`   Skipped: ${results.skipped}`);
  
  console.log(`\nOverall status:`);
  console.log(`   Pending: ${finalStats.pending}`);
  console.log(`   Approved: ${finalStats.approved}`);
  console.log(`   Needs Fix: ${finalStats.needs_fix}`);
  console.log(`   Skipped: ${finalStats.skipped}`);
  console.log(`   Total: ${finalStats.total}`);
  
  // List challenges needing fixes
  if (results.needs_fix > 0) {
    console.log('\n❌ Challenges needing fixes:');
    results.details
      .filter(d => d.status === ReviewStatus.NEEDS_FIX)
      .forEach(d => {
        console.log(`   ${d.id}: ${d.title}`);
        d.issues.forEach(i => console.log(`      - ${i}`));
      });
  }
  
  writeGitHubOutput({
    reviewed: results.reviewed,
    approved: results.approved,
    needs_fix: results.needs_fix,
    skipped: results.skipped,
    pending: finalStats.pending,
    total: finalStats.total
  });
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
