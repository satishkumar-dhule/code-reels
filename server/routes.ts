import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fs from "fs";
import path from "path";

// Load questions from JSON files
const questionsPath = path.join(process.cwd(), "client/src/lib/questions");
const questionsByChannel: Record<string, any[]> = {};

// Load all channel JSON files
const channelFiles = ["algorithms", "database", "devops", "frontend", "sre", "system-design"];
for (const channel of channelFiles) {
  try {
    const filePath = path.join(questionsPath, `${channel}.json`);
    const data = fs.readFileSync(filePath, "utf-8");
    questionsByChannel[channel] = JSON.parse(data);
  } catch (error) {
    console.error(`Failed to load ${channel}.json:`, error);
    questionsByChannel[channel] = [];
  }
}

const allQuestions = Object.values(questionsByChannel).flat();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Get all channels metadata
  app.get("/api/channels", (_req, res) => {
    const channels = Object.keys(questionsByChannel).map(channelId => ({
      id: channelId,
      questionCount: questionsByChannel[channelId].length
    }));
    res.json(channels);
  });

  // Get filtered questions list (IDs only) for a channel
  app.get("/api/questions/:channelId", (req, res) => {
    const { channelId } = req.params;
    const { subChannel, difficulty } = req.query;

    let questions = questionsByChannel[channelId] || [];

    // Filter by subchannel
    if (subChannel && subChannel !== "all") {
      questions = questions.filter((q: any) => q.subChannel === subChannel);
    }

    // Filter by difficulty
    if (difficulty && difficulty !== "all") {
      questions = questions.filter((q: any) => q.difficulty === difficulty);
    }

    // Return only IDs and basic metadata
    const questionList = questions.map((q: any) => ({
      id: q.id,
      difficulty: q.difficulty,
      subChannel: q.subChannel
    }));

    res.json(questionList);
  });

  // Get a single question by ID
  app.get("/api/question/:questionId", (req, res) => {
    const { questionId } = req.params;

    // Search through all channels
    for (const questions of Object.values(questionsByChannel)) {
      const question = questions.find((q: any) => q.id === questionId);
      if (question) {
        return res.json(question);
      }
    }

    res.status(404).json({ error: "Question not found" });
  });

  // Get channel stats
  app.get("/api/stats", (_req, res) => {
    const stats = Object.entries(questionsByChannel).map(([channelId, questions]) => {
      const beginner = questions.filter((q: any) => q.difficulty === "beginner").length;
      const intermediate = questions.filter((q: any) => q.difficulty === "intermediate").length;
      const advanced = questions.filter((q: any) => q.difficulty === "advanced").length;

      return {
        id: channelId,
        total: questions.length,
        beginner,
        intermediate,
        advanced
      };
    });

    res.json(stats);
  });

  // Get all subchannels for a channel
  app.get("/api/subchannels/:channelId", (req, res) => {
    const { channelId } = req.params;
    const questions = questionsByChannel[channelId] || [];

    const subChannelSet = new Set<string>();
    questions.forEach((q: any) => {
      if (q.subChannel) {
        subChannelSet.add(q.subChannel);
      }
    });
    const subChannels = Array.from(subChannelSet).sort();

    res.json(subChannels);
  });

  return httpServer;
}
