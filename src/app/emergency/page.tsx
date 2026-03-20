'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getCachedAudio, setCachedAudio } from '@/lib/audioDB'

interface EmergencyPhrase {
  italian: string
  phonetic: string
  english: string
}

const PHRASES: EmergencyPhrase[] = [
  { italian: 'Aiuto!', phonetic: 'ah-YOO-toh', english: 'Help!' },
  {
    italian: "Chiamate un'ambulanza!",
    phonetic: "kyah-MAH-teh oon ahm-boo-LAHN-tsah",
    english: 'Call an ambulance!',
  },
  {
    italian: 'Ho bisogno di un dottore',
    phonetic: 'oh bee-ZOHN-yoh dee oon dot-TOH-reh',
    english: 'I need a doctor',
  },
  {
    italian: "Dov'è l'ospedale?",
    phonetic: "doh-VEH lohs-peh-DAH-leh",
    english: 'Where is the hospital?',
  },
  {
    italian: 'Chiamate la polizia',
    phonetic: 'kyah-MAH-teh lah poh-lee-TSEE-ah',
    english: 'Call the police',
  },
  {
    italian: 'Mi hanno rubato il portafoglio',
    phonetic: 'mee AHN-noh roo-BAH-toh eel por-tah-FOHL-yoh',
    english: 'My wallet was stolen',
  },
  {
    italian: 'Sono allergico/a a...',
    phonetic: 'SOH-noh ah-LAIR-jee-koh/kah ah',
    english: "I'm allergic to...",
  },
  {
    italian: 'Non mi sento bene',
    phonetic: 'non mee SEN-toh BEH-neh',
    english: "I don't feel well",
  },
  {
    italian: 'Ho bisogno di aiuto',
    phonetic: 'oh bee-ZOHN-yoh dee ah-YOO-toh',
    english: 'I need help',
  },
  {
    italian: 'Parla inglese?',
    phonetic: 'PAR-lah een-GLEH-zeh',
    english: 'Do you speak English?',
  },
  {
    italian: 'Non capisco',
    phonetic: 'non kah-PEE-skoh',
    english: "I don't understand",
  },
  {
    italian: 'Più piano, per favore',
    phonetic: 'pyoo PYAH-noh, pair fah-VOH-reh',
    english: 'Slower please',
  },
  {
    italian: "Dov'è l'ambasciata americana?",
    phonetic: "doh-VEH lahm-bah-SHAH-tah ah-meh-ree-KAH-nah",
    english: 'Where is the American embassy?',
  },
  {
    italian: 'Ho perso il passaporto',
    phonetic: 'oh PAIR-soh eel pahs-sah-POR-toh',
    english: 'I lost my passport',
  },
  {
    italian: 'Mi sono perso/a',
    phonetic: 'mee SOH-noh PAIR-soh/sah',
    english: "I'm lost",
  },
  {
    italian: 'Posso usare il telefono?',
    phonetic: 'POHS-soh oo-ZAH-reh eel teh-LEH-foh-noh',
    english: 'Can I use your phone?',
  },
  {
    italian: "C'è il Wi-Fi?",
    phonetic: "cheh eel WEE-fee",
    english: 'Is there Wi-Fi?',
  },
  {
    italian: 'Acqua, per favore',
    phonetic: 'AH-kwah, pair fah-VOH-reh',
    english: 'Water, please',
  },
  {
    italian: "Dov'è la farmacia?",
    phonetic: "doh-VEH lah far-mah-CHEE-ah",
    english: 'Where is the pharmacy?',
  },
  {
    italian: "È un'emergenza",
    phonetic: "eh oon eh-mair-JEN-tsah",
    english: "It's an emergency",
  },
]

const VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2'

function cacheKey(phrase: EmergencyPhrase): string {
  return `emergency:${phrase.italian}`
}

export default function EmergencyPage() {
  const router = useRouter()
  const [playingIdx, setPlayingIdx] = useState<number | null>(null)
  const [cacheStatus, setCacheStatus] = useState<
    'idle' | 'caching' | 'cached' | 'error'
  >('idle')
  const [cachedCount, setCachedCount] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cacheStarted = useRef(false)

  useEffect(() => {
    if (cacheStarted.current) return
    cacheStarted.current = true
    prewarmCache()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const prewarmCache = async () => {
    let count = 0
    // Check how many are already cached
    for (const phrase of PHRASES) {
      const cached = await getCachedAudio(cacheKey(phrase))
      if (cached) count++
    }
    setCachedCount(count)
    if (count === PHRASES.length) {
      setCacheStatus('cached')
      return
    }

    setCacheStatus('caching')

    for (const phrase of PHRASES) {
      const key = cacheKey(phrase)
      const existing = await getCachedAudio(key)
      if (existing) {
        count++
        setCachedCount(count)
        continue
      }
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: phrase.italian, voiceId: VOICE_ID }),
        })
        if (res.ok) {
          const buf = await res.arrayBuffer()
          await setCachedAudio(key, buf)
          count++
          setCachedCount(count)
        }
      } catch {
        // continue — partial cache is fine
      }
    }

    setCacheStatus(count > 0 ? 'cached' : 'error')
  }

  const playPhrase = async (phrase: EmergencyPhrase, idx: number) => {
    if (playingIdx !== null) {
      audioRef.current?.pause()
      if (playingIdx === idx) {
        setPlayingIdx(null)
        return
      }
    }

    setPlayingIdx(idx)

    try {
      let buf = await getCachedAudio(cacheKey(phrase))

      if (!buf) {
        // Fetch live if not cached
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: phrase.italian, voiceId: VOICE_ID }),
        })
        buf = await res.arrayBuffer()
        await setCachedAudio(cacheKey(phrase), buf)
      }

      const blob = new Blob([buf], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        setPlayingIdx(null)
        URL.revokeObjectURL(url)
      }
      audio.onerror = () => setPlayingIdx(null)
      audio.play()
    } catch {
      setPlayingIdx(null)
    }
  }

  return (
    <div
      style={{
        background: '#0a0a0a',
        minHeight: '100vh',
        maxWidth: 600,
        margin: '0 auto',
        paddingBottom: 40,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px',
          borderBottom: '1px solid #1a1a1a',
          position: 'sticky',
          top: 0,
          background: '#0a0a0a',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            fontSize: 24,
            cursor: 'pointer',
            minWidth: 48,
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Back to scenarios"
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0 }}>
            🆘 Emergency Phrases
          </h1>
          <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
            {cacheStatus === 'caching' &&
              `Caching for offline use… ${cachedCount}/${PHRASES.length}`}
            {cacheStatus === 'cached' && '✓ Available offline'}
            {cacheStatus === 'error' && 'Online mode'}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 16, margin: '0 0 16px' }}>
          Tap any phrase to hear it pronounced.
        </p>

        {PHRASES.map((phrase, idx) => {
          const isPlaying = playingIdx === idx
          return (
            <button
              key={phrase.italian}
              onClick={() => playPhrase(phrase, idx)}
              style={{
                width: '100%',
                background: isPlaying ? '#1a1a0a' : '#111',
                border: isPlaying ? '1px solid #554' : '1px solid #1e1e1e',
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 10,
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: 48,
              }}
              aria-label={`Play: ${phrase.italian}`}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: isPlaying ? '#ffd60a' : 'white',
                  }}
                >
                  {isPlaying ? '🔊 ' : ''}
                  {phrase.italian}
                </div>
              </div>
              <div style={{ fontSize: 14, color: '#888', marginBottom: 2 }}>
                {phrase.phonetic}
              </div>
              <div style={{ fontSize: 14, color: '#555' }}>{phrase.english}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
