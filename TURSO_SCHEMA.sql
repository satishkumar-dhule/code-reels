-- Turso Database Schema
-- Generated from shared/schema.ts
-- Version: 2.2.0
-- Date: January 25, 2026

-- ============================================================================
-- TABLE: users
-- Purpose: User authentication and account management
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
);

-- ============================================================================
-- TABLE: questions
-- Purpose: Core interview questions with enriched metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    explanation TEXT NOT NULL,
    diagram TEXT,
    difficulty TEXT NOT NULL,
    tags TEXT,
    channel TEXT NOT NULL,
    sub_channel TEXT NOT NULL,
    source_url TEXT,
    videos TEXT,
    companies TEXT,
    eli5 TEXT,
    tldr TEXT,
    relevance_score INTEGER,
    relevance_details TEXT,
    job_title_relevance TEXT,
    experience_level_tags TEXT,
    voice_keywords TEXT,
    voice_suitable INTEGER,
    status TEXT DEFAULT 'active',
    is_new INTEGER DEFAULT 1,
    last_updated TEXT,
    created_at TEXT
);

-- ============================================================================
-- TABLE: channelMappings
-- Purpose: Maps questions to channels and sub-channels
-- ============================================================================
CREATE TABLE IF NOT EXISTS channel_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,
    sub_channel TEXT NOT NULL,
    question_id TEXT NOT NULL,
    FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- ============================================================================
-- TABLE: workQueue
-- Purpose: Work queue for bot coordination and task management
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    action TEXT NOT NULL,
    priority INTEGER DEFAULT 5,
    status TEXT DEFAULT 'pending',
    reason TEXT,
    created_by TEXT,
    assigned_to TEXT,
    created_at TEXT,
    processed_at TEXT,
    result TEXT
);

-- ============================================================================
-- TABLE: botLedger
-- Purpose: Audit ledger for all bot actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS bot_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_name TEXT NOT NULL,
    action TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    before_state TEXT,
    after_state TEXT,
    reason TEXT,
    created_at TEXT
);

-- ============================================================================
-- TABLE: botRuns
-- Purpose: Bot execution history and statistics
-- ============================================================================
CREATE TABLE IF NOT EXISTS bot_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_name TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT DEFAULT 'running',
    items_processed INTEGER DEFAULT 0,
    items_created INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    items_deleted INTEGER DEFAULT 0,
    summary TEXT
);

-- ============================================================================
-- TABLE: questionRelationships
-- Purpose: Relationships between questions for voice session grouping
-- ============================================================================
CREATE TABLE IF NOT EXISTS question_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_question_id TEXT NOT NULL,
    target_question_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL,
    strength INTEGER DEFAULT 50,
    created_at TEXT,
    FOREIGN KEY (source_question_id) REFERENCES questions(id),
    FOREIGN KEY (target_question_id) REFERENCES questions(id)
);

-- ============================================================================
-- TABLE: voiceSessions
-- Purpose: Pre-built sessions of related questions for voice interviews
-- ============================================================================
CREATE TABLE IF NOT EXISTS voice_sessions (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    description TEXT,
    channel TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    question_ids TEXT NOT NULL,
    total_questions INTEGER NOT NULL,
    estimated_minutes INTEGER DEFAULT 5,
    created_at TEXT,
    last_updated TEXT
);

-- ============================================================================
-- TABLE: certifications
-- Purpose: Certification tracks and exam information
-- ============================================================================
CREATE TABLE IF NOT EXISTS certifications (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT DEFAULT 'award',
    color TEXT DEFAULT 'text-primary',
    difficulty TEXT NOT NULL,
    category TEXT NOT NULL,
    estimated_hours INTEGER DEFAULT 40,
    exam_code TEXT,
    official_url TEXT,
    domains TEXT,
    channel_mappings TEXT,
    tags TEXT,
    prerequisites TEXT,
    status TEXT DEFAULT 'active',
    question_count INTEGER DEFAULT 0,
    passing_score INTEGER DEFAULT 70,
    exam_duration INTEGER DEFAULT 90,
    created_at TEXT,
    last_updated TEXT
);

