# 🚀 Turso Database Deployment Guide

Complete step-by-step guide to deploy your database schema to Turso.

---

## 📋 Prerequisites

### 1. Install Turso CLI

```bash
# macOS/Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Verify installation
turso --version
```

### 2. Login to Turso

```bash
turso auth login
```

---

## 🗄️ Create Database

### Option 1: Create New Database

```bash
# Create database
turso db create code-reels

# Get database URL
turso db show code-reels --url

# Create read-write token
turso db tokens create code-reels

# Create read-only token
turso db tokens create code-reels --read-only
```

### Option 2: Use Existing Database

```bash
# List your databases
turso db list

# Get URL for existing database
turso db show your-database-name --url

# Create tokens
turso db tokens create your-database-name
turso db tokens create your-database-name --read-only
```

---

## ⚙️ Configure Environment

### 1. Update .env File

```bash
# Copy example if you don't have .env
cp .env.example .env

# Edit .env and add your credentials
nano .env
```

### 2. Add Turso Credentials

```env
# Read-Write credentials (for schema push and data operations)
TURSO_DATABASE_URL="libsql://code-reels-your-org.turso.io"
TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."

# Read-Only credentials (for production serving)
TURSO_DATABASE_URL_RO="libsql://code-reels-your-org.turso.io"
TURSO_AUTH_TOKEN_RO="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
```

### 3. Verify Configuration

```bash
# Test connection
node -e "console.log(process.env.TURSO_DATABASE_URL)" 
```

---

## 📤 Push Schema to Turso

### Method 1: Using Helper Script (Recommended)

```bash
# Run the automated script with validation
pnpm db:push:schema
```

**What it does:**
- ✅ Validates environment variables
- ✅ Checks for read-only credentials
- ✅ Shows tables to be created
- ✅ Pushes schema using Drizzle Kit
- ✅ Provides next steps

### Method 2: Using Drizzle Kit Directly

```bash
# Push schema directly
pnpm db:push
```

### Method 3: Using SQL File

```bash
# Execute SQL file directly
turso db shell code-reels < TURSO_SCHEMA.sql
```

---

## ✅ Verify Deployment

### 1. Check Tables Created

```bash
# Open Turso shell
turso db shell code-reels

# List all tables
.tables

# Expected output:
# bot_ledger              question_history
# bot_runs                question_relationships
# certifications          questions
# channel_mappings        user_sessions
# learning_paths          users
# voice_sessions          work_queue
```

### 2. Verify Table Schema

```bash
# In Turso shell, check a table schema
.schema questions

# Or check all schemas
.schema
```

### 3. Check Indexes

```bash
# In Turso shell
SELECT name, tbl_name FROM sqlite_master 
WHERE type = 'index' 
ORDER BY tbl_name, name;
```

### 4. Test Query

```bash
# In Turso shell
SELECT COUNT(*) as table_count 
FROM sqlite_master 
WHERE type = 'table';

# Should return 12 tables
```

---

## 🔄 Data Migration (Optional)

If you have existing data to migrate:

### 1. Migrate Questions

```bash
pnpm db:migrate
```

### 2. Migrate Question History

```bash
pnpm db:migrate:history
```

### 3. Migrate Job Title Fields

```bash
pnpm db:migrate:job-titles
```

---

## 🧪 Test Application

### 1. Start Development Server

```bash
pnpm dev
```

### 2. Test Database Connection

Visit: http://localhost:5001

### 3. Check Console for Errors

Look for any database connection errors in the browser console or terminal.

---

## 🔐 Set Up GitHub Secrets

For CI/CD deployment, add these secrets to your GitHub repository:

### 1. Go to Repository Settings

```
GitHub Repository → Settings → Secrets and variables → Actions
```

### 2. Add Secrets

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `TURSO_DATABASE_URL` | `libsql://...` | Read-write database URL |
| `TURSO_AUTH_TOKEN` | `eyJhbGci...` | Read-write auth token |
| `TURSO_DATABASE_URL_RO` | `libsql://...` | Read-only database URL |
| `TURSO_AUTH_TOKEN_RO` | `eyJhbGci...` | Read-only auth token |

### 3. Update GitHub Actions Workflow

Your `.github/workflows/deploy.yml` should use these secrets:

```yaml
env:
  TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
  TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
```

---

## 📊 Monitor Database

### 1. Turso Dashboard

Visit: https://turso.tech/app

- View database metrics
- Monitor query performance
- Check storage usage
- Review connection logs

### 2. Query Statistics

```bash
# In Turso shell
SELECT 
    name,
    (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND tbl_name=m.name) as index_count
FROM sqlite_master m
WHERE type='table'
ORDER BY name;
```

### 3. Check Database Size

```bash
turso db show code-reels
```

---

## 🔄 Update Schema

When you need to update the schema:

### 1. Modify Schema File

Edit `shared/schema.ts` with your changes.

### 2. Push Updated Schema

```bash
pnpm db:push:schema
```

### 3. Verify Changes

```bash
turso db shell code-reels
.schema your_modified_table
```

---

## 💾 Backup Strategy

### 1. Manual Backup

```bash
# Export entire database
turso db shell code-reels ".dump" > backup-$(date +%Y%m%d).sql

# Export specific table
turso db shell code-reels ".dump questions" > questions-backup.sql
```

### 2. Automated Backup (GitHub Actions)

Create `.github/workflows/backup.yml`:

