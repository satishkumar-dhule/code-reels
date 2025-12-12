import fs from 'fs';

const QUESTIONS_DIR = 'client/src/lib/questions';

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(text1, text2) {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);

  if (norm1 === norm2) return 1.0;

  const words1 = new Set(norm1.split(' '));
  const words2 = new Set(norm2.split(' '));

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

function findDuplicates(questions) {
  const duplicates = [];
  const checked = new Set();

  for (let i = 0; i < questions.length; i++) {
    if (checked.has(i)) continue;

    const q1 = questions[i];
    const similarQuestions = [{ index: i, question: q1, similarity: 1.0 }];

    for (let j = i + 1; j < questions.length; j++) {
      if (checked.has(j)) continue;

      const q2 = questions[j];
      const similarity = calculateSimilarity(q1.question, q2.question);

      if (similarity >= 0.6) {
        similarQuestions.push({ index: j, question: q2, similarity });
        checked.add(j);
      }
    }

    if (similarQuestions.length > 1) {
      duplicates.push(similarQuestions);
    }
    checked.add(i);
  }

  return duplicates;
}

function updateIndexFile() {
  const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
  const channels = files.map(f => f.replace('.json', ''));
  const imports = channels.map(c => `import ${c.replace(/-/g, '_')} from "./${c}.json";`).join('\n');
  const exports = channels.map(c => `  "${c}": ${c.replace(/-/g, '_')}`).join(',\n');
  fs.writeFileSync(`${QUESTIONS_DIR}/index.ts`, `${imports}\n\nexport const questionsByChannel: Record<string, any[]> = {\n${exports}\n};\n\nexport const allQuestions = Object.values(questionsByChannel).flat();\n`);
}

async function main() {
  console.log('=== Question Deduplication Bot ===\n');

  // Get all JSON files
  const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    console.log('No question files found.');
    process.exit(0);
  }

  // Pick a random channel
  const randomFile = files[Math.floor(Math.random() * files.length)];
  const channelName = randomFile.replace('.json', '');
  const filePath = `${QUESTIONS_DIR}/${randomFile}`;

  console.log(`Analyzing channel: ${channelName}`);
  console.log(`File: ${randomFile}\n`);

  // Load questions from the channel
  let questions = [];
  try {
    questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.log('❌ Failed to load questions file.');
    process.exit(0);
  }

  console.log(`Loaded ${questions.length} questions from ${channelName}\n`);

  // Find duplicates
  console.log('Scanning for duplicates...\n');
  const duplicates = findDuplicates(questions);

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
    console.log(`Total questions: ${questions.length}`);
    process.exit(0);
  }

  console.log(`Found ${duplicates.length} duplicate group(s)\n`);

  // Display duplicates
  duplicates.forEach((group, idx) => {
    console.log(`Duplicate Group ${idx + 1}:`);
    group.forEach((item, i) => {
      console.log(`  ${i + 1}. [${item.question.id}] (${(item.similarity * 100).toFixed(1)}% match)`);
      console.log(`     Q: ${item.question.question.substring(0, 70)}...`);
    });
    console.log();
  });

  // Remove one duplicate from the first group (keep the oldest/first one)
  const groupToProcess = duplicates[0];
  
  // Sort by lastUpdated to keep the oldest
  groupToProcess.sort((a, b) => {
    const dateA = new Date(a.question.lastUpdated || new Date()).getTime();
    const dateB = new Date(b.question.lastUpdated || new Date()).getTime();
    return dateA - dateB;
  });

  // Remove the newest duplicate (keep the oldest)
  const toRemove = groupToProcess[groupToProcess.length - 1];
  const removedQuestion = toRemove.question;

  console.log('=== REMOVAL DECISION ===\n');
  console.log(`Keeping: [${groupToProcess[0].question.id}] (oldest)`);
  console.log(`  Q: ${groupToProcess[0].question.question.substring(0, 70)}...`);
  console.log(`  Last Updated: ${groupToProcess[0].question.lastUpdated}\n`);

  console.log(`Removing: [${removedQuestion.id}] (newest)`);
  console.log(`  Q: ${removedQuestion.question.substring(0, 70)}...`);
  console.log(`  Last Updated: ${removedQuestion.lastUpdated}\n`);

  // Remove the duplicate
  const updatedQuestions = questions.filter(q => q.id !== removedQuestion.id);

  if (updatedQuestions.length === questions.length) {
    console.log('❌ Failed to remove duplicate.');
    process.exit(0);
  }

  // Save updated questions
  fs.writeFileSync(filePath, JSON.stringify(updatedQuestions, null, 2));
  updateIndexFile();

  console.log('=== SUMMARY ===');
  console.log(`✅ Duplicate removed successfully!`);
  console.log(`Channel: ${channelName}`);
  console.log(`Removed ID: ${removedQuestion.id}`);
  console.log(`Removed Question: ${removedQuestion.question.substring(0, 70)}...`);
  console.log(`Total questions before: ${questions.length}`);
  console.log(`Total questions after: ${updatedQuestions.length}`);
  console.log(`Duplicate groups found: ${duplicates.length}`);
  console.log('=== END SUMMARY ===\n');

  const out = process.env.GITHUB_OUTPUT;
  if (out) {
    fs.appendFileSync(out, `removed_id=${removedQuestion.id}\n`);
    fs.appendFileSync(out, `removed_channel=${channelName}\n`);
    fs.appendFileSync(out, `duplicate_groups=${duplicates.length}\n`);
    fs.appendFileSync(out, `total_before=${questions.length}\n`);
    fs.appendFileSync(out, `total_after=${updatedQuestions.length}\n`);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
