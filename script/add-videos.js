import {
  getAllUnifiedQuestions,
  saveQuestion,
  validateYouTubeVideos,
  writeGitHubOutput,
  getPendingWork,
  startWorkItem,
  completeWorkItem,
  failWorkItem,
  initWorkQueue,
  runWithRetries,
  parseJson,
  logBotActivity
} from './utils.js';

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '10', 10);
const USE_WORK_QUEUE = process.env.USE_WORK_QUEUE !== 'false';

// Check if a question needs video work
function needsVideoWork(question) {
  const videos = question.videos || {};
  const hasShort = videos.shortVideo && videos.shortVideo.length > 10;
  const hasLong = videos.longVideo && videos.longVideo.length > 10;
  return !hasShort || !hasLong;
}

// Step 1: Extract top keywords from question using AI
async function extractKeywords(question) {
  console.log('  🔑 Step 1: Extracting keywords...');
  
  const prompt = `You are a keyword extractor. Output ONLY valid JSON, no explanations.

Extract 3-5 search keywords from this technical interview question that would help find relevant YouTube tutorial videos.

Question: "${question.question}"
Topic: ${question.channel}/${question.subChannel || 'general'}
Tags: ${(question.tags || []).join(', ')}

Focus on:
- Core technical concepts
- Technology names
- Programming patterns
- Specific terms interviewers care about

Output this exact JSON structure:
{"keywords":["keyword1","keyword2","keyword3"],"searchQuery":"best youtube search query for tutorials"}

IMPORTANT: Return ONLY the JSON object.`;

  const response = await runWithRetries(prompt);
  if (!response) return null;
  
  const data = parseJson(response);
  if (!data || !data.keywords || !Array.isArray(data.keywords)) {
    console.log('  ❌ Failed to parse keywords');
    return null;
  }
  
  console.log(`  ✓ Keywords: ${data.keywords.join(', ')}`);
  console.log(`  ✓ Search query: ${data.searchQuery}`);
  return data;
}

// Step 2: Find YouTube videos using keywords
async function findVideosWithKeywords(question, keywordData) {
  console.log('  🎬 Step 2: Finding videos with keywords...');
  
  const { keywords, searchQuery } = keywordData;
  
  const prompt = `You are a YouTube video finder. Output ONLY valid JSON, no explanations.

Find real, educational YouTube videos for this technical topic.

Topic: ${question.channel} - ${question.subChannel || 'general'}
Keywords: ${keywords.join(', ')}
Search Query: ${searchQuery}
Question Context: ${question.question.substring(0, 100)}

CRITICAL RULES:
1. ONLY suggest videos from well-known tech educators:
   - Fireship, Traversy Media, The Net Ninja, Web Dev Simplified
   - TechWorld with Nana, freeCodeCamp, Academind, Hussein Nasser
   - ByteByteGo, System Design Interview, Gaurav Sen
   - Corey Schafer, Sentdex, Tech With Tim (Python)
   - Java Brains, Amigoscode (Java/Spring)
   - Ben Awad, Theo, ThePrimeagen (Web dev)
   
2. Video IDs must be EXACTLY 11 characters (letters, numbers, - and _)
3. DO NOT make up video IDs - only suggest if you're confident it exists
4. If unsure, return null for that video type

Output this exact JSON structure:
{"shortVideo":{"id":"xxxxxxxxxxx","title":"Short explanation title","channel":"Channel Name"},"longVideo":{"id":"xxxxxxxxxxx","title":"Deep dive title","channel":"Channel Name"},"confidence":"high|medium|low"}

If you cannot find a reliable video, use null:
{"shortVideo":null,"longVideo":null,"confidence":"low"}

IMPORTANT: Return ONLY the JSON object.`;

  const response = await runWithRetries(prompt);
  if (!response) return null;
  
  const data = parseJson(response);
  if (!data) {
    console.log('  ❌ Failed to parse video response');
    return null;
  }
  
  console.log(`  ✓ Confidence: ${data.confidence || 'unknown'}`);
  
  // Build video URLs from IDs
  const result = { shortVideo: null, longVideo: null };
  
  if (data.shortVideo?.id && data.shortVideo.id.length === 11) {
    result.shortVideo = `https://www.youtube.com/watch?v=${data.shortVideo.id}`;
    console.log(`  ✓ Short: ${data.shortVideo.title} (${data.shortVideo.channel})`);
  }
  
  if (data.longVideo?.id && data.longVideo.id.length === 11) {
    result.longVideo = `https://www.youtube.com/watch?v=${data.longVideo.id}`;
    console.log(`  ✓ Long: ${data.longVideo.title} (${data.longVideo.channel})`);
  }
  
  return result;
}

