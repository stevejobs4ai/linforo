'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import type { DbScenarioCompletion, DbComment } from '@/lib/supabase'

interface FeedEntry extends DbScenarioCompletion {
  users: { display_name: string; photo_url: string | null }
  comments: (DbComment & { users: { display_name: string; photo_url: string | null } })[]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  return url ? (
    <img
      src={url}
      alt={name}
      style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
    />
  ) : (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: '#1a3a5a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#0a84ff',
        fontWeight: 700,
        fontSize: 16,
      }}
    >
      {name[0]?.toUpperCase()}
    </div>
  )
}

function CompletionCard({ entry, currentUserId }: { entry: FeedEntry; currentUserId: string | null }) {
  const [comment, setComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [comments, setComments] = useState(entry.comments)

  const resultLabel =
    entry.result === 'gold'
      ? 'completed Roleplay — Gold! 🥇'
      : entry.result === 'silver'
      ? 'completed Roleplay — Silver! 🥈'
      : entry.result === 'bronze'
      ? 'completed Roleplay — Bronze! 🥉'
      : `mastered ${entry.scenario_title} ${entry.scenario_emoji}`

  async function postComment() {
    if (!comment.trim() || !currentUserId) return
    setPosting(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({ completion_id: entry.id, user_id: currentUserId, text: comment.trim() })
      .select('*, users(display_name, photo_url)')
      .single()
    setPosting(false)
    if (!error && data) {
      setComments((prev) => [
        ...prev,
        data as DbComment & { users: { display_name: string; photo_url: string | null } },
      ])
      setComment('')
    }
  }

  return (
    <div
      style={{
        background: '#111',
        border: '1px solid #222',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Avatar url={entry.users.photo_url} name={entry.users.display_name} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'white', fontSize: 15 }}>
            {entry.users.display_name}
          </div>
          <div style={{ fontSize: 13, color: '#888' }}>{timeAgo(entry.completed_at)}</div>
        </div>
      </div>

      <div
        style={{
          fontSize: 15,
          color: '#ccc',
          marginBottom: 14,
          paddingLeft: 4,
        }}
      >
        {resultLabel}
      </div>

      {/* Comments */}
      {comments.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {comments.map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 8,
                alignItems: 'flex-start',
              }}
            >
              <Avatar url={c.users?.photo_url ?? null} name={c.users?.display_name ?? '?'} />
              <div
                style={{
                  background: '#1a1a1a',
                  borderRadius: 10,
                  padding: '8px 12px',
                  flex: 1,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 2 }}>
                  {c.users?.display_name}
                </div>
                <div style={{ fontSize: 14, color: '#ddd' }}>{c.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      {currentUserId && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 280))}
            onKeyDown={(e) => { if (e.key === 'Enter') postComment() }}
            placeholder="Add a comment…"
            maxLength={280}
            style={{
              flex: 1,
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 10,
              padding: '8px 12px',
              color: 'white',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            onClick={postComment}
            disabled={posting || !comment.trim()}
            style={{
              background: '#0a84ff',
              border: 'none',
              borderRadius: 10,
              padding: '8px 14px',
              color: 'white',
              fontWeight: 600,
              cursor: posting ? 'not-allowed' : 'pointer',
              opacity: posting || !comment.trim() ? 0.5 : 1,
              fontSize: 14,
            }}
          >
            Post
          </button>
        </div>
      )}
    </div>
  )
}

export default function CommunityPage() {
  const router = useRouter()
  const { user } = useUser()
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const currentDbUserId = useRef<string | null>(null)

  useEffect(() => {
    // Resolve clerk user → supabase user id
    if (user) {
      supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user.id)
        .single()
        .then(({ data }) => {
          currentDbUserId.current = data?.id ?? null
        })
    }
  }, [user])

  useEffect(() => {
    async function loadFeed() {
      const { data } = await supabase
        .from('scenario_completions')
        .select('*, users(display_name, photo_url), comments(*, users(display_name, photo_url))')
        .order('completed_at', { ascending: false })
        .limit(40)

      setFeed((data as FeedEntry[]) ?? [])
      setLoading(false)
    }

    loadFeed()

    // Real-time subscription for new completions
    const channel = supabase
      .channel('community-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scenario_completions' },
        async (payload) => {
          const { data } = await supabase
            .from('scenario_completions')
            .select('*, users(display_name, photo_url), comments(*, users(display_name, photo_url))')
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setFeed((prev) => [data as FeedEntry, ...prev])
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [])

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', padding: '24px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <button
            onClick={() => router.back()}
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 20,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              cursor: 'pointer',
              color: 'white',
            }}
            aria-label="Go back"
          >
            ←
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', margin: 0 }}>
            👥 Community
          </h1>
        </div>

        <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
          Real-time completions from learners around the world
        </p>

        {loading && (
          <div style={{ color: '#555', textAlign: 'center', padding: 40 }}>Loading…</div>
        )}

        {!loading && feed.length === 0 && (
          <div>
            <div
              style={{
                background: '#1a1a0a',
                border: '1px solid #3a3a1a',
                borderRadius: 12,
                padding: '10px 16px',
                marginBottom: 16,
                fontSize: 13,
                color: '#aaa888',
                textAlign: 'center',
              }}
            >
              Preview — sign up to join the community
            </div>
            {[
              { name: 'Maria', initial: 'M', text: 'mastered Ordering Food 🍝', time: '2h ago' },
              { name: 'João', initial: 'J', text: 'completed his first roleplay — Gold! 🥇', time: '5h ago' },
              { name: 'Emma', initial: 'E', text: 'practiced Greetings for the 10th time', time: 'yesterday' },
            ].map((entry) => (
              <div
                key={entry.name}
                style={{
                  background: '#111',
                  border: '1px solid #222',
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                  opacity: 0.75,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: '#1a3a5a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0a84ff',
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    {entry.initial}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'white', fontSize: 15 }}>{entry.name}</div>
                    <div style={{ fontSize: 13, color: '#888' }}>{entry.time}</div>
                  </div>
                </div>
                <div style={{ fontSize: 15, color: '#ccc' }}>{entry.text}</div>
              </div>
            ))}
          </div>
        )}

        {feed.map((entry) => (
          <CompletionCard
            key={entry.id}
            entry={entry}
            currentUserId={currentDbUserId.current}
          />
        ))}
      </div>
    </main>
  )
}
