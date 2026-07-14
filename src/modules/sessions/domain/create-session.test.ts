import { describe, expect, it } from "vitest";

import { createSessionInputSchema, normalizeExpression } from "./create-session";

const validInput = {
  title: "海外出張の自己紹介",
  topic: "自己紹介",
  objective: "",
  linkedExpressions: [],
};

describe("createSessionInputSchema", () => {
  it("accepts an empty optional objective", () => {
    const parsed = createSessionInputSchema.parse(validInput);

    expect(parsed.objective).toBe("");
  });

  it("rejects duplicate expressions after normalization", () => {
    const result = createSessionInputSchema.safeParse({
      ...validInput,
      linkedExpressions: [
        { expressionEn: "I coordinate with stakeholders.", meaningJa: "" },
        { expressionEn: " i   coordinate with stakeholders. ", meaningJa: "" },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe("normalizeExpression", () => {
  it("normalizes spacing and case for library reuse", () => {
    expect(normalizeExpression("  I   Act as a Bridge ")).toBe("i act as a bridge");
  });
});
