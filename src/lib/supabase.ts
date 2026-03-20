import { createClient } from '@supabase/supabase-js'

// Swap these in .env.local when Reece creates the actual Supabase project.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role key (only used in API routes)
export function createServiceClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// ─── Types matching supabase/schema.sql ──────────────────────────────────────

export interface DbUser {
  id: string
  clerk_id: string
  display_name: string
  photo_url: string | null
  languages_learning: string[]
  interests: string[]
  scenarios_mastered: number
  phrases_owned: number
  days_active: number
  plan: 'free' | 'premium'
  stripe_customer_id: string | null
  subscription_ends_at: string | null
  referral_code: string | null
  created_at: string
  is_public: boolean
}

export interface DbUserPreferences {
  id: string
  user_id: string
  onboarding_done: boolean
  learning_reason: string | null
  voice_gender: 'female' | 'male'
  interests: string[]
  interests_seen: boolean
  presence_opt_in: boolean
  updated_at: string
}

export interface DbBookmark {
  id: string
  user_id: string
  italian: string
  phonetic: string
  english: string
  scenario_id: string
  scenario_title: string
  saved_at: number
}

export interface DbConfidenceRep {
  id: string
  user_id: string
  phrase_italian: string
  attempts: number
  first_attempted: number
  last_attempted: number
  status: 'new' | 'practicing' | 'owned'
}

export interface DbConversation {
  id: string
  user_id: string
  scenario_id: string
  scenario_title: string
  scenario_emoji: string
  started_at: number
}

export interface DbMessage {
  id: string
  conversation_id: string
  role: 'user' | 'tutor'
  text: string
  timestamp: number
}

export interface DbScenarioCompletion {
  id: string
  user_id: string
  scenario_id: string
  scenario_title: string
  scenario_emoji: string
  result: string | null
  completed_at: string
  users?: Pick<DbUser, 'display_name' | 'photo_url'>
}

export interface DbComment {
  id: string
  completion_id: string
  user_id: string
  text: string
  created_at: string
  users?: Pick<DbUser, 'display_name' | 'photo_url'>
}

export interface DbDailyUsage {
  id: string
  user_id: string
  date: string
  conversation_count: number
}

export interface DbReferral {
  id: string
  referrer_id: string
  referred_id: string
  created_at: string
  rewarded: boolean
}
