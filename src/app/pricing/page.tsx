'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

const FREE_FEATURES = [
  '5 voice conversations/day',
  'All scenario types',
  'Phrase bookmarking',
  'Travel readiness score',
  'Basic TTS voice',
]

const PREMIUM_FEATURES = [
  '50 voice conversations/day',
  'Natural ElevenLabs Italian voice',
  'All scenario types',
  'Phrase bookmarking & mastery tracking',
  'Community feed + badges',
  'Shareable progress cards',
  'Priority support',
]

export default function PricingPage() {
  const router = useRouter()
  const { user } = useUser()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)

  async function checkout() {
    if (!user) {
      router.push('/sign-in')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkId: user.id,
          plan: billing,
          successUrl: `${window.location.origin}/profile?upgraded=1`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="page-enter"
      style={{ background: 'var(--bg)', minHeight: '100vh', padding: '24px 20px' }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 22,
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              cursor: 'pointer',
              color: 'var(--text)',
              flexShrink: 0,
            }}
          >
            ←
          </button>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: 'var(--font-heading)', letterSpacing: '-0.5px' }}>
            ⭐ Upgrade to Premium
          </h1>
        </div>

        {/* Billing toggle */}
        <div
          style={{
            display: 'flex',
            background: 'var(--card)',
            borderRadius: 14,
            padding: 4,
            marginBottom: 28,
            gap: 4,
            border: '1px solid var(--border)',
          }}
        >
          {(['monthly', 'yearly'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              style={{
                flex: 1,
                padding: '11px 0',
                borderRadius: 11,
                border: 'none',
                background: billing === b ? 'var(--accent)' : 'transparent',
                color: billing === b ? 'white' : 'var(--text-muted)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 14,
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {b === 'monthly' ? 'Monthly' : 'Yearly (save 33%)'}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
          {/* Free */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 22,
              padding: 24,
              boxShadow: 'var(--shadow)',
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontFamily: 'var(--font-heading)' }}>
              Free
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>
              $0
              <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text-muted)' }}>/month</span>
            </div>
            {FREE_FEATURES.map((f) => (
              <div
                key={f}
                style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 14, color: 'var(--text-muted)' }}
              >
                <span style={{ color: 'var(--text-dim)', fontSize: 16 }}>✓</span> {f}
              </div>
            ))}
            <div
              style={{
                marginTop: 18,
                padding: '11px 0',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 14,
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontWeight: 600,
              }}
            >
              Current plan
            </div>
          </div>

          {/* Premium */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(196,112,63,0.12) 0%, rgba(212,168,67,0.08) 100%)',
              border: '2px solid var(--accent)',
              borderRadius: 22,
              padding: 24,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 32px rgba(196,112,63,0.15)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'var(--accent)',
                color: 'white',
                fontSize: 11,
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: 20,
                letterSpacing: '0.5px',
              }}
            >
              POPULAR
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontFamily: 'var(--font-heading)' }}>
              Premium
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
              {billing === 'monthly' ? '$9.99' : '$6.67'}
              <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text-muted)' }}>/month</span>
            </div>
            {billing === 'yearly' && (
              <div style={{ fontSize: 13, color: 'var(--accent2)', marginBottom: 14, fontWeight: 700 }}>
                $79.99/year — save $40
              </div>
            )}
            <div style={{ marginBottom: 16 }} />
            {PREMIUM_FEATURES.map((f) => (
              <div
                key={f}
                style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 14, color: 'var(--text)' }}
              >
                <span style={{ color: 'var(--accent)', fontSize: 16, fontWeight: 700 }}>✓</span> {f}
              </div>
            ))}
            <button
              onClick={checkout}
              disabled={loading}
              style={{
                width: '100%',
                marginTop: 22,
                padding: '15px 0',
                borderRadius: 14,
                background: loading ? 'var(--border)' : 'var(--accent)',
                border: 'none',
                color: 'white',
                fontWeight: 700,
                fontSize: 16,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                fontFamily: 'inherit',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(196,112,63,0.4)',
              }}
            >
              {loading ? 'Loading…' : `Get Premium ${billing === 'yearly' ? '(Yearly)' : '(Monthly)'} →`}
            </button>
          </div>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', paddingBottom: 32, lineHeight: 1.6 }}>
          Cancel anytime · Secure checkout via Stripe · 7-day refund policy
        </div>
      </div>
    </main>
  )
}
