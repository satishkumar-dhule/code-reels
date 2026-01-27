# Turso Database Quick Reference

## 🚀 Quick Commands

### Push Schema to Turso
```bash
# Recommended: Use helper script with validation
pnpm db:push:schema

# Or directly with drizzle-kit
pnpm db:push
```

### View Schema
```bash
# Generate SQL schema
pnpm drizzle-kit introspect

# View in Turso dashboard
turso db shell code-reels
```

### Database Operations
```bash
# Create database
turso db create code-reels

# List databases
turso db list

# Get database URL
turso db show code-reels --url

# Create auth token (read-write)
turso db tokens create code-reels

# Create read-only token
turso db tokens create code-reels --read-only

# Delete database
turso db destroy code-reels
```

---

## 📊 All Tables at a Glance

| # | Table | Purpose | Key Fields |
|---|-------|---------|------------|
| 1 | users | User authentication | id, username, password |
| 2 | questions | Interview questions | id, question, answer, channel |
| 3 | channelMappings | Question-channel links | channelId, questionId |
| 4 | workQueue | Bot task queue | itemType, action, status |
| 5 | botLedger | Bot action audit log | botName, action, itemId |
| 6 | botRuns | Bot execution history | botName, status, summary |
| 7 | questionRelationships | Question links | sourceQuestionId, targetQuestionId |
| 8 | voiceSessions | Voice interview sessions | topic, questionIds |
| 9 | certifications | Certification tracks | name, provider, domains |
| 10 | questionHistory | Change tracking | questionId, eventType |
| 11 | userSessions | Active sessions | sessionType, progress |
| 12 | learningPaths | Learning paths | pathType, questionIds |

---

## 🔑 Primary Keys

| Table | Primary Key Type | Auto-Generated |
|-------|-----------------|----------------|
| users | TEXT (UUID) | ✅ Yes |
| questions | TEXT | ❌ No (manual) |
| channelMappings | INTEGER | ✅ Yes (auto-increment) |
| workQueue | INTEGER | ✅ Yes (auto-increment) |
| botLedger | INTEGER | ✅ Yes (auto-increment) |
| botRuns | INTEGER | ✅ Yes (auto-increment) |
| questionRelationships | INTEGER | ✅ Yes (auto-increment) |
| voiceSessions | TEXT | ❌ No (manual) |
| certifications | TEXT | ❌ No (manual) |
| questionHistory | INTEGER | ✅ Yes (auto-increment) |
| userSessions | TEXT (UUID) | ✅ Yes |
| learningPaths | TEXT | ❌ No (manual) |

---

## 🔗 Foreign Key Relationships

```
channelMappings.questionId → questions.id
questionRelationships.sourceQuestionId → questions.id
questionRelationships.targetQuestionId → questions.id
```

---

## 📝 Common JSON Field Formats

### questions.tags
```json
["react", "javascript", "frontend"]
```

### questions.companies
```json
["Google", "Amazon", "Meta"]
```

### questions.jobTitleRelevance
```json
{
  "frontend-engineer": 95,
  "backend-engineer": 60
}
```

### certifications.domains
```json
[
  { "name": "Design Resilient Architectures", "weight": 30 },
  { "name": "Security", "weight": 25 }
]
```

### learningPaths.questionIds
```json
["q1", "q2", "q3", "q4"]
```

### voiceSessions.questionIds
```json
["aws-q1", "aws-q2", "aws-q3"]
```

---

## 🎯 Status Values

### questions.status
- `active` - Live question
- `flagged` - Needs review
- `deleted` - Soft deleted

### questions.difficulty
- `beginner`
- `intermediate`
- `advanced`

### workQueue.status
- `pending` - Waiting to process
- `processing` - Currently being processed
- `completed` - Successfully completed
- `failed` - Processing failed

### botRuns.status
- `running` - Currently executing
- `completed` - Successfully finished
- `failed` - Execution failed

### userSessions.status
- `active` - In progress
- `completed` - Finished
- `abandoned` - User left

### certifications.status
- `active` - Available
- `draft` - Not published
- `archived` - No longer active

### learningPaths.status
- `active` - Available
- `draft` - Not published
- `archived` - No longer active

---

## 🤖 Bot Action Types

### workQueue.action
- `improve` - Enhance content quality
- `delete` - Remove item
- `verify` - Validate content
- `enrich` - Add metadata

### botLedger.action
- `create` - New item created
- `update` - Item modified
- `delete` - Item removed
- `verify` - Item validated
- `flag` - Item flagged for review

---

## 📈 Typical Data Volumes

