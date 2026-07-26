import { z } from "zod";

export const expressionPriorities = ["high", "medium", "low"] as const;
export const expressionLearningStatuses = ["new", "practicing", "active", "mastered"] as const;
export const expressionIdSchema = z.uuid();

export const expressionInputSchema = z.object({
  expressionEn: z.string().trim().min(1, "英語表現を入力してください").max(1000),
  meaningJa: z.string().trim().max(1000).default(""),
  alternativeExpressions: z.array(z.string().trim().min(1).max(1000)).max(30).default([]),
  examples: z.array(z.string().trim().min(1).max(2000)).max(30).default([]),
  relatedWords: z.array(z.string().trim().min(1).max(500)).max(50).default([]),
  usageNotes: z.string().trim().max(5000).default(""),
  pronunciationNotes: z.string().trim().max(2000).default(""),
  learningStatus: z.enum(expressionLearningStatuses).default("new"),
  priority: z.enum(expressionPriorities).default("medium"),
});

export type ExpressionInput = z.infer<typeof expressionInputSchema>;

export function normalizeExpression(value: string): string {
  return value.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase("en-US");
}
