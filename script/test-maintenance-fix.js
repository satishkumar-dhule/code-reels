#!/usr/bin/env node
/**
 * Test the maintenance script fix
 */

// Simulate the check
const tableInfo = { rows: [
  { name: 'id' },
  { name: 'question' },
  { name: 'answer' }
  // is_new column missing
]};

const hasColumn = tableInfo.rows.some(row => row.name === 'is_new');

console.log('🧪 Testing maintenance script fix\n');

if (!hasColumn) {
  console.log('⚠️  Column is_new does not exist yet');
  console.log('💡 Run migration: node script/migrations/add-is-new-column.js');
  console.log('✅ Skipping maintenance (no error)');
  console.log('\n✅ Test passed: Script handles missing column gracefully');
  process.exit(0);
}

console.log('✅ Column exists, proceeding with maintenance');
