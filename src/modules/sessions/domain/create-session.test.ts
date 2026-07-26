import { describe, expect, it } from "vitest";

import {
  createSessionInputSchema,
  MAX_LINKED_EXPRESSIONS,
  normalizeExpression,
} from "./create-session";

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

  it("keeps session creation within the D1 Free query limit", () => {
    const result = createSessionInputSchema.safeParse({
      ...validInput,
      linkedExpressions: Array.from({ length: MAX_LINKED_EXPRESSIONS + 1 }, (_, index) => ({
        expressionEn: `Expression ${index}`,
        meaningJa: "",
      })),
    });

    expect(result.success).toBe(false);
  });
});

describe("normalizeExpression", () => {
  it("normalizes spacing and case for library reuse", () => {
    expect(normalizeExpression("  I   Act as a Bridge ")).toBe("i act as a bridge");
  });
});
