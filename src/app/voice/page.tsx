'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getScenarioById, Scenario } from '@/lib/scenarios'
import { ConversationMessage, createMessage, formatMessagesForAPI } from '@/lib/conversation'
import { generateSystemPrompt } from '@/lib/systemPrompt'
import { AudioState, transition, AudioEvent } from '@/lib/audioState'
import { addBookmark, isBookmarked, getBookmarks } from '@/lib/bookmarks'
import { incrementConversationCount } from '@/lib/conversationCount'
import { incrementScenarioConversation } from '@/lib/readiness'
import { computeSessionSummary, formatSummaryForShare } from '@/lib/sessionSummary'
import { saveSession } from '@/lib/history'
import { trackEvent } from '@/lib/analytics'

type VoiceGender = 'female' | 'male'

const FEMALE_VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2' // Alice
const MALE_VOICE_ID = 'ErXwobaYiN019PkySvjV' // Antoni

// Roleplay character system prompts
const ROLEPLAY_CHARACTERS: Record<
  string,
  { label: string; emoji: string; prompt: string }
> = {
  waiter: {
    label: 'Waiter',
    emoji: '🍝',
    prompt: `You are a friendly waiter at a small trattoria in Rome. Greet the customer warmly and take their order. Respond naturally in Italian. If they struggle, gently help them with the correct phrase. Keep responses to 1-3 sentences. Stay in character throughout.`,
  },
  shopkeeper: {
    label: 'Shopkeeper',
    emoji: '🛒',
    prompt: `You are a cheerful shopkeeper at a market stall in Florence. Welcome the customer and help them find what they need. Respond naturally in Italian. If they struggle, gently rephrase what they were trying to say. Keep responses short and natural.`,
  },
  taxi: {
    label: 'Taxi Driver',
    emoji: '🚕',
    prompt: `You are a talkative taxi driver in Rome. Ask where the passenger is going and chat about the city. Respond in Italian. If they struggle, help them gently. Keep it conversational and fun.`,
  },
  hotel: {
    label: 'Hotel Receptionist',
    emoji: '🏨',
    prompt: `You are a professional hotel receptionist in Milan. Welcome the guest and help with check-in. Respond in Italian. If they struggle with a phrase, model the correct version naturally. Keep responses brief and professional.`,
  },
}

function getRoleplayRating(
  userMessageCount: number
): { label: string; emoji: string; color: string } {
  if (userMessageCount >= 8)
    return { label: 'Gold', emoji: '🥇', color: '#ffd60a' }
  if (userMessageCount >= 5)
    return { label: 'Silver', emoji: '🥈', color: '#aaa' }
  return { label: 'Bronze', emoji: '🥉', color: '#c97b3a' }
}

function countItalianMessages(messages: ConversationMessage[]): number {
  const italianPattern =
    /\b(ciao|buon|grazie|prego|per favore|scusi|mi|ho|sono|vorrei|posso|dov|cosa|come|quando|quanto)\b/i
  return messages
    .filter((m) => m.role === 'user')
    .filter((m) => italianPattern.test(m.text)).length
}

function VoicePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const scenarioId = searchParams.get('scenario') || 'freestyle'
  const characterId = searchParams.get('character') || 'waiter'

  const isRoleplay = scenarioId === 'roleplay'
  const roleplayChar = ROLEPLAY_CHARACTERS[characterId] ?? ROLEPLAY_CHARACTERS['waiter']

  const [scenario, setScenario] = useState<Scenario | undefined>()
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [audioState, setAudioState] = useState<AudioState>('idle')
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('female')
  const [sayItBackPhrase, setSayItBackPhrase] = useState<string>('')

  // Shadow mode
  const [shadowMode, setShadowMode] = useState(false)
  const [shadowPhrase, setShadowPhrase] = useState<string>('')
  const shadowModeRef = useRef(false)

  // Teach me new
  const [teachMeStatus, setTeachMeStatus] = useState<string>('')
  const [showTeachMeToast, setShowTeachMeToast] = useState(false)

  // Roleplay summary
  const [showRoleplaySummary, setShowRoleplaySummary] = useState(false)
  const roleplaySummaryTriggered = useRef(false)

  // Bookmark state
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

  // WW: WebSocket streaming transcription
  const wsRef = useRef<WebSocket | null>(null)
  const finalTranscriptRef = useRef<string>('')
  const interimTranscriptRef = useRef<string>('')
  const [interimTranscript, setInterimTranscript] = useState<string>('')

  // XX: Streaming TTS queue
  const ttsQueueRef = useRef<Array<{ text: string; blob?: ArrayBuffer; index: number }>>([])
  const ttsPlayIndexRef = useRef(0)
  const isTTSPlayingRef = useRef(false)
  const totalSentencesRef = useRef(0)
  const fullReplyRef = useRef('')
  const isTTSStreamingRef = useRef(false)

  // YY: Error handling + toast
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'error' | 'info' | 'warning' }>>([])
  const [isOffline, setIsOffline] = useState(false)

  // AAA: Pronunciation replay
  const userAudioBlobRef = useRef<Blob | null>(null)
  const tutorAudioBlobRef = useRef<ArrayBuffer | null>(null)
  const [showPronunciationCompare, setShowPronunciationCompare] = useState(false)
  const pronunciationAutoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Analytics tracking
  const roleplayAnalyticsTracked = useRef(false)
  const conversationStartedTracked = useRef(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const messagesRef = useRef<ConversationMessage[]>([])
  const scenarioRef = useRef<Scenario | undefined>(undefined)
  const voiceGenderRef = useRef<VoiceGender>('female')

  // YY: Show toast helper
  const showToast = useCallback((message: string, type: 'error' | 'info' | 'warning' = 'error') => {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  // YY: Offline/online detection
  useEffect(() => {
    const handleOffline = () => setIsOffline(true)
    const handleOnline = () => setIsOffline(false)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

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

    // Auto-trigger roleplay summary after 12+ messages (6 exchanges)
    if (
      isRoleplay &&
      messages.length >= 12 &&
      !roleplaySummaryTriggered.current
    ) {
      roleplaySummaryTriggered.current = true
    }
  }, [messages, isRoleplay])

  // Analytics: track roleplay started
  useEffect(() => {
    if (isRoleplay && !roleplayAnalyticsTracked.current) {
      roleplayAnalyticsTracked.current = true
      trackEvent('roleplay_started')
    }
  }, [isRoleplay])

  const dispatch = useCallback((event: AudioEvent) => {
    setAudioState((prev) => transition(prev, event))
  }, [])

  const persistSession = useCallback(() => {
    const msgs = messagesForSummaryRef.current
    if (msgs.length === 0) return
    const sc = scenarioRef.current
    saveSession({
      scenarioId: isRoleplay ? 'roleplay' : (sc?.id ?? 'freestyle'),
      scenarioTitle: isRoleplay
        ? `Roleplay — ${roleplayChar.label}`
        : (sc?.title ?? 'Freestyle'),
      scenarioEmoji: isRoleplay ? roleplayChar.emoji : (sc?.emoji ?? '💬'),
      startedAt: msgs[0]?.timestamp ?? Date.now(),
      messages: msgs.map((m) => ({
        role: m.role,
        text: m.text,
        timestamp: m.timestamp,
      })),
    })
    if (!isRoleplay && sc) {
      incrementScenarioConversation(sc.id)
    }
  }, [isRoleplay, roleplayChar])

  const handleBack = useCallback(() => {
    if (messagesForSummaryRef.current.length > 0) {
      incrementConversationCount()
      persistSession()
      if (isRoleplay) {
        setShowRoleplaySummary(true)
      } else {
        setShowSummary(true)
      }
    } else {
      router.push('/')
    }
  }, [router, isRoleplay, persistSession])

  // XX: tryPlayNextTTS — play sentences in order as TTS arrives
  const tryPlayNextTTS = useCallback(() => {
    if (isTTSPlayingRef.current) return
    const queue = ttsQueueRef.current
    const nextItem = queue.find((item) => item.index === ttsPlayIndexRef.current)
    if (!nextItem || !nextItem.blob) return

    isTTSPlayingRef.current = true
    const buf = nextItem.blob
    // AAA: store last tutor audio buffer
    tutorAudioBlobRef.current = buf
    const blob = new Blob([buf], { type: 'audio/mpeg' })
    const url = URL.createObjectURL(blob)

    if (audioRef.current) {
      audioRef.current.src = url
      audioRef.current.onended = () => {
        URL.revokeObjectURL(url)
        isTTSPlayingRef.current = false
        ttsPlayIndexRef.current += 1

        if (ttsPlayIndexRef.current >= totalSentencesRef.current && totalSentencesRef.current > 0) {
          // All sentences played
          if (!isTTSStreamingRef.current) {
            isTTSStreamingRef.current = true
            dispatch('SAY_IT_BACK_TRIGGERED')
          }
        } else {
          tryPlayNextTTS()
        }
      }
      dispatch('PLAYBACK_STARTED')
      audioRef.current.play().catch(() => {
        isTTSPlayingRef.current = false
      })
    }
  }, [dispatch])

  // XX: Enqueue a TTS sentence
  const enqueueTTSSentence = useCallback(
    async (text: string, index: number) => {
      try {
        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voiceId: voiceGenderRef.current === 'female' ? FEMALE_VOICE_ID : MALE_VOICE_ID,
          }),
        })
        if (!ttsRes.ok) {
          if (ttsRes.status === 429) {
            // YY: ElevenLabs rate limit — remove this sentence from queue
            ttsQueueRef.current = ttsQueueRef.current.filter((item) => item.index !== index)
            totalSentencesRef.current = Math.max(0, totalSentencesRef.current - 1)
            if (!isTTSStreamingRef.current && ttsPlayIndexRef.current >= totalSentencesRef.current && totalSentencesRef.current === 0) {
              isTTSStreamingRef.current = true
              dispatch('SAY_IT_BACK_TRIGGERED')
            }
            return
          }
          throw new Error(`TTS error: ${ttsRes.status}`)
        }
        const buf = await ttsRes.arrayBuffer()
        const item = ttsQueueRef.current.find((q) => q.index === index)
        if (item) {
          item.blob = buf
        }
        tryPlayNextTTS()
      } catch (err) {
        console.error('TTS sentence error:', err)
        // Skip this sentence
        ttsQueueRef.current = ttsQueueRef.current.filter((item) => item.index !== index)
        totalSentencesRef.current = Math.max(0, totalSentencesRef.current - 1)
        if (!isTTSStreamingRef.current && totalSentencesRef.current === 0) {
          isTTSStreamingRef.current = true
          dispatch('SAY_IT_BACK_TRIGGERED')
        }
      }
    },
    [dispatch, tryPlayNextTTS]
  )

  // ── TTS helper (used for shadow mode / teach me new) ──────────────────────
  const playTTS = useCallback(
    async (text: string, onEnd?: () => void): Promise<void> => {
      try {
        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voiceId:
              voiceGenderRef.current === 'female' ? FEMALE_VOICE_ID : MALE_VOICE_ID,
          }),
        })
        if (!ttsRes.ok) {
          if (ttsRes.status === 429) {
            // YY: Rate limit — skip audio, trigger onEnd
            if (onEnd) onEnd()
            return
          }
          throw new Error(`TTS error: ${ttsRes.status}`)
        }
        const buf = await ttsRes.arrayBuffer()
        // AAA: Store tutor audio
        tutorAudioBlobRef.current = buf
        const blob = new Blob([buf], { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        if (audioRef.current) {
          audioRef.current.src = url
          audioRef.current.onended = () => {
            if (onEnd) onEnd()
            URL.revokeObjectURL(url)
          }
          dispatch('PLAYBACK_STARTED')
          audioRef.current.play().catch(() => {
            if (onEnd) onEnd()
          })
        }
      } catch (err) {
        console.error('TTS error:', err)
        // YY: TTS error — skip audio, continue
        if (onEnd) onEnd()
      }
    },
    [dispatch]
  )

  // ── Shadow phrase ─────────────────────────────────────────────────────────
  const startShadowPhrase = useCallback(async () => {
    const sc = scenarioRef.current
    const shadowPrompt = `You are in SHADOWING MODE for Italian language practice.
Say exactly ONE short Italian sentence or phrase (5-10 words) suitable for ${sc?.title ?? 'general'} conversation.
Do NOT include any English translation, phonetic pronunciation, or explanation.
Just the Italian phrase, nothing else. Make it natural and useful.`

    try {
      dispatch('RESPONSE_RECEIVED')
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'next phrase' }],
          systemPrompt: shadowPrompt,
        }),
      })
      const { reply } = await res.json() as { reply: string }
      const tutorMsg = createMessage('tutor', reply)
      setMessages((prev) => [...prev, tutorMsg])
      setSayItBackPhrase(reply)
      setShadowPhrase(reply)

      await playTTS(reply, () => dispatch('SAY_IT_BACK_TRIGGERED'))
    } catch (err) {
      console.error('Shadow phrase error:', err)
      dispatch('RESET')
    }
  }, [dispatch, playTTS])

  // ── Toggle shadow mode ────────────────────────────────────────────────────
  const toggleShadowMode = useCallback(() => {
    const next = !shadowModeRef.current
    setShadowMode(next)
    shadowModeRef.current = next
    if (next) {
      trackEvent('shadowing_started')
      setAudioState((curr) => {
        if (curr === 'idle') {
          startShadowPhrase()
        }
        return curr
      })
    }
  }, [startShadowPhrase])

  // ── Teach me something new ────────────────────────────────────────────────
  const handleTeachMeNew = useCallback(async () => {
    const sc = scenarioRef.current
    if (!sc || sc.phrases.length === 0) {
      setTeachMeStatus('No phrases in this scenario yet.')
      setShowTeachMeToast(true)
      setTimeout(() => setShowTeachMeToast(false), 3000)
      return
    }

    const bookmarked = getBookmarks()
    const bookmarkedItalian = new Set(
      bookmarked
        .filter((b) => b.scenarioId === sc.id)
        .map((b) => b.italian)
    )

    const unbookmarked = sc.phrases.filter(
      (p) => !bookmarkedItalian.has(p.italian)
    )

    if (unbookmarked.length === 0) {
      setTeachMeStatus("You've mastered all phrases in this scenario! 🎉")
      setShowTeachMeToast(true)
      setTimeout(() => setShowTeachMeToast(false), 4000)
      return
    }

    const phrase = unbookmarked[Math.floor(Math.random() * unbookmarked.length)]

    const teachMsg = createMessage(
      'tutor',
      `✨ Let me teach you a new phrase! **${phrase.italian}** (${phrase.phonetic}) — "${phrase.english}". Now try saying it back!`
    )
    setMessages((prev) => [...prev, teachMsg])
    setSayItBackPhrase(phrase.italian)

    try {
      dispatch('RESPONSE_RECEIVED')
      const fullText = `Let me teach you a new phrase! ${phrase.italian}. The pronunciation is: ${phrase.phonetic}. It means: ${phrase.english}. Now try saying it back!`
      await playTTS(fullText, () => dispatch('SAY_IT_BACK_TRIGGERED'))
    } catch (err) {
      console.error('Teach me new error:', err)
      dispatch('RESET')
    }
  }, [dispatch, playTTS])

  // XX: Streaming chat + sentence-by-sentence TTS
  const handleStreamingChat = useCallback(
    async (
      userMsg: ConversationMessage,
      systemPrompt: string
    ) => {
      // Reset streaming state
      ttsQueueRef.current = []
      ttsPlayIndexRef.current = 0
      isTTSPlayingRef.current = false
      totalSentencesRef.current = 0
      fullReplyRef.current = ''
      isTTSStreamingRef.current = false

      dispatch('RESPONSE_RECEIVED')

      let sentenceBuffer = ''
      let sentenceIndex = 0
      const sentenceBoundary = /[.!?]["']?\s|[.!?]["']?$/

      const flushSentence = (text: string) => {
        const trimmed = text.trim()
        if (trimmed.length >= 10) {
          const idx = sentenceIndex++
          totalSentencesRef.current = sentenceIndex
          ttsQueueRef.current.push({ text: trimmed, index: idx })
          enqueueTTSSentence(trimmed, idx)
        }
      }

      try {
        const chatRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: formatMessagesForAPI([
              ...messagesRef.current,
              userMsg,
            ]),
            systemPrompt,
            stream: true,
          }),
        })

        if (!chatRes.ok) {
          throw new Error(`Chat error: ${chatRes.status}`)
        }

        const contentType = chatRes.headers.get('content-type') || ''
        if (!contentType.includes('text/event-stream')) {
          // Fallback to batch response
          const data = await chatRes.json() as { reply: string }
          const reply = data.reply
          fullReplyRef.current = reply
          const tutorMsg = createMessage('tutor', reply)
          setMessages((prev) => [...prev, tutorMsg])
          setSayItBackPhrase(reply)
          await playTTS(reply, () => dispatch('SAY_IT_BACK_TRIGGERED'))
          return
        }

        const reader = chatRes.body?.getReader()
        if (!reader) throw new Error('No reader')
        const decoder = new TextDecoder()

        let done = false
        while (!done) {
          const result = await reader.read()
          done = result.done
          if (result.value) {
            const chunk = decoder.decode(result.value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()
              if (data === '[DONE]') {
                done = true
                break
              }
              try {
                const parsed = JSON.parse(data) as { token: string }
                const token = parsed.token
                fullReplyRef.current += token
                sentenceBuffer += token

                // Detect sentence boundaries
                const match = sentenceBoundary.exec(sentenceBuffer)
                if (match) {
                  const splitIdx = match.index + match[0].length
                  const sentence = sentenceBuffer.slice(0, splitIdx)
                  sentenceBuffer = sentenceBuffer.slice(splitIdx)
                  flushSentence(sentence)
                }
              } catch {
                // skip malformed SSE
              }
            }
          }
        }

        // Flush any remaining buffer
        if (sentenceBuffer.trim().length >= 10) {
          flushSentence(sentenceBuffer)
          sentenceBuffer = ''
        } else if (sentenceBuffer.trim()) {
          // Short remaining text — append to full reply but skip TTS for it
          fullReplyRef.current += sentenceBuffer
        }

        const fullReply = fullReplyRef.current
        const tutorMsg = createMessage('tutor', fullReply)
        setMessages((prev) => [...prev, tutorMsg])
        setSayItBackPhrase(fullReply)

        // If no sentences were enqueued (very short reply), play as single TTS
        if (totalSentencesRef.current === 0 && fullReply.trim()) {
          await playTTS(fullReply, () => dispatch('SAY_IT_BACK_TRIGGERED'))
        }
      } catch (err) {
        console.error('Streaming chat error:', err)
        // YY: Fallback to batch mode
        try {
          const chatRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: formatMessagesForAPI([
                ...messagesRef.current,
                userMsg,
              ]),
              systemPrompt,
            }),
          })
          if (!chatRes.ok) {
            throw new Error(`Chat fallback error: ${chatRes.status}`)
          }
          const { reply } = await chatRes.json() as { reply: string }
          dispatch('RESPONSE_RECEIVED')
          const tutorMsg = createMessage('tutor', reply)
          setMessages((prev) => [...prev, tutorMsg])
          setSayItBackPhrase(reply)
          await playTTS(reply, () => dispatch('SAY_IT_BACK_TRIGGERED'))
        } catch (fallbackErr) {
          console.error('Chat fallback error:', fallbackErr)
          // YY: OpenRouter error toast
          showToast('Our tutor is taking a break — try again in a moment', 'error')
          dispatch('RESET')
        }
      }
    },
    [dispatch, enqueueTTSSentence, playTTS, showToast]
  )

  // ── Main mic recording ─────────────────────────────────────────────────────
  const handleMicClick = useCallback(async () => {
    // AAA: Clear pronunciation compare when starting new recording
    if (pronunciationAutoTimerRef.current) {
      clearTimeout(pronunciationAutoTimerRef.current)
      pronunciationAutoTimerRef.current = null
    }
    setShowPronunciationCompare(false)

    setAudioState((currentState) => {
      if (currentState === 'recording') {
        // WW: Close WebSocket when user stops recording
        if (wsRef.current) {
          try {
            wsRef.current.send(JSON.stringify({ type: 'stop' }))
            wsRef.current.close()
          } catch {
            // ignore
          }
          wsRef.current = null
        }
        mediaRecorderRef.current?.stop()
        return transition(currentState, 'STOP_RECORDING')
      }
      return currentState
    })

    setAudioState((currentState) => {
      if (currentState === 'idle' || currentState === 'say-it-back') {
        const isSayItBackMode = currentState === 'say-it-back'

        // AAA: Reset user audio when starting say-it-back recording
        if (isSayItBackMode) {
          userAudioBlobRef.current = null
        }

        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            // WW: Reset transcript refs
            finalTranscriptRef.current = ''
            interimTranscriptRef.current = ''
            setInterimTranscript('')

            // WW: Open WebSocket for streaming transcription
            try {
              const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
              const wsUrl = `${wsProto}//${window.location.hostname}:3003/api/transcribe-ws`
              const ws = new WebSocket(wsUrl)
              wsRef.current = ws

              ws.onmessage = (event) => {
                try {
                  const data = JSON.parse(event.data as string) as {
                    transcript: string
                    isFinal: boolean
                    speechFinal: boolean
                  }
                  if (data.transcript) {
                    setInterimTranscript(data.transcript)
                    interimTranscriptRef.current = data.transcript
                    if (data.speechFinal) {
                      finalTranscriptRef.current = data.transcript
                    }
                  }
                } catch {
                  // ignore parse errors
                }
              }

              ws.onerror = () => {
                // WS failed — will fall back to /api/transcribe
              }
            } catch {
              // WS not available, will use fallback
            }

            const mimeType = MediaRecorder.isTypeSupported('audio/webm')
              ? 'audio/webm'
              : 'audio/ogg'
            const mediaRecorder = new MediaRecorder(stream, { mimeType })
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) {
                audioChunksRef.current.push(e.data)
                // WW: Stream audio chunk to WebSocket
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send(e.data)
                }
              }
            }

            mediaRecorder.onstop = async () => {
              stream.getTracks().forEach((t) => t.stop())
              setInterimTranscript('')

              // AAA: Save user audio if in say-it-back mode
              if (isSayItBackMode) {
                userAudioBlobRef.current = new Blob(audioChunksRef.current, { type: 'audio/webm' })
              }

              // WW: Use WS transcript if available, otherwise fall back to /api/transcribe
              const wsTranscript = finalTranscriptRef.current || interimTranscriptRef.current
              let transcript = wsTranscript

              if (!transcript?.trim()) {
                // Fallback: POST to /api/transcribe
                try {
                  const audioBlob = new Blob(audioChunksRef.current, {
                    type: 'audio/webm',
                  })
                  const formData = new FormData()
                  formData.append('audio', audioBlob, 'recording.webm')
                  const res = await fetch('/api/transcribe', {
                    method: 'POST',
                    body: formData,
                  })
                  if (!res.ok) {
                    throw new Error(`Transcribe error: ${res.status}`)
                  }
                  const data = await res.json() as { transcript: string }
                  transcript = data.transcript
                } catch (err) {
                  console.error('Transcription fallback error:', err)
                  // YY: Transcription error toast
                  showToast('Having trouble hearing you — try again', 'error')
                  dispatch('RESET')
                  return
                }
              }

              if (!transcript?.trim()) {
                dispatch('RESET')
                return
              }

              // Analytics: track first message
              if (!conversationStartedTracked.current) {
                conversationStartedTracked.current = true
                trackEvent('conversation_started')
              }

              const userMsg = createMessage('user', transcript)
              setMessages((prev) => [...prev, userMsg])

              // AAA: Show pronunciation compare if in say-it-back mode with saved audio
              if (isSayItBackMode && userAudioBlobRef.current && tutorAudioBlobRef.current) {
                setShowPronunciationCompare(true)
                if (pronunciationAutoTimerRef.current) {
                  clearTimeout(pronunciationAutoTimerRef.current)
                }
                pronunciationAutoTimerRef.current = setTimeout(() => {
                  setShowPronunciationCompare(false)
                }, 10000)
              }

              // Shadow mode: just show transcript, then start next phrase
              if (shadowModeRef.current) {
                await startShadowPhrase()
                return
              }

              // Normal conversation flow
              const systemPrompt = isRoleplay
                ? roleplayChar.prompt
                : generateSystemPrompt(
                    scenarioRef.current,
                    voiceGenderRef.current
                  )

              await handleStreamingChat(userMsg, systemPrompt)
            }

            mediaRecorder.start(100)
            dispatch('START_RECORDING')
          })
          .catch((err: unknown) => {
            console.error('Mic error:', err)
            // YY: Mic permission denied
            if (
              err instanceof DOMException &&
              (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
            ) {
              showToast(
                'Mic access denied — go to Settings → Safari → Microphone to enable',
                'warning'
              )
            }
            dispatch('RESET')
          })

        return transition(currentState, 'START_RECORDING')
      }
      return currentState
    })
  }, [dispatch, isRoleplay, roleplayChar, startShadowPhrase, handleStreamingChat, showToast])

  const toggleVoiceGender = () => {
    const next: VoiceGender = voiceGender === 'female' ? 'male' : 'female'
    setVoiceGender(next)
    voiceGenderRef.current = next
    localStorage.setItem('linforo-voice-gender', next)
  }

  const handleBookmark = (msg: ConversationMessage) => {
    if (!scenario) return
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

    trackEvent('phrase_bookmarked')
    setBookmarkedIds((prev) => new Set([...prev, msg.id]))
  }

  // Replay a tutor message from transcript
  const replayTutorMessage = useCallback(
    async (text: string) => {
      if (audioState !== 'idle' && audioState !== 'say-it-back') return
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voiceId:
              voiceGenderRef.current === 'female' ? FEMALE_VOICE_ID : MALE_VOICE_ID,
          }),
        })
        if (!res.ok) {
          if (res.status === 429) return // YY: rate limit, skip silently
          throw new Error(`TTS error: ${res.status}`)
        }
        const buf = await res.arrayBuffer()
        // AAA: Store tutor audio
        tutorAudioBlobRef.current = buf
        const blob = new Blob([buf], { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        if (audioRef.current) {
          audioRef.current.src = url
          audioRef.current.onended = () => URL.revokeObjectURL(url)
          audioRef.current.play().catch(() => {})
        }
      } catch {
        // ignore
      }
    },
    [audioState]
  )

  // AAA: Play user recording
  const playUserAudio = () => {
    if (!userAudioBlobRef.current) return
    try {
      const url = URL.createObjectURL(userAudioBlobRef.current)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.play().catch(() => {})
    } catch {
      // ignore
    }
  }

  // AAA: Play tutor recording
  const playTutorAudio = () => {
    if (!tutorAudioBlobRef.current) return
    try {
      const blob = new Blob([tutorAudioBlobRef.current], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.play().catch(() => {})
    } catch {
      // ignore
    }
  }

  // Panic button recording
  const startPanicRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg'
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
          const tRes = await fetch('/api/transcribe', {
            method: 'POST',
            body: fd,
          })
          if (!tRes.ok) throw new Error(`Transcribe error: ${tRes.status}`)
          const { transcript } = await tRes.json() as { transcript: string }
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
          if (!cRes.ok) throw new Error(`Chat error: ${cRes.status}`)
          const { reply } = await cRes.json() as { reply: string }
          setPanicAnswer(reply)
          setPanicState('idle')

          const userMsg = createMessage('user', `[Quick Help] ${transcript}`)
          const tutorMsg = createMessage('tutor', reply)
          setMessages((prev) => [...prev, userMsg, tutorMsg])
        } catch (err) {
          console.error('Panic error:', err)
          setPanicState('idle')
          showToast('Having trouble hearing you — try again', 'error')
        }
      }

      recorder.start(100)
      setPanicState('recording')
    } catch (err) {
      console.error('Panic mic error:', err)
      setPanicState('idle')
      if (
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      ) {
        showToast('Mic access denied — go to Settings → Safari → Microphone to enable', 'warning')
      }
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

  const summary = showSummary
    ? computeSessionSummary(
        messagesForSummaryRef.current,
        scenario?.phrases ?? []
      )
    : null

  // Roleplay summary data
  const userMessages = messages.filter((m) => m.role === 'user')
  const italianCount = countItalianMessages(messages)
  const roleplayRating = getRoleplayRating(userMessages.length)
  const hasEnoughForRoleplaySummary =
    isRoleplay && roleplaySummaryTriggered.current

  const headerTitle = isRoleplay
    ? `${roleplayChar.emoji} ${roleplayChar.label}`
    : scenario
    ? `${scenario.emoji} ${scenario.title}`
    : '💬 Freestyle'

  // YY: Toast background colors
  const toastBg = (type: 'error' | 'info' | 'warning') => {
    if (type === 'error') return '#c0392b'
    if (type === 'warning') return '#d4a017'
    return '#0a84ff'
  }

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
      {/* YY: Offline banner — fixed at very top */}
      {isOffline && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: 600,
            background: '#e67e22',
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 200,
          }}
        >
          <span>You&apos;re offline — emergency phrasebook still works</span>
          <a
            href="/emergency"
            style={{
              color: 'white',
              textDecoration: 'underline',
              marginLeft: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            Open →
          </a>
        </div>
      )}

      {/* YY: Toast notifications */}
      <div
        style={{
          position: 'fixed',
          top: isOffline ? 52 : 12,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: 540,
          zIndex: 300,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              background: toastBg(toast.type),
              color: 'white',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 500,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              textAlign: 'center',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: '1px solid #1a1a1a',
          marginTop: isOffline ? 44 : 0,
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
          <div style={{ fontSize: 14, color: '#888' }}>
            {isRoleplay ? 'Roleplay' : 'Practicing'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>
            {headerTitle}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Teach me new ✨ */}
          <button
            onClick={handleTeachMeNew}
            disabled={isProcessing || isRoleplay}
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 20,
              padding: '8px 10px',
              color: isRoleplay ? '#333' : '#ccc',
              fontSize: 18,
              cursor: isProcessing || isRoleplay ? 'not-allowed' : 'pointer',
              minHeight: 48,
              minWidth: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Teach me something new"
          >
            ✨
          </button>
          {/* Shadow mode */}
          <button
            onClick={toggleShadowMode}
            disabled={isProcessing || isRoleplay}
            style={{
              background: shadowMode ? '#0a2a1a' : '#1a1a1a',
              border: shadowMode ? '1px solid #1a5a2a' : '1px solid #333',
              borderRadius: 20,
              padding: '8px 10px',
              color: shadowMode ? '#4caf50' : isRoleplay ? '#333' : '#ccc',
              fontSize: 14,
              fontWeight: shadowMode ? 700 : 400,
              cursor: isProcessing || isRoleplay ? 'not-allowed' : 'pointer',
              minHeight: 48,
              minWidth: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label={shadowMode ? 'Disable shadowing mode' : 'Enable shadowing mode'}
          >
            Shadow
          </button>
          {/* Bookmarks */}
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
          {/* Voice gender */}
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

      {/* Shadow mode banner */}
      {shadowMode && (
        <div
          style={{
            background: '#0a2a1a',
            borderBottom: '1px solid #1a4a2a',
            padding: '10px 16px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 13, color: '#4caf50', fontWeight: 600 }}>
            🎧 SHADOW MODE — Listen and repeat
          </div>
          {shadowPhrase && (
            <div style={{ fontSize: 16, color: 'white', marginTop: 4 }}>
              {shadowPhrase}
            </div>
          )}
        </div>
      )}

      {/* Roleplay header badge */}
      {isRoleplay && (
        <div
          style={{
            background: '#1a0a2e',
            borderBottom: '1px solid #2a1a3e',
            padding: '10px 16px',
            textAlign: 'center',
            fontSize: 13,
            color: '#9a7adf',
          }}
        >
          🎭 You&apos;re speaking with a{' '}
          <strong style={{ color: '#c4a8ff' }}>{roleplayChar.label}</strong> in
          Italian. Navigate the full conversation!
        </div>
      )}

      {/* Teach me toast */}
      {showTeachMeToast && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: 12,
            padding: '10px 16px',
            fontSize: 14,
            color: 'white',
            zIndex: 50,
            whiteSpace: 'nowrap',
          }}
        >
          {teachMeStatus}
        </div>
      )}

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
            {shadowMode
              ? 'Starting shadow mode...'
              : isRoleplay
              ? `${roleplayChar.emoji} Start the conversation in Italian!`
              : 'Tap the mic and start speaking!'}
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
            {msg.role === 'tutor' && !isRoleplay && (
              <button
                onClick={() => handleBookmark(msg)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: 4,
                  color:
                    bookmarkedIds.has(msg.id) ||
                    isBookmarked(msg.text, scenarioId)
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
            <button
              onClick={
                msg.role === 'tutor'
                  ? () => replayTutorMessage(msg.text)
                  : undefined
              }
              disabled={msg.role !== 'tutor'}
              style={{
                maxWidth: '80%',
                padding: '12px 16px',
                borderRadius:
                  msg.role === 'user'
                    ? '18px 18px 4px 18px'
                    : '18px 18px 18px 4px',
                background: msg.role === 'user' ? '#0a84ff' : '#1c1c1e',
                border:
                  msg.role === 'tutor' ? '1px solid #2c2c2e' : 'none',
                fontSize: 18,
                lineHeight: 1.5,
                color: 'white',
                fontWeight: msg.role === 'tutor' ? 500 : 400,
                cursor: msg.role === 'tutor' ? 'pointer' : 'default',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              {msg.text}
            </button>
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
              {shadowMode ? 'Now shadow it!' : 'Now you try!'}
            </div>
            {shadowMode && shadowPhrase && (
              <div style={{ fontSize: 15, color: '#888', marginTop: 4 }}>
                {shadowPhrase}
              </div>
            )}
          </div>
        )}

        {/* AAA: Pronunciation compare card */}
        {showPronunciationCompare && userAudioBlobRef.current && tutorAudioBlobRef.current && (
          <div
            style={{
              background: '#0a1a2a',
              border: '1px solid #1a3a5a',
              borderRadius: 12,
              padding: '14px 16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 14, color: '#5a9adf', marginBottom: 10, fontWeight: 600 }}>
              🎧 Compare pronunciation
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={playUserAudio}
                style={{
                  background: '#1a2a3a',
                  border: '1px solid #2a4a6a',
                  borderRadius: 10,
                  padding: '10px 18px',
                  color: '#8ac0f0',
                  fontSize: 15,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  minHeight: 44,
                }}
              >
                🔊 You
              </button>
              <button
                onClick={playTutorAudio}
                style={{
                  background: '#1a2a3a',
                  border: '1px solid #2a4a6a',
                  borderRadius: 10,
                  padding: '10px 18px',
                  color: '#8ac0f0',
                  fontSize: 15,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  minHeight: 44,
                }}
              >
                🔊 Tutor
              </button>
            </div>
          </div>
        )}

        {/* Roleplay "finish" prompt */}
        {hasEnoughForRoleplaySummary && !showRoleplaySummary && (
          <div
            style={{
              background: '#1a0a2e',
              border: '1px solid #3a2a5e',
              borderRadius: 12,
              padding: '14px 16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 14, color: '#9a7adf', marginBottom: 8 }}>
              Great job! You&apos;ve had a full conversation.
            </div>
            <button
              onClick={() => setShowRoleplaySummary(true)}
              style={{
                background: '#5a3adf',
                border: 'none',
                borderRadius: 10,
                padding: '10px 20px',
                color: 'white',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: 48,
              }}
            >
              See how you did →
            </button>
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

        {/* WW: Interim transcript display */}
        {isRecording && interimTranscript && (
          <div
            style={{
              fontSize: 14,
              color: '#888',
              fontStyle: 'italic',
              textAlign: 'center',
              maxWidth: 300,
              lineHeight: 1.4,
            }}
          >
            {interimTranscript}
          </div>
        )}

        <div style={{ fontSize: 14, color: '#666' }}>
          {isRecording
            ? 'Tap to stop'
            : isProcessing
            ? 'Processing...'
            : isSayItBack
            ? shadowMode
              ? 'Shadow it!'
              : 'Tap mic to repeat!'
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
            <h2
              style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 8 }}
            >
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
              onClick={
                panicState === 'recording'
                  ? stopPanicRecording
                  : startPanicRecording
              }
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
              {panicState === 'idle' &&
                (panicAnswer ? '🎤 Ask again' : '🎤 Ask your question')}
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

      {/* Roleplay summary overlay */}
      {showRoleplaySummary && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
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
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 4 }}>
              {roleplayRating.emoji}
            </div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: roleplayRating.color,
                textAlign: 'center',
                marginBottom: 4,
              }}
            >
              {roleplayRating.label} Performance
            </h2>
            <div
              style={{
                fontSize: 14,
                color: '#666',
                textAlign: 'center',
                marginBottom: 24,
              }}
            >
              {roleplayChar.emoji} {roleplayChar.label} conversation complete
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  background: '#1a1a1a',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}
              >
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                  EXCHANGES
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0a84ff' }}>
                  {userMessages.length}
                </div>
              </div>

              <div
                style={{
                  background: '#1a1a1a',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}
              >
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                  ITALIAN PHRASES USED
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#4caf50' }}>
                  {italianCount}
                </div>
              </div>

              <div
                style={{
                  background: '#1a1a1a',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}
              >
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                  STRUGGLING AREAS
                </div>
                <div style={{ fontSize: 15, color: '#aaa' }}>
                  {userMessages.length - italianCount > 0
                    ? `${userMessages.length - italianCount} exchange${userMessages.length - italianCount !== 1 ? 's' : ''} in English — keep practicing!`
                    : 'None — excellent work! 🎉'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setShowRoleplaySummary(false)
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
                Keep going
              </button>
              <button
                onClick={() => router.push('/')}
                style={{
                  flex: 1,
                  background: '#5a3adf',
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
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 16 }}>
              🏁
            </div>
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

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                marginBottom: 24,
              }}
            >
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
                <div
                  style={{
                    background: '#1a1a1a',
                    borderRadius: 12,
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                    BEST ATTEMPT
                  </div>
                  <div style={{ fontSize: 15, color: 'white', fontStyle: 'italic' }}>
                    &ldquo;{summary.bestUserPhrase}&rdquo;
                  </div>
                </div>
              )}

              {summary.nextPracticePhrase && (
                <div
                  style={{
                    background: '#1a1a1a',
                    borderRadius: 12,
                    padding: '14px 16px',
                  }}
                >
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
                  const text = formatSummaryForShare(
                    summary,
                    scenario?.title ?? 'Italian'
                  )
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
