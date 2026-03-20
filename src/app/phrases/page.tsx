'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getBookmarksByScenario, removeBookmark, BookmarkedPhrase } from '@/lib/bookmarks'
import { getAllConfidence, getStatusColor, getStatusLabel, type PhraseConfidence, getWeakPhrases } from '@/lib/confidence'
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

  // PPP: PDF phrasebook export
  const handlePrintPhrasebook = async () => {
    const allPhrases = Object.values(grouped).flat()
    if (allPhrases.length === 0) {
      alert('Bookmark some phrases first!')
      return
    }
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ format: 'a4', unit: 'mm' })

    const pageW = 210
    const margin = 18
    const usableW = pageW - margin * 2
    let y = 20

    const addPage = () => {
      doc.addPage()
      y = 20
    }

    const checkPage = (needed: number) => {
      if (y + needed > 270) addPage()
    }

    // Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(20, 20, 20)
    doc.text('My Italian Phrasebook', pageW / 2, y, { align: 'center' })
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(120, 120, 120)
    doc.text('Generated by Linforo', pageW / 2, y, { align: 'center' })
    y += 12

    // Draw a divider
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageW - margin, y)
    y += 10

    // Phrases grouped by scenario
    for (const scenarioId of Object.keys(grouped)) {
      const phrases = grouped[scenarioId]
      const title = phrases[0]?.scenarioTitle ?? scenarioId

      checkPage(14)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(80, 80, 80)
      doc.text(title.toUpperCase(), margin, y)
      y += 8

      for (const phrase of phrases) {
        checkPage(22)

        // Italian (large, bold)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(20, 20, 20)
        const italianLines = doc.splitTextToSize(phrase.italian, usableW)
        doc.text(italianLines, margin, y)
        y += italianLines.length * 6

        // Phonetic (italic)
        if (phrase.phonetic) {
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(11)
          doc.setTextColor(100, 100, 100)
          const phoneticLines = doc.splitTextToSize(phrase.phonetic, usableW)
          doc.text(phoneticLines, margin, y)
          y += phoneticLines.length * 5
        }

        // English
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(12)
        doc.setTextColor(60, 60, 60)
        const englishLines = doc.splitTextToSize(phrase.english, usableW)
        doc.text(englishLines, margin, y)
        y += englishLines.length * 5 + 8

        // Separator
        doc.setDrawColor(230, 230, 230)
        doc.line(margin, y, pageW - margin, y)
        y += 6
      }
      y += 4
    }

    // Page numbers
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(160, 160, 160)
      doc.text(`Page ${i} of ${totalPages}`, pageW / 2, 287, { align: 'center' })
    }

    doc.save('linforo-phrasebook.pdf')
  }

  const weakPhrases = getWeakPhrases(10)

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
        {/* PPP: PDF export button */}
        {totalCount > 0 && (
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={handlePrintPhrasebook}
              style={{
                width: '100%',
                background: '#111',
                border: '1px solid #333',
                borderRadius: 12,
                padding: '14px 16px',
                color: '#aaa',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minHeight: 48,
              }}
            >
              📄 Print Phrasebook
            </button>
          </div>
        )}

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

        {/* CCCC: Weak phrases section */}
        {weakPhrases.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#ff6b6b',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 12,
              }}
            >
              Weak Phrases — Keep Practicing
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {weakPhrases.map((wp) => (
                <div
                  key={wp.phraseItalian}
                  style={{
                    background: '#1a0a0a',
                    border: `1px solid ${getStatusColor(wp.status)}44`,
                    borderRadius: 12,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: getStatusColor(wp.status),
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>
                      {wp.phraseItalian}
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {getStatusLabel(wp.status)} · {wp.attempts} attempt{wp.attempts !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {scenarios.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: '#444',
              marginTop: weakPhrases.length > 0 ? 40 : 80,
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
