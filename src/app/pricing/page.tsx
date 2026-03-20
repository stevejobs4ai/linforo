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
    <main style={{ background: '#0a0a0a', minHeight: '100vh', padding: '24px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <button
            onClick={() => router.back()}
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 20,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              cursor: 'pointer',
              color: 'white',
            }}
          >
            ←
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', margin: 0 }}>
            ⭐ Upgrade to Premium
          </h1>
        </div>

        {/* Billing toggle */}
        <div
          style={{
            display: 'flex',
            background: '#1a1a1a',
            borderRadius: 12,
            padding: 4,
            marginBottom: 28,
            gap: 4,
          }}
        >
          {(['monthly', 'yearly'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 10,
                border: 'none',
                background: billing === b ? '#0a84ff' : 'transparent',
                color: billing === b ? 'white' : '#666',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 14,
                transition: 'all 0.15s',
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
              background: '#111',
              border: '1px solid #222',
              borderRadius: 20,
              padding: 24,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 4 }}>
              Free
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'white', marginBottom: 16 }}>
              $0
              <span style={{ fontSize: 14, fontWeight: 400, color: '#555' }}>/month</span>
            </div>
            {FREE_FEATURES.map((f) => (
              <div
                key={f}
                style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 14, color: '#888' }}
              >
                <span style={{ color: '#444' }}>✓</span> {f}
              </div>
            ))}
            <div
              style={{
                marginTop: 16,
                padding: '10px 0',
                textAlign: 'center',
                color: '#555',
                fontSize: 14,
                border: '1px solid #333',
                borderRadius: 10,
              }}
            >
              Current plan
            </div>
          </div>

          {/* Premium */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0a1a2a 0%, #0a0a2a 100%)',
              border: '2px solid #0a84ff',
              borderRadius: 20,
              padding: 24,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                background: '#0a84ff',
                color: 'white',
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 20,
              }}
            >
              POPULAR
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 4 }}>
              Premium
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'white', marginBottom: 4 }}>
              {billing === 'monthly' ? '$9.99' : '$6.67'}
              <span style={{ fontSize: 14, fontWeight: 400, color: '#555' }}>/month</span>
            </div>
            {billing === 'yearly' && (
              <div style={{ fontSize: 13, color: '#7adf4a', marginBottom: 12 }}>
                $79.99/year — save $40
              </div>
            )}
            <div style={{ marginBottom: 16 }} />
            {PREMIUM_FEATURES.map((f) => (
              <div
                key={f}
                style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 14, color: '#ccc' }}
              >
                <span style={{ color: '#0a84ff' }}>✓</span> {f}
              </div>
            ))}
            <button
              onClick={checkout}
              disabled={loading}
              style={{
                width: '100%',
                marginTop: 20,
                padding: '14px 0',
                borderRadius: 12,
                background: loading ? '#1a1a2a' : '#0a84ff',
                border: 'none',
                color: 'white',
                fontWeight: 700,
                fontSize: 16,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Loading…' : `Get Premium ${billing === 'yearly' ? '(Yearly)' : '(Monthly)'} →`}
            </button>
          </div>
        </div>

        <div style={{ fontSize: 13, color: '#555', textAlign: 'center', paddingBottom: 32 }}>
          Cancel anytime · Secure checkout via Stripe · 7-day refund policy
        </div>
      </div>
    </main>
  )
}
