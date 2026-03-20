'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getScenarioById, Scenario } from '@/lib/scenarios'
import { ConversationMessage, createMessage, formatMessagesForAPI } from '@/lib/conversation'
import { generateSystemPrompt } from '@/lib/systemPrompt'
import { AudioState, transition, AudioEvent } from '@/lib/audioState'
import { addBookmark, isBookmarked } from '@/lib/bookmarks'
import { incrementConversationCount } from '@/lib/conversationCount'
import { computeSessionSummary, formatSummaryForShare } from '@/lib/sessionSummary'

type VoiceGender = 'female' | 'male'

const FEMALE_VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2' // Alice
const MALE_VOICE_ID = 'ErXwobaYiN019PkySvjV' // Antoni

function VoicePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const scenarioId = searchParams.get('scenario') || 'freestyle'

  const [scenario, setScenario] = useState<Scenario | undefined>()
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [audioState, setAudioState] = useState<AudioState>('idle')
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('female')
  const [sayItBackPhrase, setSayItBackPhrase] = useState<string>('')

  // Bookmark state — track per-message bookmark status
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())

  // Panic button (Quick Help)
  const [panicOpen, setPanicOpen] = useState(false)
  const [panicState, setPanicState] = useState<'idle' | 'recording' | 'processing'>('idle')
  const [panicAnswer, setPanicAnswer] = useState<string>('')
  const panicRecorderRef = useRef<MediaRecorder | null>(null)
  const panicChunksRef = useRef<Blob[]>([])

  // Session summary
  const [showSummary, setShowSummary] = useState(false)
  const messagesForSummaryRef = useRef<ConversationMessage[]>([])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const messagesRef = useRef<ConversationMessage[]>([])
  const scenarioRef = useRef<Scenario | undefined>(undefined)
  const voiceGenderRef = useRef<VoiceGender>('female')

  useEffect(() => {
    const s = getScenarioById(scenarioId)
    setScenario(s)
    scenarioRef.current = s
  }, [scenarioId])

  useEffect(() => {
    const stored = localStorage.getItem('linforo-voice-gender')
    if (stored === 'male' || stored === 'female') {
      setVoiceGender(stored)
      voiceGenderRef.current = stored
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    messagesRef.current = messages
    messagesForSummaryRef.current = messages
  }, [messages])

  const dispatch = useCallback((event: AudioEvent) => {
    setAudioState((prev) => transition(prev, event))
  }, [])

  const handleBack = useCallback(() => {
    // Only show summary if there was actual conversation
    if (messagesForSummaryRef.current.length > 0) {
      incrementConversationCount()
      setShowSummary(true)
    } else {
      router.push('/')
    }
  }, [router])

  const handleMicClick = useCallback(async () => {
    setAudioState((currentState) => {
      if (currentState === 'recording') {
        mediaRecorderRef.current?.stop()
        return transition(currentState, 'STOP_RECORDING')
      }
      return currentState
    })

    setAudioState((currentState) => {
      if (currentState === 'idle' || currentState === 'say-it-back') {
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
          const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
          const mediaRecorder = new MediaRecorder(stream, { mimeType })
          mediaRecorderRef.current = mediaRecorder
          audioChunksRef.current = []

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data)
          }

          mediaRecorder.onstop = async () => {
            stream.getTracks().forEach((t) => t.stop())
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

            try {
              const formData = new FormData()
              formData.append('audio', audioBlob, 'recording.webm')
              const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
              const { transcript } = await res.json()

              if (!transcript?.trim()) {
                dispatch('RESET')
                return
              }

              const userMsg = createMessage('user', transcript)
              let updatedMessages: ConversationMessage[] = []
              setMessages((prev) => {
                updatedMessages = [...prev, userMsg]
                return updatedMessages
              })

              const systemPrompt = generateSystemPrompt(scenarioRef.current, voiceGenderRef.current)
              const chatRes = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  messages: formatMessagesForAPI([...messagesRef.current, userMsg]),
                  systemPrompt,
                }),
              })

              const { reply } = await chatRes.json()
              dispatch('RESPONSE_RECEIVED')

              const tutorMsg = createMessage('tutor', reply)
              setMessages((prev) => [...prev, tutorMsg])
              setSayItBackPhrase(reply)

              const ttsRes = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: reply,
                  voiceId: voiceGenderRef.current === 'female' ? FEMALE_VOICE_ID : MALE_VOICE_ID,
                }),
              })

              const audioArrayBuffer = await ttsRes.arrayBuffer()
              const audioBlob2 = new Blob([audioArrayBuffer], { type: 'audio/mpeg' })
              const audioUrl = URL.createObjectURL(audioBlob2)

              if (audioRef.current) {
                audioRef.current.src = audioUrl
                audioRef.current.onended = () => {
                  dispatch('SAY_IT_BACK_TRIGGERED')
                  URL.revokeObjectURL(audioUrl)
                }
                dispatch('PLAYBACK_STARTED')
                audioRef.current.play()
              }
            } catch (err) {
              console.error('Pipeline error:', err)
              dispatch('RESET')
            }
          }

          mediaRecorder.start(100)
          dispatch('START_RECORDING')
        }).catch((err) => {
          console.error('Mic error:', err)
          dispatch('RESET')
        })

        return transition(currentState, 'START_RECORDING')
      }
      return currentState
    })
  }, [dispatch])

  const toggleVoiceGender = () => {
    const next: VoiceGender = voiceGender === 'female' ? 'male' : 'female'
    setVoiceGender(next)
    voiceGenderRef.current = next
    localStorage.setItem('linforo-voice-gender', next)
  }

  const handleBookmark = (msg: ConversationMessage) => {
    if (!scenario) return
    // Try to parse the Italian phrase from the tutor message
    // Format: **Italian phrase** (phonetic) — English
    const bold = msg.text.match(/\*\*([^*]+)\*\*/)
    const phonetic = msg.text.match(/\(([^)]+)\)/)
    const english = msg.text.match(/—\s*(.+)/)

    const italian = bold ? bold[1] : msg.text.slice(0, 60)
    const ph = phonetic ? phonetic[1] : ''
    const en = english ? english[1].trim() : ''

    addBookmark({
      italian,
      phonetic: ph,
      english: en,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
    })

    setBookmarkedIds((prev) => new Set([...prev, msg.id]))
  }

  // Panic button recording
  const startPanicRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      const recorder = new MediaRecorder(stream, { mimeType })
      panicRecorderRef.current = recorder
      panicChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) panicChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setPanicState('processing')
        const blob = new Blob(panicChunksRef.current, { type: 'audio/webm' })
        try {
          const fd = new FormData()
          fd.append('audio', blob, 'panic.webm')
          const tRes = await fetch('/api/transcribe', { method: 'POST', body: fd })
          const { transcript } = await tRes.json()
          if (!transcript?.trim()) {
            setPanicState('idle')
            return
          }

          const panicPrompt = `You are a quick Italian translation assistant. The user is in Italy and needs immediate help. They will ask a question in English. Reply ONLY with the Italian phrase they need, plus its phonetic pronunciation in parentheses, plus the English meaning after a dash. One line only. Be brief.`
          const cRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: transcript }],
              systemPrompt: panicPrompt,
            }),
          })
          const { reply } = await cRes.json()
          setPanicAnswer(reply)
          setPanicState('idle')

          // Add to main conversation
          const userMsg = createMessage('user', `[Quick Help] ${transcript}`)
          const tutorMsg = createMessage('tutor', reply)
          setMessages((prev) => [...prev, userMsg, tutorMsg])
        } catch {
          setPanicState('idle')
        }
      }

      recorder.start(100)
      setPanicState('recording')
    } catch {
      setPanicState('idle')
    }
  }

  const stopPanicRecording = () => {
    panicRecorderRef.current?.stop()
  }

  const closePanic = () => {
    setPanicOpen(false)
    setPanicAnswer('')
    setPanicState('idle')
  }

  const isRecording = audioState === 'recording'
  const isSayItBack = audioState === 'say-it-back'
  const isProcessing = audioState === 'processing' || audioState === 'playing'

  // Session summary data
  const summary = showSummary
    ? computeSessionSummary(messagesForSummaryRef.current, scenario?.phrases ?? [])
    : null

  return (
    <div
      style={{
        background: '#0a0a0a',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 600,
        margin: '0 auto',
        position: 'relative',
      }}
    >
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
          onClick={handleBack}
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
          aria-label="Back to scenarios"
        >
          ←
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#888' }}>Practicing</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>
            {scenario ? `${scenario.emoji} ${scenario.title}` : '💬 Freestyle'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => router.push('/phrases')}
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 20,
              padding: '8px 12px',
              color: '#ccc',
              fontSize: 18,
              cursor: 'pointer',
              minHeight: 48,
              minWidth: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="My saved phrases"
          >
            ⭐
          </button>
          <button
            onClick={toggleVoiceGender}
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 20,
              padding: '8px 14px',
              color: '#ccc',
              fontSize: 14,
              cursor: 'pointer',
              minHeight: 48,
              minWidth: 48,
            }}
            aria-label={`Switch to ${voiceGender === 'female' ? 'male' : 'female'} voice`}
          >
            {voiceGender === 'female' ? '♀' : '♂'}
          </button>
        </div>
      </div>

      {/* Conversation transcript */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#444',
              marginTop: 40,
              fontSize: 16,
            }}
          >
            Tap the mic and start speaking!
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-end',
              gap: 6,
            }}
          >
            {msg.role === 'tutor' && (
              <button
                onClick={() => handleBookmark(msg)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: 4,
                  color: bookmarkedIds.has(msg.id) || isBookmarked(msg.text, scenarioId)
                    ? '#ffd60a'
                    : '#444',
                  minWidth: 28,
                  minHeight: 28,
                  flexShrink: 0,
                  transition: 'color 0.2s',
                }}
                aria-label="Bookmark phrase"
              >
                ⭐
              </button>
            )}
            <div
              style={{
                maxWidth: '80%',
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: msg.role === 'user' ? '#0a84ff' : '#1c1c1e',
                border: msg.role === 'tutor' ? '1px solid #2c2c2e' : 'none',
                fontSize: 18,
                lineHeight: 1.5,
                color: 'white',
                fontWeight: msg.role === 'tutor' ? 500 : 400,
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                background: '#1c1c1e',
                border: '1px solid #2c2c2e',
                borderRadius: '18px 18px 18px 4px',
                padding: '14px 18px',
                fontSize: 18,
                color: '#888',
              }}
            >
              ...
            </div>
          </div>
        )}

        {isSayItBack && sayItBackPhrase && (
          <div
            style={{
              background: '#1a1a0a',
              border: '1px solid #444',
              borderRadius: 12,
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 20 }}>🎤</div>
            <div style={{ fontSize: 16, color: '#ffd60a', marginTop: 4 }}>
              Now you try!
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Mic button area */}
      <div
        style={{
          padding: '24px 16px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          position: 'relative',
        }}
      >
        {/* Quick Help panic button */}
        <button
          onClick={() => setPanicOpen(true)}
          style={{
            position: 'absolute',
            right: 24,
            bottom: 52,
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#1c1c1e',
            border: '1px solid #333',
            color: '#888',
            fontSize: 22,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
          aria-label="Quick help"
        >
          ❓
        </button>

        <button
          onClick={handleMicClick}
          disabled={isProcessing}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          className={isRecording ? 'mic-pulse' : ''}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: 'none',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontSize: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            background: isRecording
              ? '#ff3b30'
              : isSayItBack
              ? '#ffd60a'
              : '#1c1c1e',
            color: isRecording || isSayItBack ? 'white' : '#888',
            transition: 'background 0.2s',
          }}
        >
          {isRecording ? '⏹' : '🎤'}
        </button>

        <div style={{ fontSize: 14, color: '#666' }}>
          {isRecording
            ? 'Tap to stop'
            : isProcessing
            ? 'Processing...'
            : isSayItBack
            ? 'Tap mic to repeat!'
            : 'Tap to speak'}
        </div>
      </div>

      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* Quick Help overlay */}
      {panicOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 100,
            padding: '0 0 40px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closePanic()
          }}
        >
          <div
            style={{
              background: '#111',
              border: '1px solid #333',
              borderRadius: '20px 20px 0 0',
              padding: '24px 20px 32px',
              width: '100%',
              maxWidth: 600,
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                background: '#333',
                borderRadius: 2,
                margin: '0 auto 20px',
              }}
            />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 8 }}>
              ❓ Quick Help
            </h2>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>
              Ask in English — get instant Italian
            </p>

            {panicAnswer && (
              <div
                style={{
                  background: '#1a2a1a',
                  border: '1px solid #2a4a2a',
                  borderRadius: 12,
                  padding: '14px 16px',
                  marginBottom: 20,
                  fontSize: 16,
                  color: 'white',
                  lineHeight: 1.5,
                }}
              >
                {panicAnswer}
              </div>
            )}

            <button
              onClick={panicState === 'recording' ? stopPanicRecording : startPanicRecording}
              disabled={panicState === 'processing'}
              style={{
                width: '100%',
                background: panicState === 'recording' ? '#ff3b30' : '#0a84ff',
                border: 'none',
                borderRadius: 14,
                padding: '18px',
                color: 'white',
                fontSize: 17,
                fontWeight: 600,
                cursor: panicState === 'processing' ? 'not-allowed' : 'pointer',
                minHeight: 56,
              }}
            >
              {panicState === 'idle' && (panicAnswer ? '🎤 Ask again' : '🎤 Ask your question')}
              {panicState === 'recording' && '⏹ Stop'}
              {panicState === 'processing' && 'Getting answer...'}
            </button>

            <button
              onClick={closePanic}
              style={{
                width: '100%',
                background: 'none',
                border: '1px solid #333',
                borderRadius: 14,
                padding: '14px',
                color: '#888',
                fontSize: 15,
                cursor: 'pointer',
                marginTop: 12,
                minHeight: 48,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Session summary card */}
      {showSummary && summary && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '24px 16px',
          }}
        >
          <div
            style={{
              background: '#111',
              border: '1px solid #333',
              borderRadius: 20,
              padding: '28px 24px',
              width: '100%',
              maxWidth: 380,
            }}
          >
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 16 }}>🏁</div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'white',
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              Session complete!
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              <div
                style={{
                  background: '#1a1a1a',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}
              >
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                  PHRASES PRACTICED
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0a84ff' }}>
                  {summary.phraseCount}
                </div>
              </div>

              {summary.bestUserPhrase && (
                <div style={{ background: '#1a1a1a', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                    BEST ATTEMPT
                  </div>
                  <div style={{ fontSize: 15, color: 'white', fontStyle: 'italic' }}>
                    &ldquo;{summary.bestUserPhrase}&rdquo;
                  </div>
                </div>
              )}

              {summary.nextPracticePhrase && (
                <div style={{ background: '#1a1a1a', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                    PRACTICE NEXT TIME
                  </div>
                  <div style={{ fontSize: 15, color: 'white', fontWeight: 600 }}>
                    {summary.nextPracticePhrase.italian}
                  </div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                    {summary.nextPracticePhrase.english}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={async () => {
                  const text = formatSummaryForShare(summary, scenario?.title ?? 'Italian')
                  try {
                    await navigator.clipboard.writeText(text)
                  } catch {
                    // clipboard not available
                  }
                }}
                style={{
                  flex: 1,
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: 12,
                  padding: '14px',
                  color: '#aaa',
                  fontSize: 15,
                  cursor: 'pointer',
                  minHeight: 48,
                }}
              >
                Share 📋
              </button>
              <button
                onClick={() => router.push('/')}
                style={{
                  flex: 1,
                  background: '#0a84ff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '14px',
                  color: 'white',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: 48,
                }}
              >
                Done
              </button>
            </div>

            <button
              onClick={() => {
                setShowSummary(false)
                router.push('/')
              }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: '#555',
                fontSize: 14,
                cursor: 'pointer',
                marginTop: 12,
                padding: 8,
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function VoicePageWrapper() {
  return (
    <Suspense fallback={<div style={{ background: '#0a0a0a', minHeight: '100vh' }} />}>
      <VoicePage />
    </Suspense>
  )
}
