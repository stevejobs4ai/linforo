'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EmergencyPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/voice?sos=true')
  }, [router])

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#888', fontSize: 16 }}>🆘 Opening emergency mode…</div>
    </div>
  )
}
