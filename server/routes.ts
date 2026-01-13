import type { Express } from "express";
import { type Server } from "http";
import { client } from "./db";

// Helper to parse JSON fields from DB
function parseQuestion(row: any) {
  // Sanitize answer field - ensure no JSON/MCQ format
  let answer = row.answer;
  
  // Check if answer contains MCQ JSON format
  if (answer && typeof answer === 'string' && answer.trim().startsWith('[{')) {
    try {
      const parsed = JSON.parse(answer);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Extract correct answer text
        const correctOption = parsed.find((opt: any) => opt.isCorrect === true);
        if (correctOption && correctOption.text) {
          answer = correctOption.text;
          console.warn(`⚠️  Question ${row.id} had MCQ format in answer - sanitized on-the-fly`);
        }
      }
    } catch (e) {
      // If parsing fails, leave as is but log warning
      console.warn(`⚠️  Question ${row.id} has malformed answer field`);
    }
  }
  
  return {
    id: row.id,
    question: row.question,
    answer: answer,
    explanation: row.explanation,
    diagram: row.diagram,
    difficulty: row.difficulty,
    tags: row.tags ? JSON.parse(row.tags) : [],
    channel: row.channel,
    subChannel: row.sub_channel,
    sourceUrl: row.source_url,
    videos: row.videos ? JSON.parse(row.videos) : null,
    companies: row.companies ? JSON.parse(row.companies) : null,
    eli5: row.eli5,
    lastUpdated: row.last_updated,
  };
}



