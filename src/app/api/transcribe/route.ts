import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const audioFile = formData.get('audio') as File

  if (!audioFile) {
    return NextResponse.json({ error: 'No audio file' }, { status: 400 })
  }

  const arrayBuffer = await audioFile.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const response = await fetch('https://api.deepgram.com/v1/listen?language=en&model=nova-2&smart_format=true', {
    method: 'POST',
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      'Content-Type': audioFile.type || 'audio/webm',
    },
    body: buffer,
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('Deepgram error:', text)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }

  const data = await response.json()
  const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''

  return NextResponse.json({ transcript })
}
