import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { messages, systemPrompt } = await req.json()

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://linforo.app',
      'X-Title': 'Linforo',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('OpenRouter error:', text)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }

  const data = await response.json()
  const reply = data.choices?.[0]?.message?.content || ''

  return NextResponse.json({ reply })
}