export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Get all channels with question counts
  app.get("/api/channels", async (_req, res) => {
    try {
      const result = await client.execute(
        "SELECT channel, COUNT(*) as count FROM questions WHERE status != 'deleted' GROUP BY channel"
      );
      res.json(result.rows.map(r => ({ id: r.channel, questionCount: r.count })));
    } catch (error) {
      console.error("Error fetching channels:", error);
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });

  // Get question IDs for a channel with filters
  app.get("/api/questions/:channelId", async (req, res) => {
    try {
      const { channelId } = req.params;
      const { subChannel, difficulty } = req.query;

      let sql = "SELECT id, difficulty, sub_channel as subChannel FROM questions WHERE channel = ?";
      const args: any[] = [channelId];

      if (subChannel && subChannel !== "all") {
        sql += " AND sub_channel = ?";
        args.push(subChannel);
      }
      
      if (difficulty && difficulty !== "all") {
        sql += " AND difficulty = ?";
        args.push(difficulty);
      }

      const result = await client.execute({ sql, args });
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  // Get a random question (must be before :questionId to avoid route conflict)
  app.get("/api/question/random", async (req, res) => {
    try {
      const { channel, difficulty } = req.query;
      
      let sql = "SELECT * FROM questions WHERE 1=1";
      const args: any[] = [];

      if (channel && channel !== "all") {
        sql += " AND channel = ?";
        args.push(channel);
      }
      if (difficulty && difficulty !== "all") {
        sql += " AND difficulty = ?";
        args.push(difficulty);
      }

      sql += " ORDER BY RANDOM() LIMIT 1";

      const result = await client.execute({ sql, args });

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "No questions found" });
      }

      res.json(parseQuestion(result.rows[0]));
    } catch (error) {
      console.error("Error fetching random question:", error);
      res.status(500).json({ error: "Failed to fetch random question" });
    }
  });

  // Get a single question by ID
  app.get("/api/question/:questionId", async (req, res) => {
    try {
      const { questionId } = req.params;
      
      const result = await client.execute({
        sql: "SELECT * FROM questions WHERE id = ? LIMIT 1",
        args: [questionId]
      });

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Question not found" });
      }

      res.json(parseQuestion(result.rows[0]));
    } catch (error) {
      console.error("Error fetching question:", error);
      res.status(500).json({ error: "Failed to fetch question" });
    }
  });

  // Get channel stats
  app.get("/api/stats", async (_req, res) => {
    try {
      const result = await client.execute(
        "SELECT channel, difficulty, COUNT(*) as count FROM questions WHERE status != 'deleted' GROUP BY channel, difficulty"
      );

      // Aggregate by channel
      const statsMap = new Map<string, { total: number; beginner: number; intermediate: number; advanced: number }>();
      
      for (const row of result.rows) {
        const channel = row.channel as string;
        const difficulty = row.difficulty as string;
        const count = Number(row.count);
        
        if (!statsMap.has(channel)) {
          statsMap.set(channel, { total: 0, beginner: 0, intermediate: 0, advanced: 0 });
        }
        const stat = statsMap.get(channel)!;
        stat.total += count;
        if (difficulty === 'beginner') stat.beginner = count;
        if (difficulty === 'intermediate') stat.intermediate = count;
        if (difficulty === 'advanced') stat.advanced = count;
      }

      const stats = Array.from(statsMap.entries()).map(([id, stat]) => ({
        id,
        ...stat
      }));

      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Get subchannels for a channel
  app.get("/api/subchannels/:channelId", async (req, res) => {
    try {
      const { channelId } = req.params;
      
      const result = await client.execute({
        sql: "SELECT DISTINCT sub_channel FROM questions WHERE channel = ? ORDER BY sub_channel",
        args: [channelId]
      });

      const subChannels = result.rows.map(r => r.sub_channel);
      res.json(subChannels);
    } catch (error) {
      console.error("Error fetching subchannels:", error);
      res.status(500).json({ error: "Failed to fetch subchannels" });
    }
  });

  // Get companies for a channel
  app.get("/api/companies/:channelId", async (req, res) => {
    try {
      const { channelId } = req.params;
      
      const result = await client.execute({
        sql: "SELECT companies FROM questions WHERE channel = ? AND companies IS NOT NULL",
        args: [channelId]
      });

      const companiesSet = new Set<string>();
      for (const row of result.rows) {
        if (row.companies) {
          const parsed = JSON.parse(row.companies as string);
          parsed.forEach((c: string) => companiesSet.add(c));
        }
      }

      res.json(Array.from(companiesSet).sort());
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  // Note: Bot activity is served from static JSON file at /data/bot-activity.json
  // Generated during build by fetch-questions-for-build.js

  // ============================================
  // CODING CHALLENGES API
  // ============================================

  // Helper to parse coding challenge from DB row
  function parseCodingChallenge(row: any) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      difficulty: row.difficulty,
      category: row.category,
      tags: row.tags ? JSON.parse(row.tags) : [],
      companies: row.companies ? JSON.parse(row.companies) : [],
      starterCode: {
        javascript: row.starter_code_js || '',
        python: row.starter_code_py || '',
      },
      testCases: row.test_cases ? JSON.parse(row.test_cases) : [],
      hints: row.hints ? JSON.parse(row.hints) : [],
      sampleSolution: {
        javascript: row.solution_js || '',
        python: row.solution_py || '',
      },
      complexity: {
        time: row.complexity_time || 'O(n)',
        space: row.complexity_space || 'O(1)',
        explanation: row.complexity_explanation || '',
      },
      timeLimit: row.time_limit || 15,
    };
  }

  // Get all coding challenges
  app.get("/api/coding/challenges", async (req, res) => {
    try {
      const { difficulty, category } = req.query;
      
      let sql = "SELECT * FROM coding_challenges WHERE 1=1";
      const args: any[] = [];

      if (difficulty && difficulty !== "all") {
        sql += " AND difficulty = ?";
        args.push(difficulty);
      }
      if (category && category !== "all") {
        sql += " AND category = ?";
        args.push(category);
      }

      sql += " ORDER BY created_at DESC";

      const result = await client.execute({ sql, args });
      res.json(result.rows.map(parseCodingChallenge));
    } catch (error) {
      console.error("Error fetching coding challenges:", error);
      // Return empty array if table doesn't exist yet
      res.json([]);
    }
  });

  // Get a single coding challenge by ID
  app.get("/api/coding/challenge/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await client.execute({
        sql: "SELECT * FROM coding_challenges WHERE id = ? LIMIT 1",
        args: [id]
      });

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Challenge not found" });
      }

      res.json(parseCodingChallenge(result.rows[0]));
    } catch (error) {
      console.error("Error fetching coding challenge:", error);
      res.status(500).json({ error: "Failed to fetch challenge" });
    }
  });

  // Get a random coding challenge
  app.get("/api/coding/random", async (req, res) => {
    try {
      const { difficulty } = req.query;
      
      let sql = "SELECT * FROM coding_challenges WHERE 1=1";
      const args: any[] = [];

      if (difficulty && difficulty !== "all") {
        sql += " AND difficulty = ?";
        args.push(difficulty);
      }

      sql += " ORDER BY RANDOM() LIMIT 1";

      const result = await client.execute({ sql, args });

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "No challenges found" });
      }

      res.json(parseCodingChallenge(result.rows[0]));
    } catch (error) {
      console.error("Error fetching random challenge:", error);
      res.status(500).json({ error: "Failed to fetch random challenge" });
    }
  });

  // Get coding challenge stats
  app.get("/api/coding/stats", async (_req, res) => {
    try {
      const result = await client.execute(
        "SELECT difficulty, category, COUNT(*) as count FROM coding_challenges GROUP BY difficulty, category"
      );

      const stats = {
        total: 0,
        byDifficulty: { easy: 0, medium: 0 },
        byCategory: {} as Record<string, number>,
      };

      for (const row of result.rows) {
        const count = Number(row.count);
        stats.total += count;
        
        const diff = row.difficulty as string;
        if (diff === 'easy' || diff === 'medium') {
          stats.byDifficulty[diff] += count;
        }
        
        const cat = row.category as string;
        stats.byCategory[cat] = (stats.byCategory[cat] || 0) + count;
      }

      res.json(stats);
    } catch (error) {
      console.error("Error fetching coding stats:", error);
      res.json({ total: 0, byDifficulty: { easy: 0, medium: 0 }, byCategory: {} });
    }
  });

  // ============================================
  // QUESTION HISTORY API
  // ============================================

  // Helper to parse history record from DB row
  function parseHistoryRecord(row: any) {
    return {
      id: row.id,
      questionId: row.question_id,
      questionType: row.question_type,
      eventType: row.event_type,
      eventSource: row.event_source,
      sourceName: row.source_name,
      changesSummary: row.changes_summary,
      changedFields: row.changed_fields ? JSON.parse(row.changed_fields) : [],
      beforeSnapshot: row.before_snapshot ? JSON.parse(row.before_snapshot) : null,
      afterSnapshot: row.after_snapshot ? JSON.parse(row.after_snapshot) : null,
      reason: row.reason,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      createdAt: row.created_at,
    };
  }

  // Get history for a specific question
  app.get("/api/history/:questionId", async (req, res) => {
    try {
      const { questionId } = req.params;
      const { type = 'question', limit = '50' } = req.query;
      
      const result = await client.execute({
        sql: `SELECT * FROM question_history 
              WHERE question_id = ? AND question_type = ? 
              ORDER BY created_at DESC 
              LIMIT ?`,
        args: [questionId, type as string, parseInt(limit as string)]
      });

      res.json(result.rows.map(parseHistoryRecord));
    } catch (error) {
      console.error("Error fetching question history:", error);
      // Return empty array if table doesn't exist yet
      res.json([]);
    }
  });

  // Get history summary (count of events) for a question
  app.get("/api/history/:questionId/summary", async (req, res) => {
    try {
      const { questionId } = req.params;
      const { type = 'question' } = req.query;
      
      const result = await client.execute({
        sql: `SELECT event_type, COUNT(*) as count 
              FROM question_history 
              WHERE question_id = ? AND question_type = ?
              GROUP BY event_type`,
        args: [questionId, type as string]
      });

      const summary: Record<string, number> = {};
      let total = 0;
      for (const row of result.rows) {
        const count = Number(row.count);
        summary[row.event_type as string] = count;
        total += count;
      }

      // Get latest event
      const latestResult = await client.execute({
        sql: `SELECT * FROM question_history 
              WHERE question_id = ? AND question_type = ?
              ORDER BY created_at DESC LIMIT 1`,
        args: [questionId, type as string]
      });

      const latest = latestResult.rows.length > 0 
        ? parseHistoryRecord(latestResult.rows[0]) 
        : null;

      res.json({ total, byType: summary, latest });
    } catch (error) {
      console.error("Error fetching history summary:", error);
      res.json({ total: 0, byType: {}, latest: null });
    }
  });

  // Add a history record (for bots and system use)
  app.post("/api/history", async (req, res) => {
    try {
      const {
        questionId,
        questionType = 'question',
        eventType,
        eventSource,
        sourceName,
        changesSummary,
        changedFields,
        beforeSnapshot,
        afterSnapshot,
        reason,
        metadata
      } = req.body;

      if (!questionId || !eventType || !eventSource) {
        return res.status(400).json({ 
          error: "Missing required fields: questionId, eventType, eventSource" 
        });
      }

      const result = await client.execute({
        sql: `INSERT INTO question_history 
              (question_id, question_type, event_type, event_source, source_name, 
               changes_summary, changed_fields, before_snapshot, after_snapshot, 
               reason, metadata, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          questionId,
          questionType,
          eventType,
          eventSource,
          sourceName || null,
          changesSummary || null,
          changedFields ? JSON.stringify(changedFields) : null,
          beforeSnapshot ? JSON.stringify(beforeSnapshot) : null,
          afterSnapshot ? JSON.stringify(afterSnapshot) : null,
          reason || null,
          metadata ? JSON.stringify(metadata) : null,
          new Date().toISOString()
        ]
      });

      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      console.error("Error adding history record:", error);
      res.status(500).json({ error: "Failed to add history record" });
    }
  });

  // Get recent history across all questions (for admin/dashboard)
  app.get("/api/history", async (req, res) => {
    try {
      const { limit = '100', type, eventType, source } = req.query;
      
      let sql = "SELECT * FROM question_history WHERE 1=1";
      const args: any[] = [];

      if (type && type !== 'all') {
        sql += " AND question_type = ?";
        args.push(type);
      }
      if (eventType && eventType !== 'all') {
        sql += " AND event_type = ?";
        args.push(eventType);
      }
      if (source && source !== 'all') {
        sql += " AND event_source = ?";
        args.push(source);
      }

      sql += " ORDER BY created_at DESC LIMIT ?";
      args.push(parseInt(limit as string));

      const result = await client.execute({ sql, args });
      res.json(result.rows.map(parseHistoryRecord));
    } catch (error) {
      console.error("Error fetching history:", error);
      res.json([]);
    }
  });

  // ============================================
  // CERTIFICATIONS API
  // ============================================

  // Helper to parse certification from DB row
  function parseCertification(row: any) {
    return {
      id: row.id,
      name: row.name,
      provider: row.provider,
      description: row.description,
      icon: row.icon || 'award',
      color: row.color || 'text-primary',
      difficulty: row.difficulty,
      category: row.category,
      estimatedHours: row.estimated_hours || 40,
      examCode: row.exam_code,
      officialUrl: row.official_url,
      domains: row.domains ? JSON.parse(row.domains) : [],
      channelMappings: row.channel_mappings ? JSON.parse(row.channel_mappings) : [],
      tags: row.tags ? JSON.parse(row.tags) : [],
      prerequisites: row.prerequisites ? JSON.parse(row.prerequisites) : [],
      status: row.status || 'active',
      questionCount: row.question_count || 0,
      passingScore: row.passing_score || 70,
      examDuration: row.exam_duration || 90,
      createdAt: row.created_at,
      lastUpdated: row.last_updated,
    };
  }

  // Get all certifications
  app.get("/api/certifications", async (req, res) => {
    try {
      const { category, difficulty, provider, status = 'active' } = req.query;
      
      let sql = "SELECT * FROM certifications WHERE status = ?";
      const args: any[] = [status];

      if (category && category !== 'all') {
        sql += " AND category = ?";
        args.push(category);
      }
      if (difficulty && difficulty !== 'all') {
        sql += " AND difficulty = ?";
        args.push(difficulty);
      }
      if (provider && provider !== 'all') {
        sql += " AND provider LIKE ?";
        args.push(`%${provider}%`);
      }

      sql += " ORDER BY name ASC";

      const result = await client.execute({ sql, args });
      res.json(result.rows.map(parseCertification));
    } catch (error) {
      console.error("Error fetching certifications:", error);
      // Return empty array if table doesn't exist yet
      res.json([]);
    }
  });

  // Get a single certification by ID
  app.get("/api/certification/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await client.execute({
        sql: "SELECT * FROM certifications WHERE id = ? LIMIT 1",
        args: [id]
      });

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Certification not found" });
      }

      res.json(parseCertification(result.rows[0]));
    } catch (error) {
      console.error("Error fetching certification:", error);
      res.status(500).json({ error: "Failed to fetch certification" });
    }
  });

  // Get certification stats
  app.get("/api/certifications/stats", async (_req, res) => {
    try {
      const result = await client.execute(
        "SELECT category, difficulty, COUNT(*) as count, SUM(question_count) as questions FROM certifications WHERE status = 'active' GROUP BY category, difficulty"
      );

      const stats = {
        total: 0,
        totalQuestions: 0,
        byCategory: {} as Record<string, number>,
        byDifficulty: {} as Record<string, number>,
      };

      for (const row of result.rows) {
        const count = Number(row.count);
        const questions = Number(row.questions) || 0;
        stats.total += count;
        stats.totalQuestions += questions;
        
        const cat = row.category as string;
        stats.byCategory[cat] = (stats.byCategory[cat] || 0) + count;
        
        const diff = row.difficulty as string;
        stats.byDifficulty[diff] = (stats.byDifficulty[diff] || 0) + count;
      }

      res.json(stats);
    } catch (error) {
      console.error("Error fetching certification stats:", error);
      res.json({ total: 0, totalQuestions: 0, byCategory: {}, byDifficulty: {} });
    }
  });

  // Get questions for a certification (by channel)
  app.get("/api/certification/:id/questions", async (req, res) => {
    try {
      const { id } = req.params;
      const { domain, difficulty, limit = '50' } = req.query;
      
      let sql = "SELECT * FROM questions WHERE channel = ? AND status != 'deleted'";
      const args: any[] = [id];

      if (domain && domain !== 'all') {
        sql += " AND sub_channel = ?";
        args.push(domain);
      }
      if (difficulty && difficulty !== 'all') {
        sql += " AND difficulty = ?";
        args.push(difficulty);
      }

      sql += " ORDER BY RANDOM() LIMIT ?";
      args.push(parseInt(limit as string));

      const result = await client.execute({ sql, args });
      res.json(result.rows.map(parseQuestion));
    } catch (error) {
      console.error("Error fetching certification questions:", error);
      res.json([]);
    }
  });

  // Update certification question count (called after generating questions)
  app.post("/api/certification/:id/update-count", async (req, res) => {
    try {
      const { id } = req.params;
      
      const countResult = await client.execute({
        sql: "SELECT COUNT(*) as count FROM questions WHERE channel = ? AND status != 'deleted'",
        args: [id]
      });
      
      const count = countResult.rows[0]?.count || 0;
      
      await client.execute({
        sql: "UPDATE certifications SET question_count = ?, last_updated = ? WHERE id = ?",
        args: [count, new Date().toISOString(), id]
      });

      res.json({ success: true, questionCount: count });
    } catch (error) {
      console.error("Error updating certification count:", error);
      res.status(500).json({ error: "Failed to update count" });
    }
  });

  // ============================================
  // USER SESSION ENDPOINTS (for resume feature)
  // ============================================

  // Get all active sessions for a user
  app.get("/api/user/sessions", async (_req, res) => {
    try {
      const result = await client.execute(
        "SELECT * FROM user_sessions WHERE status = 'active' ORDER BY last_accessed_at DESC"
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching user sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Get a specific session
  app.get("/api/user/sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const result = await client.execute({
        sql: "SELECT * FROM user_sessions WHERE id = ?",
        args: [sessionId]
      });
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  // Create or update a session
  app.post("/api/user/sessions", async (req, res) => {
    try {
      const {
        sessionKey,
        sessionType,
        title,
        subtitle,
        channelId,
        certificationId,
        progress,
        totalItems,
        completedItems,
        sessionData
      } = req.body;

      // Check if session already exists
      const existing = await client.execute({
        sql: "SELECT id FROM user_sessions WHERE session_key = ? AND status = 'active'",
        args: [sessionKey]
      });

      if (existing.rows.length > 0) {
        // Update existing session
        const sessionId = existing.rows[0].id;
        await client.execute({
          sql: `UPDATE user_sessions 
                SET title = ?, subtitle = ?, progress = ?, completed_items = ?, 
                    session_data = ?, last_accessed_at = ?
                WHERE id = ?`,
          args: [
            title,
            subtitle || null,
            progress,
            completedItems,
            JSON.stringify(sessionData),
            new Date().toISOString(),
            sessionId
          ]
        });
        res.json({ id: sessionId, updated: true });
      } else {
        // Create new session
        const sessionId = crypto.randomUUID();
        await client.execute({
          sql: `INSERT INTO user_sessions 
                (id, session_key, session_type, title, subtitle, channel_id, certification_id, 
                 progress, total_items, completed_items, session_data, started_at, last_accessed_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            sessionId,
            sessionKey,
            sessionType,
            title,
            subtitle || null,
            channelId || null,
            certificationId || null,
            progress,
            totalItems,
            completedItems,
            JSON.stringify(sessionData),
            new Date().toISOString(),
            new Date().toISOString(),
            'active'
          ]
        });
        res.json({ id: sessionId, created: true });
      }
    } catch (error) {
      console.error("Error saving session:", error);
      res.status(500).json({ error: "Failed to save session" });
    }
  });

  // Update session progress
  app.put("/api/user/sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { progress, completedItems, sessionData } = req.body;

      await client.execute({
        sql: `UPDATE user_sessions 
              SET progress = ?, completed_items = ?, session_data = ?, last_accessed_at = ?
              WHERE id = ?`,
        args: [
          progress,
          completedItems,
          JSON.stringify(sessionData),
          new Date().toISOString(),
          sessionId
        ]
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating session:", error);
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  // Delete/abandon a session
  app.delete("/api/user/sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      await client.execute({
        sql: "UPDATE user_sessions SET status = 'abandoned' WHERE id = ?",
        args: [sessionId]
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  // Complete a session
  app.post("/api/user/sessions/:sessionId/complete", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      await client.execute({
        sql: "UPDATE user_sessions SET status = 'completed', completed_at = ? WHERE id = ?",
        args: [new Date().toISOString(), sessionId]
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error completing session:", error);
      res.status(500).json({ error: "Failed to complete session" });
    }
  });

  return httpServer;
}
