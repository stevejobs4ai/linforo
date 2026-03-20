'use client'

/**
 * db-sync.ts — syncs localStorage data to Supabase.
 * localStorage remains the offline cache/source of truth for reads.
 * Writes flow: localStorage first → then Supabase in background.
 *
 * Call syncAll() once after the user signs in.
 */

import { supabase } from './supabase'
import { getBookmarks } from './bookmarks'
import { getAllConfidence } from './confidence'
import { getHistory } from './history'
import { isOnboardingComplete, getLearningReason } from './onboarding'
import { getInterests, hasSeenInterests } from './interests'

// ─── helpers ─────────────────────────────────────────────────────────────────

async function getUserId(clerkId: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()
  return data?.id ?? null
}

// ─── ensure user profile exists ──────────────────────────────────────────────

export async function ensureUserProfile(
  clerkId: string,
  displayName: string,
  photoUrl?: string | null
): Promise<string | null> {
  // Upsert so re-runs are safe
  const { data, error } = await supabase
    .from('users')
    .upsert(
      { clerk_id: clerkId, display_name: displayName, photo_url: photoUrl ?? null },
      { onConflict: 'clerk_id', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (error) {
    console.error('[db-sync] ensureUserProfile error', error.message)
    return null
  }
  return data.id
}

// ─── preferences ─────────────────────────────────────────────────────────────

export async function syncPreferences(userId: string): Promise<void> {
  const onboardingDone = isOnboardingComplete()
  const learningReasonVal = getLearningReason()
  const interests = getInterests()
  const interestsSeen = hasSeenInterests()

  const voiceGender =
    typeof window !== 'undefined'
      ? (localStorage.getItem('linforo-voice-gender') as 'female' | 'male' | null) ?? 'female'
      : 'female'

  await supabase.from('user_preferences').upsert(
    {
      user_id: userId,
      onboarding_done: onboardingDone,
      learning_reason: learningReasonVal,
      voice_gender: voiceGender,
      interests,
      interests_seen: interestsSeen,
    },
    { onConflict: 'user_id' }
  )
}

// ─── bookmarks ────────────────────────────────────────────────────────────────

export async function syncBookmarks(userId: string): Promise<void> {
  const bookmarks = getBookmarks()
  if (bookmarks.length === 0) return

  const rows = bookmarks.map((b) => ({
    id: b.id,
    user_id: userId,
    italian: b.italian,
    phonetic: b.phonetic,
    english: b.english,
    scenario_id: b.scenarioId,
    scenario_title: b.scenarioTitle,
    saved_at: b.savedAt,
  }))

  await supabase.from('bookmarks').upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
}

// ─── confidence reps ──────────────────────────────────────────────────────────

export async function syncConfidence(userId: string): Promise<void> {
  const data = getAllConfidence()
  const entries = Object.values(data)
  if (entries.length === 0) return

  const rows = entries.map((c) => ({
    user_id: userId,
    phrase_italian: c.phraseItalian,
    attempts: c.attempts,
    first_attempted: c.firstAttempted,
    last_attempted: c.lastAttempted,
    status: c.status,
  }))

  await supabase
    .from('confidence_reps')
    .upsert(rows, { onConflict: 'user_id,phrase_italian' })
}

// ─── conversation history ─────────────────────────────────────────────────────

export async function syncHistory(userId: string): Promise<void> {
  const sessions = getHistory()
  if (sessions.length === 0) return

  for (const session of sessions) {
    const { error: convErr } = await supabase.from('conversations').upsert(
      {
        id: session.id,
        user_id: userId,
        scenario_id: session.scenarioId,
        scenario_title: session.scenarioTitle,
        scenario_emoji: session.scenarioEmoji,
        started_at: session.startedAt,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    if (convErr) continue

    const msgRows = session.messages.map((m) => ({
      conversation_id: session.id,
      role: m.role,
      text: m.text,
      timestamp: m.timestamp,
    }))
    if (msgRows.length > 0) {
      await supabase.from('messages').insert(msgRows)
    }
  }
}

// ─── full sync ────────────────────────────────────────────────────────────────

export async function syncAll(
  clerkId: string,
  displayName: string,
  photoUrl?: string | null
): Promise<void> {
  const userId = await ensureUserProfile(clerkId, displayName, photoUrl)
  if (!userId) return

  await Promise.all([
    syncPreferences(userId),
    syncBookmarks(userId),
    syncConfidence(userId),
    syncHistory(userId),
  ])
}

// ─── daily usage helpers ──────────────────────────────────────────────────────

const FREE_DAILY_LIMIT = 5
const PREMIUM_DAILY_LIMIT = 50
const USAGE_LS_KEY = 'linforo-daily-usage'

interface LocalUsage {
  date: string
  count: number
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getLocalDailyUsage(): LocalUsage {
  if (typeof window === 'undefined') return { date: todayStr(), count: 0 }
  try {
    const raw = localStorage.getItem(USAGE_LS_KEY)
    if (!raw) return { date: todayStr(), count: 0 }
    const parsed = JSON.parse(raw) as LocalUsage
    if (parsed.date !== todayStr()) return { date: todayStr(), count: 0 }
    return parsed
  } catch {
    return { date: todayStr(), count: 0 }
  }
}

export function incrementLocalDailyUsage(): number {
  const usage = getLocalDailyUsage()
  const updated: LocalUsage = { date: todayStr(), count: usage.count + 1 }
  if (typeof window !== 'undefined') {
    localStorage.setItem(USAGE_LS_KEY, JSON.stringify(updated))
  }
  return updated.count
}

export function getDailyLimit(plan: 'free' | 'premium'): number {
  return plan === 'premium' ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT
}

export function getRemainingConversations(plan: 'free' | 'premium'): number {
  const usage = getLocalDailyUsage()
  return Math.max(0, getDailyLimit(plan) - usage.count)
}

export async function incrementSupabaseUsage(userId: string): Promise<void> {
  const today = todayStr()
  await Promise.resolve(
    supabase.rpc('increment_daily_usage', { p_user_id: userId, p_date: today })
  ).catch(() => {
    // Non-fatal if RPC doesn't exist yet; localStorage is the authoritative source
  })
}

// ─── referral code generation ─────────────────────────────────────────────────

export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function ensureReferralCode(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('referral_code')
    .eq('id', userId)
    .single()

  if (data?.referral_code) return data.referral_code

  const code = generateReferralCode()
  const { error } = await supabase
    .from('users')
    .update({ referral_code: code })
    .eq('id', userId)

  return error ? null : code
}

export async function applyReferral(referralCode: string, newUserId: string): Promise<boolean> {
  const { data: referrer } = await supabase
    .from('users')
    .select('id')
    .eq('referral_code', referralCode)
    .single()

  if (!referrer) return false

  const { error } = await supabase.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: newUserId,
  })

  if (error) return false

  // Grant 7 days premium to both users
  const premiumEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  await supabase
    .from('users')
    .update({ plan: 'premium', subscription_ends_at: premiumEnds })
    .in('id', [referrer.id, newUserId])

  await supabase
    .from('referrals')
    .update({ rewarded: true })
    .eq('referred_id', newUserId)

  return true
}

export { getUserId }
