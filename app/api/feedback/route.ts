import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import {
  FEEDBACK_MAX_REWARDS,
  FEEDBACK_REWARD_SCANS,
  parseFeedbackBody,
} from '@/lib/feedback'

// Feedback submission with a scan-credit reward: the first
// FEEDBACK_MAX_REWARDS submissions grant +FEEDBACK_REWARD_SCANS credits each.
// The submit_feedback rpc does the insert + cap check + grant in one
// transaction, so concurrent submissions can't race past the cap.
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const parsed = parseFeedbackBody(await request.json().catch(() => null))
  if (!parsed) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  const { data, error } = await supabase.rpc('submit_feedback', {
    p_rating: parsed.rating,
    p_comment: parsed.comment,
  })
  if (error) {
    console.error('feedback: submit_feedback failed', error)
    return NextResponse.json({ error: 'submit_failed' }, { status: 500 })
  }

  const result = data as { rewarded?: boolean; extra_scans?: number; rewards_used?: number } | null
  return NextResponse.json({
    ok: true,
    rewarded: result?.rewarded ?? false,
    extraScans: result?.extra_scans ?? 0,
    rewardsUsed: result?.rewards_used ?? 0,
  })
}

// Reward status for the feedback dialog: how many of the 3 rewards the user
// has already claimed.
export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { count, error } = await supabase
    .from('feedback')
    .select('id', { count: 'exact', head: true })
    .eq('rewarded', true)
  if (error) {
    console.error('feedback: status read failed', error)
    return NextResponse.json({ error: 'read_failed' }, { status: 500 })
  }

  return NextResponse.json({
    rewardsUsed: count ?? 0,
    maxRewards: FEEDBACK_MAX_REWARDS,
    rewardScans: FEEDBACK_REWARD_SCANS,
  })
}
