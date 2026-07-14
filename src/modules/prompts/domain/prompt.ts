import type { CreateSessionInput } from "@/modules/sessions/domain/create-session";

export const GENERIC_TEMPLATE_KEY = "generic-manual";
export const GENERIC_TEMPLATE_VERSION = "1.0.0";
export const REVIEW_SCHEMA_VERSION = "1.0";

export type PromptInput = {
  title: string;
  topic: string;
  objective: string;
  situation: string;
  userRole: string;
  aiRole: string;
  conversationType: CreateSessionInput["conversationType"];
  difficulty: CreateSessionInput["difficulty"];
  plannedDurationMinutes: number | null;
  preparationNotes: string;
  providerName: string;
  modelName: string;
  preparedExpressions: Array<{
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
