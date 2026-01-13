# Maintenance Script Fix

## Issue
The daily maintenance workflow was failing with:
```
❌ Maintenance failed: LibsqlError: SQLITE_UNKNOWN: SQLite error: no such column: is_new
```

## Root Cause
The `is_new` column was added to the schema but the migration hasn't been run on the production database yet. The maintenance script was trying to use this column without checking if it exists first.

## Solution

### 1. Updated Maintenance Script
Modified `script/maintenance/clear-old-new-flags.js` to:
- Check if `is_new` column exists before using it
- Exit gracefully with informative message if column is missing
- Prevents workflow failures while migration is pending

```javascript
// Check if is_new column exists
const tableInfo = await dbClient.execute('PRAGMA table_info(questions)');
const hasColumn = tableInfo.rows.some(row => row.name === 'is_new');

if (!hasColumn) {
  console.log('⚠️  Column is_new does not exist yet');
  console.log('💡 Run migration: node script/migrations/add-is-new-column.js');
  console.log('✅ Skipping maintenance (no error)');
  return;
}
```

### 2. Migration Available
The migration script exists at `script/migrations/add-is-new-column.js` and can be run manually:

```bash
node script/migrations/add-is-new-column.js
```

This will:
- Add the `is_new` column if it doesn't exist
- Set `is_new = 1` for questions created in the last 7 days
- Set `is_new = 0` for older questions

### 3. Workflow Enhancement (Optional)
To automatically run migrations, add this step to `.github/workflows/daily-maintenance.yml`:

```yaml
- name: Run migrations (if needed)
  env:
    TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
    TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
  run: |
    echo "🔄 Running database migrations..."
    node script/migrations/add-is-new-column.js || echo "⚠️  Migration skipped or already applied"
```

## Testing
Created test script to verify the fix:
```bash
node script/test-maintenance-fix.js
```

Output:
```
🧪 Testing maintenance script fix

⚠️  Column is_new does not exist yet
💡 Run migration: node script/migrations/add-is-new-column.js
✅ Skipping maintenance (no error)

✅ Test passed: Script handles missing column gracefully
```

## Result
- ✅ Maintenance script no longer crashes when column is missing
- ✅ Provides clear instructions for running migration
- ✅ Workflow will pass even if migration hasn't been run yet
- ✅ Once migration is run, maintenance will work normally

## Next Steps
1. Run the migration manually on production database
2. Or add the migration step to the workflow (requires workflow scope in OAuth token)
3. Verify maintenance script runs successfully after migration

## Verification
After migration is run:
```bash
# Check if column exists
sqlite3 questions.db "PRAGMA table_info(questions);" | grep is_new

# Run maintenance manually
node script/maintenance/clear-old-new-flags.js
```
