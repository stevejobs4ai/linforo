'use client'

import { useState, useRef } from 'react'
import { LearningReason, completeOnboarding } from '@/lib/onboarding'
import { PERSONAS, PersonaId, savePersona } from '@/lib/personas'
import { getAvailableLanguages } from '@/lib/scenarios'

const SAMPLE_TEXT = 'Ciao! Benvenuto.'

interface OnboardingProps {
  onComplete: (voiceGender: 'female' | 'male') => void
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [screen, setScreen] = useState<1 | 2 | 3 | 4>(1)
  const [reason, setReason] = useState<LearningReason | null>(null)
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>('sofia')
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const languages = getAvailableLanguages()

  const playVoiceSample = async (voiceId: string, personaId: string) => {
    if (playingVoice) return
    setPlayingVoice(personaId)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: SAMPLE_TEXT, voiceId }),
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

  const handleSelectPersona = (id: PersonaId) => {
    const persona = PERSONAS.find((p) => p.id === id)!
    setSelectedPersona(id)
    playVoiceSample(persona.voiceId, id)
  }

  const handleFinish = () => {
    if (!reason) return
    const persona = PERSONAS.find((p) => p.id === selectedPersona)!
    savePersona(selectedPersona)
    completeOnboarding(reason, persona.voiceGender)
    onComplete(persona.voiceGender)
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
        background: 'var(--bg)',
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
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: n <= screen ? '#0a84ff' : 'var(--border)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>

      {/* Screen 1: Language selection */}
      {screen === 1 && (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌍</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            What language?
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 40 }}>
            More coming soon
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {languages.map((lang) =>
              lang.available ? (
                <button
                  key={lang.id}
                  style={{
                    background: '#0a84ff22',
                    border: '2px solid #0a84ff',
                    borderRadius: 14,
                    padding: '18px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    cursor: 'pointer',
                    color: 'var(--text)',
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ fontSize: 28 }}>{lang.flag}</span>
                  {lang.name}
                  <span style={{ marginLeft: 'auto', fontSize: 13, color: '#0a84ff' }}>Selected</span>
                </button>
              ) : (
                <button
                  key={lang.id}
                  disabled
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: '18px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    cursor: 'not-allowed',
                    color: 'var(--text-muted)',
                    fontSize: 18,
                    fontWeight: 500,
                    opacity: 0.5,
                  }}
                >
                  <span style={{ fontSize: 24 }}>{lang.flag}</span>
                  {lang.name}
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                    Coming soon
                  </span>
                </button>
              )
            )}
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

      {/* Screen 2: Learning reason */}
      {screen === 2 && (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            Why are you learning?
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 20 }}>
            We&apos;ll tailor your experience
          </p>

          {/* SOS tip */}
          <div style={{
            background: '#1a0a0a',
            border: '1px solid #3a1a1a',
            borderRadius: 12,
            padding: '10px 14px',
            marginBottom: 24,
            fontSize: 13,
            color: '#ff9999',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span>🆘</span>
            <span>Tap 🆘 anytime for emergency phrases — just describe your situation and we&apos;ll translate instantly.</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {reasons.map((r) => (
              <button
                key={r.id}
                onClick={() => setReason(r.id)}
                style={{
                  background: reason === r.id ? '#0a84ff22' : 'var(--card)',
                  border: `2px solid ${reason === r.id ? '#0a84ff' : 'var(--border)'}`,
                  borderRadius: 14,
                  padding: '20px 16px',
                  cursor: 'pointer',
                  color: 'var(--text)',
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
              background: reason ? '#0a84ff' : 'var(--border)',
              border: 'none',
              borderRadius: 14,
              padding: '18px',
              color: reason ? 'white' : 'var(--text-muted)',
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

      {/* Screen 3: Tutor persona */}
      {screen === 3 && (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎭</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            Pick your tutor
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 32 }}>
            Tap to hear their voice
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PERSONAS.map((persona) => (
              <button
                key={persona.id}
                onClick={() => handleSelectPersona(persona.id)}
                style={{
                  background: selectedPersona === persona.id ? '#0a84ff22' : 'var(--card)',
                  border: `2px solid ${selectedPersona === persona.id ? '#0a84ff' : 'var(--border)'}`,
                  borderRadius: 14,
                  padding: '18px 20px',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  textAlign: 'left',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
              >
                <span style={{ fontSize: 36, flexShrink: 0 }}>{persona.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{persona.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    {persona.tagline}
                  </div>
                </div>
                <span style={{ fontSize: 13, color: '#888', flexShrink: 0 }}>
                  {playingVoice === persona.id ? '▶ Playing...' : '▶ Sample'}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setScreen(4)}
            style={{
              marginTop: 32,
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

      {/* Screen 4: Confirm & start */}
      {screen === 4 && (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>
            {PERSONAS.find((p) => p.id === selectedPersona)?.emoji}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            Meet {PERSONAS.find((p) => p.id === selectedPersona)?.name}!
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
            {PERSONAS.find((p) => p.id === selectedPersona)?.systemPromptAddition.slice(0, 100)}...
          </p>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 40 }}>
            You can change your tutor anytime in Settings.
          </p>

          <button
            onClick={handleFinish}
            style={{
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
