'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EmergencyPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/voice?sos=true')
  }, [router])

  return (
    <div style={{
      background: 'var(--bg)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{ fontSize: 48 }}>🆘</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 16, fontFamily: 'var(--font-heading)' }}>
          Opening emergency mode…
        </div>
      </div>
    </div>
  )
}
