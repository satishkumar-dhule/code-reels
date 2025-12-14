import fs from 'fs';
import {
  QUESTIONS_DIR,
  loadChannelQuestions,
  saveChannelQuestions,
  calculateSimilarity,
  updateIndexFile,
  writeGitHubOutput,
  getQuestionsFile
} from './utils.js';

const SIMILARITY_THRESHOLD = 0.6;

function getAllChannels() {
  try {
    return fs.readdirSync(QUESTIONS_DIR)
      .filter(f => f.endsWith('.json') && f !== 'index.ts')
      .map(f => f.replace('.json', ''));
  } catch (e) {
    return [];
  }
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
  console.log('=== Question Deduplication Bot ===\n');
  console.log('Mode: 1 duplicate removal per channel\n');

  const channels = getAllChannels();
  console.log(`Found ${channels.length} channels\n`);

  if (channels.length === 0) {
    console.log('No channels found.');
    return;
  }

  const removedQuestions = [];
  const skippedChannels = [];
  let totalQuestionsRemaining = 0;

  // Process each channel
  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i];
    console.log(`\n--- Channel ${i + 1}/${channels.length}: ${channel} ---`);

    const questions = loadChannelQuestions(channel);
    console.log(`Loaded ${questions.length} questions`);

    const duplicates = findDuplicates(questions);
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found');
      skippedChannels.push(channel);
      totalQuestionsRemaining += questions.length;
      continue;
    }

    console.log(`Found ${duplicates.length} duplicate pairs`);

    // Remove at most 1 duplicate per channel
    const toRemove = duplicates[0];
    
    console.log('Duplicate Pair:');
    console.log(`  Q1 [${toRemove.q1.id}]: ${toRemove.q1.question.substring(0, 50)}...`);
    console.log(`  Q2 [${toRemove.q2.id}]: ${toRemove.q2.question.substring(0, 50)}...`);
    console.log(`  Similarity: ${toRemove.similarity}`);

    // Keep older question, remove newer one
    const q1Date = new Date(toRemove.q1.lastUpdated || 0).getTime();
    const q2Date = new Date(toRemove.q2.lastUpdated || 0).getTime();
    
    const toRemoveId = q1Date < q2Date ? toRemove.q2.id : toRemove.q1.id;
    const toKeepId = q1Date < q2Date ? toRemove.q1.id : toRemove.q2.id;

    console.log(`Keeping: ${toKeepId} | Removing: ${toRemoveId}`);

    // Remove the duplicate
    const filtered = questions.filter(q => q.id !== toRemoveId);
    saveChannelQuestions(channel, filtered);
    
    removedQuestions.push({
      channel,
      removedId: toRemoveId,
      keptId: toKeepId,
      similarity: toRemove.similarity
    });
    
    totalQuestionsRemaining += filtered.length;
    console.log(`✅ Removed 1 duplicate (${filtered.length} remaining)`);
  }

  // Update index file once at the end
  updateIndexFile();

  // Print summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`Channels Processed: ${channels.length}`);
  console.log(`Channels with Duplicates: ${removedQuestions.length}`);
  console.log(`Channels Clean: ${skippedChannels.length}`);
  console.log(`Total Duplicates Removed: ${removedQuestions.length}`);
  
  if (removedQuestions.length > 0) {
    console.log('\n🗑️ Removed Duplicates:');
    removedQuestions.forEach((r, idx) => {
      console.log(`  ${idx + 1}. [${r.channel}] Removed ${r.removedId}, kept ${r.keptId} (${r.similarity} similar)`);
    });
  }

  if (skippedChannels.length > 0) {
    console.log(`\n✅ Clean Channels: ${skippedChannels.join(', ')}`);
  }

  console.log(`\nTotal Questions Remaining: ${totalQuestionsRemaining}`);
  console.log('=== END SUMMARY ===\n');

  writeGitHubOutput({
    removed_count: removedQuestions.length,
    channels_processed: channels.length,
    channels_clean: skippedChannels.length,
    total_questions: totalQuestionsRemaining,
    removed_ids: removedQuestions.map(r => r.removedId).join(',')
  });
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
