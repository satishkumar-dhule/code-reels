# Turso Database Schema Documentation

This document provides a complete overview of all database tables and their schemas in the Turso database.

## Quick Start

### Push Schema to Turso

```bash
# Using the helper script
node script/push-schema-to-turso.js

# Or directly with drizzle-kit
pnpm db:push
```

### Prerequisites

Ensure your `.env` file has the following variables set:

```env
TURSO_DATABASE_URL="libsql://your-database.turso.io"
TURSO_AUTH_TOKEN="your-read-write-token"
```

---

## Database Tables

### 1. **users**
User authentication and account management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID generated automatically |
| username | TEXT | NOT NULL, UNIQUE | User's unique username |
| password | TEXT | NOT NULL | Hashed password |

---

### 2. **questions**
Core interview questions with metadata and enrichment.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique question identifier |
| question | TEXT | NOT NULL | The interview question text |
| answer | TEXT | NOT NULL | Detailed answer |
| explanation | TEXT | NOT NULL | Additional explanation |
| diagram | TEXT | | Mermaid diagram code (optional) |
| difficulty | TEXT | NOT NULL | beginner, intermediate, advanced |
| tags | TEXT | | JSON array of tags |
| channel | TEXT | NOT NULL | Main topic channel |
| subChannel | TEXT | NOT NULL | Sub-topic channel |
| sourceUrl | TEXT | | Source URL reference |
| videos | TEXT | | JSON object with video links |
| companies | TEXT | | JSON array of companies |
| eli5 | TEXT | | Explain Like I'm 5 version |
| tldr | TEXT | | Too Long; Didn't Read summary |
| relevanceScore | INTEGER | | 0-100 interview relevance |
| relevanceDetails | TEXT | | JSON with scoring breakdown |
| jobTitleRelevance | TEXT | | JSON mapping job titles to scores |
| experienceLevelTags | TEXT | | JSON array of experience levels |
| voiceKeywords | TEXT | | JSON array of keywords for voice |
| voiceSuitable | INTEGER | | 1 = suitable, 0 = not suitable |
| status | TEXT | DEFAULT 'active' | active, flagged, deleted |
| isNew | INTEGER | DEFAULT 1 | 1 = new (< 7 days), 0 = old |
| lastUpdated | TEXT | | ISO timestamp of last update |
| createdAt | TEXT | AUTO | ISO timestamp of creation |

---

### 3. **channelMappings**
Maps questions to channels and sub-channels.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO INCREMENT | Unique mapping ID |
| channelId | TEXT | NOT NULL | Channel identifier |
| subChannel | TEXT | NOT NULL | Sub-channel identifier |
| questionId | TEXT | NOT NULL, FOREIGN KEY | References questions.id |

---

### 4. **workQueue**
Work queue for bot coordination and task management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO INCREMENT | Unique work item ID |
| itemType | TEXT | NOT NULL | question, challenge, test, blog |
| itemId | TEXT | NOT NULL | ID of the item to process |
| action | TEXT | NOT NULL | improve, delete, verify, enrich |
| priority | INTEGER | DEFAULT 5 | 1=highest, 10=lowest |
| status | TEXT | DEFAULT 'pending' | pending, processing, completed, failed |
| reason | TEXT | | Why this work was created |
| createdBy | TEXT | | Which bot created this |
| assignedTo | TEXT | | Which bot should process |
| createdAt | TEXT | AUTO | ISO timestamp |
| processedAt | TEXT | | When processing completed |
| result | TEXT | | JSON result or error message |

---

### 5. **botLedger**
Audit ledger for all bot actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO INCREMENT | Unique ledger entry ID |
| botName | TEXT | NOT NULL | Name of the bot |
| action | TEXT | NOT NULL | create, update, delete, verify, flag |
| itemType | TEXT | NOT NULL | Type of item affected |
| itemId | TEXT | NOT NULL | ID of the item |
| beforeState | TEXT | | JSON snapshot before action |
| afterState | TEXT | | JSON snapshot after action |
| reason | TEXT | | Reason for the action |
| createdAt | TEXT | AUTO | ISO timestamp |

---

### 6. **botRuns**
Bot execution history and statistics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO INCREMENT | Unique run ID |
| botName | TEXT | NOT NULL | Name of the bot |
| startedAt | TEXT | NOT NULL | When the run started |
| completedAt | TEXT | | When the run completed |
| status | TEXT | DEFAULT 'running' | running, completed, failed |
| itemsProcessed | INTEGER | DEFAULT 0 | Count of items processed |
| itemsCreated | INTEGER | DEFAULT 0 | Count of items created |
| itemsUpdated | INTEGER | DEFAULT 0 | Count of items updated |
| itemsDeleted | INTEGER | DEFAULT 0 | Count of items deleted |
| summary | TEXT | | JSON summary of the run |

---

