import type { CreateSessionInput } from "@/modules/sessions/domain/create-session";

import {
  GENERIC_TEMPLATE_KEY,
  GENERIC_TEMPLATE_VERSION,
  type PromptInput,
  type RenderedPromptSet,
} from "../domain/prompt";
import { renderConversationStartPrompt } from "../templates/generic/v1/conversation-start";
import { renderReviewOutputPrompt } from "../templates/generic/v1/review-output";

export function renderSessionPrompts(input: CreateSessionInput): RenderedPromptSet {
  const inputSnapshot: PromptInput = {
    title: input.title,
    topic: input.topic,
    objective: input.objective,
    linkedExpressions: input.linkedExpressions,
  };

  return {
    templateKey: GENERIC_TEMPLATE_KEY,
    templateVersion: GENERIC_TEMPLATE_VERSION,
    inputSnapshot,
    start: renderConversationStartPrompt(inputSnapshot),
    review: renderReviewOutputPrompt(inputSnapshot),
  };
}
