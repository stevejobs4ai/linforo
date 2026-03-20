'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { toPng } from 'html-to-image'
import QRCode from 'qrcode'
import { getBadge, getNextBadge, getMonthlyStats, getPhrasesOwned, getDaysActive } from '@/lib/badges'
import { computeReadiness } from '@/lib/readiness'
import { supabase } from '@/lib/supabase'
import { syncAll, ensureReferralCode } from '@/lib/db-sync'
import type { BadgeTier } from '@/lib/badges'

const BADGE_COLORS: Record<BadgeTier, string> = {
  none: '#333',
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  platinum: '#e5e4e2',
}

function BadgeDisplay({ tier, emoji, label }: { tier: BadgeTier; emoji: string; label: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: '#1a1a1a',
        border: `2px solid ${BADGE_COLORS[tier]}`,
        borderRadius: 20,
        padding: '6px 14px',
        fontSize: 14,
        fontWeight: 700,
        color: BADGE_COLORS[tier],
      }}
    >
      {emoji} {label}
    </div>
  )
}

// ─── Share Card (rendered off-screen, captured with html-to-image) ────────────

interface ShareCardProps {
  displayName: string
  phrasesOwned: number
  daysActive: number
  readiness: number
  badgeEmoji: string
  badgeLabel: string
  qrDataUrl: string
}