```yaml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Install Turso CLI
        run: curl -sSfL https://get.tur.so/install.sh | bash
      
      - name: Backup Database
        run: |
          turso db shell code-reels ".dump" > backup-$(date +%Y%m%d).sql
        env:
          TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
      
      - name: Upload to S3 (or other storage)
        # Add your backup storage logic here
```

### 3. Restore from Backup

```bash
# Restore entire database
turso db shell code-reels < backup-20260125.sql

# Restore specific table
turso db shell code-reels < questions-backup.sql
```

---

## 🐛 Troubleshooting

### Issue: "TURSO_DATABASE_URL is required"

**Cause**: Environment variables not set

**Solution**:
```bash
# Check if .env exists
ls -la .env

# Verify contents
cat .env | grep TURSO

# If missing, add credentials
echo 'TURSO_DATABASE_URL="libsql://your-db.turso.io"' >> .env
echo 'TURSO_AUTH_TOKEN="your-token"' >> .env
```

### Issue: "Permission denied"

**Cause**: Using read-only token for write operations

**Solution**:
```bash
# Create new read-write token
turso db tokens create code-reels

# Update .env with new token
nano .env
```

### Issue: "Connection timeout"

**Cause**: Network issues or Turso service down

**Solution**:
```bash
# Check Turso status
curl -I https://turso.tech

# Test connection
turso db shell code-reels "SELECT 1"

# Check your internet connection
ping turso.tech
```

### Issue: "Table already exists"

**Cause**: Schema already pushed (this is normal)

**Solution**:
```bash
# Drizzle Kit handles this automatically
pnpm db:push

# Or force recreate (WARNING: deletes data)
turso db shell code-reels "DROP TABLE IF EXISTS table_name"
pnpm db:push
```

### Issue: "Invalid JSON in field"

**Cause**: Malformed JSON data

**Solution**:
```javascript
// Validate JSON before inserting
try {
  JSON.parse(jsonString);
  // Insert to database
} catch (error) {
  console.error('Invalid JSON:', error);
}
```

---

## 📈 Performance Optimization

### 1. Enable Query Caching

```typescript
// In your database client
const db = drizzle(client, {
  logger: true,
  caching: true
});
```

### 2. Use Prepared Statements

```typescript
// Instead of dynamic queries
const stmt = db.prepare('SELECT * FROM questions WHERE channel = ?');
const results = stmt.all('aws');
```

### 3. Batch Operations

```typescript
// Insert multiple records at once
await db.insert(questions).values([
  { id: 'q1', question: '...', answer: '...' },
  { id: 'q2', question: '...', answer: '...' },
  // ... more records
]);
```

### 4. Monitor Slow Queries

```bash
# In Turso dashboard, enable query logging
# Review slow queries and add indexes as needed
```

---

## 🔒 Security Checklist

- [ ] ✅ Read-only tokens used in production
- [ ] ✅ Write tokens only in CI/CD and scripts
- [ ] ✅ Tokens stored in GitHub Secrets
- [ ] ✅ .env file in .gitignore
- [ ] ✅ Token rotation schedule set (90 days)
- [ ] ✅ Database backups automated
- [ ] ✅ Audit logs enabled
- [ ] ✅ Input validation implemented
- [ ] ✅ SQL injection prevention in place
- [ ] ✅ Rate limiting configured

---

## 📚 Additional Resources

### Documentation
- [Turso Documentation](https://docs.turso.tech/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

### Project Files
- [Complete Schema Documentation](./TURSO_DATABASE_SCHEMA.md)
- [Schema Diagrams](./TURSO_SCHEMA_DIAGRAM.md)
- [Quick Reference](./TURSO_QUICK_REFERENCE.md)
- [SQL Schema File](./TURSO_SCHEMA.sql)

### Support
- [Turso Discord](https://discord.gg/turso)
- [GitHub Issues](https://github.com/open-interview/open-interview/issues)
- [Turso Status Page](https://status.turso.tech/)

---

## ✅ Deployment Checklist

Use this checklist to ensure successful deployment:

### Pre-Deployment
- [ ] Turso CLI installed
- [ ] Logged into Turso account
- [ ] Database created
- [ ] Tokens generated (read-write and read-only)
- [ ] .env file configured
- [ ] Environment variables verified

### Deployment
- [ ] Schema pushed to Turso
- [ ] Tables verified in Turso shell
- [ ] Indexes created
- [ ] Views created (if applicable)
- [ ] Data migrated (if applicable)

### Post-Deployment
- [ ] Application tested locally
- [ ] Database connection verified
- [ ] GitHub Secrets configured
- [ ] CI/CD pipeline tested
- [ ] Backup strategy implemented
- [ ] Monitoring enabled

### Production
- [ ] Read-only tokens in production
- [ ] Rate limiting configured
- [ ] Error tracking enabled
- [ ] Performance monitoring active
- [ ] Backup schedule running
- [ ] Documentation updated

---

## 🎉 Success!

If you've completed all steps, your Turso database is now:
- ✅ Fully deployed with all 12 tables
- ✅ Properly indexed for performance
- ✅ Secured with appropriate tokens
- ✅ Backed up automatically
- ✅ Ready for production use

**Next Steps:**
1. Start building features using the database
2. Monitor performance and optimize as needed
3. Keep documentation updated
4. Review security regularly

---

**Last Updated**: January 25, 2026
**Schema Version**: 2.2.0
**Status**: ✅ Production Ready
