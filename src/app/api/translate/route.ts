import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage } = await request.json();

    if (!text || !targetLanguage) {
      return NextResponse.json({ error: 'text and targetLanguage are required' }, { status: 400 });
    }

    const prompt = `Translate the following content into ${targetLanguage.toUpperCase()} preserving meaning, tone and formatting. Respond with the translated text only.\n\n---\n${text}\n---`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();
    const translated = data.choices[0]?.message?.content?.trim();

    return NextResponse.json({ success: true, translated });
  } catch (e) {
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
} 