export const GENERIC_TEMPLATE_KEY = "generic-manual";
export const GENERIC_TEMPLATE_VERSION = "1.2.0";
export const REVIEW_SCHEMA_VERSION = "1.0";

export type PromptInput = {
  title: string;
  topic: string;
  objective: string;
  linkedExpressions: Array<{
    expressionEn: string;
    meaningJa: string;
  }>;
};

export type RenderedPromptSet = {
  templateKey: string;
  templateVersion: string;
  inputSnapshot: PromptInput;
  start: string;
  review: string;
};
