'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SCENARIOS } from '@/lib/scenarios'
import { isOnboardingComplete } from '@/lib/onboarding'
import { shouldShowAccountNudge } from '@/lib/conversationCount'
import Onboarding from '@/components/Onboarding'

export default function ScenarioPicker() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showNudge, setShowNudge] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isOnboardingComplete()) {
      setShowOnboarding(true)
    } else if (shouldShowAccountNudge()) {
      setShowNudge(true)
    }
  }, [])

  const handleOnboardingComplete = (voiceGender: 'female' | 'male') => {
    void voiceGender
    setShowOnboarding(false)
    if (shouldShowAccountNudge()) setShowNudge(true)
  }

  const handleSelect = (id: string) => {
    router.push(`/voice?scenario=${id}`)
  }

  // Avoid flash of wrong content on server
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
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'white',
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          🇮🇹 Linforo
        </h1>
        <p
          style={{
            fontSize: 16,
            color: '#888',
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          Choose a scenario to practice
        </p>

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
            marginBottom: 20,
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
    </main>
  )
}