// Combined multi-step video finder
async function findVideosForQuestion(question) {
  // Step 1: Extract keywords
  const keywordData = await extractKeywords(question);
  if (!keywordData) {
    console.log('  ❌ Keyword extraction failed');
    return null;
  }
  
  // Step 2: Find videos using keywords
  const videos = await findVideosWithKeywords(question, keywordData);
  return videos;
}

async function main() {
  console.log('=== 🎬 Tutor Bot - Finding Learning Videos (Multi-Step) ===\n');
  
  await initWorkQueue();
  
  let batch = [];
  let workItems = [];
  
  if (USE_WORK_QUEUE) {
    console.log('📋 Checking work queue for video tasks...');
    workItems = await getPendingWork('video', BATCH_SIZE);
    batch = workItems.map(w => ({ ...w.question, workId: w.workId, workReason: w.reason }));
    console.log(`📦 Found ${batch.length} video tasks in work queue\n`);
  }
  
  // Fallback to scanning if no work queue items
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
    const workId = question.workId;
    
    console.log(`\n--- [${i + 1}/${batch.length}] ${question.id} ---`);
    console.log(`Q: ${question.question.substring(0, 60)}...`);
    console.log(`Channel: ${question.channel}/${question.subChannel || 'general'}`);
    if (workId) console.log(`Work ID: ${workId} (${question.workReason})`);
    
    if (workId) await startWorkItem(workId);
    
    const currentVideos = question.videos || {};
    const hasShort = currentVideos.shortVideo && currentVideos.shortVideo.length > 10;
    const hasLong = currentVideos.longVideo && currentVideos.longVideo.length > 10;
    
    console.log(`Current: short=${hasShort ? '✓' : '✗'}, long=${hasLong ? '✓' : '✗'}`);
    
    // Validate existing videos first
    if (hasShort || hasLong) {
      console.log('🔍 Validating existing videos...');
      const validated = await validateYouTubeVideos(currentVideos);
      
      if (hasShort && !validated.shortVideo) {
        console.log('  ⚠️ Short video invalid, will search for new one');
        currentVideos.shortVideo = null;
      }
      if (hasLong && !validated.longVideo) {
        console.log('  ⚠️ Long video invalid, will search for new one');
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
    
    // Find new videos using multi-step approach
    const needsShort = !currentVideos.shortVideo;
    const needsLong = !currentVideos.longVideo;
    
    if (needsShort || needsLong) {
      console.log(`🔎 Starting multi-step video search...`);
      
      const foundVideos = await findVideosForQuestion(question);
      
      if (!foundVideos) {
        console.log('  ❌ Video search failed');
        if (workId) await failWorkItem(workId, 'Multi-step search failed');
        await logBotActivity(question.id, 'video', 'search_failed', 'failed');
        results.failed++;
        results.processed++;
        continue;
      }
      
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
      } else if (needsShort && foundVideos.shortVideo) {
        console.log('  ⚠️ Short video failed validation');
      }
      
      if (needsLong && validatedNew.longVideo) {
        currentVideos.longVideo = validatedNew.longVideo;
        results.videosAdded++;
        updated = true;
        addedVideos.push('long');
        console.log('  ✅ Added long video');
      } else if (needsLong && foundVideos.longVideo) {
        console.log('  ⚠️ Long video failed validation');
      }
      
      if (updated) {
        question.videos = currentVideos;
        question.lastUpdated = new Date().toISOString();
        await saveQuestion(question);
        console.log('  💾 Saved to database');
        if (workId) await completeWorkItem(workId, { added: addedVideos });
        await logBotActivity(question.id, 'video', 'videos_added', 'completed', { added: addedVideos });
      } else {
        console.log('  ⚠️ No valid videos found after validation');
        if (workId) await completeWorkItem(workId, { status: 'no_valid_videos_found' });
        await logBotActivity(question.id, 'video', 'no_valid_videos', 'completed');
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
