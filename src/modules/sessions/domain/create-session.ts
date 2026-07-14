import { z } from "zod";

export const MAX_LINKED_EXPRESSIONS = 100;

export const linkedExpressionSchema = z.object({
  expressionEn: z.string().trim().min(1).max(1000),
  meaningJa: z.string().trim().max(1000).default(""),
});

export const createSessionInputSchema = z
  .object({
    title: z.string().trim().min(1, "タイトルを入力してください").max(120),
    topic: z.string().trim().min(1, "テーマを入力してください").max(500),
    objective: z.string().trim().max(2000).default(""),
    linkedExpressions: z.array(linkedExpressionSchema).max(MAX_LINKED_EXPRESSIONS),
  })
  .superRefine((input, context) => {
    const seen = new Set<string>();

    input.linkedExpressions.forEach((expression, index) => {
      const normalized = normalizeExpression(expression.expressionEn);
      if (seen.has(normalized)) {
        context.addIssue({
          code: "custom",
          message: "同じ表現が重複しています",
          path: ["linkedExpressions", index, "expressionEn"],
        });
      }
      seen.add(normalized);
    });
  });

export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;

export function normalizeExpression(value: string): string {
  return value.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase("en-US");
}
