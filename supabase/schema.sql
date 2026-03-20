-- Linforo Supabase Schema
-- Run this in your Supabase SQL editor after creating the project

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────
-- Users / profiles
-- ────────────────────────────────────────────────
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  clerk_id text unique not null,
  display_name text not null,
  photo_url text,
  languages_learning text[] default array['italian'],
  interests text[] default array[]::text[],
  scenarios_mastered int default 0,
  phrases_owned int default 0,
  days_active int default 0,
  plan text not null default 'free',            -- 'free' | 'premium'
  stripe_customer_id text,
  subscription_ends_at timestamptz,
  referral_code text unique,
  created_at timestamptz default now(),
  is_public boolean default false
);

-- ────────────────────────────────────────────────
-- User preferences (replaces several localStorage keys)
-- ────────────────────────────────────────────────
create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  onboarding_done boolean default false,
  learning_reason text,               -- 'travel' | 'moving' | 'curiosity' | 'school'
  voice_gender text default 'female', -- 'female' | 'male'
  interests text[] default array[]::text[],
  interests_seen boolean default false,
  presence_opt_in boolean default false,
  updated_at timestamptz default now(),
  unique(user_id)
);

-- ────────────────────────────────────────────────
-- Bookmarks
-- ────────────────────────────────────────────────
create table if not exists bookmarks (
  id text primary key,
  user_id uuid references users(id) on delete cascade,
  italian text not null,
  phonetic text not null,
  english text not null,
  scenario_id text not null,
  scenario_title text not null,
  saved_at bigint not null,
  created_at timestamptz default now()
);

create index if not exists bookmarks_user_id on bookmarks(user_id);

-- ────────────────────────────────────────────────
-- Confidence / phrase mastery reps
-- ────────────────────────────────────────────────
create table if not exists confidence_reps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  phrase_italian text not null,
  attempts int default 1,
  first_attempted bigint not null,
  last_attempted bigint not null,
  status text not null default 'new',  -- 'new' | 'practicing' | 'owned'
  updated_at timestamptz default now(),
  unique(user_id, phrase_italian)
);

create index if not exists confidence_reps_user_id on confidence_reps(user_id);

-- ────────────────────────────────────────────────
-- Conversations + messages
-- ────────────────────────────────────────────────
create table if not exists conversations (
  id text primary key,
  user_id uuid references users(id) on delete cascade,
  scenario_id text not null,
  scenario_title text not null,
  scenario_emoji text not null,
  started_at bigint not null,
  created_at timestamptz default now()
);

create index if not exists conversations_user_id on conversations(user_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text references conversations(id) on delete cascade,
  role text not null,   -- 'user' | 'tutor'
  text text not null,
  timestamp bigint not null,
  created_at timestamptz default now()
);

create index if not exists messages_conversation_id on messages(conversation_id);

-- ────────────────────────────────────────────────
-- Scenario completions (for community feed)
-- ────────────────────────────────────────────────
create table if not exists scenario_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  scenario_id text not null,
  scenario_title text not null,
  scenario_emoji text not null,
  result text,          -- null | 'gold' | 'silver' | 'bronze'
  completed_at timestamptz default now()
);

create index if not exists scenario_completions_completed_at on scenario_completions(completed_at desc);

-- ────────────────────────────────────────────────
-- Community comments
-- ────────────────────────────────────────────────
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  completion_id uuid references scenario_completions(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  text text not null check (char_length(text) <= 280),
  created_at timestamptz default now()
);

create index if not exists comments_completion_id on comments(completion_id);

-- ────────────────────────────────────────────────
-- Daily usage (voice conversations per day)
-- ────────────────────────────────────────────────
create table if not exists daily_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  date date not null,
  conversation_count int default 0,
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- ────────────────────────────────────────────────
-- Referrals
-- ────────────────────────────────────────────────
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references users(id) on delete cascade,
  referred_id uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  rewarded boolean default false,
  unique(referred_id)
);

create index if not exists referrals_referrer_id on referrals(referrer_id);

-- ────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────
alter table users enable row level security;
alter table user_preferences enable row level security;
alter table bookmarks enable row level security;
alter table confidence_reps enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table scenario_completions enable row level security;
alter table comments enable row level security;
alter table daily_usage enable row level security;
alter table referrals enable row level security;

-- Users can read/write their own data
create policy "users_own" on users for all using (clerk_id = current_setting('app.clerk_id', true));
create policy "prefs_own" on user_preferences for all using (
  user_id = (select id from users where clerk_id = current_setting('app.clerk_id', true))
);
create policy "bookmarks_own" on bookmarks for all using (
  user_id = (select id from users where clerk_id = current_setting('app.clerk_id', true))
);
create policy "confidence_own" on confidence_reps for all using (
  user_id = (select id from users where clerk_id = current_setting('app.clerk_id', true))
);
create policy "conversations_own" on conversations for all using (
  user_id = (select id from users where clerk_id = current_setting('app.clerk_id', true))
);
create policy "messages_own" on messages for all using (
  conversation_id in (
    select id from conversations
    where user_id = (select id from users where clerk_id = current_setting('app.clerk_id', true))
  )
);
create policy "usage_own" on daily_usage for all using (
  user_id = (select id from users where clerk_id = current_setting('app.clerk_id', true))
);
create policy "referrals_own" on referrals for all using (
  referrer_id = (select id from users where clerk_id = current_setting('app.clerk_id', true))
  or referred_id = (select id from users where clerk_id = current_setting('app.clerk_id', true))
);

-- Public reads for community feed (only public users)
create policy "completions_public_read" on scenario_completions for select using (
  user_id in (select id from users where is_public = true)
);
create policy "completions_own_write" on scenario_completions for insert using (
  user_id = (select id from users where clerk_id = current_setting('app.clerk_id', true))
);
create policy "comments_public_read" on comments for select using (true);
create policy "comments_own_write" on comments for insert using (
  user_id = (select id from users where clerk_id = current_setting('app.clerk_id', true))
);