-- ============================================================================
-- TABLE: questionHistory
-- Purpose: Tracks all changes and events for each question
-- ============================================================================
CREATE TABLE IF NOT EXISTS question_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'question',
    event_type TEXT NOT NULL,
    event_source TEXT NOT NULL,
    source_name TEXT,
    changes_summary TEXT,
    changed_fields TEXT,
    before_snapshot TEXT,
    after_snapshot TEXT,
    reason TEXT,
    metadata TEXT,
    created_at TEXT
);

-- ============================================================================
-- TABLE: userSessions
-- Purpose: Track active/in-progress sessions for resume functionality
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    session_type TEXT NOT NULL,
    session_key TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    channel_id TEXT,
    certification_id TEXT,
    progress INTEGER DEFAULT 0,
    total_items INTEGER NOT NULL,
    completed_items INTEGER DEFAULT 0,
    session_data TEXT,
    started_at TEXT,
    last_accessed_at TEXT,
    completed_at TEXT,
    status TEXT DEFAULT 'active'
);

-- ============================================================================
-- TABLE: learningPaths
-- Purpose: Dynamically generated learning paths based on company, job title, and RAG
-- ============================================================================
CREATE TABLE IF NOT EXISTS learning_paths (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    path_type TEXT NOT NULL,
    target_company TEXT,
    target_job_title TEXT,
    difficulty TEXT NOT NULL,
    estimated_hours INTEGER DEFAULT 40,
    question_ids TEXT NOT NULL,
    channels TEXT NOT NULL,
    tags TEXT,
    prerequisites TEXT,
    learning_objectives TEXT,
    milestones TEXT,
    popularity INTEGER DEFAULT 0,
    completion_rate INTEGER DEFAULT 0,
    average_rating INTEGER DEFAULT 0,
    metadata TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT,
    last_updated TEXT,
    last_generated TEXT
);

-- ============================================================================
-- INDEXES
-- Purpose: Improve query performance
-- ============================================================================

-- Questions indexes
CREATE INDEX IF NOT EXISTS idx_questions_channel ON questions(channel);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_created ON questions(created_at);

