'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getBookmarksByScenario, removeBookmark, BookmarkedPhrase } from '@/lib/bookmarks'
import { getAllConfidence, getStatusColor, type PhraseConfidence } from '@/lib/confidence'
import { getCachedAudio, setCachedAudio } from '@/lib/audioDB'

const FEMALE_VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2'

export default function PhrasesPage() {
  const router = useRouter()
  const [grouped, setGrouped] = useState<Record<string, BookmarkedPhrase[]>>({})
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<Record<string, PhraseConfidence>>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Offline download state
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [cachedPhraseIds, setCachedPhraseIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const g = getBookmarksByScenario()
    setGrouped(g)
    setConfidence(getAllConfidence())
    checkCachedPhrases(g)
  }, [])

  const getVoiceId = () =>
    localStorage.getItem('linforo-voice-gender') === 'male'
      ? 'ErXwobaYiN019PkySvjV'
      : FEMALE_VOICE_ID

  async function checkCachedPhrases(g: Record<string, BookmarkedPhrase[]>) {
    const allPhrases = Object.values(g).flat()
    const cached = new Set<string>()
    for (const phrase of allPhrases) {
      const voiceId = typeof window !== 'undefined'
        ? (localStorage.getItem('linforo-voice-gender') === 'male' ? 'ErXwobaYiN019PkySvjV' : FEMALE_VOICE_ID)
        : FEMALE_VOICE_ID
      const key = `phrase:${voiceId}:${phrase.italian}`
      const buf = await getCachedAudio(key)
      if (buf) cached.add(phrase.id)
    }
    setCachedPhraseIds(cached)
  }

  const handlePlay = async (phrase: BookmarkedPhrase) => {
    if (playingId) return
    setPlayingId(phrase.id)
    try {
      const voiceId = getVoiceId()
      const cacheKey = `phrase:${voiceId}:${phrase.italian}`

      // Try IndexedDB cache first
      let buf = await getCachedAudio(cacheKey)
      if (!buf) {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: phrase.italian, voiceId }),
        })
        if (!res.ok) throw new Error('TTS failed')
        buf = await res.arrayBuffer()
        // Cache for offline use
        await setCachedAudio(cacheKey, buf)
      }

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

  const handleDownloadAll = async () => {
    const allPhrases = Object.values(grouped).flat()
    if (allPhrases.length === 0) return

    setIsDownloading(true)
    setDownloadProgress(0)

    const voiceId = getVoiceId()
    const newCached = new Set(cachedPhraseIds)
    let done = 0

    for (const phrase of allPhrases) {
      const cacheKey = `phrase:${voiceId}:${phrase.italian}`
      const existing = await getCachedAudio(cacheKey)
      if (!existing) {
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: phrase.italian, voiceId }),
          })
          if (res.ok) {
            const buf = await res.arrayBuffer()
            await setCachedAudio(cacheKey, buf)
            newCached.add(phrase.id)
          }
        } catch {
          // Continue with next phrase
        }
      } else {
        newCached.add(phrase.id)
      }
      done++
      setDownloadProgress(Math.round((done / allPhrases.length) * 100))
    }

    setCachedPhraseIds(newCached)
    setIsDownloading(false)
  }

  const scenarios = Object.keys(grouped)
  const totalCount = Object.values(grouped).reduce((n, arr) => n + arr.length, 0)
  const allCached = totalCount > 0 && Object.values(grouped).flat().every((p) => cachedPhraseIds.has(p.id))

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
        {/* Offline download button */}
        {totalCount > 0 && (
          <div style={{ marginBottom: 20 }}>
            {isDownloading ? (
              <div
                style={{
                  background: '#111',
                  border: '1px solid #333',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}
              >
                <div style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>
                  Downloading audio... {downloadProgress}%
                </div>
                <div
                  style={{
                    background: '#222',
                    borderRadius: 4,
                    height: 6,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      background: '#0a84ff',
                      height: '100%',
                      width: `${downloadProgress}%`,
                      transition: 'width 0.3s ease',
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleDownloadAll}
                disabled={allCached}
                style={{
                  width: '100%',
                  background: allCached ? '#0a1a0a' : '#111',
                  border: `1px solid ${allCached ? '#1a3a1a' : '#333'}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  color: allCached ? '#4caf50' : '#aaa',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: allCached ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minHeight: 48,
                }}
                aria-label="Download all phrases for offline use"
              >
                {allCached ? '✈️ All phrases available offline' : '✈️ Download for Offline'}
              </button>
            )}
          </div>
        )}

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
                  {phrases.map((phrase) => {
                    const conf = confidence[phrase.italian]
                    const isCached = cachedPhraseIds.has(phrase.id)
                    return (
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontSize: 17, fontWeight: 600, color: 'white' }}>
                              {phrase.italian}
                            </div>
                            {/* Confidence dot */}
                            {conf && (
                              <span
                                title={`${conf.status} — ${conf.attempts} attempt${conf.attempts !== 1 ? 's' : ''}`}
                                style={{
                                  display: 'inline-block',
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  background: getStatusColor(conf.status),
                                  flexShrink: 0,
                                }}
                                aria-label={`Confidence: ${conf.status}`}
                              />
                            )}
                            {/* Offline indicator */}
                            {isCached && (
                              <span
                                title="Available offline"
                                style={{ fontSize: 12, flexShrink: 0 }}
                                aria-label="Cached for offline"
                              >
                                ✈️
                              </span>
                            )}
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
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
