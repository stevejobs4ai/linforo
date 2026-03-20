'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SCENARIOS } from '@/lib/scenarios'
import { isOnboardingComplete } from '@/lib/onboarding'
import { shouldShowAccountNudge } from '@/lib/conversationCount'
import { computeReadiness } from '@/lib/readiness'
import { hasSeenInterests } from '@/lib/interests'
import { getTodayPrompt, hasSeenTodayPrompt, markPromptSeen, isDailyPromptCompleted } from '@/lib/dailyPrompt'
import { trackEvent } from '@/lib/analytics'
import Onboarding from '@/components/Onboarding'
import PresenceBanner from '@/components/PresenceBanner'

const ROLEPLAY_CHARACTERS = [
  { id: 'waiter', emoji: '🍝', label: 'Waiter', description: 'Trattoria in Rome' },
  { id: 'shopkeeper', emoji: '🛒', label: 'Shopkeeper', description: 'Florence market' },
  { id: 'taxi', emoji: '🚕', label: 'Taxi Driver', description: 'Rome streets' },
  { id: 'hotel', emoji: '🏨', label: 'Hotel Receptionist', description: 'Milan hotel' },
]

function ReadinessRing({ readiness }: { readiness: number }) {
  const R = 54
  const C = 2 * Math.PI * R
  const offset = C - (readiness / 100) * C

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 28,
        padding: '20px 0 8px',
      }}
    >
      <svg width="128" height="128" aria-label={`${readiness}% travel ready`}>
        <circle cx="64" cy="64" r={R} fill="none" stroke="#1a1a1a" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={R}
          fill="none"
          stroke="#0a84ff"
          strokeWidth="10"
          strokeDasharray={C}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 64 64)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text
          x="64"
          y="58"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="26"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          {readiness}%
        </text>
        <text
          x="64"
          y="80"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#555"
          fontSize="11"
          fontFamily="system-ui, sans-serif"
        >
          READY
        </text>
      </svg>
      <div
        style={{
          fontSize: 15,
          color: '#888',
          textAlign: 'center',
          marginTop: 4,
        }}
      >
        You&apos;re{' '}
        <span style={{ color: '#0a84ff', fontWeight: 600 }}>{readiness}%</span>{' '}
        ready for Italy
      </div>
    </div>
  )
}

