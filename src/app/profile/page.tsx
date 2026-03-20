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
        background: 'rgba(196,112,63,0.08)',
        border: `2px solid ${BADGE_COLORS[tier]}`,
        borderRadius: 20,
        padding: '5px 14px',
        fontSize: 13,
        fontWeight: 700,
        color: BADGE_COLORS[tier],
        marginTop: 6,
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
    return <div style={{ background: 'var(--bg)', minHeight: '100vh' }} />
  }

  if (!user) {
    return (
      <main className="page-enter" style={{ background: 'var(--bg)', minHeight: '100vh', padding: '24px 20px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button onClick={() => router.back()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', color: 'var(--text)' }}>←</button>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: 'var(--font-heading)' }}>My Profile</h1>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, padding: 24, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'var(--shadow)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(196,112,63,0.1)', border: '3px solid rgba(196,112,63,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: 'var(--text-dim)' }}>?</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>Your Name</div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>🥉 Bronze (starter)</div>
            </div>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 20, marginBottom: 16, boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase' as const, letterSpacing: '1px' }}>This Month</div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[{ label: 'Scenarios practiced', value: 0 }, { label: 'Phrases owned', value: 0 }, { label: 'Roleplays', value: 0 }].map(({ label, value }) => (
                <div key={label} style={{ flex: 1, textAlign: 'center' as const }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-dim)' }}>{value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(196,112,63,0.12) 0%, rgba(212,168,67,0.08) 100%)', border: '1px solid rgba(196,112,63,0.3)', borderRadius: 18, padding: 24, textAlign: 'center' as const }}>
            <div style={{ fontSize: 24, marginBottom: 8, fontFamily: 'var(--font-heading)' }}>🇮🇹 Track your Italian journey</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.5 }}>Sign up to save your progress, earn badges, and appear in the community feed.</div>
            <button onClick={() => router.push('/sign-up')} style={{ background: 'var(--accent)', border: 'none', borderRadius: 14, padding: '13px 32px', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(196,112,63,0.35)' }}>
              Sign up to track your progress →
            </button>
          </div>
        </div>
      </main>
    )
  }

  const badge = getBadge(phrasesOwned)
  const nextBadge = getNextBadge(phrasesOwned)
  const displayName = user?.fullName ?? user?.username ?? 'Learner'

  return (
    <main className="page-enter" style={{ background: 'var(--bg)', minHeight: '100vh', padding: '24px 20px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 22,
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              cursor: 'pointer',
              color: 'var(--text)',
            }}
          >
            ←
          </button>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: 'var(--font-heading)', letterSpacing: '-0.5px' }}>My Profile</h1>
        </div>

        {/* User info */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 22,
            padding: 24,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            boxShadow: 'var(--shadow)',
          }}
        >
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={displayName}
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border)' }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(196,112,63,0.15)',
                border: '3px solid rgba(196,112,63,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                color: 'var(--accent)',
                fontWeight: 700,
              }}
            >
              {displayName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>{displayName}</div>
            {badge ? (
              <BadgeDisplay tier={badge.tier} emoji={badge.emoji} label={badge.label} />
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>No badge yet</div>
            )}
          </div>
        </div>

        {/* This month stats */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 18,
            padding: 20,
            marginBottom: 16,
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '1px' }}>
            This Month
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: 'Scenarios practiced', value: monthlyStats.scenariosPracticed },
              { label: 'New phrases owned', value: monthlyStats.phrasesOwned },
              { label: 'Roleplays completed', value: monthlyStats.roleplaysCompleted },
            ].map(({ label, value }) => (
              <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--accent)' }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Badge progress */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 18,
            padding: 20,
            marginBottom: 16,
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Badge Progress
          </div>
          <div style={{ fontSize: 15, color: 'var(--text)', marginBottom: 8 }}>
            <span style={{ color: 'var(--accent3)', fontWeight: 700 }}>{phrasesOwned}</span> phrases owned total
          </div>
          {nextBadge ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {nextBadge.emoji} {nextBadge.threshold - phrasesOwned} more to reach {nextBadge.label}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--accent3)' }}>💎 Maximum badge achieved!</div>
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
                  background: phrasesOwned >= threshold ? 'rgba(196,112,63,0.1)' : 'var(--card2)',
                  border: `1px solid ${phrasesOwned >= threshold ? BADGE_COLORS[tier] : 'var(--border)'}`,
                  borderRadius: 20,
                  padding: '4px 12px',
                  fontSize: 12,
                  color: phrasesOwned >= threshold ? BADGE_COLORS[tier] : 'var(--text-dim)',
                  fontWeight: phrasesOwned >= threshold ? 700 : 400,
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
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 18,
            padding: 20,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div>
            <div style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600 }}>Public profile</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Show your completions in the community feed
            </div>
          </div>
          <button
            onClick={togglePublic}
            style={{
              width: 50,
              height: 28,
              borderRadius: 14,
              background: isPublic ? 'var(--accent)' : 'var(--border2)',
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
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 18,
            padding: 20,
            marginBottom: 16,
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ fontSize: 16, color: 'var(--text)', fontWeight: 700, marginBottom: 12, fontFamily: 'var(--font-heading)' }}>
            Share your progress
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {(['square', 'story'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setShareSize(size)}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 12,
                  border: `1px solid ${shareSize === size ? 'var(--accent)' : 'var(--border)'}`,
                  background: shareSize === size ? 'rgba(196,112,63,0.1)' : 'var(--card2)',
                  color: shareSize === size ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'inherit',
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
              padding: '13px 0',
              borderRadius: 14,
              background: generating ? 'var(--border)' : 'var(--accent)',
              border: 'none',
              color: 'white',
              fontWeight: 700,
              fontSize: 15,
              cursor: generating ? 'not-allowed' : 'pointer',
              opacity: generating ? 0.7 : 1,
              fontFamily: 'inherit',
              boxShadow: generating ? 'none' : '0 4px 20px rgba(196,112,63,0.35)',
            }}
          >
            {generating ? 'Generating…' : '📤 Share my progress'}
          </button>
        </div>

        {/* Referral */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 18,
            padding: 20,
            marginBottom: 16,
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ fontSize: 16, color: 'var(--text)', fontWeight: 700, marginBottom: 4, fontFamily: 'var(--font-heading)' }}>
            Refer a friend 🎁
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
            Both of you get 7 days of premium free! {referralCount > 0 && `${referralCount} friend${referralCount > 1 ? 's' : ''} joined so far.`}
          </div>
          {referralCode ? (
            <div
              style={{
                background: 'var(--card2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <span style={{ color: 'var(--accent3)', fontWeight: 700, fontFamily: 'monospace', fontSize: 18 }}>
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
                  background: 'rgba(196,112,63,0.12)',
                  border: '1px solid rgba(196,112,63,0.3)',
                  borderRadius: 8,
                  padding: '5px 12px',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                }}
              >
                Copy link
              </button>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sign in to get your referral code</div>
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
              padding: '11px 0',
              borderRadius: 12,
              background: 'rgba(196,112,63,0.1)',
              border: '1px solid rgba(196,112,63,0.3)',
              color: 'var(--accent)',
              fontWeight: 700,
              cursor: referralCode ? 'pointer' : 'not-allowed',
              fontSize: 14,
              opacity: referralCode ? 1 : 0.5,
              fontFamily: 'inherit',
            }}
          >
            🔗 Share with a friend
          </button>
        </div>

        {/* Upgrade */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(196,112,63,0.12) 0%, rgba(212,168,67,0.08) 100%)',
            border: '1px solid rgba(196,112,63,0.3)',
            borderRadius: 18,
            padding: 22,
            marginBottom: 24,
            textAlign: 'center',
            boxShadow: '0 4px 24px rgba(196,112,63,0.1)',
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 6, fontFamily: 'var(--font-heading)' }}>⭐ Go Premium</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
            Unlimited conversations · ElevenLabs voice · Priority features
          </div>
          <button
            onClick={() => router.push('/pricing')}
            style={{
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 14,
              padding: '13px 32px',
              color: 'white',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 4px 20px rgba(196,112,63,0.35)',
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
