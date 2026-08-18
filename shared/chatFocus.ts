const GUIDED_CHAT_STEPS = new Set([
  "loan_purpose",
  "property_type",
  "property_value",
  "credit_range",
  "annual_income",
  "down_payment",
  "sms_consent",
  "home_search_interest",
]);

/**
 * Determines the most helpful focus target after a new intake question arrives.
 * Guided steps have buttons or a slider; all other steps use the chat text field.
 */
export function getNextQuestionFocusTarget(step: string | null): "guided" | "text" | "none" {
  if (!step) return "none";
  return GUIDED_CHAT_STEPS.has(step) ? "guided" : "text";
}

/**
 * Positions each new question below a small transcript-top gutter. This makes
 * the beginning of every follow-up prompt immediately readable; a conditional
 * down-arrow cue handles questions that extend beyond the mobile viewport.
 */
export function getQuestionSnapScrollTop(
  questionTop: number,
  topGutter = 56,
  isOpeningQuestion = false,
): number {
  if (isOpeningQuestion) return 0;
  return Math.max(0, questionTop - topGutter);
}

/** True only when transcript content remains below the visible viewport. */
export function hasTranscriptContentBelow(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  tolerance = 8,
  trailingSpacer = 0,
): boolean {
  return scrollTop + clientHeight < scrollHeight - trailingSpacer - tolerance;
}
