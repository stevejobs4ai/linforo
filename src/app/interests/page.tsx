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

  if (!mounted) return <div style={{ background: 'var(--bg)', minHeight: '100vh' }} />

  return (
    <div
      className="page-enter"
      style={{
        background: 'var(--bg)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <div style={{ fontSize: 52, marginBottom: 16 }}>✨</div>
      <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--text)', marginBottom: 8, textAlign: 'center', fontFamily: 'var(--font-heading)', letterSpacing: '-0.5px' }}>
        What are you into?
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 8, textAlign: 'center', lineHeight: 1.5 }}>
        Pick up to 5 interests and your tutor will weave them into conversations
      </p>
      <div style={{
        fontSize: 13,
        color: 'var(--accent)',
        fontWeight: 700,
        marginBottom: 28,
        background: 'rgba(196,112,63,0.1)',
        border: '1px solid rgba(196,112,63,0.2)',
        borderRadius: 20,
        padding: '4px 14px',
      }}>
        {selected.size}/5 selected
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          width: '100%',
          marginBottom: 28,
        }}
      >
        {INTERESTS.map((item, i) => {
          const isSelected = selected.has(item.id)
          const isDisabled = !isSelected && selected.size >= 5
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              disabled={isDisabled}
              className="stagger-item"
              style={{
                background: isSelected ? 'rgba(196,112,63,0.12)' : 'var(--card)',
                border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 16,
                padding: '16px 14px',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                color: isDisabled ? 'var(--text-dim)' : 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: isDisabled ? 0.45 : 1,
                transition: 'border-color 0.2s, background 0.2s',
                minHeight: 64,
                boxShadow: isSelected ? '0 2px 16px rgba(196,112,63,0.12)' : 'var(--shadow)',
                animationDelay: `${i * 30}ms`,
              }}
            >
              <span style={{ fontSize: 26 }}>{item.emoji}</span>
              <span style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-heading)' }}>{item.label}</span>
              {isSelected && <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: 14, fontWeight: 700 }}>✓</span>}
            </button>
          )
        })}
      </div>

      {/* Free-text custom interest */}
      <div style={{ width: '100%', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>Or type your own…</div>
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
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '12px 14px',
              color: 'var(--text)',
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
              background: customInput.trim() && selected.size < 5 ? 'var(--accent)' : 'var(--border)',
              border: 'none',
              borderRadius: 12,
              padding: '12px 18px',
              color: customInput.trim() && selected.size < 5 ? 'white' : 'var(--text-muted)',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              minWidth: 56,
            }}
          >
            Add
          </button>
        </div>
        {/* Show custom (non-preset) selected items */}
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {Array.from(selected).filter((id) => !INTERESTS.some((i) => i.id === id)).map((custom) => (
            <div
              key={custom}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(196,112,63,0.12)',
                border: '1px solid rgba(196,112,63,0.35)',
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: 13,
                color: 'var(--accent)',
                fontWeight: 600,
              }}
            >
              {custom}
              <button
                onClick={() => setSelected((prev) => { const next = new Set(prev); next.delete(custom); return next })}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }}
              >×</button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={selected.size === 0}
        style={{
          width: '100%',
          background: selected.size > 0 ? 'var(--accent)' : 'var(--border)',
          border: 'none',
          borderRadius: 16,
          padding: '18px',
          color: selected.size > 0 ? 'white' : 'var(--text-muted)',
          fontSize: 17,
          fontWeight: 700,
          cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
          minHeight: 56,
          marginBottom: 12,
          transition: 'background 0.2s',
          boxShadow: selected.size > 0 ? '0 4px 24px rgba(196,112,63,0.35)' : 'none',
        }}
      >
        Save my interests →
      </button>

      <button
        onClick={handleSkip}
        style={{
          width: '100%',
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '14px',
          color: 'var(--text-muted)',
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
