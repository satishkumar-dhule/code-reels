import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const questions = sqliteTable("questions", {
  id: text("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  explanation: text("explanation").notNull(),
  diagram: text("diagram"),
  difficulty: text("difficulty").notNull(), // beginner, intermediate, advanced
  tags: text("tags"), // JSON array stored as text
  channel: text("channel").notNull(),
  subChannel: text("sub_channel").notNull(),
  sourceUrl: text("source_url"),
  videos: text("videos"), // JSON object stored as text
  companies: text("companies"), // JSON array stored as text
  eli5: text("eli5"),
  tldr: text("tldr"),
  relevanceScore: integer("relevance_score"), // 0-100 interview relevance score
  relevanceDetails: text("relevance_details"), // JSON with detailed scoring breakdown
  voiceKeywords: text("voice_keywords"), // JSON array of mandatory keywords for voice interview
  voiceSuitable: integer("voice_suitable"), // 1 = suitable for voice interview, 0 = not suitable
  status: text("status").default("active"), // active, flagged, deleted
  lastUpdated: text("last_updated"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const channelMappings = sqliteTable("channel_mappings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  channelId: text("channel_id").notNull(),
  subChannel: text("sub_channel").notNull(),
  questionId: text("question_id").notNull().references(() => questions.id),
});

// Work queue for bot coordination
export const workQueue = sqliteTable("work_queue", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemType: text("item_type").notNull(), // 'question', 'challenge', 'test', 'blog'
  itemId: text("item_id").notNull(),
  action: text("action").notNull(), // 'improve', 'delete', 'verify', 'enrich'
  priority: integer("priority").default(5), // 1=highest, 10=lowest
  status: text("status").default("pending"), // 'pending', 'processing', 'completed', 'failed'
  reason: text("reason"), // why this work was created
  createdBy: text("created_by"), // which bot created this work item
  assignedTo: text("assigned_to"), // which bot should process
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  processedAt: text("processed_at"),
  result: text("result"), // JSON result or error message
});

// Audit ledger for all bot actions
export const botLedger = sqliteTable("bot_ledger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  botName: text("bot_name").notNull(),
  action: text("action").notNull(), // 'create', 'update', 'delete', 'verify', 'flag'
  itemType: text("item_type").notNull(),
  itemId: text("item_id").notNull(),
  beforeState: text("before_state"), // JSON snapshot before action
  afterState: text("after_state"), // JSON snapshot after action
  reason: text("reason"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

// Bot run history
export const botRuns = sqliteTable("bot_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  botName: text("bot_name").notNull(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  status: text("status").default("running"), // 'running', 'completed', 'failed'
  itemsProcessed: integer("items_processed").default(0),
  itemsCreated: integer("items_created").default(0),
  itemsUpdated: integer("items_updated").default(0),
  itemsDeleted: integer("items_deleted").default(0),
  summary: text("summary"), // JSON summary
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertQuestionSchema = createInsertSchema(questions);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;