-- Channel mappings indexes
CREATE INDEX IF NOT EXISTS idx_channel_mappings_channel ON channel_mappings(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_mappings_question ON channel_mappings(question_id);

-- Question history indexes
CREATE INDEX IF NOT EXISTS idx_question_history_question ON question_history(question_id);
CREATE INDEX IF NOT EXISTS idx_question_history_type ON question_history(question_type);
CREATE INDEX IF NOT EXISTS idx_question_history_created ON question_history(created_at);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_type ON user_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_user_sessions_key ON user_sessions(session_key);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

-- Work queue indexes
CREATE INDEX IF NOT EXISTS idx_work_queue_status ON work_queue(status);
CREATE INDEX IF NOT EXISTS idx_work_queue_priority ON work_queue(priority);
CREATE INDEX IF NOT EXISTS idx_work_queue_item ON work_queue(item_id);

-- Bot ledger indexes
CREATE INDEX IF NOT EXISTS idx_bot_ledger_bot ON bot_ledger(bot_name);
CREATE INDEX IF NOT EXISTS idx_bot_ledger_item ON bot_ledger(item_id);
CREATE INDEX IF NOT EXISTS idx_bot_ledger_created ON bot_ledger(created_at);

-- Bot runs indexes
CREATE INDEX IF NOT EXISTS idx_bot_runs_bot ON bot_runs(bot_name);
CREATE INDEX IF NOT EXISTS idx_bot_runs_status ON bot_runs(status);

-- Learning paths indexes
CREATE INDEX IF NOT EXISTS idx_learning_paths_type ON learning_paths(path_type);
CREATE INDEX IF NOT EXISTS idx_learning_paths_status ON learning_paths(status);
CREATE INDEX IF NOT EXISTS idx_learning_paths_company ON learning_paths(target_company);
CREATE INDEX IF NOT EXISTS idx_learning_paths_job ON learning_paths(target_job_title);

-- Certifications indexes
CREATE INDEX IF NOT EXISTS idx_certifications_status ON certifications(status);
CREATE INDEX IF NOT EXISTS idx_certifications_provider ON certifications(provider);
CREATE INDEX IF NOT EXISTS idx_certifications_category ON certifications(category);

-- Voice sessions indexes
CREATE INDEX IF NOT EXISTS idx_voice_sessions_channel ON voice_sessions(channel);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_difficulty ON voice_sessions(difficulty);

-- Question relationships indexes
CREATE INDEX IF NOT EXISTS idx_question_relationships_source ON question_relationships(source_question_id);
CREATE INDEX IF NOT EXISTS idx_question_relationships_target ON question_relationships(target_question_id);

-- ============================================================================
-- VIEWS (Optional - for common queries)
-- ============================================================================

-- Active questions with channel info
CREATE VIEW IF NOT EXISTS v_active_questions AS
SELECT 
    q.*,
    COUNT(DISTINCT cm.id) as channel_count
FROM questions q
LEFT JOIN channel_mappings cm ON q.id = cm.question_id
WHERE q.status = 'active'
GROUP BY q.id;

-- Bot activity summary
CREATE VIEW IF NOT EXISTS v_bot_activity AS
SELECT 
    bot_name,
    COUNT(*) as total_actions,
    SUM(CASE WHEN action = 'create' THEN 1 ELSE 0 END) as creates,
    SUM(CASE WHEN action = 'update' THEN 1 ELSE 0 END) as updates,
    SUM(CASE WHEN action = 'delete' THEN 1 ELSE 0 END) as deletes,
    MAX(created_at) as last_action
FROM bot_ledger
GROUP BY bot_name;

-- Active user sessions summary
CREATE VIEW IF NOT EXISTS v_active_sessions AS
SELECT 
    session_type,
    COUNT(*) as total_sessions,
    AVG(progress) as avg_progress,
    SUM(completed_items) as total_completed
FROM user_sessions
WHERE status = 'active'
GROUP BY session_type;

-- ============================================================================
-- TRIGGERS (Optional - for data integrity)
-- ============================================================================

-- Update last_updated timestamp on questions
CREATE TRIGGER IF NOT EXISTS trg_questions_update
AFTER UPDATE ON questions
BEGIN
    UPDATE questions 
    SET last_updated = datetime('now')
    WHERE id = NEW.id;
END;

-- Update last_accessed_at on user sessions
CREATE TRIGGER IF NOT EXISTS trg_user_sessions_access
AFTER UPDATE ON user_sessions
BEGIN
    UPDATE user_sessions 
    SET last_accessed_at = datetime('now')
    WHERE id = NEW.id;
END;

-- ============================================================================
-- COMMENTS
-- ============================================================================

-- This schema is managed by Drizzle ORM
-- Source: shared/schema.ts
-- To update: Modify shared/schema.ts and run: pnpm db:push

-- JSON Field Formats:
-- - questions.tags: ["tag1", "tag2"]
-- - questions.companies: ["Company1", "Company2"]
-- - questions.jobTitleRelevance: {"title": score}
-- - certifications.domains: [{"name": "Domain", "weight": 30}]
-- - learningPaths.questionIds: ["q1", "q2", "q3"]

-- Status Values:
-- - questions.status: 'active', 'flagged', 'deleted'
-- - workQueue.status: 'pending', 'processing', 'completed', 'failed'
-- - botRuns.status: 'running', 'completed', 'failed'
-- - userSessions.status: 'active', 'completed', 'abandoned'

-- Difficulty Values:
-- - 'beginner', 'intermediate', 'advanced', 'expert'

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
