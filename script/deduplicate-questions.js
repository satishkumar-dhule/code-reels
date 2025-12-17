import {
  loadUnifiedQuestions,
  saveUnifiedQuestions,
  loadChannelMappings,
  saveChannelMappings,
  getAllUnifiedQuestions,
  calculateSimilarity,
  updateUnifiedIndexFile,
  writeGitHubOutput
} from './utils.js';

const SIMILARITY_THRESHOLD = 0.6;

async function getAllChannels() {
  const mappings = await loadChannelMappings();
  return Object.keys(mappings);
}

function findDuplicates(questions, threshold = SIMILARITY_THRESHOLD) {
  const duplicates = [];
  
  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const similarity = calculateSimilarity(
        questions[i].question,
        questions[j].question
      );
      
      if (similarity >= threshold) {
        duplicates.push({
          q1: questions[i],
          q2: questions[j],
          similarity: similarity.toFixed(2)
        });
      }
    }
  }
  
  return duplicates;
}

async function main() {
  console.log('=== Question Deduplication Bot (Database) ===\n');

  const allQuestions = await getAllUnifiedQuestions();
  console.log(`Loaded ${allQuestions.length} questions from database\n`);

  if (allQuestions.length === 0) {
    console.log('No questions found.');
    return;
  }

  // Find duplicates across all questions
  const duplicates = findDuplicates(allQuestions);
  console.log(`Found ${duplicates.length} duplicate pairs\n`);

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
    writeGitHubOutput({
      removed_count: 0,
      total_questions: allQuestions.length
    });
    return;
  }

  const removedQuestions = [];
  const questions = await loadUnifiedQuestions();
  const mappings = await loadChannelMappings();

  // Remove duplicates (limit to 10 per run to avoid too many changes)
  const maxToRemove = Math.min(10, duplicates.length);
  
  for (let i = 0; i < maxToRemove; i++) {
    const dup = duplicates[i];
    
    console.log(`\n--- Duplicate ${i + 1}/${maxToRemove} ---`);
    console.log(`  Q1 [${dup.q1.id}]: ${dup.q1.question.substring(0, 50)}...`);
    console.log(`  Q2 [${dup.q2.id}]: ${dup.q2.question.substring(0, 50)}...`);
    console.log(`  Similarity: ${dup.similarity}`);

    // Keep older question, remove newer one
    const q1Date = new Date(dup.q1.lastUpdated || 0).getTime();
    const q2Date = new Date(dup.q2.lastUpdated || 0).getTime();
    
    const toRemoveId = q1Date < q2Date ? dup.q2.id : dup.q1.id;
    const toKeepId = q1Date < q2Date ? dup.q1.id : dup.q2.id;

    // Skip if already removed
    if (!questions[toRemoveId]) {
      console.log(`  ⏭️ Already removed`);
      continue;
    }

    console.log(`  Keeping: ${toKeepId} | Removing: ${toRemoveId}`);

    // Remove from unified questions
    delete questions[toRemoveId];

    // Remove from all channel mappings
    Object.keys(mappings).forEach(channel => {
      Object.keys(mappings[channel].subChannels || {}).forEach(subChannel => {
        mappings[channel].subChannels[subChannel] = 
          mappings[channel].subChannels[subChannel].filter(id => id !== toRemoveId);
      });
    });

    removedQuestions.push({
      removedId: toRemoveId,
      keptId: toKeepId,
      similarity: dup.similarity
    });

    console.log(`  ✅ Removed`);
  }

  // Save updated data
  await saveUnifiedQuestions(questions);
  await saveChannelMappings(mappings);

  // Print summary
  const totalRemaining = Object.keys(questions).length;
  console.log('\n\n=== SUMMARY ===');
  console.log(`Total Duplicates Found: ${duplicates.length}`);
  console.log(`Duplicates Removed: ${removedQuestions.length}`);
  
  if (removedQuestions.length > 0) {
    console.log('\n🗑️ Removed Duplicates:');
    removedQuestions.forEach((r, idx) => {
      console.log(`  ${idx + 1}. Removed ${r.removedId}, kept ${r.keptId} (${r.similarity} similar)`);
    });
  }

  console.log(`\nTotal Questions Remaining: ${totalRemaining}`);
  console.log('=== END SUMMARY ===\n');

  writeGitHubOutput({
    removed_count: removedQuestions.length,
    duplicates_found: duplicates.length,
    total_questions: totalRemaining,
    removed_ids: removedQuestions.map(r => r.removedId).join(',')
  });
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
