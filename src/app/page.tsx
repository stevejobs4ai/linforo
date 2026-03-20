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
import { hasShownReminderPrompt, markReminderPromptShown, shouldShowInAppReminder, saveReminderPrefs, requestNotificationPermission, registerReminderServiceWorker } from '@/lib/reminders'
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

  const ringColor = readiness >= 70 ? '#7c9a5e' : readiness >= 40 ? '#d4a843' : '#c4703f'

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
        <circle cx="64" cy="64" r={R} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={R}
          fill="none"
          stroke={ringColor}
          strokeWidth="10"
          strokeDasharray={C}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 64 64)"
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.6s ease' }}
        />
        <text
          x="64"
          y="58"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--text)"
          fontSize="26"
          fontWeight="700"
          fontFamily="var(--font-sans)"
        >
          {readiness}%
        </text>
        <text
          x="64"
          y="80"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--text-muted)"
          fontSize="11"
          fontFamily="var(--font-sans)"
          letterSpacing="1.5"
        >
          READY
        </text>
      </svg>
      <div
        style={{
          fontSize: 15,
          color: 'var(--text-muted)',
          textAlign: 'center',
          marginTop: 6,
        }}
      >
        You&apos;re{' '}
        <span style={{ color: ringColor, fontWeight: 700 }}>{readiness}%</span>{' '}
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
  const [showReminderNudge, setShowReminderNudge] = useState(false)
  const [showReminderBanner, setShowReminderBanner] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState<{ scenarioId: string; title: string; suggestions: string[] } | null>(null)

  useEffect(() => {
    setMounted(true)
    if (!isOnboardingComplete()) {
      setShowOnboarding(true)
    } else {
      if (!hasSeenInterests()) {
        router.push('/interests')
        return
      }
      if (shouldShowAccountNudge() && localStorage.getItem('linforo-nudge-dismissed') !== '1') setShowNudge(true)
    }
    setReadiness(computeReadiness())

    const prompt = getTodayPrompt()
    setDailyPrompt(prompt)
    setDailyDone(isDailyPromptCompleted())
    if (!hasSeenTodayPrompt()) {
      markPromptSeen()
    }

    if (isOnboardingComplete() && !hasShownReminderPrompt()) {
      setShowReminderNudge(true)
      markReminderPromptShown()
    }

    const lastPractice = localStorage.getItem('linforo-last-practice-date')
    if (shouldShowInAppReminder(lastPractice)) {
      setShowReminderBanner(true)
    }
  }, [router])

  const handleOnboardingComplete = (voiceGender: 'female' | 'male') => {
    void voiceGender
    trackEvent('onboarding_completed')
    if (!hasSeenInterests()) {
      router.push('/interests')
      return
    }
    setShowOnboarding(false)
    setReadiness(computeReadiness())
    if (shouldShowAccountNudge() && localStorage.getItem('linforo-nudge-dismissed') !== '1') setShowNudge(true)
  }

  const SCENARIO_SUGGESTIONS: Record<string, string[]> = {
    freestyle: ['How do I say hello?', 'How do I introduce myself?', 'How do I ask for directions?', 'Teach me a common phrase'],
    greetings: ['How do I say hello?', 'How do I introduce myself?', 'How do I say goodbye?', "How do I ask someone's name?"],
    ordering: ['How do I order food?', 'How do I ask for the menu?', 'How do I ask for the bill?', 'How do I say I am allergic to something?'],
    shopping: ['How do I ask for the price?', 'How do I ask for a different size?', 'How do I say this is too expensive?', 'How do I say I want to buy this?'],
    transport: ['How do I ask where the train station is?', 'How do I buy a ticket?', 'How do I ask a taxi driver for an address?', 'How do I ask how far away something is?'],
    accommodation: ['How do I check in?', 'How do I ask for a room?', 'How do I ask for Wi-Fi?', 'How do I report a problem with my room?'],
    emergency: ['How do I say I need help?', 'How do I call the police?', 'How do I say I lost my passport?', 'How do I find a pharmacy?'],
  }

  const handleSelect = (id: string) => {
    if (id === 'roleplay') {
      setShowRoleplayPicker(true)
      return
    }
    const scenario = SCENARIOS.find((s) => s.id === id)
    const suggestions = SCENARIO_SUGGESTIONS[id]
    if (suggestions && scenario) {
      setShowSuggestions({ scenarioId: id, title: `${scenario.emoji} ${scenario.title}`, suggestions })
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
    return <div style={{ background: 'var(--bg)', minHeight: '100vh' }} />
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  const featured = SCENARIOS[0]
  const rest = SCENARIOS.slice(1)

  return (
    <main
      className="min-h-screen page-enter"
      style={{ background: 'var(--bg)', padding: '24px 20px' }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <button
            onClick={() => { trackEvent('emergency_opened'); router.push('/voice?sos=true') }}
            style={{
              background: 'rgba(196,60,40,0.12)',
              border: '1px solid rgba(196,60,40,0.3)',
              borderRadius: 22,
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              cursor: 'pointer',
            }}
            aria-label="Emergency phrases"
          >
            🆘
          </button>

          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: 'var(--text)',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '-0.5px',
                margin: 0,
                lineHeight: 1,
              }}
            >
              🇮🇹 Linforo
            </h1>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => router.push('/community')}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                cursor: 'pointer',
              }}
              aria-label="Community"
            >
              👥
            </button>
            <button
              onClick={() => router.push('/profile')}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                cursor: 'pointer',
              }}
              aria-label="Profile"
            >
              👤
            </button>
            <button
              onClick={() => router.push('/history')}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
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
            fontSize: 15,
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginBottom: 10,
          }}
        >
          Choose a scenario to practice
        </p>

        {/* In-app reminder banner */}
        {showReminderBanner && (
          <div
            style={{
              background: 'rgba(196, 112, 63, 0.1)',
              border: '1px solid rgba(196, 112, 63, 0.3)',
              borderRadius: 14,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600 }}>
              🇮🇹 Ready for today&apos;s Italian?
            </div>
            <button
              onClick={() => setShowReminderBanner(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: 0, minWidth: 28, minHeight: 28 }}
            >
              ×
            </button>
          </div>
        )}

        {/* Interests & settings link */}
        <div style={{ textAlign: 'center', marginBottom: 10, display: 'flex', justifyContent: 'center', gap: 20 }}>
          <button
            onClick={() => router.push('/interests')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'underline',
              textDecorationColor: 'var(--border2)',
            }}
          >
            ✨ My interests
          </button>
          <button
            onClick={() => router.push('/settings')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'underline',
              textDecorationColor: 'var(--border2)',
            }}
          >
            ⚙️ Settings
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
            className="card-hover"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(124,154,94,0.15) 0%, rgba(212,168,67,0.12) 100%)',
              border: '1px solid rgba(124,154,94,0.4)',
              borderRadius: 18,
              padding: '18px 20px',
              marginBottom: 16,
              cursor: 'pointer',
              textAlign: 'left',
              minHeight: 48,
              boxShadow: '0 2px 16px rgba(124,154,94,0.1)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--accent2)', fontWeight: 700, marginBottom: 5, letterSpacing: '1px', textTransform: 'uppercase' }}>
              🎯 Today&apos;s Challenge
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', lineHeight: 1.3 }}>
              {dailyPrompt.text}
            </div>
            <div style={{ fontSize: 13, color: 'var(--accent2)', marginTop: 6, opacity: 0.8 }}>
              Tap to start this conversation →
            </div>
          </button>
        )}

        {dailyPrompt && dailyDone && (
          <div
            style={{
              background: 'rgba(124,154,94,0.08)',
              border: '1px solid rgba(124,154,94,0.25)',
              borderRadius: 18,
              padding: '14px 20px',
              marginBottom: 16,
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--accent2)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
              ✅ Today&apos;s Challenge Done
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
              {dailyPrompt.text}
            </div>
          </div>
        )}

        {/* One-time reminder nudge */}
        {showReminderNudge && (
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 18,
              padding: '18px 18px',
              marginBottom: 16,
              boxShadow: 'var(--shadow)',
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6, fontFamily: 'var(--font-heading)' }}>
              🇮🇹 Daily Italian reminder?
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
              We&apos;ll nudge you once a day — no guilt if you skip!
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={async () => {
                  const granted = await requestNotificationPermission()
                  if (granted) {
                    await registerReminderServiceWorker()
                    saveReminderPrefs({ enabled: true, time: '09:00' })
                  }
                  setShowReminderNudge(false)
                }}
                style={{
                  flex: 1,
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  minHeight: 48,
                }}
              >
                Yes, remind me!
              </button>
              <button
                onClick={() => setShowReminderNudge(false)}
                style={{
                  flex: 1,
                  background: 'var(--card2)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '12px',
                  color: 'var(--text-muted)',
                  fontSize: 14,
                  cursor: 'pointer',
                  minHeight: 48,
                }}
              >
                Maybe later
              </button>
            </div>
          </div>
        )}

        {/* Account nudge banner */}
        {showNudge && (
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '14px 16px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              cursor: 'pointer',
              boxShadow: 'var(--shadow)',
            }}
            onClick={() => router.push('/sign-up')}
          >
            <div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                Create an account to save your progress
              </p>
              <p style={{ fontSize: 12, color: 'var(--accent)', margin: '2px 0 0', fontWeight: 700 }}>
                Tap to sign up →
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                localStorage.setItem('linforo-nudge-dismissed', '1')
                setShowNudge(false)
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
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
          className="card-hover"
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, rgba(196,112,63,0.2) 0%, rgba(212,168,67,0.15) 50%, rgba(196,112,63,0.1) 100%)',
            border: '1px solid rgba(196,112,63,0.35)',
            borderRadius: 20,
            padding: '28px 24px',
            marginBottom: 12,
            cursor: 'pointer',
            textAlign: 'left',
            minHeight: 48,
            boxShadow: '0 4px 24px rgba(196,112,63,0.08)',
          }}
        >
          <div style={{ fontSize: 36 }}>{featured.emoji}</div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--text)',
              marginTop: 8,
              fontFamily: 'var(--font-heading)',
            }}
          >
            {featured.title}
          </div>
          <div style={{ fontSize: 15, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
            {featured.description}
          </div>
        </button>

        {/* Roleplay card */}
        <button
          onClick={() => handleSelect('roleplay')}
          className="card-hover"
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, rgba(124,90,180,0.15) 0%, rgba(90,60,160,0.12) 100%)',
            border: '1px solid rgba(124,90,180,0.3)',
            borderRadius: 20,
            padding: '22px 24px',
            marginBottom: 20,
            cursor: 'pointer',
            textAlign: 'left',
            minHeight: 48,
            boxShadow: '0 4px 24px rgba(90,60,160,0.06)',
          }}
          aria-label="Roleplay a full conversation"
        >
          <div style={{ fontSize: 36 }}>🎭</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text)',
              marginTop: 8,
              fontFamily: 'var(--font-heading)',
            }}
          >
            Roleplay
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
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
          {rest.map((scenario, i) => (
            <button
              key={scenario.id}
              onClick={() => handleSelect(scenario.id)}
              className="card-hover stagger-item"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '18px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: 48,
                boxShadow: 'var(--shadow)',
                animationDelay: `${i * 50}ms`,
              }}
            >
              <div style={{ fontSize: 28 }}>{scenario.emoji}</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--text)',
                  marginTop: 6,
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {scenario.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.3 }}>
                {scenario.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Scenario suggestions bottom sheet */}
      {showSuggestions && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(26,20,16,0.88)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 100,
            padding: '0 0 40px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSuggestions(null)
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '24px 24px 0 0',
              padding: '24px 20px 32px',
              width: '100%',
              maxWidth: 600,
              boxShadow: '0 -8px 48px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ width: 40, height: 4, background: 'var(--border2)', borderRadius: 2, margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 6, fontFamily: 'var(--font-heading)' }}>
              {showSuggestions.title}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
              What would you like to practice?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {showSuggestions.suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    trackEvent('scenario_selected', { scenario: showSuggestions.scenarioId, source: 'suggestion' })
                    router.push(`/voice?scenario=${showSuggestions.scenarioId}&suggestion=${encodeURIComponent(s)}`)
                    setShowSuggestions(null)
                  }}
                  style={{
                    background: 'var(--card2)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    color: 'var(--text)',
                    fontSize: 15,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    minHeight: 48,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                trackEvent('scenario_selected', { scenario: showSuggestions.scenarioId })
                router.push(`/voice?scenario=${showSuggestions.scenarioId}`)
                setShowSuggestions(null)
              }}
              style={{
                width: '100%',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 14,
                padding: '14px',
                color: 'white',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: 10,
                minHeight: 48,
              }}
            >
              🎤 Ask freely
            </button>
            <button
              onClick={() => setShowSuggestions(null)}
              style={{
                width: '100%',
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '12px',
                color: 'var(--text-muted)',
                fontSize: 14,
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Roleplay character picker modal */}
      {showRoleplayPicker && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(26,20,16,0.88)',
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
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '24px 24px 0 0',
              padding: '24px 20px 32px',
              width: '100%',
              maxWidth: 600,
              boxShadow: '0 -8px 48px rgba(0,0,0,0.4)',
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                background: 'var(--border2)',
                borderRadius: 2,
                margin: '0 auto 20px',
              }}
            />
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: 6,
                fontFamily: 'var(--font-heading)',
              }}
            >
              🎭 Choose a character
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
              You&apos;ll navigate a full conversation in Italian
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ROLEPLAY_CHARACTERS.map((char) => (
                <button
                  key={char.id}
                  onClick={() => handleRoleplayCharacter(char.id)}
                  style={{
                    background: 'var(--card2)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
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
                    <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
                      {char.label}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
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
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '14px',
                color: 'var(--text-muted)',
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
