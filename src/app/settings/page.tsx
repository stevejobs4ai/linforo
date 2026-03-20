'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getEffectiveTheme, saveTheme, applyTheme, Theme } from '@/lib/theme'
import { getReminderPrefs, saveReminderPrefs, requestNotificationPermission, registerReminderServiceWorker } from '@/lib/reminders'
import { PERSONAS, PersonaId, getSelectedPersona, savePersona } from '@/lib/personas'

export default function SettingsPage() {
  const router = useRouter()
  const [theme, setTheme] = useState<Theme>('dark')
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState('09:00')
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>('sofia')
  const [notifStatus, setNotifStatus] = useState<string>('')

  useEffect(() => {
    setTheme(getEffectiveTheme())
    const prefs = getReminderPrefs()
    setReminderEnabled(prefs.enabled)
    setReminderTime(prefs.time)
    setSelectedPersona(getSelectedPersona().id)
  }, [])

  const handleThemeToggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    saveTheme(next)
    applyTheme(next)
  }

  const handleReminderToggle = async () => {
    if (!reminderEnabled) {
      // Turning on — request permission
      const granted = await requestNotificationPermission()
      if (!granted) {
        setNotifStatus('Notifications blocked. Enable them in browser settings.')
        return
      }
      await registerReminderServiceWorker()
      setNotifStatus('Reminders enabled!')
    }
    const next = !reminderEnabled
    setReminderEnabled(next)
    saveReminderPrefs({ enabled: next, time: reminderTime })
    if (!next) setNotifStatus('')
  }

  const handleTimeChange = (t: string) => {
    setReminderTime(t)
    saveReminderPrefs({ enabled: reminderEnabled, time: t })
  }

  const handlePersonaChange = (id: PersonaId) => {
    setSelectedPersona(id)
    savePersona(id)
    // Also sync voice gender
    const persona = PERSONAS.find((p) => p.id === id)!
    localStorage.setItem('linforo-voice-gender', persona.voiceGender)
  }

  const cardStyle = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '16px 18px',
    marginBottom: 12,
    boxShadow: 'var(--shadow)',
  }

  const labelStyle = {
    fontSize: 13,
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 16,
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 24,
            cursor: 'pointer',
            minWidth: 48,
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Go back"
        >
          ←
        </button>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Settings</div>
        <div style={{ minWidth: 48 }} />
      </div>

      <div style={{ padding: '20px 16px' }}>
        {/* Appearance */}
        <div style={labelStyle}>Appearance</div>
        <div style={cardStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                {theme === 'dark' ? '🌙 Dark mode' : '☀️ Light mode'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              </div>
            </div>
            <button
              onClick={handleThemeToggle}
              style={{
                background: theme === 'dark' ? '#1c1c1e' : '#e0e0e0',
                border: '1px solid var(--border2)',
                borderRadius: 24,
                width: 52,
                height: 30,
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
              aria-label="Toggle theme"
            >
              <div
                style={{
                  position: 'absolute',
                  top: 3,
                  left: theme === 'dark' ? 3 : 24,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: theme === 'dark' ? '#555' : '#0a84ff',
                  transition: 'left 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                }}
              >
                {theme === 'dark' ? '🌙' : '☀️'}
              </div>
            </button>
          </div>
        </div>

        {/* Tutor Persona */}
        <div style={{ ...labelStyle, marginTop: 24 }}>Tutor</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          {PERSONAS.map((persona) => (
            <button
              key={persona.id}
              onClick={() => handlePersonaChange(persona.id)}
              style={{
                background: selectedPersona === persona.id ? '#0a84ff22' : 'var(--card)',
                border: `2px solid ${selectedPersona === persona.id ? '#0a84ff' : 'var(--border)'}`,
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.2s, background 0.2s',
                boxShadow: 'var(--shadow)',
              }}
            >
              <span style={{ fontSize: 28, flexShrink: 0 }}>{persona.emoji}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{persona.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{persona.tagline}</div>
              </div>
              {selectedPersona === persona.id && (
                <span style={{ marginLeft: 'auto', color: '#0a84ff', fontSize: 18 }}>✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Daily Reminders */}
        <div style={{ ...labelStyle, marginTop: 24 }}>Daily Reminder</div>
        <div style={cardStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: reminderEnabled ? 14 : 0,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Daily nudge</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                Remind me to practice Italian
              </div>
            </div>
            <button
              onClick={handleReminderToggle}
              style={{
                background: reminderEnabled ? '#0a84ff' : 'var(--card2)',
                border: `1px solid ${reminderEnabled ? '#0a84ff' : 'var(--border2)'}`,
                borderRadius: 24,
                width: 52,
                height: 30,
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
              aria-label="Toggle reminder"
            >
              <div
                style={{
                  position: 'absolute',
                  top: 3,
                  left: reminderEnabled ? 24 : 3,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'white',
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>
          {reminderEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Remind me at</div>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                style={{
                  background: 'var(--card2)',
                  border: '1px solid var(--border2)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  color: 'var(--text)',
                  fontSize: 15,
                  fontFamily: 'inherit',
                }}
              />
            </div>
          )}
          {notifStatus && (
            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                color: notifStatus.includes('blocked') ? '#ff3b30' : '#34c759',
              }}
            >
              {notifStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
