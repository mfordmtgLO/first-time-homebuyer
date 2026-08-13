const GUIDED_CHAT_STEPS = new Set([
  "loan_purpose",
  "property_type",
  "property_value",
  "credit_range",
  "annual_income",
  "down_payment",
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
 * Positions the newest complete question near the bottom of the transcript,
 * immediately above the fixed response area. This keeps the entire prompt in
 * view instead of blindly scrolling the transcript bottom under guided controls.
 */
export function getQuestionSnapScrollTop(
  questionTop: number,
  questionHeight: number,
  viewportHeight: number,
  bottomGutter = 16
): number {
  return Math.max(0, questionTop + questionHeight - viewportHeight + bottomGutter);
}
