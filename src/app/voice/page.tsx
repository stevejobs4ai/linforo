'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getScenarioById, Scenario } from '@/lib/scenarios'
import { ConversationMessage, createMessage, formatMessagesForAPI } from '@/lib/conversation'
import { generateSystemPrompt } from '@/lib/systemPrompt'
import { AudioState, transition, AudioEvent } from '@/lib/audioState'

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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const messagesRef = useRef<ConversationMessage[]>([])
  const scenarioRef = useRef<Scenario | undefined>(undefined)
  const voiceGenderRef = useRef<VoiceGender>('female')

  useEffect(() => {
    setScenario(getScenarioById(scenarioId))
    scenarioRef.current = getScenarioById(scenarioId)
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
  }, [messages])

  const dispatch = useCallback((event: AudioEvent) => {
    setAudioState((prev) => transition(prev, event))
  }, [])

  const handleMicClick = useCallback(async () => {
    setAudioState((currentState) => {
      if (currentState === 'recording') {
        // Stop recording
        mediaRecorderRef.current?.stop()
        return transition(currentState, 'STOP_RECORDING')
      }
      return currentState
    })

    setAudioState((currentState) => {
      if (currentState === 'idle' || currentState === 'say-it-back') {
        // Will start recording
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
              // Transcribe
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

              // Get AI response
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

              // TTS
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

  const isRecording = audioState === 'recording'
  const isSayItBack = audioState === 'say-it-back'
  const isProcessing = audioState === 'processing' || audioState === 'playing'

  return (
    <div
      style={{
        background: '#0a0a0a',
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
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: '1px solid #1a1a1a',
        }}
      >
        <button
          onClick={() => router.push('/')}
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
            {scenario ? `${scenario.emoji} ${scenario.title}` : '🌟 Freestyle'}
          </div>
        </div>
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
            }}
          >
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

      {/* Mic button */}
      <div
        style={{
          padding: '24px 16px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
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
