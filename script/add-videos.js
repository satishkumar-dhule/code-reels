import {
  getAllUnifiedQuestions,
  saveQuestion,
  validateYouTubeVideos,
  writeGitHubOutput,
  getPendingWork,
  startWorkItem,
  completeWorkItem,
  failWorkItem,
  initWorkQueue
} from './utils.js';

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '10', 10);
const USE_WORK_QUEUE = process.env.USE_WORK_QUEUE !== 'false'; // Default to true

// Check if a question needs video work
function needsVideoWork(question) {
  const videos = question.videos || {};
  const hasShort = videos.shortVideo && videos.shortVideo.length > 10;
  const hasLong = videos.longVideo && videos.longVideo.length > 10;
  return !hasShort || !hasLong;
}

// NOTE: LLM-based video search removed - LLMs hallucinate video IDs
// Videos should be added manually or via YouTube Data API integration
// This bot now only validates existing videos and cleans up invalid ones
function findVideosForQuestion(question) {
  // Return null - we don't search for videos via LLM anymore
  // Videos should be sourced from:
  // 1. Manual curation
  // 2. YouTube Data API (future integration)
  // 3. Curated video database
  console.log('  ℹ️ Video search disabled (LLM hallucinates video IDs)');
  console.log('  ℹ️ Videos should be added manually or via YouTube API');
  return null;
}

async function main() {
  console.log('=== 🎬 Tutor Bot - Finding Learning Videos ===\n');
  
  await initWorkQueue();
  
  let batch = [];
  let workItems = [];
  
  if (USE_WORK_QUEUE) {
    // Get work from queue
    console.log('📋 Checking work queue for video tasks...');
    workItems = await getPendingWork('video', BATCH_SIZE);
    batch = workItems.map(w => ({ ...w.question, workId: w.workId, workReason: w.reason }));
    console.log(`📦 Found ${batch.length} video tasks in work queue\n`);
  }
  
  // Fallback to scanning if no work queue items (for new questions or manual runs)
  if (batch.length === 0 && !USE_WORK_QUEUE) {
    console.log('📊 Scanning all questions (work queue disabled)...');
    const allQuestions = await getAllUnifiedQuestions();
    console.log(`📊 Database: ${allQuestions.length} questions`);
    
    const needingVideos = allQuestions.filter(needsVideoWork);
    console.log(`📦 Questions needing videos: ${needingVideos.length}\n`);
    batch = needingVideos.slice(0, BATCH_SIZE);
  }
  
  if (batch.length === 0) {
    console.log('✅ No video work to do!');
    writeGitHubOutput({ processed: 0, videos_added: 0 });
    return;
  }
  
  console.log(`⚙️ Processing ${batch.length} questions\n`);
  
  const results = {
    processed: 0,
    videosAdded: 0,
    videosValidated: 0,
    skipped: 0,
    failed: 0
  };
  
  for (let i = 0; i < batch.length; i++) {
    const question = batch[i];
    const workId = question.workId; // From work queue if applicable
    
    console.log(`\n--- [${i + 1}/${batch.length}] ${question.id} ---`);
    console.log(`Q: ${question.question.substring(0, 60)}...`);
    if (workId) console.log(`Work ID: ${workId} (${question.workReason})`);
    
    // Mark work as started
    if (workId) await startWorkItem(workId);
    
    const currentVideos = question.videos || {};
    const hasShort = currentVideos.shortVideo && currentVideos.shortVideo.length > 10;
    const hasLong = currentVideos.longVideo && currentVideos.longVideo.length > 10;
    
    console.log(`Current: short=${hasShort ? '✓' : '✗'}, long=${hasLong ? '✓' : '✗'}`);
    
    // Validate existing videos
    if (hasShort || hasLong) {
      console.log('🔍 Validating existing videos...');
      const validated = await validateYouTubeVideos(currentVideos);
      
      if (hasShort && !validated.shortVideo) {
        console.log('  ⚠️ Short video invalid');
        currentVideos.shortVideo = null;
      }
      if (hasLong && !validated.longVideo) {
        console.log('  ⚠️ Long video invalid');
        currentVideos.longVideo = null;
      }
      
      if (validated.shortVideo && validated.longVideo) {
        console.log('  ✅ Both videos valid, skipping');
        if (workId) await completeWorkItem(workId, { status: 'already_valid' });
        results.videosValidated++;
        results.skipped++;
        continue;
      }
    }
    
    // Find new videos if needed
    const needsShort = !currentVideos.shortVideo;
    const needsLong = !currentVideos.longVideo;
    
    if (needsShort || needsLong) {
      console.log(`🔎 Searching for videos...`);
      
      const foundVideos = await findVideosForQuestion(question);
      
      if (!foundVideos) {
        console.log('  ❌ AI search failed');
        if (workId) await failWorkItem(workId, 'AI search failed');
        results.failed++;
        results.processed++;
        continue;
      }
      
      console.log(`  Found: short=${foundVideos.shortVideo ? '✓' : '✗'}, long=${foundVideos.longVideo ? '✓' : '✗'}`);
      
      // Validate found videos
      console.log('  🔍 Validating found videos...');
      const validatedNew = await validateYouTubeVideos(foundVideos);
      
      let updated = false;
      let addedVideos = [];
      
      if (needsShort && validatedNew.shortVideo) {
        currentVideos.shortVideo = validatedNew.shortVideo;
        results.videosAdded++;
        updated = true;
        addedVideos.push('short');
        console.log('  ✅ Added short video');
      }
      
      if (needsLong && validatedNew.longVideo) {
        currentVideos.longVideo = validatedNew.longVideo;
        results.videosAdded++;
        updated = true;
        addedVideos.push('long');
        console.log('  ✅ Added long video');
      }
      
      if (updated) {
        question.videos = currentVideos;
        question.lastUpdated = new Date().toISOString();
        await saveQuestion(question);
        console.log('  💾 Saved to database');
        if (workId) await completeWorkItem(workId, { added: addedVideos });
      } else {
        console.log('  ⚠️ No valid videos found (closing work item)');
        // Complete the work item even if no videos found - don't retry endlessly
        if (workId) await completeWorkItem(workId, { status: 'no_valid_videos_found' });
      }
    }
    
    results.processed++;
  }
  
  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`Processed: ${results.processed}`);
  console.log(`Videos Added: ${results.videosAdded}`);
  console.log(`Videos Validated: ${results.videosValidated}`);
  console.log(`Skipped: ${results.skipped}`);
  console.log(`Failed: ${results.failed}`);
  console.log('=== END ===\n');
  
  writeGitHubOutput({
    processed: results.processed,
    videos_added: results.videosAdded,
    videos_validated: results.videosValidated,
    skipped: results.skipped,
    failed: results.failed
  });
}

main().catch(e => {
  console.error('Fatal:', e);
  writeGitHubOutput({ error: e.message, processed: 0 });
  process.exit(1);
});
