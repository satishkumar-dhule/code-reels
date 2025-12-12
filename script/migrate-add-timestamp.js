import fs from 'fs';

const QUESTIONS_DIR = 'client/src/lib/questions';

function migrateQuestions() {
  console.log('=== Migrating Questions: Adding lastUpdated Field ===\n');

  const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
  let totalUpdated = 0;
  let alreadyHasField = 0;

  files.forEach(file => {
    const filePath = `${QUESTIONS_DIR}/${file}`;
    const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let fileUpdated = 0;

    questions.forEach(q => {
      if (!q.lastUpdated) {
        // Use current date for new questions, or a date far in the past for existing ones
        q.lastUpdated = new Date().toISOString();
        fileUpdated++;
      } else {
        alreadyHasField++;
      }
    });

    if (fileUpdated > 0) {
      fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));
      console.log(`✅ ${file}: Added lastUpdated to ${fileUpdated} questions`);
      totalUpdated += fileUpdated;
    }
  });

  console.log(`\n=== Migration Complete ===`);
  console.log(`Total Updated: ${totalUpdated}`);
  console.log(`Already Had Field: ${alreadyHasField}`);
}

migrateQuestions();
