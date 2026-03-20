'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getBookmarksByScenario, removeBookmark, BookmarkedPhrase } from '@/lib/bookmarks'

const FEMALE_VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2'

export default function PhrasesPage() {
  const router = useRouter()
  const [grouped, setGrouped] = useState<Record<string, BookmarkedPhrase[]>>({})
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    setGrouped(getBookmarksByScenario())
  }, [])

  const handlePlay = async (phrase: BookmarkedPhrase) => {
    if (playingId) return
    setPlayingId(phrase.id)
    try {
      const voiceId = localStorage.getItem('linforo-voice-gender') === 'male'
        ? 'ErXwobaYiN019PkySvjV'
        : FEMALE_VOICE_ID
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: phrase.italian, voiceId }),
      })
      const buf = await res.arrayBuffer()
      const blob = new Blob([buf], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        setPlayingId(null)
        URL.revokeObjectURL(url)
      }
      audio.play()
    } catch {
      setPlayingId(null)
    }
  }

  const handleRemove = (id: string) => {
    removeBookmark(id)
    setGrouped(getBookmarksByScenario())
  }

  const scenarios = Object.keys(grouped)
  const totalCount = Object.values(grouped).reduce((n, arr) => n + arr.length, 0)

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: '1px solid #1a1a1a',
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            fontSize: 24,
            cursor: 'pointer',
            minWidth: 48,
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Go back"
        >
          ←
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>My Phrases</div>
          <div style={{ fontSize: 13, color: '#666' }}>{totalCount} saved</div>
        </div>
        <div style={{ minWidth: 48 }} />
      </div>

      <div style={{ padding: '16px' }}>
        {scenarios.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: '#444',
              marginTop: 80,
              fontSize: 16,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
            <p>No saved phrases yet.</p>
            <p style={{ fontSize: 14, color: '#333', marginTop: 8 }}>
              Tap ⭐ on any tutor message to save it.
            </p>
          </div>
        ) : (
          scenarios.map((scenarioId) => {
            const phrases = grouped[scenarioId]
            const scenarioTitle = phrases[0]?.scenarioTitle ?? scenarioId
            return (
              <div key={scenarioId} style={{ marginBottom: 28 }}>
                <h2
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#888',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    marginBottom: 12,
                  }}
                >
                  {scenarioTitle}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {phrases.map((phrase) => (
                    <div
                      key={phrase.id}
                      style={{
                        background: '#111',
                        border: '1px solid #222',
                        borderRadius: 12,
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 17, fontWeight: 600, color: 'white' }}>
                          {phrase.italian}
                        </div>
                        <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                          {phrase.phonetic}
                        </div>
                        <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                          {phrase.english}
                        </div>
                      </div>
                      <button
                        onClick={() => handlePlay(phrase)}
                        disabled={playingId !== null}
                        style={{
                          background: '#1c1c1e',
                          border: '1px solid #333',
                          borderRadius: 10,
                          width: 40,
                          height: 40,
                          cursor: playingId ? 'not-allowed' : 'pointer',
                          fontSize: 18,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: playingId === phrase.id ? '#0a84ff' : '#888',
                        }}
                        aria-label={`Play ${phrase.italian}`}
                      >
                        {playingId === phrase.id ? '▶' : '🔊'}
                      </button>
                      <button
                        onClick={() => handleRemove(phrase.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#444',
                          cursor: 'pointer',
                          fontSize: 18,
                          padding: 4,
                          minWidth: 32,
                          minHeight: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                        aria-label={`Remove ${phrase.italian}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
