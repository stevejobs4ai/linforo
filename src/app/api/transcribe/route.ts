import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const audioFile = formData.get('audio') as File

  if (!audioFile) {
    return NextResponse.json({ error: 'No audio file' }, { status: 400 })
  }

  // Debug: log blob size to verify audio was recorded
  console.log('[transcribe] audio size:', audioFile.size, 'bytes, type:', audioFile.type)

  if (!process.env.DEEPGRAM_API_KEY) {
    console.error('[transcribe] DEEPGRAM_API_KEY is not set!')
    return NextResponse.json({ error: 'Transcription service not configured' }, { status: 500 })
  }

  if (audioFile.size < 500) {
    console.warn('[transcribe] Audio too small — likely empty recording')
    return NextResponse.json({ transcript: '' })
  }

  const arrayBuffer = await audioFile.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Determine content type — prefer webm/opus, fallback to wav
  const mimeType = audioFile.type && audioFile.type !== 'audio/webm'
    ? audioFile.type
    : 'audio/webm;codecs=opus'

  try {
    const response = await fetch(
      'https://api.deepgram.com/v1/listen?language=it&model=nova-2&smart_format=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          'Content-Type': mimeType,
        },
        body: buffer,
      }
    )

    if (!response.ok) {
      const text = await response.text()
      console.error('[transcribe] Deepgram error status:', response.status, text)
      return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
    }

    const data = await response.json()
    const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
    console.log('[transcribe] transcript:', JSON.stringify(transcript))

    return NextResponse.json({ transcript })
  } catch (err) {
    console.error('[transcribe] fetch error:', err)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
