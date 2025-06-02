import { NextRequest, NextResponse } from 'next/server';
import { LanguageDetectionRequest, LanguageDetectionResult, Language } from '@/types';

const languageNames = {
  english: 'English',
  spanish: 'Spanish (Español)',
  chinese: 'Chinese (中文)',
  arabic: 'Arabic (العربية)',
  portuguese: 'Portuguese (Português)',
  indonesian: 'Indonesian (Bahasa Indonesia)',
  french: 'French (Français)',
  japanese: 'Japanese (日本語)',
  russian: 'Russian (Русский)',
  german: 'German (Deutsch)'
};

const buildLanguageDetectionPrompt = (article: string): string => {
  return `
You are a language detection expert. Analyze the following article text and determine the primary language.

IMPORTANT: You must respond with ONLY a valid JSON object in this exact format:
{
  "language": "one_of_supported_languages",
  "confidence": confidence_score_0_to_100
}

Supported languages (use exact key names):
- english
- spanish  
- chinese
- arabic
- portuguese
- indonesian
- french
- japanese
- russian
- german

Article text to analyze:
${article.substring(0, 1000)}...

RESPOND WITH VALID JSON ONLY:
  `.trim();
};

export async function POST(request: NextRequest) {
  try {
    const { article }: LanguageDetectionRequest = await request.json();
    
    if (!article || !article.content) {
      return NextResponse.json({ error: 'Article content is required' }, { status: 400 });
    }

    console.log('🌍 Detecting language for article:', article.title?.substring(0, 50) + '...');

    // Build the prompt
    const prompt = buildLanguageDetectionPrompt(article.content);

    // Call OpenAI
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.1 // Low temperature for more consistent detection
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('❌ OpenAI API error:', openAIResponse.status, errorText);
      
      // Fallback to English if API fails
      return NextResponse.json({
        success: true,
        result: {
          language: 'english' as Language,
          confidence: 50
        }
      });
    }

    const data = await openAIResponse.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ Invalid OpenAI response structure');
      return NextResponse.json({
        success: true,
        result: {
          language: 'english' as Language,
          confidence: 50
        }
      });
    }

    const rawResponse = data.choices[0].message.content.trim();
    
    try {
      // Parse the response
      let cleanedResponse = rawResponse.trim();
      
      // Remove potential markdown code blocks
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to find JSON within the response
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      const parsed: LanguageDetectionResult = JSON.parse(cleanedResponse);
      
      // Validate the structure and language
      if (!parsed.language || !Object.keys(languageNames).includes(parsed.language)) {
        throw new Error('Invalid language detected');
      }
      
      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 100) {
        parsed.confidence = 80; // Default confidence
      }
      
      console.log(`✅ Language detected: ${languageNames[parsed.language]} (${parsed.confidence}% confidence)`);
      
      return NextResponse.json({
        success: true,
        result: parsed
      });

    } catch (parseError) {
      console.error('❌ Failed to parse language detection response:', parseError);
      console.error('📄 Full raw response:', rawResponse);
      
      // Fallback to English with low confidence
      return NextResponse.json({
        success: true,
        result: {
          language: 'english' as Language,
          confidence: 30
        }
      });
    }

  } catch (error) {
    console.error('💥 Error in language detection API:', error);
    
    // Return English as fallback
    return NextResponse.json({
      success: true,
      result: {
        language: 'english' as Language,
        confidence: 30
      }
    });
  }
} 