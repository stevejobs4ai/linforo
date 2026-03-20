'use client'

import { useState, useRef } from 'react'
import { LearningReason, completeOnboarding } from '@/lib/onboarding'

const FEMALE_VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2'
const MALE_VOICE_ID = 'ErXwobaYiN019PkySvjV'

const SAMPLE_TEXT = 'Ciao! Sono la tua tutor italiana. Iniziamo!'

interface OnboardingProps {
  onComplete: (voiceGender: 'female' | 'male') => void
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [screen, setScreen] = useState<1 | 2 | 3>(1)
  const [reason, setReason] = useState<LearningReason | null>(null)
  const [selectedVoice, setSelectedVoice] = useState<'female' | 'male'>('female')
  const [playingVoice, setPlayingVoice] = useState<'female' | 'male' | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const playVoiceSample = async (gender: 'female' | 'male') => {
    if (playingVoice) return
    setPlayingVoice(gender)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: SAMPLE_TEXT,
          voiceId: gender === 'female' ? FEMALE_VOICE_ID : MALE_VOICE_ID,
        }),
      })
      const buf = await res.arrayBuffer()
      const blob = new Blob([buf], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        setPlayingVoice(null)
        URL.revokeObjectURL(url)
      }
      audio.play()
    } catch {
      setPlayingVoice(null)
    }
  }

  const handleSelectVoice = (gender: 'female' | 'male') => {
    setSelectedVoice(gender)
    playVoiceSample(gender)
  }

  const handleFinish = () => {
    if (!reason) return
    completeOnboarding(reason, selectedVoice)
    onComplete(selectedVoice)
  }

  const reasons: { id: LearningReason; emoji: string; label: string }[] = [
    { id: 'travel', emoji: '✈️', label: 'Travel' },
    { id: 'moving', emoji: '🏠', label: 'Moving there' },
    { id: 'curiosity', emoji: '💡', label: 'Curiosity' },
    { id: 'school', emoji: '📚', label: 'School' },
  ]

  return (
    <div
      style={{
        background: '#0a0a0a',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 48 }}>
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: n <= screen ? '#0a84ff' : '#333',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>

      {screen === 1 && (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌍</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'white', marginBottom: 8 }}>
            What language?
          </h1>
          <p style={{ fontSize: 15, color: '#666', marginBottom: 40 }}>
            More coming soon
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              style={{
                background: '#0a84ff22',
                border: '2px solid #0a84ff',
                borderRadius: 14,
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                cursor: 'pointer',
                color: 'white',
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: 28 }}>🇮🇹</span>
              Italian
              <span style={{ marginLeft: 'auto', fontSize: 13, color: '#0a84ff' }}>Selected</span>
            </button>

            {['🇫🇷 French', '🇪🇸 Spanish', '🇩🇪 German', '🇯🇵 Japanese'].map((lang) => (
              <button
                key={lang}
                disabled
                style={{
                  background: '#111',
                  border: '1px solid #222',
                  borderRadius: 14,
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  cursor: 'not-allowed',
                  color: '#444',
                  fontSize: 18,
                  fontWeight: 500,
                  opacity: 0.5,
                }}
              >
                <span style={{ fontSize: 24 }}>{lang.split(' ')[0]}</span>
                {lang.split(' ')[1]}
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#444' }}>Coming soon</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setScreen(2)}
            style={{
              marginTop: 40,
              width: '100%',
              background: '#0a84ff',
              border: 'none',
              borderRadius: 14,
              padding: '18px',
              color: 'white',
              fontSize: 17,
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: 56,
            }}
          >
            Continue →
          </button>
        </div>
      )}

      {screen === 2 && (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'white', marginBottom: 8 }}>
            Why are you learning?
          </h1>
          <p style={{ fontSize: 15, color: '#666', marginBottom: 40 }}>
            We&apos;ll tailor your experience
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {reasons.map((r) => (
              <button
                key={r.id}
                onClick={() => setReason(r.id)}
                style={{
                  background: reason === r.id ? '#0a84ff22' : '#111',
                  border: `2px solid ${reason === r.id ? '#0a84ff' : '#222'}`,
                  borderRadius: 14,
                  padding: '20px 16px',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: 15,
                  fontWeight: 600,
                  minHeight: 80,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'border-color 0.2s, background 0.2s',
                }}
              >
                <span style={{ fontSize: 28 }}>{r.emoji}</span>
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => reason && setScreen(3)}
            disabled={!reason}
            style={{
              marginTop: 40,
              width: '100%',
              background: reason ? '#0a84ff' : '#222',
              border: 'none',
              borderRadius: 14,
              padding: '18px',
              color: reason ? 'white' : '#555',
              fontSize: 17,
              fontWeight: 600,
              cursor: reason ? 'pointer' : 'not-allowed',
              minHeight: 56,
              transition: 'background 0.2s',
            }}
          >
            Continue →
          </button>
        </div>
      )}

      {screen === 3 && (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎙️</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'white', marginBottom: 8 }}>
            Pick your tutor voice
          </h1>
          <p style={{ fontSize: 15, color: '#666', marginBottom: 40 }}>
            Tap to hear a sample
          </p>

          <div style={{ display: 'flex', gap: 12 }}>
            {(['female', 'male'] as const).map((gender) => (
              <button
                key={gender}
                onClick={() => handleSelectVoice(gender)}
                style={{
                  flex: 1,
                  background: selectedVoice === gender ? '#0a84ff22' : '#111',
                  border: `2px solid ${selectedVoice === gender ? '#0a84ff' : '#222'}`,
                  borderRadius: 14,
                  padding: '24px 16px',
                  cursor: 'pointer',
                  color: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 120,
                  transition: 'border-color 0.2s, background 0.2s',
                }}
              >
                <span style={{ fontSize: 36 }}>{gender === 'female' ? '👩' : '👨'}</span>
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  {gender === 'female' ? 'Sofia' : 'Marco'}
                </span>
                <span style={{ fontSize: 13, color: '#888' }}>
                  {playingVoice === gender ? '▶ Playing...' : '▶ Play sample'}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={handleFinish}
            style={{
              marginTop: 40,
              width: '100%',
              background: '#0a84ff',
              border: 'none',
              borderRadius: 14,
              padding: '18px',
              color: 'white',
              fontSize: 17,
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: 56,
            }}
          >
            Start learning 🇮🇹
          </button>
        </div>
      )}
    </div>
  )
}
