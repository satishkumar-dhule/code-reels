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
  lastUpdated: text("last_updated"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const channelMappings = sqliteTable("channel_mappings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  channelId: text("channel_id").notNull(),
  subChannel: text("sub_channel").notNull(),
  questionId: text("question_id").notNull().references(() => questions.id),
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
