'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

/**
 * /r/[code] — referral landing page.
 * Stores the referral code in localStorage so it can be applied during sign-up.
 */

const REFERRAL_LS_KEY = 'linforo-referral-code'

export default function ReferralPage() {
  const router = useRouter()
  const params = useParams()
  const code = typeof params.code === 'string' ? params.code : ''

  useEffect(() => {
    if (code && typeof window !== 'undefined') {
      localStorage.setItem(REFERRAL_LS_KEY, code)
    }
    // Redirect to home — onboarding/sign-up will pick up the code
    router.replace('/')
  }, [code, router])

  return (
    <main
      style={{
        background: '#0a0a0a',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ fontSize: 48 }}>🇮🇹</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>Welcome to Linforo!</div>
      <div style={{ fontSize: 15, color: '#666' }}>A friend invited you. Loading…</div>
    </main>
  )
}
