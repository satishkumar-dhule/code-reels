import type { Express } from "express";
import { type Server } from "http";
import { client } from "./db";

// Helper to parse JSON fields from DB
function parseQuestion(row: any) {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
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
        "SELECT channel, COUNT(*) as count FROM questions GROUP BY channel"
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
        "SELECT channel, difficulty, COUNT(*) as count FROM questions GROUP BY channel, difficulty"
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

  return httpServer;
}