function ShareCard({
  displayName,
  phrasesOwned,
  daysActive,
  readiness,
  badgeEmoji,
  badgeLabel,
  qrDataUrl,
}: ShareCardProps) {
  const R = 54
  const C = 2 * Math.PI * R
  const offset = C - (readiness / 100) * C

  return (
    <div
      style={{
        width: 540,
        height: 540,
        background: 'linear-gradient(135deg, #0a0a0a 0%, #0a1a2a 100%)',
        borderRadius: 32,
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: 'white',
        boxSizing: 'border-box',
      }}
    >
      {/* Top: flag + brand */}
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>
        🇮🇹 Linforo
      </div>

      {/* Middle: ring + badge + name */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <svg width="128" height="128">
          <circle cx="64" cy="64" r={R} fill="none" stroke="#1a1a1a" strokeWidth="10" />
          <circle
            cx="64"
            cy="64"
            r={R}
            fill="none"
            stroke="#0a84ff"
            strokeWidth="10"
            strokeDasharray={C}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 64 64)"
          />
          <text x="64" y="58" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="26" fontWeight="700" fontFamily="system-ui">
            {readiness}%
          </text>
          <text x="64" y="78" textAnchor="middle" dominantBaseline="middle" fill="#555" fontSize="11" fontFamily="system-ui">
            READY
          </text>
        </svg>

        <div style={{ fontSize: 22, fontWeight: 700 }}>{displayName}</div>

        {badgeLabel !== 'none' && (
          <div style={{ fontSize: 20, fontWeight: 700, color: '#ffd700' }}>
            {badgeEmoji} {badgeLabel}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ fontSize: 16, color: '#aaa', textAlign: 'center', lineHeight: 1.5 }}>
        I learned{' '}
        <span style={{ color: '#0a84ff', fontWeight: 700 }}>{phrasesOwned}</span> Italian phrases
        <br />
        in{' '}
        <span style={{ color: '#0a84ff', fontWeight: 700 }}>{daysActive}</span> days with Linforo 🇮🇹
      </div>

      {/* QR + bottom */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {qrDataUrl && (
          <img src={qrDataUrl} alt="QR" style={{ width: 56, height: 56, borderRadius: 8 }} />
        )}
        <div style={{ fontSize: 13, color: '#555' }}>linforo.app</div>
      </div>
    </div>
  )
}

// ─── Main profile page ────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [mounted, setMounted] = useState(false)
  const [phrasesOwned, setPhrasesOwned] = useState(0)
  const [daysActive, setDaysActive] = useState(0)
  const [readiness, setReadiness] = useState(0)
  const [monthlyStats, setMonthlyStats] = useState({ scenariosPracticed: 0, phrasesOwned: 0, roleplaysCompleted: 0 })
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referralCount, setReferralCount] = useState(0)
  const [isPublic, setIsPublic] = useState(false)
  const [dbUserId, setDbUserId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [shareSize, setShareSize] = useState<'story' | 'square'>('square')
  const shareCardRef = useRef<HTMLDivElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    setMounted(true)
    setPhrasesOwned(getPhrasesOwned())
    setDaysActive(getDaysActive())
    setReadiness(computeReadiness())
    setMonthlyStats(getMonthlyStats())

    QRCode.toDataURL('https://linforo.app', { width: 120, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isLoaded || !user) return

    async function init() {
      await syncAll(user!.id, user!.fullName ?? user!.username ?? 'Learner', user!.imageUrl)

      const { data: dbUser } = await supabase
        .from('users')
        .select('id, is_public, referral_code')
        .eq('clerk_id', user!.id)
        .single()

      if (!dbUser) return
      setDbUserId(dbUser.id)
      setIsPublic(dbUser.is_public ?? false)

      const code = dbUser.referral_code ?? (await ensureReferralCode(dbUser.id))
      setReferralCode(code)

      const { count } = await supabase
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', dbUser.id)
      setReferralCount(count ?? 0)
    }

    init()
  }, [isLoaded, user])

  async function togglePublic() {
    if (!dbUserId) return
    const next = !isPublic
    setIsPublic(next)
    await supabase.from('users').update({ is_public: next }).eq('id', dbUserId)
  }

  async function generateShareCard() {
    if (!shareCardRef.current) return
    setGenerating(true)
    try {
      const width = shareSize === 'story' ? 1080 : 1080
      const height = shareSize === 'story' ? 1920 : 1080
      const scale = width / 540

      const dataUrl = await toPng(shareCardRef.current, {
        width: 540,
        height: 540,
        pixelRatio: scale * (height / 540),
        style: { transform: `scale(1)` },
      })

      // Try Web Share API first
      if (navigator.share && navigator.canShare) {
        try {
          const res = await fetch(dataUrl)
          const blob = await res.blob()
          const file = new File([blob], 'linforo-progress.png', { type: 'image/png' })
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'My Italian progress — Linforo',
              files: [file],
            })
            return
          }
        } catch {
          // fall through to download
        }
      }

      // Fallback: download
      const link = document.createElement('a')
      link.download = `linforo-${shareSize}.png`
      link.href = dataUrl
      link.click()
    } finally {
      setGenerating(false)
    }
  }

  if (!mounted || !isLoaded) {
    return <div style={{ background: '#0a0a0a', minHeight: '100vh' }} />
  }

  const badge = getBadge(phrasesOwned)
  const nextBadge = getNextBadge(phrasesOwned)
  const displayName = user?.fullName ?? user?.username ?? 'Learner'

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', padding: '24px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => router.back()}
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 20,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              cursor: 'pointer',
              color: 'white',
            }}
          >
            ←
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', margin: 0 }}>My Profile</h1>
        </div>

        {/* User info */}
        <div
          style={{
            background: '#111',
            border: '1px solid #222',
            borderRadius: 20,
            padding: 24,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={displayName}
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#1a3a5a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                color: '#0a84ff',
                fontWeight: 700,
              }}
            >
              {displayName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>{displayName}</div>
            {badge ? (
              <BadgeDisplay tier={badge.tier} emoji={badge.emoji} label={badge.label} />
            ) : (
              <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>No badge yet</div>
            )}
          </div>
        </div>

        {/* This month stats */}
        <div
          style={{
            background: '#111',
            border: '1px solid #222',
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 13, color: '#555', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            This Month
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: 'Scenarios practiced', value: monthlyStats.scenariosPracticed },
              { label: 'New phrases owned', value: monthlyStats.phrasesOwned },
              { label: 'Roleplays completed', value: monthlyStats.roleplaysCompleted },
            ].map(({ label, value }) => (
              <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#0a84ff' }}>{value}</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Badge progress */}
        <div
          style={{
            background: '#111',
            border: '1px solid #222',
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 13, color: '#555', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Badge Progress
          </div>
          <div style={{ fontSize: 15, color: '#ccc', marginBottom: 8 }}>
            <span style={{ color: '#0a84ff', fontWeight: 700 }}>{phrasesOwned}</span> phrases owned total
          </div>
          {nextBadge ? (
            <div style={{ fontSize: 13, color: '#666' }}>
              {nextBadge.emoji} {nextBadge.threshold - phrasesOwned} more to reach {nextBadge.label}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#ffd700' }}>💎 Maximum badge achieved!</div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {[
              { tier: 'bronze' as BadgeTier, emoji: '🥉', label: 'Bronze', threshold: 10 },
              { tier: 'silver' as BadgeTier, emoji: '🥈', label: 'Silver', threshold: 30 },
              { tier: 'gold' as BadgeTier, emoji: '🥇', label: 'Gold', threshold: 60 },
              { tier: 'platinum' as BadgeTier, emoji: '💎', label: 'Platinum', threshold: 100 },
            ].map(({ tier, emoji, label, threshold }) => (
              <div
                key={tier}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#1a1a1a',
                  border: `1px solid ${phrasesOwned >= threshold ? BADGE_COLORS[tier] : '#333'}`,
                  borderRadius: 20,
                  padding: '4px 10px',
                  fontSize: 12,
                  color: phrasesOwned >= threshold ? BADGE_COLORS[tier] : '#555',
                }}
              >
                {emoji} {label}
              </div>
            ))}
          </div>
        </div>

        {/* Public profile toggle */}
        <div
          style={{
            background: '#111',
            border: '1px solid #222',
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 15, color: 'white', fontWeight: 600 }}>Public profile</div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
              Show your completions in the community feed
            </div>
          </div>
          <button
            onClick={togglePublic}
            style={{
              width: 50,
              height: 28,
              borderRadius: 14,
              background: isPublic ? '#0a84ff' : '#333',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s',
            }}
            aria-label={isPublic ? 'Disable public profile' : 'Enable public profile'}
          >
            <div
              style={{
                position: 'absolute',
                top: 3,
                left: isPublic ? 25 : 3,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.2s',
              }}
            />
          </button>
        </div>

        {/* Share card */}
        <div
          style={{
            background: '#111',
            border: '1px solid #222',
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 15, color: 'white', fontWeight: 600, marginBottom: 12 }}>
            Share your progress
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {(['square', 'story'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setShareSize(size)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 10,
                  border: `1px solid ${shareSize === size ? '#0a84ff' : '#333'}`,
                  background: shareSize === size ? '#0a1a2a' : '#1a1a1a',
                  color: shareSize === size ? '#0a84ff' : '#666',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {size === 'square' ? '⬛ Square (1080×1080)' : '📱 Story (1080×1920)'}
              </button>
            ))}
          </div>
          <button
            onClick={generateShareCard}
            disabled={generating}
            style={{
              width: '100%',
              padding: '12px 0',
              borderRadius: 12,
              background: generating ? '#1a1a1a' : '#0a84ff',
              border: 'none',
              color: 'white',
              fontWeight: 700,
              fontSize: 15,
              cursor: generating ? 'not-allowed' : 'pointer',
              opacity: generating ? 0.7 : 1,
            }}
          >
            {generating ? 'Generating…' : '📤 Share my progress'}
          </button>
        </div>

        {/* Referral */}
        <div
          style={{
            background: '#111',
            border: '1px solid #222',
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 15, color: 'white', fontWeight: 600, marginBottom: 4 }}>
            Refer a friend 🎁
          </div>
          <div style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>
            Both of you get 7 days of premium free! {referralCount > 0 && `${referralCount} friend${referralCount > 1 ? 's' : ''} joined so far.`}
          </div>
          {referralCode ? (
            <div
              style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <span style={{ color: '#0a84ff', fontWeight: 700, fontFamily: 'monospace', fontSize: 18 }}>
                {referralCode}
              </span>
              <button
                onClick={() => {
                  const link = `https://linforo.app/r/${referralCode}`
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(link)
                  }
                }}
                style={{
                  background: '#1a3a5a',
                  border: 'none',
                  borderRadius: 8,
                  padding: '4px 10px',
                  color: '#0a84ff',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Copy link
              </button>
            </div>
          ) : (
            <div style={{ color: '#555', fontSize: 13 }}>Sign in to get your referral code</div>
          )}
          <button
            onClick={() => {
              const link = `https://linforo.app/r/${referralCode}`
              if (navigator.share) {
                navigator.share({ title: 'Try Linforo!', text: 'Learn Italian by speaking. Use my code:', url: link })
              }
            }}
            disabled={!referralCode}
            style={{
              width: '100%',
              padding: '10px 0',
              borderRadius: 10,
              background: '#1a3a5a',
              border: 'none',
              color: '#0a84ff',
              fontWeight: 600,
              cursor: referralCode ? 'pointer' : 'not-allowed',
              fontSize: 14,
              opacity: referralCode ? 1 : 0.5,
            }}
          >
            🔗 Share with a friend
          </button>
        </div>

        {/* Upgrade */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0a1a2a 0%, #1a0a2a 100%)',
            border: '1px solid #1a2a4a',
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 6 }}>⭐ Go Premium</div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 14 }}>
            Unlimited conversations · ElevenLabs voice · Priority features
          </div>
          <button
            onClick={() => router.push('/pricing')}
            style={{
              background: '#0a84ff',
              border: 'none',
              borderRadius: 12,
              padding: '12px 32px',
              color: 'white',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            View plans →
          </button>
        </div>
      </div>

      {/* Off-screen share card (captured with html-to-image) */}
      <div
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          pointerEvents: 'none',
        }}
      >
        <div ref={shareCardRef}>
          <ShareCard
            displayName={displayName}
            phrasesOwned={phrasesOwned}
            daysActive={daysActive}
            readiness={readiness}
            badgeEmoji={badge?.emoji ?? ''}
            badgeLabel={badge?.label ?? 'none'}
            qrDataUrl={qrDataUrl}
          />
        </div>
      </div>
    </main>
  )
}
