import 'dotenv/config';
import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('❌ Missing TURSO_DATABASE_URL');
  process.exit(1);
}

const db = createClient({ url, authToken });

async function main() {
  console.log('=== Adding TLDR column to questions table ===\n');
  
  try {
    // Check if column exists
    const tableInfo = await db.execute("PRAGMA table_info(questions)");
    const columns = tableInfo.rows.map(r => r.name);
    
    if (columns.includes('tldr')) {
      console.log('✅ TLDR column already exists');
      return;
    }
    
    // Add the column
    await db.execute('ALTER TABLE questions ADD COLUMN tldr TEXT');
    console.log('✅ Added TLDR column to questions table');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

main();