### 7. **questionRelationships**
Relationships between questions for voice session grouping.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO INCREMENT | Unique relationship ID |
| sourceQuestionId | TEXT | NOT NULL, FOREIGN KEY | References questions.id |
| targetQuestionId | TEXT | NOT NULL, FOREIGN KEY | References questions.id |
| relationshipType | TEXT | NOT NULL | prerequisite, follow_up, related, deeper_dive |
| strength | INTEGER | DEFAULT 50 | 0-100 relationship strength |
| createdAt | TEXT | AUTO | ISO timestamp |

---

### 8. **voiceSessions**
Pre-built sessions of related questions for voice interviews.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique session identifier |
| topic | TEXT | NOT NULL | Session topic |
| description | TEXT | | Session description |
| channel | TEXT | NOT NULL | Main channel |
| difficulty | TEXT | NOT NULL | beginner, intermediate, advanced |
| questionIds | TEXT | NOT NULL | JSON array of question IDs in order |
| totalQuestions | INTEGER | NOT NULL | Total number of questions |
| estimatedMinutes | INTEGER | DEFAULT 5 | Estimated duration |
| createdAt | TEXT | AUTO | ISO timestamp |
| lastUpdated | TEXT | | Last update timestamp |

---

### 9. **certifications**
Certification tracks and exam information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique certification ID |
| name | TEXT | NOT NULL | Certification name |
| provider | TEXT | NOT NULL | Provider (AWS, Azure, etc.) |
| description | TEXT | NOT NULL | Certification description |
| icon | TEXT | DEFAULT 'award' | Icon identifier |
| color | TEXT | DEFAULT 'text-primary' | Color class |
| difficulty | TEXT | NOT NULL | beginner, intermediate, advanced, expert |
| category | TEXT | NOT NULL | cloud, devops, security, data, ai, etc. |
| estimatedHours | INTEGER | DEFAULT 40 | Study time estimate |
| examCode | TEXT | | Official exam code |
| officialUrl | TEXT | | Official certification URL |
| domains | TEXT | | JSON array of exam domains |
| channelMappings | TEXT | | JSON array of channel mappings |
| tags | TEXT | | JSON array of tags |
| prerequisites | TEXT | | JSON array of prerequisite cert IDs |
| status | TEXT | DEFAULT 'active' | active, draft, archived |
| questionCount | INTEGER | DEFAULT 0 | Cached question count |
| passingScore | INTEGER | DEFAULT 70 | Percentage to pass |
| examDuration | INTEGER | DEFAULT 90 | Exam duration in minutes |
| createdAt | TEXT | AUTO | ISO timestamp |
| lastUpdated | TEXT | | Last update timestamp |

---

### 10. **questionHistory**
Tracks all changes and events for each question.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO INCREMENT | Unique history entry ID |
| questionId | TEXT | NOT NULL | Question, test, or challenge ID |
| questionType | TEXT | NOT NULL, DEFAULT 'question' | question, test, coding |
| eventType | TEXT | NOT NULL | created, updated, improved, flagged, etc. |
| eventSource | TEXT | NOT NULL | bot, user, system, import |
| sourceName | TEXT | | Specific bot name or user ID |
| changesSummary | TEXT | | Human-readable change summary |
| changedFields | TEXT | | JSON array of changed field names |
| beforeSnapshot | TEXT | | JSON snapshot before change |
| afterSnapshot | TEXT | | JSON snapshot after change |
| reason | TEXT | | Why this change was made |
| metadata | TEXT | | JSON for additional context |
| createdAt | TEXT | AUTO | ISO timestamp |

---

### 11. **userSessions**
Track active/in-progress sessions for resume functionality.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID generated automatically |
| userId | TEXT | | Optional user ID for future auth |
| sessionType | TEXT | NOT NULL | test, voice-interview, certification, channel |
| sessionKey | TEXT | NOT NULL | Unique session key |
| title | TEXT | NOT NULL | Session title |
| subtitle | TEXT | | Session subtitle |
| channelId | TEXT | | Associated channel ID |
| certificationId | TEXT | | Associated certification ID |
| progress | INTEGER | DEFAULT 0 | 0-100 progress percentage |
| totalItems | INTEGER | NOT NULL | Total items in session |
| completedItems | INTEGER | DEFAULT 0 | Number of completed items |
| sessionData | TEXT | | JSON blob with session data |
| startedAt | TEXT | AUTO | When session started |
| lastAccessedAt | TEXT | AUTO | Last access timestamp |
| completedAt | TEXT | | When session completed |
| status | TEXT | DEFAULT 'active' | active, completed, abandoned |

---

