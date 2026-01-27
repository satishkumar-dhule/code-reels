#!/usr/bin/env node

/**
 * Push all database schemas to Turso DB
 * 
 * This script uses Drizzle Kit to push the schema defined in shared/schema.ts
 * to your Turso database. It will create all tables if they don't exist,
 * or update existing tables to match the schema.
 * 
 * Usage:
 *   node script/push-schema-to-turso.js
 * 
 * Prerequisites:
 *   - TURSO_DATABASE_URL must be set in .env
 *   - TURSO_AUTH_TOKEN must be set in .env
 *   - Ensure you're using write credentials, not read-only
 */

import { config } from 'dotenv';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Load environment variables
config();

console.log('🚀 Turso Schema Push Script\n');
console.log('=' .repeat(60));

// Validate environment variables
const requiredEnvVars = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease set these in your .env file.');
  console.error('See .env.example for reference.\n');
  process.exit(1);
}

// Check if using read-only credentials
if (process.env.TURSO_DATABASE_URL.includes('-ro') || 
    process.env.TURSO_AUTH_TOKEN_RO === process.env.TURSO_AUTH_TOKEN) {
  console.warn('⚠️  Warning: You may be using read-only credentials!');
  console.warn('   Make sure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN');
  console.warn('   are set to your read-write credentials.\n');
}

console.log('📋 Database Configuration:');
console.log(`   URL: ${process.env.TURSO_DATABASE_URL}`);
console.log(`   Token: ${process.env.TURSO_AUTH_TOKEN.substring(0, 20)}...`);
console.log('');

// Read and display schema information
try {
  const schemaContent = readFileSync('./shared/schema.ts', 'utf-8');
  const tableMatches = schemaContent.match(/export const \w+ = sqliteTable\("(\w+)"/g);
  
  if (tableMatches) {
    console.log('📊 Tables to be created/updated:');
    tableMatches.forEach(match => {
      const tableName = match.match(/"(\w+)"/)[1];
      console.log(`   ✓ ${tableName}`);
    });
    console.log('');
  }
} catch (error) {
  console.warn('⚠️  Could not read schema file for preview');
}

console.log('=' .repeat(60));
console.log('\n🔄 Pushing schema to Turso...\n');

try {
  // Run drizzle-kit push
  execSync('pnpm drizzle-kit push', {
    stdio: 'inherit',
    env: {
      ...process.env,
      // Ensure we're using write mode
      TURSO_WRITE_MODE: 'true'
    }
  });
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Schema successfully pushed to Turso DB!');
  console.log('=' .repeat(60));
  console.log('\n📝 Next steps:');
  console.log('   1. Verify tables in Turso dashboard');
  console.log('   2. Run data migration scripts if needed');
  console.log('   3. Test your application with the new schema\n');
  
} catch (error) {
  console.error('\n' + '=' .repeat(60));
  console.error('❌ Failed to push schema to Turso DB');
  console.error('=' .repeat(60));
  console.error('\nError details:', error.message);
  console.error('\n💡 Troubleshooting tips:');
  console.error('   1. Verify your Turso credentials are correct');
  console.error('   2. Ensure you have write permissions');
  console.error('   3. Check your internet connection');
  console.error('   4. Try running: pnpm drizzle-kit push --verbose\n');
  process.exit(1);
}
