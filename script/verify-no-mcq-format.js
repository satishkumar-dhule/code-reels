#!/usr/bin/env node
/**
 * Comprehensive verification that no MCQ format exists anywhere
 */

import 'dotenv/config';
import { dbClient } from './utils.js';
import fs from 'fs';
import path from 'path';

console.log('=== Comprehensive MCQ Format Verification ===\n');

const results = {
  database: { checked: false, clean: false, count: 0 },
  staticFiles: { checked: false, clean: false, files: [] },
  tests: { checked: false, clean: false, count: 0 }
};

// 1. Check Database
console.log('1️⃣  Checking Database...');
try {
  const result = await dbClient.execute('SELECT id, channel, answer FROM questions WHERE status != "deleted"');
  
  const mcqQuestions = result.rows.filter(q => {
    const answer = q.answer;
    if (!answer || typeof answer !== 'string') return false;
    return answer.trim().startsWith('[{');
  });
  
  results.database.checked = true;
  results.database.count = result.rows.length;
  results.database.clean = mcqQuestions.length === 0;
  
  if (results.database.clean) {
    console.log(`   ✅ Database is clean (${result.rows.length} questions checked)`);
  } else {
    console.log(`   ❌ Found ${mcqQuestions.length} questions with MCQ format`);
    console.log(`   Channels affected: ${[...new Set(mcqQuestions.map(q => q.channel))].join(', ')}`);
  }
} catch (e) {
  console.log(`   ⚠️  Could not check database: ${e.message}`);
}

// 2. Check Static Files
console.log('\n2️⃣  Checking Static Files...');
try {
  const dataDir = 'client/public/data';
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && !f.includes('test'));
  
  let totalQuestions = 0;
  let mcqCount = 0;
  const affectedFiles = [];
  
  for (const file of files) {
    if (file === 'tests.json' || file === 'stats.json' || file === 'channels.json') continue;
    
    const filePath = path.join(dataDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (content.questions && Array.isArray(content.questions)) {
      totalQuestions += content.questions.length;
      
      const mcqQuestions = content.questions.filter(q => 
        q.answer && typeof q.answer === 'string' && q.answer.trim().startsWith('[{')
      );
      
      if (mcqQuestions.length > 0) {
        mcqCount += mcqQuestions.length;
        affectedFiles.push({ file, count: mcqQuestions.length });
      }
    }
  }
  
  results.staticFiles.checked = true;
  results.staticFiles.clean = mcqCount === 0;
  results.staticFiles.files = affectedFiles;
  
  if (results.staticFiles.clean) {
    console.log(`   ✅ Static files are clean (${totalQuestions} questions in ${files.length} files)`);
  } else {
    console.log(`   ❌ Found ${mcqCount} questions with MCQ format`);
    for (const { file, count } of affectedFiles) {
      console.log(`      ${file}: ${count} questions`);
    }
  }
} catch (e) {
  console.log(`   ⚠️  Could not check static files: ${e.message}`);
}

// 3. Check Tests.json (should have MCQ format - this is correct)
console.log('\n3️⃣  Checking Tests File...');
try {
  const testsPath = 'client/public/data/tests.json';
  if (fs.existsSync(testsPath)) {
    const tests = JSON.parse(fs.readFileSync(testsPath, 'utf8'));
    
    let totalTestQuestions = 0;
    let properFormat = 0;
    
    for (const test of tests) {
      if (test.questions && Array.isArray(test.questions)) {
        totalTestQuestions += test.questions.length;
        properFormat += test.questions.filter(q => 
          q.type && q.options && Array.isArray(q.options)
        ).length;
      }
    }
    
    results.tests.checked = true;
    results.tests.count = totalTestQuestions;
    results.tests.clean = properFormat === totalTestQuestions;
    
    if (results.tests.clean) {
      console.log(`   ✅ Tests file is correct (${totalTestQuestions} test questions with proper format)`);
    } else {
      console.log(`   ⚠️  Some test questions missing proper format`);
      console.log(`      Proper format: ${properFormat}/${totalTestQuestions}`);
    }
  } else {
    console.log(`   ℹ️  No tests.json file found`);
  }
} catch (e) {
  console.log(`   ⚠️  Could not check tests file: ${e.message}`);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(50));

const allClean = results.database.clean && results.staticFiles.clean;

if (allClean) {
  console.log('✅ ALL SYSTEMS CLEAN');
  console.log('   No MCQ format found in regular questions');
  console.log('   Test questions have proper format');
  console.log('\n💡 If users still see MCQ format:');
  console.log('   1. Clear browser cache (Ctrl+Shift+Delete)');
  console.log('   2. Hard reload (Ctrl+Shift+R)');
  console.log('   3. Clear CDN cache if using one');
} else {
  console.log('⚠️  ISSUES FOUND');
  
  if (!results.database.clean) {
    console.log('   ❌ Database has MCQ format questions');
    console.log('   → Run: node script/convert-mcq-to-text-answers.js');
  }
  
  if (!results.staticFiles.clean) {
    console.log('   ❌ Static files have MCQ format questions');
    console.log('   → Run: node script/fetch-questions-for-build.js');
  }
}

console.log('='.repeat(50));

// Exit with error code if not clean
process.exit(allClean ? 0 : 1);