### 12. **learningPaths**
Dynamically generated learning paths based on company, job title, and RAG analysis.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique path identifier |
| title | TEXT | NOT NULL | Path title |
| description | TEXT | NOT NULL | Path description |
| pathType | TEXT | NOT NULL | company, job-title, skill, certification |
| targetCompany | TEXT | | Target company (Google, Amazon, etc.) |
| targetJobTitle | TEXT | | Target job title |
| difficulty | TEXT | NOT NULL | beginner, intermediate, advanced |
| estimatedHours | INTEGER | DEFAULT 40 | Estimated completion time |
| questionIds | TEXT | NOT NULL | JSON array of question IDs in order |
| channels | TEXT | NOT NULL | JSON array of channels covered |
| tags | TEXT | | JSON array of tags |
| prerequisites | TEXT | | JSON array of prerequisite path IDs |
| learningObjectives | TEXT | | JSON array of learning objectives |
| milestones | TEXT | | JSON array of milestone objects |
| popularity | INTEGER | DEFAULT 0 | Number of users who started |
| completionRate | INTEGER | DEFAULT 0 | Percentage who completed |
| averageRating | INTEGER | DEFAULT 0 | 0-100 user rating |
| metadata | TEXT | | JSON for RAG insights, patterns, etc. |
| status | TEXT | DEFAULT 'active' | active, draft, archived |
| createdAt | TEXT | AUTO | ISO timestamp |
| lastUpdated | TEXT | | Last update timestamp |
| lastGenerated | TEXT | | When path was last regenerated |

---

## Schema Management

### Viewing Current Schema

```bash
# Generate SQL schema file
pnpm drizzle-kit introspect
```

### Creating Migrations

```bash
# Generate migration files
pnpm drizzle-kit generate
```

### Applying Schema Changes

```bash
# Push schema changes to Turso
pnpm db:push

# Or use the helper script
node script/push-schema-to-turso.js
```

---

## Database Relationships

### Foreign Key Relationships

1. **channelMappings.questionId** → **questions.id**
2. **questionRelationships.sourceQuestionId** → **questions.id**
3. **questionRelationships.targetQuestionId** → **questions.id**

### JSON Field Structures

#### questions.tags
```json
["react", "javascript", "frontend"]
```

#### questions.videos
```json
{
  "youtube": "https://youtube.com/watch?v=...",
  "vimeo": "https://vimeo.com/..."
}
```

#### questions.companies
```json
["Google", "Amazon", "Meta", "Microsoft"]
```

#### questions.jobTitleRelevance
```json
{
  "frontend-engineer": 95,
  "backend-engineer": 60,
  "full-stack-engineer": 85
}
```

#### certifications.domains
```json
[
  { "name": "Design Resilient Architectures", "weight": 30 },
  { "name": "Design High-Performing Architectures", "weight": 28 }
]
```

#### learningPaths.milestones
```json
[
  {
    "id": "milestone-1",
    "title": "Fundamentals",
    "questionIds": ["q1", "q2", "q3"],
    "estimatedHours": 10
  }
]
```

---

## Environment Configuration

### Required Environment Variables

```env
# Turso Database (Read-Write)
TURSO_DATABASE_URL="libsql://your-database.turso.io"
TURSO_AUTH_TOKEN="your-read-write-token"

# Turso Database (Read-Only) - for production serving
TURSO_DATABASE_URL_RO="libsql://your-database.turso.io"
TURSO_AUTH_TOKEN_RO="your-read-only-token"
```

### Creating a Turso Database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create a new database
turso db create code-reels

# Get the database URL
turso db show code-reels --url

# Create an auth token
turso db tokens create code-reels

# Create a read-only token
turso db tokens create code-reels --read-only
```

---

## Backup and Recovery

### Export Database

```bash
# Export to SQL file
turso db shell code-reels ".dump" > backup.sql
```

### Import Database

```bash
# Import from SQL file
turso db shell code-reels < backup.sql
```

---

## Performance Considerations

### Indexes

The schema uses the following indexes automatically:
- Primary keys on all tables
- Unique constraint on `users.username`
- Foreign key indexes on relationship tables

### Query Optimization Tips

1. Use `status = 'active'` filters on questions table
2. Index JSON fields if querying frequently
3. Use pagination for large result sets
4. Cache frequently accessed data (certifications, learning paths)

---

## Security Best Practices

1. **Use Read-Only Tokens in Production**: Serve the application with read-only credentials
2. **Rotate Tokens Regularly**: Update auth tokens periodically
3. **Validate Input**: Always validate data before inserting
4. **Sanitize JSON Fields**: Ensure JSON fields are properly formatted
5. **Monitor Bot Actions**: Review botLedger regularly for anomalies

---

## Troubleshooting

### Common Issues

**Issue**: "TURSO_DATABASE_URL is required"
- **Solution**: Ensure `.env` file has the correct variables set

**Issue**: "Permission denied" when pushing schema
- **Solution**: Verify you're using read-write credentials, not read-only

**Issue**: "Table already exists"
- **Solution**: Use `pnpm db:push` which handles existing tables

**Issue**: "Connection timeout"
- **Solution**: Check internet connection and Turso service status

---

## Additional Resources

- [Turso Documentation](https://docs.turso.tech/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Project Repository](https://github.com/open-interview/open-interview)

---

**Last Updated**: January 25, 2026
**Schema Version**: 2.2.0
