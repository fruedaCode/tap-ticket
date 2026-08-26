// Shared feedback constants + payload validation. Keep this module free of
// server-only imports so both the API route and tests can use it.

export const FEEDBACK_REWARD_SCANS = 2
export const FEEDBACK_MAX_REWARDS = 3
export const FEEDBACK_MAX_COMMENT = 2000

export type FeedbackPayload = {
  rating: number
  comment: string
}

// Validate a JSON body for POST /api/feedback. Rating is required (integer
// 1-5); the comment is optional, trimmed, capped at FEEDBACK_MAX_COMMENT.
export function parseFeedbackBody(body: unknown): FeedbackPayload | null {
  if (typeof body !== 'object' || body === null) return null
  const { rating, comment } = body as { rating?: unknown; comment?: unknown }
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return null
  }
  if (comment === undefined || comment === null) return { rating, comment: '' }
  if (typeof comment !== 'string') return null
  const trimmed = comment.trim()
  if (trimmed.length > FEEDBACK_MAX_COMMENT) return null
  return { rating, comment: trimmed }
}
