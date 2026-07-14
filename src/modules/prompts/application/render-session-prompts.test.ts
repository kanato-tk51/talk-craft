import { describe, expect, it } from "vitest";

import type { CreateSessionInput } from "@/modules/sessions/domain/create-session";

import { renderSessionPrompts } from "./render-session-prompts";

const input: CreateSessionInput = {
  title: "海外出張の自己紹介",
  topic: "海外出張先での自己紹介",
  objective: "仕事内容を自然に説明する",
  situation: "取引先との初対面",
  userRole: "プロジェクトリード",
  aiRole: "海外の取引先担当者",
  conversationType: "voice",
  difficulty: "intermediate",
  plannedDurationMinutes: 15,
  scheduledAt: null,
  preparationNotes: "短い文章で止まらない",
  providerName: "任意の外部AI",
  providerWebsiteUrl: null,
  modelName: "",
  preparedExpressions: [
    {
      expressionEn: "I coordinate with multiple stakeholders.",
      meaningJa: "複数の関係者と調整します",
    },
  ],
};

describe("renderSessionPrompts", () => {
  it("renders a product-neutral start prompt from structured context", () => {
    const result = renderSessionPrompts(input);

    expect(result.start).toContain("<learning_context>");
    expect(result.start).toContain("I coordinate with multiple stakeholders.");
    expect(result.start).not.toContain("ChatGPT");
    expect(result.templateKey).toBe("generic-manual");
    expect(result.templateVersion).toBe("1.0.0");
  });

  it("requests versioned JSON without inventing a transcript", () => {
    const result = renderSessionPrompts(input);

    expect(result.review).toContain('"schema_version": "1.0"');
    expect(result.review).toContain("推測して会話ログに追加しない");
    expect(result.review).toContain('"accuracy"');
    expect(result.review).not.toContain("```json");
  });
});