| Table | Small | Medium | Large |
|-------|-------|--------|-------|
| users | < 100 | 100-1K | > 1K |
| questions | < 500 | 500-5K | > 5K |
| channelMappings | < 1K | 1K-10K | > 10K |
| workQueue | < 50 | 50-500 | > 500 |
| botLedger | < 5K | 5K-50K | > 50K |
| botRuns | < 100 | 100-1K | > 1K |
| questionRelationships | < 1K | 1K-10K | > 10K |
| voiceSessions | < 100 | 100-1K | > 1K |
| certifications | < 50 | 50-200 | > 200 |
| questionHistory | < 5K | 5K-50K | > 50K |
| userSessions | < 500 | 500-5K | > 5K |
| learningPaths | < 50 | 50-500 | > 500 |

---

## 🔍 Essential Queries

### Get Active Questions by Channel
```sql
SELECT * FROM questions 
WHERE channel = 'aws' AND status = 'active'
ORDER BY createdAt DESC;
```

### Get User's Active Sessions
```sql
SELECT * FROM userSessions 
WHERE userId = 'user-123' AND status = 'active'
ORDER BY lastAccessedAt DESC;
```

### Get Certification with Questions
```sql
SELECT c.*, COUNT(cm.questionId) as question_count
FROM certifications c
LEFT JOIN channelMappings cm ON c.id = cm.channelId
WHERE c.status = 'active'
GROUP BY c.id;
```

### Get Question History
```sql
SELECT * FROM questionHistory 
WHERE questionId = 'q-123'
ORDER BY createdAt DESC
LIMIT 10;
```

### Get Pending Work Items
```sql
SELECT * FROM workQueue 
WHERE status = 'pending'
ORDER BY priority ASC, createdAt ASC
LIMIT 20;
```

### Get Bot Activity Summary
```sql
SELECT 
  botName,
  COUNT(*) as total_actions,
  SUM(CASE WHEN action = 'create' THEN 1 ELSE 0 END) as creates,
  SUM(CASE WHEN action = 'update' THEN 1 ELSE 0 END) as updates
FROM botLedger
WHERE createdAt > datetime('now', '-7 days')
GROUP BY botName;
```

---

## 🛠️ Maintenance Commands

### Backup Database
```bash
# Export to SQL
turso db shell code-reels ".dump" > backup-$(date +%Y%m%d).sql

# Export specific table
turso db shell code-reels ".dump questions" > questions-backup.sql
```

### Restore Database
```bash
# Import from SQL
turso db shell code-reels < backup.sql
```

### Clean Up Old Data
```sql
-- Delete old completed work queue items
DELETE FROM workQueue 
WHERE status = 'completed' 
AND processedAt < datetime('now', '-30 days');

-- Archive old bot runs
DELETE FROM botRuns 
WHERE status = 'completed' 
AND completedAt < datetime('now', '-90 days');

-- Clean up abandoned sessions
UPDATE userSessions 
SET status = 'abandoned'
WHERE status = 'active' 
AND lastAccessedAt < datetime('now', '-7 days');
```

---

## 🔐 Security Checklist

- [ ] Use read-only tokens in production
- [ ] Rotate auth tokens every 90 days
- [ ] Never commit tokens to git
- [ ] Use environment variables for credentials
- [ ] Enable Turso audit logs
- [ ] Monitor unusual query patterns
- [ ] Backup database daily
- [ ] Test restore procedures monthly

---

## 📦 Environment Variables

```env
# Required for schema push
TURSO_DATABASE_URL="libsql://your-db.turso.io"
TURSO_AUTH_TOKEN="your-write-token"

# Required for production
TURSO_DATABASE_URL_RO="libsql://your-db.turso.io"
TURSO_AUTH_TOKEN_RO="your-read-only-token"

# Optional
TURSO_WRITE_MODE="true"  # Enable write operations
```

---

## 🐛 Troubleshooting

### Error: "TURSO_DATABASE_URL is required"
**Solution**: Add credentials to `.env` file

### Error: "Permission denied"
**Solution**: Use read-write token, not read-only

### Error: "Table already exists"
**Solution**: Use `pnpm db:push` which handles existing tables

### Error: "Connection timeout"
**Solution**: Check internet connection and Turso status

### Error: "Invalid JSON in field"
**Solution**: Validate JSON before inserting:
```javascript
JSON.parse(jsonString); // Will throw if invalid
```

---

## 📚 Additional Resources

- [Full Schema Documentation](./TURSO_DATABASE_SCHEMA.md)
- [Schema Diagram](./TURSO_SCHEMA_DIAGRAM.md)
- [Turso Docs](https://docs.turso.tech/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)

---

**Last Updated**: January 25, 2026
**Schema Version**: 2.2.0
