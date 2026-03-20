'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { INTERESTS, type Interest, getInterests, setInterests, markInterestsSeen } from '@/lib/interests'

export default function InterestsPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<Interest>>(new Set())
  const [mounted, setMounted] = useState(false)
  const [customInput, setCustomInput] = useState('')

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

      {/* Free-text custom interest */}
      <div style={{ width: '100%', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>Or type your own…</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const trimmed = customInput.trim()
                if (trimmed && selected.size < 5) {
                  setSelected((prev) => new Set([...prev, trimmed.toLowerCase()]))
                  setCustomInput('')
                }
              }
            }}
            placeholder="e.g. Formula 1, Lord of the Rings…"
            style={{
              flex: 1,
              background: '#111',
              border: '1px solid #333',
              borderRadius: 12,
              padding: '12px 14px',
              color: 'white',
              fontSize: 15,
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button
            onClick={() => {
              const trimmed = customInput.trim()
              if (trimmed && selected.size < 5) {
                setSelected((prev) => new Set([...prev, trimmed.toLowerCase()]))
                setCustomInput('')
              }
            }}
            disabled={!customInput.trim() || selected.size >= 5}
            style={{
              background: customInput.trim() && selected.size < 5 ? '#0a84ff' : '#222',
              border: 'none',
              borderRadius: 12,
              padding: '12px 16px',
              color: 'white',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              minWidth: 52,
            }}
          >
            Add
          </button>
        </div>
        {/* Show custom (non-preset) selected items */}
        {Array.from(selected).filter((id) => !INTERESTS.some((i) => i.id === id)).map((custom) => (
          <div
            key={custom}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#0a84ff22',
              border: '1px solid #0a84ff',
              borderRadius: 20,
              padding: '4px 12px',
              marginTop: 8,
              marginRight: 6,
              fontSize: 13,
              color: '#0a84ff',
            }}
          >
            {custom}
            <button
              onClick={() => setSelected((prev) => { const next = new Set(prev); next.delete(custom); return next })}
              style={{ background: 'none', border: 'none', color: '#0a84ff', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }}
            >×</button>
          </div>
        ))}
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
