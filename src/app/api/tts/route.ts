import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { text, voiceId } = await req.json()

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('ElevenLabs error:', errText)
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
  }

  const audioBuffer = await response.arrayBuffer()
  return new NextResponse(audioBuffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
    },
  })
}
