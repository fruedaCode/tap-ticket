import { describe, expect, it } from 'vitest'
import { FEEDBACK_MAX_COMMENT, parseFeedbackBody } from '@/lib/feedback'

describe('parseFeedbackBody', () => {
  it('accepts a rating with a comment', () => {
    expect(parseFeedbackBody({ rating: 4, comment: 'great app' })).toEqual({ rating: 4, comment: 'great app' })
  })

  it('accepts a rating without a comment', () => {
    expect(parseFeedbackBody({ rating: 5 })).toEqual({ rating: 5, comment: '' })
    expect(parseFeedbackBody({ rating: 1, comment: null })).toEqual({ rating: 1, comment: '' })
  })

  it('trims the comment', () => {
    expect(parseFeedbackBody({ rating: 3, comment: '  ok  ' })).toEqual({ rating: 3, comment: 'ok' })
  })

  it('rejects non-object bodies', () => {
    expect(parseFeedbackBody(null)).toBeNull()
    expect(parseFeedbackBody('rating: 5')).toBeNull()
    expect(parseFeedbackBody(5)).toBeNull()
  })

  it('rejects missing or non-integer ratings', () => {
    expect(parseFeedbackBody({})).toBeNull()
    expect(parseFeedbackBody({ rating: '5' })).toBeNull()
    expect(parseFeedbackBody({ rating: 4.5 })).toBeNull()
  })

  it('rejects out-of-range ratings', () => {
    expect(parseFeedbackBody({ rating: 0 })).toBeNull()
    expect(parseFeedbackBody({ rating: 6 })).toBeNull()
  })

  it('rejects non-string comments', () => {
    expect(parseFeedbackBody({ rating: 5, comment: 42 })).toBeNull()
  })

  it('rejects comments over the max length', () => {
    expect(parseFeedbackBody({ rating: 5, comment: 'x'.repeat(FEEDBACK_MAX_COMMENT) })).not.toBeNull()
    expect(parseFeedbackBody({ rating: 5, comment: 'x'.repeat(FEEDBACK_MAX_COMMENT + 1) })).toBeNull()
  })
})
