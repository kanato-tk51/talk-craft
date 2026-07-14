import { describe, expect, it } from "vitest";

import {
  createSessionInputSchema,
  localDateTimeToUtc,
  normalizeExpression,
} from "./create-session";

const validInput = {
  title: "海外出張の自己紹介",
  topic: "自己紹介",
  objective: "仕事内容を自然に説明する",
  situation: "取引先との初対面",
  userRole: "エンジニア",
  aiRole: "取引先担当者",
  conversationType: "voice" as const,
  difficulty: "intermediate" as const,
  plannedDurationMinutes: 15,
  scheduledAt: null,
  preparationNotes: "短文で終わらない",
  providerName: "",
  providerWebsiteUrl: "",
  modelName: "",
  preparedExpressions: [],
};

describe("createSessionInputSchema", () => {
  it("accepts provider-independent input", () => {
    const parsed = createSessionInputSchema.parse(validInput);

    expect(parsed.providerWebsiteUrl).toBeNull();
  });

  it("rejects duplicate expressions after normalization", () => {
    const result = createSessionInputSchema.safeParse({
      ...validInput,
      preparedExpressions: [
        { expressionEn: "I coordinate with stakeholders.", meaningJa: "" },
        { expressionEn: " i   coordinate with stakeholders. ", meaningJa: "" },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-https provider links", () => {
    const result = createSessionInputSchema.safeParse({
      ...validInput,
      providerWebsiteUrl: "javascript:alert(1)",
    });

    expect(result.success).toBe(false);
  });
});

describe("localDateTimeToUtc", () => {
  it("converts a JST browser value to UTC", () => {
    expect(localDateTimeToUtc("2026-07-14T20:30", -540)?.toISOString()).toBe(
      "2026-07-14T11:30:00.000Z",
    );
  });

  it("does not guess invalid input", () => {
    expect(localDateTimeToUtc("2026/07/14", -540)).toBeNull();
  });
});

describe("normalizeExpression", () => {
  it("normalizes spacing and case for library reuse", () => {
    expect(normalizeExpression("  I   Act as a Bridge ")).toBe("i act as a bridge");
  });
});