export default function ScenarioPicker() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showNudge, setShowNudge] = useState(false)
  const [readiness, setReadiness] = useState(0)
  const [showRoleplayPicker, setShowRoleplayPicker] = useState(false)
  const [dailyPrompt, setDailyPrompt] = useState<ReturnType<typeof getTodayPrompt> | null>(null)
  const [dailyDone, setDailyDone] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isOnboardingComplete()) {
      setShowOnboarding(true)
    } else {
      // After onboarding, show interests screen if never set
      if (!hasSeenInterests()) {
        router.push('/interests')
        return
      }
      if (shouldShowAccountNudge()) setShowNudge(true)
    }
    setReadiness(computeReadiness())

    // Daily prompt
    const prompt = getTodayPrompt()
    setDailyPrompt(prompt)
    setDailyDone(isDailyPromptCompleted())
    if (!hasSeenTodayPrompt()) {
      markPromptSeen()
    }
  }, [router])

  const handleOnboardingComplete = (voiceGender: 'female' | 'male') => {
    void voiceGender
    setShowOnboarding(false)
    setReadiness(computeReadiness())
    trackEvent('onboarding_completed')
    // Show interests screen
    if (!hasSeenInterests()) {
      router.push('/interests')
      return
    }
    if (shouldShowAccountNudge()) setShowNudge(true)
  }

  const handleSelect = (id: string) => {
    if (id === 'roleplay') {
      setShowRoleplayPicker(true)
      return
    }
    trackEvent('scenario_selected', { scenario: id })
    router.push(`/voice?scenario=${id}`)
  }

  const handleRoleplayCharacter = (characterId: string) => {
    setShowRoleplayPicker(false)
    trackEvent('roleplay_started', { character: characterId })
    router.push(`/voice?scenario=roleplay&character=${characterId}`)
  }

  const handleDailyPrompt = () => {
    if (!dailyPrompt) return
    trackEvent('scenario_selected', { scenario: dailyPrompt.scenario, source: 'daily_prompt' })
    router.push(`/voice?scenario=${dailyPrompt.scenario}&dailyContext=${encodeURIComponent(dailyPrompt.context)}`)
  }

  if (!mounted) {
    return <div style={{ background: '#0a0a0a', minHeight: '100vh' }} />
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  const featured = SCENARIOS[0]
  const rest = SCENARIOS.slice(1)

  return (
    <main
      className="min-h-screen"
      style={{ background: '#0a0a0a', padding: '24px 16px' }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <button
            onClick={() => { trackEvent('emergency_opened'); router.push('/emergency') }}
            style={{
              background: '#1a0a0a',
              border: '1px solid #3a1a1a',
              borderRadius: 20,
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              cursor: 'pointer',
            }}
            aria-label="Emergency phrases"
          >
            🆘
          </button>

          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'white',
              textAlign: 'center',
              margin: 0,
            }}
          >
            🇮🇹 Linforo
          </h1>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => router.push('/community')}
              style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: 20,
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                cursor: 'pointer',
              }}
              aria-label="Community"
            >
              👥
            </button>
            <button
              onClick={() => router.push('/profile')}
              style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: 20,
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                cursor: 'pointer',
              }}
              aria-label="Profile"
            >
              👤
            </button>
            <button
              onClick={() => router.push('/history')}
              style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: 20,
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                cursor: 'pointer',
              }}
              aria-label="Conversation history"
            >
              🕐
            </button>
          </div>
        </div>

        <p
          style={{
            fontSize: 16,
            color: '#888',
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Choose a scenario to practice
        </p>

        {/* Interests & settings link */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <button
            onClick={() => router.push('/interests')}
            style={{
              background: 'none',
              border: 'none',
              color: '#555',
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            ✨ My interests
          </button>
        </div>

        {/* Live presence banner */}
        <PresenceBanner />

        {/* Travel Readiness Ring */}
        <ReadinessRing readiness={readiness} />

        {/* Daily challenge card */}
        {dailyPrompt && !dailyDone && (
          <button
            onClick={handleDailyPrompt}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #1a2a0a 0%, #1e300e 100%)',
              border: '1px solid #3a5a1a',
              borderRadius: 16,
              padding: '18px 20px',
              marginBottom: 16,
              cursor: 'pointer',
              textAlign: 'left',
              minHeight: 48,
            }}
          >
            <div style={{ fontSize: 13, color: '#7adf4a', fontWeight: 600, marginBottom: 4 }}>
              🎯 TODAY&apos;S CHALLENGE
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>
              {dailyPrompt.text}
            </div>
            <div style={{ fontSize: 13, color: '#7a9a4a', marginTop: 4 }}>
              Tap to start this conversation →
            </div>
          </button>
        )}

        {dailyPrompt && dailyDone && (
          <div
            style={{
              background: '#0a1a0a',
              border: '1px solid #1a3a1a',
              borderRadius: 16,
              padding: '14px 20px',
              marginBottom: 16,
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: 13, color: '#4caf50', fontWeight: 600 }}>
              ✅ TODAY&apos;S CHALLENGE DONE
            </div>
            <div style={{ fontSize: 14, color: '#555', marginTop: 2 }}>
              {dailyPrompt.text}
            </div>
          </div>
        )}

        {/* Account nudge banner */}
        {showNudge && (
          <div
            style={{
              background: '#1a1a2e',
              border: '1px solid #334',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <p style={{ fontSize: 14, color: '#aaa', margin: 0 }}>
              Create an account to save your progress
            </p>
            <button
              onClick={() => setShowNudge(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#555',
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1,
                padding: 4,
                minWidth: 28,
                minHeight: 28,
              }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {/* Featured: Freestyle */}
        <button
          onClick={() => handleSelect(featured.id)}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            border: '1px solid #334',
            borderRadius: 16,
            padding: '28px 24px',
            marginBottom: 12,
            cursor: 'pointer',
            textAlign: 'left',
            minHeight: 48,
          }}
        >
          <div style={{ fontSize: 36 }}>{featured.emoji}</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'white',
              marginTop: 8,
            }}
          >
            {featured.title}
          </div>
          <div style={{ fontSize: 15, color: '#aaa', marginTop: 4 }}>
            {featured.description}
          </div>
        </button>

        {/* Roleplay card */}
        <button
          onClick={() => handleSelect('roleplay')}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #1a0a2e 0%, #2a0f3e 50%, #1a0a5e 100%)',
            border: '1px solid #443',
            borderRadius: 16,
            padding: '22px 24px',
            marginBottom: 20,
            cursor: 'pointer',
            textAlign: 'left',
            minHeight: 48,
          }}
          aria-label="Roleplay a full conversation"
        >
          <div style={{ fontSize: 36 }}>🎭</div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'white',
              marginTop: 8,
            }}
          >
            Roleplay
          </div>
          <div style={{ fontSize: 14, color: '#aaa', marginTop: 4 }}>
            Full character conversations — waiter, shopkeeper, taxi driver & more
          </div>
        </button>

        {/* Travel scenarios grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
        >
          {rest.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => handleSelect(scenario.id)}
              style={{
                background: '#111',
                border: '1px solid #222',
                borderRadius: 12,
                padding: '18px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: 48,
              }}
            >
              <div style={{ fontSize: 28 }}>{scenario.emoji}</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'white',
                  marginTop: 6,
                }}
              >
                {scenario.title}
              </div>
              <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                {scenario.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Roleplay character picker modal */}
      {showRoleplayPicker && (
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
            if (e.target === e.currentTarget) setShowRoleplayPicker(false)
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
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'white',
                marginBottom: 6,
              }}
            >
              🎭 Choose a character
            </h2>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>
              You&apos;ll navigate a full conversation in Italian
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ROLEPLAY_CHARACTERS.map((char) => (
                <button
                  key={char.id}
                  onClick={() => handleRoleplayCharacter(char.id)}
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: 14,
                    padding: '16px 18px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    minHeight: 64,
                  }}
                >
                  <span style={{ fontSize: 28 }}>{char.emoji}</span>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: 'white' }}>
                      {char.label}
                    </div>
                    <div style={{ fontSize: 13, color: '#666' }}>
                      {char.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowRoleplayPicker(false)}
              style={{
                width: '100%',
                background: 'none',
                border: '1px solid #333',
                borderRadius: 14,
                padding: '14px',
                color: '#666',
                fontSize: 15,
                cursor: 'pointer',
                marginTop: 14,
                minHeight: 48,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
