'use client'

/**
 * UsageBanner — shows remaining conversations for free users.
 * Shown inside the voice page header.
 */

import { useRouter } from 'next/navigation'
import { getRemainingConversations, getDailyLimit } from '@/lib/db-sync'

interface Props {
  plan: 'free' | 'premium'
}

export default function UsageBanner({ plan }: Props) {
  const router = useRouter()
  const remaining = getRemainingConversations(plan)
  const limit = getDailyLimit(plan)

  if (plan === 'premium') return null

  if (remaining === 0) {
    return (
      <div
        style={{
          background: '#1a0a0a',
          border: '1px solid #3a1a1a',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 12,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 14, color: '#ff3b30', fontWeight: 600, marginBottom: 6 }}>
          You&apos;ve used all {limit} free conversations today
        </div>
        <button
          onClick={() => router.push('/pricing')}
          style={{
            background: '#0a84ff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            color: 'white',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Upgrade to Premium for unlimited conversations →
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#0d1a0d',
        border: '1px solid #1a3a1a',
        borderRadius: 10,
        padding: '8px 14px',
        marginBottom: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 13,
      }}
    >
      <span style={{ color: '#7adf4a' }}>
        {remaining} of {limit} conversations left today
      </span>
      <button
        onClick={() => router.push('/pricing')}
        style={{
          background: 'none',
          border: 'none',
          color: '#0a84ff',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          padding: 0,
        }}
      >
        Upgrade ↗
      </button>
    </div>
  )
}
