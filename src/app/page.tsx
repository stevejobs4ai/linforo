'use client'

import { useRouter } from 'next/navigation'
import { SCENARIOS } from '@/lib/scenarios'

export default function ScenarioPicker() {
  const router = useRouter()

  const handleSelect = (id: string) => {
    router.push(`/voice?scenario=${id}`)
  }

  const featured = SCENARIOS[0]
  const rest = SCENARIOS.slice(1)

  return (
    <main
      className="min-h-screen"
      style={{ background: '#0a0a0a', padding: '24px 16px' }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'white',
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          🇮🇹 Linforo
        </h1>
        <p
          style={{
            fontSize: 16,
            color: '#888',
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          Choose a scenario to practice
        </p>

        {/* Featured: Freestyle */}
        <button
          onClick={() => handleSelect(featured.id)}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            border: '1px solid #334',
            borderRadius: 16,
            padding: '28px 24px',
            marginBottom: 20,
            cursor: 'pointer',
            textAlign: 'left',
            minHeight: 48,
          }}
        >
          <div style={{ fontSize: 36 }}>{featured.emoji}</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'white',
              marginTop: 8,
            }}
          >
            {featured.title}
          </div>
          <div style={{ fontSize: 15, color: '#aaa', marginTop: 4 }}>
            {featured.description}
          </div>
        </button>

        {/* Travel scenarios grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
        >
          {rest.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => handleSelect(scenario.id)}
              style={{
                background: '#111',
                border: '1px solid #222',
                borderRadius: 12,
                padding: '18px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: 48,
              }}
            >
              <div style={{ fontSize: 28 }}>{scenario.emoji}</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'white',
                  marginTop: 6,
                }}
              >
                {scenario.title}
              </div>
              <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                {scenario.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
