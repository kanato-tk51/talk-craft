import type { PromptInput } from "../../../domain/prompt";

const outputShape = {
  schema_version: "1.0",
  source: {
    ai_provider: "",
    model_name: "",
    conversation_type: "voice | text | mixed | unknown",
    record_completeness: "complete | partial | summary_only | manual | unknown",
    contains_ai_inference: null,
  },
  session_summary: {
    topic: "",
    situation: "",
    user_role: "",
    ai_role: "",
    summary_ja: "",
    summary_en: "",
  },
  conversation: [
    {
      speaker: "user | ai | unknown",
      text_en: "",
      text_ja: "",
      notes: "",
      accuracy: "exact | paraphrased | inferred | unknown",
    },
  ],
  prepared_expressions: [
    {
      expression: "",
      used: null,
      usage_evaluation: "",
      better_example: "",
    },
  ],
  good_points: [{ description: "", example: "" }],
  corrections: [
    {
      original: "",
      corrected: "",
      more_natural: "",
      reason_ja: "",
      category: "grammar | vocabulary | naturalness | pronunciation | communication | unknown",
    },
  ],
  missed_opportunities: [
    {
      situation: "",
      what_i_wanted_to_say_ja: "",
      recommended_expression_en: "",
      example: "",
    },
  ],
  listening_review: [
    {
      ai_expression: "",
      meaning_ja: "",
      why_it_may_be_difficult: "",
      related_expressions: [],
    },
  ],
  expressions_for_next_session: [
    {
      expression_en: "",
      meaning_ja: "",
      example: "",
      priority: "high | medium | low",
    },
  ],
  next_session: {
    recommended_topic: "",
    goals: [],
    points_to_focus_on: [],
  },
};

export function renderReviewOutputPrompt(input: PromptInput): string {
  const linkedExpressions = input.linkedExpressions.map((expression) => expression.expressionEn);

  return `ここまでの英会話セッションを終了します。

今回の会話内容を、英語学習用の記録として次のJSON構造で出力してください。

重要なルール:

- 実際に参照できる会話内容だけを記録してください。
- 逐語的に参照できない発言を推測して会話ログに追加しないでください。
- 正確な発言は accuracy を "exact"、要旨だけなら "paraphrased"、推定を含むなら "inferred"、判断不能なら "unknown" にしてください。
- 分からない文字列は空文字、配列は空配列、使用状況は null、列挙は unknown を使用してください。
- prepared_expressions には、このセッションに関連付けられた次の表現をそれぞれ含めてください: ${JSON.stringify(linkedExpressions)}
- JSONの前後に説明文やMarkdownのコードブロックを付けないでください。
- schema_version は必ず "1.0" にしてください。

${JSON.stringify(outputShape, null, 2)}`;
}
