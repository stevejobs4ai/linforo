'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { INTERESTS, type Interest, getInterests, setInterests, markInterestsSeen } from '@/lib/interests'

export default function InterestsPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<Interest>>(new Set())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const existing = getInterests()
    setSelected(new Set(existing))
  }, [])

  const toggle = (id: Interest) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 5) {
        next.add(id)
      }
      return next
    })
  }

  const handleSave = () => {
    setInterests(Array.from(selected))
    markInterestsSeen()
    router.push('/')
  }

  const handleSkip = () => {
    markInterestsSeen()
    router.push('/')
  }

  if (!mounted) return <div style={{ background: '#0a0a0a', minHeight: '100vh' }} />

  return (
    <div
      style={{
        background: '#0a0a0a',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 16px',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: 'white', marginBottom: 8, textAlign: 'center' }}>
        What are you into?
      </h1>
      <p style={{ fontSize: 15, color: '#666', marginBottom: 8, textAlign: 'center' }}>
        Pick up to 5 interests and your tutor will weave them into conversations
      </p>
      <p style={{ fontSize: 13, color: '#444', marginBottom: 32, textAlign: 'center' }}>
        {selected.size}/5 selected
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          width: '100%',
          marginBottom: 32,
        }}
      >
        {INTERESTS.map((item) => {
          const isSelected = selected.has(item.id)
          const isDisabled = !isSelected && selected.size >= 5
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              disabled={isDisabled}
              style={{
                background: isSelected ? '#0a84ff22' : '#111',
                border: `2px solid ${isSelected ? '#0a84ff' : '#222'}`,
                borderRadius: 14,
                padding: '18px 16px',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                color: isDisabled ? '#444' : 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: isDisabled ? 0.5 : 1,
                transition: 'border-color 0.2s, background 0.2s',
                minHeight: 64,
              }}
            >
              <span style={{ fontSize: 28 }}>{item.emoji}</span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{item.label}</span>
            </button>
          )
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={selected.size === 0}
        style={{
          width: '100%',
          background: selected.size > 0 ? '#0a84ff' : '#222',
          border: 'none',
          borderRadius: 14,
          padding: '18px',
          color: selected.size > 0 ? 'white' : '#555',
          fontSize: 17,
          fontWeight: 600,
          cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
          minHeight: 56,
          marginBottom: 12,
          transition: 'background 0.2s',
        }}
      >
        Save my interests →
      </button>

      <button
        onClick={handleSkip}
        style={{
          width: '100%',
          background: 'none',
          border: '1px solid #333',
          borderRadius: 14,
          padding: '14px',
          color: '#666',
          fontSize: 15,
          cursor: 'pointer',
          minHeight: 48,
        }}
      >
        Skip for now
      </button>
    </div>
  )
}
