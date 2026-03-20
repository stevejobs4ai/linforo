import { NextRequest, NextResponse } from 'next/server'

/**
 * /api/tts-free — zero-cost TTS for free-tier users.
 *
 * Strategy:
 * 1. Google Cloud TTS if GOOGLE_CLOUD_TTS_API_KEY is set
 * 2. Browser SpeechSynthesis (client-side) — returned as a signal, not audio
 *
 * For free users this route returns either:
 *  - audio/mpeg blob (Google Cloud TTS)
 *  - JSON { useBrowserTTS: true, text } (fallback to browser)
 */

const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const text: string = body.text ?? ''
  const voiceGender: 'female' | 'male' = body.voiceGender === 'male' ? 'male' : 'female'

  if (!text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const googleApiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY
  if (googleApiKey) {
    try {
      const ssmlGender = voiceGender === 'male' ? 'MALE' : 'FEMALE'
      const res = await fetch(`${GOOGLE_TTS_URL}?key=${googleApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: 'it-IT', ssmlGender },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      })

      if (res.ok) {
        const json = await res.json() as { audioContent: string }
        const audioBuffer = Buffer.from(json.audioContent, 'base64')
        return new NextResponse(audioBuffer, {
          headers: { 'Content-Type': 'audio/mpeg' },
        })
      }
    } catch {
      // fall through to browser fallback
    }
  }

  // Browser SpeechSynthesis fallback — client handles playback
  return NextResponse.json({ useBrowserTTS: true, text, voiceGender })
}
