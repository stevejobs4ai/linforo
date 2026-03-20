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
      className="page-enter"
      style={{
        background: 'var(--bg)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 48 }}>
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            style={{
              width: n === screen ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: n <= screen ? 'var(--accent)' : 'var(--border)',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Screen 1: Language selection */}
      {screen === 1 && (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🌍</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', marginBottom: 8, fontFamily: 'var(--font-heading)', letterSpacing: '-0.5px' }}>
            What language?
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 40, lineHeight: 1.5 }}>
            More languages coming soon
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {languages.map((lang) =>
              lang.available ? (
                <button
                  key={lang.id}
                  style={{
                    background: 'rgba(196,112,63,0.1)',
                    border: '2px solid var(--accent)',
                    borderRadius: 16,
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
                  <span style={{ fontSize: 32 }}>{lang.flag}</span>
                  {lang.name}
                  <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>Selected ✓</span>
                </button>
              ) : (
                <button
                  key={lang.id}
                  disabled
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    padding: '18px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    cursor: 'not-allowed',
                    color: 'var(--text-muted)',
                    fontSize: 18,
                    fontWeight: 500,
                    opacity: 0.45,
                  }}
                >
                  <span style={{ fontSize: 28 }}>{lang.flag}</span>
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
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 16,
              padding: '18px',
              color: 'white',
              fontSize: 17,
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: 56,
              boxShadow: '0 4px 24px rgba(196,112,63,0.35)',
            }}
          >
            Continue →
          </button>
        </div>
      )}

      {/* Screen 2: Learning reason */}
      {screen === 2 && (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎯</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', marginBottom: 8, fontFamily: 'var(--font-heading)', letterSpacing: '-0.5px' }}>
            Why are you learning?
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
            We&apos;ll tailor your experience
          </p>

          {/* SOS tip */}
          <div style={{
            background: 'rgba(196,60,40,0.1)',
            border: '1px solid rgba(196,60,40,0.25)',
            borderRadius: 14,
            padding: '12px 16px',
            marginBottom: 24,
            fontSize: 13,
            color: '#e87060',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            textAlign: 'left',
          }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>🆘</span>
            <span style={{ lineHeight: 1.5 }}>Tap 🆘 anytime for emergency phrases — just describe your situation and we&apos;ll translate instantly.</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {reasons.map((r) => (
              <button
                key={r.id}
                onClick={() => setReason(r.id)}
                style={{
                  background: reason === r.id ? 'rgba(196,112,63,0.12)' : 'var(--card)',
                  border: `2px solid ${reason === r.id ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 16,
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
                  boxShadow: reason === r.id ? '0 2px 16px rgba(196,112,63,0.15)' : 'none',
                }}
              >
                <span style={{ fontSize: 30 }}>{r.emoji}</span>
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
              background: reason ? 'var(--accent)' : 'var(--border)',
              border: 'none',
              borderRadius: 16,
              padding: '18px',
              color: reason ? 'white' : 'var(--text-muted)',
              fontSize: 17,
              fontWeight: 700,
              cursor: reason ? 'pointer' : 'not-allowed',
              minHeight: 56,
              transition: 'background 0.2s',
              boxShadow: reason ? '0 4px 24px rgba(196,112,63,0.35)' : 'none',
            }}
          >
            Continue →
          </button>
        </div>
      )}

      {/* Screen 3: Tutor persona */}
      {screen === 3 && (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎭</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', marginBottom: 8, fontFamily: 'var(--font-heading)', letterSpacing: '-0.5px' }}>
            Pick your tutor
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.5 }}>
            Tap to hear their voice
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PERSONAS.map((persona) => (
              <button
                key={persona.id}
                onClick={() => handleSelectPersona(persona.id)}
                style={{
                  background: selectedPersona === persona.id ? 'rgba(196,112,63,0.1)' : 'var(--card)',
                  border: `2px solid ${selectedPersona === persona.id ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 16,
                  padding: '16px 20px',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  textAlign: 'left',
                  transition: 'border-color 0.2s, background 0.2s',
                  boxShadow: selectedPersona === persona.id ? '0 2px 16px rgba(196,112,63,0.12)' : 'none',
                }}
              >
                <span style={{ fontSize: 36, flexShrink: 0 }}>{persona.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{persona.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    {persona.tagline}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--accent)', flexShrink: 0, fontWeight: 600 }}>
                  {playingVoice === persona.id ? '♪ Playing...' : '▶ Sample'}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setScreen(4)}
            style={{
              marginTop: 32,
              width: '100%',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 16,
              padding: '18px',
              color: 'white',
              fontSize: 17,
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: 56,
              boxShadow: '0 4px 24px rgba(196,112,63,0.35)',
            }}
          >
            Continue →
          </button>
        </div>
      )}

      {/* Screen 4: Confirm & start */}
      {screen === 4 && (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: 'rgba(196,112,63,0.12)',
            border: '2px solid rgba(196,112,63,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 52,
            margin: '0 auto 20px',
          }}>
            {PERSONAS.find((p) => p.id === selectedPersona)?.emoji}
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', marginBottom: 8, fontFamily: 'var(--font-heading)', letterSpacing: '-0.5px' }}>
            Meet {PERSONAS.find((p) => p.id === selectedPersona)?.name}!
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6, maxWidth: 340, margin: '0 auto 12px' }}>
            {PERSONAS.find((p) => p.id === selectedPersona)?.systemPromptAddition.slice(0, 100)}...
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 40, marginTop: 12 }}>
            You can change your tutor anytime in Settings.
          </p>

          <button
            onClick={handleFinish}
            style={{
              width: '100%',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 16,
              padding: '18px',
              color: 'white',
              fontSize: 17,
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: 56,
              boxShadow: '0 4px 24px rgba(196,112,63,0.4)',
            }}
          >
            Start learning 🇮🇹
          </button>
        </div>
      )}
    </div>
  )
}
