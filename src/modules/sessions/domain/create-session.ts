import { z } from "zod";

export const conversationTypes = ["voice", "text", "mixed", "unknown"] as const;
export const difficulties = ["beginner", "intermediate", "advanced", "unspecified"] as const;

const optionalHttpsUrl = z
  .union([z.literal(""), z.null(), z.url().max(2000)])
  .transform((value) => (value === "" ? null : value))
  .refine((value) => value === null || new URL(value).protocol === "https:", {
    message: "URLは https:// から入力してください",
  });

export const preparedExpressionSchema = z.object({
  expressionEn: z.string().trim().min(1).max(1000),
  meaningJa: z.string().trim().max(1000).default(""),
});

export const createSessionInputSchema = z
  .object({
    title: z.string().trim().min(1, "タイトルを入力してください").max(120),
    topic: z.string().trim().min(1, "テーマを入力してください").max(500),
    objective: z.string().trim().min(1, "目的を入力してください").max(2000),
    situation: z.string().trim().max(2000).default(""),
    userRole: z.string().trim().max(500).default(""),
    aiRole: z.string().trim().max(500).default(""),
    conversationType: z.enum(conversationTypes),
    difficulty: z.enum(difficulties),
    plannedDurationMinutes: z.number().int().min(1).max(240).nullable(),
    scheduledAt: z.date().nullable(),
    preparationNotes: z.string().trim().max(5000).default(""),
    providerName: z.string().trim().max(200).default(""),
    providerWebsiteUrl: optionalHttpsUrl,
    modelName: z.string().trim().max(200).default(""),
    preparedExpressions: z.array(preparedExpressionSchema).max(100),
  })
  .superRefine((input, context) => {
    const seen = new Set<string>();

    input.preparedExpressions.forEach((expression, index) => {
      const normalized = normalizeExpression(expression.expressionEn);
      if (seen.has(normalized)) {
        context.addIssue({
          code: "custom",
          message: "同じ表現が重複しています",
          path: ["preparedExpressions", index, "expressionEn"],
        });
      }
      seen.add(normalized);
    });
  });

export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;

export function normalizeExpression(value: string): string {
  return value.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function localDateTimeToUtc(localValue: string, timezoneOffsetMinutes: number): Date | null {
  if (!localValue) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localValue);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const localAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  const result = new Date(localAsUtc + timezoneOffsetMinutes * 60_000);

  return Number.isNaN(result.getTime()) ? null : result;
}
