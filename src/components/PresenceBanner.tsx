'use client'

/**
 * PresenceBanner — shows how many users are practicing Italian right now.
 * Uses Supabase Realtime presence. Opt-in via settings. Dismissible.
 */

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const OPT_IN_LS_KEY = 'linforo-presence-opt-in'
const DISMISSED_LS_KEY = 'linforo-presence-dismissed'

function getOptIn(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(OPT_IN_LS_KEY) === 'true'
}

function setOptIn(v: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(OPT_IN_LS_KEY, v ? 'true' : 'false')
}

function getDismissed(): boolean {
  if (typeof window === 'undefined') return false
  // Reset dismissal daily
  const raw = localStorage.getItem(DISMISSED_LS_KEY)
  if (!raw) return false
  try {
    const { date } = JSON.parse(raw) as { date: string }
    return date === new Date().toISOString().slice(0, 10)
  } catch {
    return false
  }
}

function dismiss(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(
    DISMISSED_LS_KEY,
    JSON.stringify({ date: new Date().toISOString().slice(0, 10) })
  )
}

interface Props {
  /** Pass the user's Supabase user id if available */
  userId?: string | null
  /** Whether this user is currently on the voice page (counts as "practicing") */
  isPracticing?: boolean
}

export default function PresenceBanner({ userId, isPracticing = false }: Props) {
  const [count, setCount] = useState(0)
  const [optedIn, setOptedIn] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    setMounted(true)
    setOptedIn(getOptIn())
    setDismissed(getDismissed())
  }, [])

  useEffect(() => {
    if (!mounted || !optedIn) return

    const presenceKey = userId ?? `anon-${Math.random().toString(36).slice(2)}`

    const channel = supabase.channel('presence:practicing', {
      config: { presence: { key: presenceKey } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setCount(Object.keys(state).length)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && isPracticing) {
          await channel.track({ user_id: presenceKey, at: Date.now() })
        }
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [mounted, optedIn, userId, isPracticing])

  if (!mounted || dismissed) return null

  if (!optedIn) {
    return (
      <div
        style={{
          background: '#0d1a0d',
          border: '1px solid #1a3a1a',
          borderRadius: 12,
          padding: '10px 16px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          fontSize: 13,
          color: '#7adf4a',
        }}
      >
        <span>See who&apos;s practicing right now?</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              setOptIn(true)
              setOptedIn(true)
            }}
            style={{
              background: '#1a4a1a',
              border: 'none',
              borderRadius: 8,
              padding: '4px 10px',
              color: '#7adf4a',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Sure
          </button>
          <button
            onClick={() => {
              dismiss()
              setDismissed(true)
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#555',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#0d1a0d',
        border: '1px solid #1a3a1a',
        borderRadius: 12,
        padding: '10px 16px',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 13,
        color: '#7adf4a',
      }}
    >
      <span>
        🟢{' '}
        <strong>{count > 0 ? count : '—'}</strong>{' '}
        {count === 1 ? 'person' : 'people'} practicing Italian right now
      </span>
      <button
        onClick={() => {
          dismiss()
          setDismissed(true)
        }}
        style={{
          background: 'none',
          border: 'none',
          color: '#555',
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
          padding: 0,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
