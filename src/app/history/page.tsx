'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getHistory, getSession, ConversationSession } from '@/lib/history'

function formatDate(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function firstTutorPhrase(session: ConversationSession): string {
  const msg = session.messages.find((m) => m.role === 'tutor')
  if (!msg) return 'No messages'
  return msg.text.length > 80 ? msg.text.slice(0, 80) + '…' : msg.text
}

function TranscriptView({
  session,
  onBack,
}: {
  session: ConversationSession
  onBack: () => void
}) {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const voiceId =
    typeof window !== 'undefined'
      ? localStorage.getItem('linforo-voice-gender') === 'male'
        ? 'ErXwobaYiN019PkySvjV'
        : 'Xb7hH8MSUJpSbSDYk0k2'
      : 'Xb7hH8MSUJpSbSDYk0k2'

  const playMessage = async (text: string, id: string) => {
    if (playingId) return
    setPlayingId(id)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId }),
      })
      const buf = await res.arrayBuffer()
      const blob = new Blob([buf], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => {
        setPlayingId(null)
        URL.revokeObjectURL(url)
      }
      audio.onerror = () => setPlayingId(null)
      audio.play()
    } catch {
      setPlayingId(null)
    }
  }

  const userCount = session.messages.filter((m) => m.role === 'user').length

  return (
    <div
      style={{
        background: 'var(--bg)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 600,
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 24,
            cursor: 'pointer',
            minWidth: 48,
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Back to history"
        >
          ←
        </button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
            {session.scenarioEmoji} {session.scenarioTitle}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {formatDate(session.startedAt)} · {userCount} exchange
            {userCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Read-only hint */}
      <div
        style={{
          background: 'var(--card)',
          padding: '10px 20px',
          fontSize: 13,
          color: 'var(--text-muted)',
          textAlign: 'center',
          borderBottom: '1px solid var(--border)',
        }}
      >
        Read-only · Tap any tutor message to replay it
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {session.messages.map((msg, i) => {
          const msgId = `${session.id}-${i}`
          const isTutor = msg.role === 'tutor'
          const isPlaying = playingId === msgId
          return (
            <div
              key={msgId}
              style={{
                display: 'flex',
                justifyContent: isTutor ? 'flex-start' : 'flex-end',
              }}
            >
              <button
                onClick={isTutor ? () => playMessage(msg.text, msgId) : undefined}
                disabled={!isTutor}
                style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: isTutor
                    ? '18px 18px 18px 4px'
                    : '18px 18px 4px 18px',
                  background: isTutor
                    ? isPlaying
                      ? 'rgba(124,154,94,0.15)'
                      : 'var(--card)'
                    : 'var(--accent)',
                  border: isTutor
                    ? isPlaying
                      ? '1px solid rgba(124,154,94,0.4)'
                      : '1px solid var(--border)'
                    : 'none',
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: isTutor ? 'var(--text)' : 'white',
                  cursor: isTutor ? 'pointer' : 'default',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  fontWeight: isTutor ? 500 : 400,
                }}
                aria-label={isTutor ? 'Replay tutor message' : undefined}
              >
                {isPlaying ? '🔊 ' : ''}
                {msg.text}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<ConversationSession[]>([])
  const [selected, setSelected] = useState<ConversationSession | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setSessions(getHistory())
  }, [])

  const openSession = (id: string) => {
    const s = getSession(id)
    if (s) setSelected(s)
  }

  if (!mounted) {
    return <div style={{ background: 'var(--bg)', minHeight: '100vh' }} />
  }

  if (selected) {
    return (
      <TranscriptView session={selected} onBack={() => setSelected(null)} />
    )
  }

  return (
    <div
      className="page-enter"
      style={{
        background: 'var(--bg)',
        minHeight: '100vh',
        maxWidth: 600,
        margin: '0 auto',
        padding: '0 0 40px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 24,
            cursor: 'pointer',
            minWidth: 48,
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Back to scenarios"
        >
          ←
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: 'var(--font-heading)' }}>
          🕐 Conversation History
        </h1>
      </div>

      {sessions.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            marginTop: 80,
            padding: '0 24px',
          }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>💬</div>
          <div style={{ fontSize: 18, color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>No conversations yet.</div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.5 }}>
            Start a conversation to see your history here.
          </div>
          <button
            onClick={() => router.push('/')}
            style={{
              marginTop: 24,
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 16,
              padding: '14px 28px',
              color: 'white',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: 48,
              boxShadow: '0 4px 20px rgba(196,112,63,0.3)',
            }}
          >
            Start practicing
          </button>
        </div>
      ) : (
        <div style={{ padding: '16px 20px' }}>
          {sessions.map((session, i) => {
            const userCount = session.messages.filter(
              (m) => m.role === 'user'
            ).length
            const preview = firstTutorPhrase(session)
            return (
              <button
                key={session.id}
                onClick={() => openSession(session.id)}
                className="card-hover stagger-item"
                style={{
                  width: '100%',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '16px',
                  marginBottom: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  minHeight: 48,
                  boxShadow: 'var(--shadow)',
                  animationDelay: `${i * 40}ms`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
                    {session.scenarioEmoji} {session.scenarioTitle}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', flexShrink: 0, marginLeft: 8 }}>
                    {formatDate(session.startedAt)}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4 }}>
                  {preview}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {userCount} exchange{userCount !== 1 ? 's' : ''}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
