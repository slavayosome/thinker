import { NextRequest, NextResponse } from 'next/server';
import { ArticleData, ContentType } from '@/types';

interface ContentTypeAvailability {
  type: ContentType;
  available: boolean;
  confidence: number; // 0-100
  reason?: string;
}

interface DetectionResult {
  availableTypes: ContentTypeAvailability[];
  recommendedTypes: ContentType[];
}

export async function POST(request: NextRequest) {
  try {
    const { article }: { article: ArticleData } = await request.json();
    
    if (!article || !article.content) {
      return NextResponse.json({ 
        error: 'Article content is required' 
      }, { status: 400 });
    }

    console.log('🔍 Detecting content types for:', article.title);

    const prompt = `
Analyze the following article and determine which types of content can be effectively extracted from it.

Article Title: ${article.title}
Article Content: ${article.content.substring(0, 3000)}...

For each content type below, determine:
1. Whether it's available in the article (true/false)
2. Confidence level (0-100)
3. Brief reason for availability/unavailability

Content Types to Evaluate:
- hooks: Can we create attention-grabbing opening lines from this content?
- quotes: Are there powerful, quotable statements or insights?
- key-insights: Does the article contain important learnings or insights?
- statistics: Are there numerical data, percentages, or research findings?
- questions: Can we formulate thought-provoking questions based on the content?
- takeaways: Are there actionable advice or practical tips?

Respond with a JSON object in this exact format:
{
  "availableTypes": [
    {
      "type": "hooks",
      "available": true,
      "confidence": 95,
      "reason": "Article has strong narrative elements and compelling themes"
    },
    {
      "type": "statistics",
      "available": false,
      "confidence": 90,
      "reason": "No numerical data or research findings present"
    }
    // ... continue for all types
  ],
  "recommendedTypes": ["hooks", "key-insights", "takeaways"]
}

The recommendedTypes array should contain the top 3-4 most suitable content types based on the article.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return NextResponse.json({ 
        error: 'Failed to analyze content types' 
      }, { status: 500 });
    }

    const data = await response.json();
    const rawResponse = data.choices[0].message.content.trim();
    
    console.log('📝 Raw detection response:', rawResponse.substring(0, 200) + '...');

    try {
      let cleanedResponse = rawResponse;
      
      // Remove markdown code blocks if present
      if (cleanedResponse.includes('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```/g, '');
      }
      
      const result: DetectionResult = JSON.parse(cleanedResponse);
      
      console.log('✅ Content types detected:', result.recommendedTypes);
      
      return NextResponse.json({
        success: true,
        result
      });

    } catch (parseError) {
      console.error('Failed to parse detection response:', parseError);
      
      // Fallback to all types available if detection fails
      const fallbackResult: DetectionResult = {
        availableTypes: [
          { type: 'hooks', available: true, confidence: 70, reason: 'Default availability' },
          { type: 'quotes', available: true, confidence: 70, reason: 'Default availability' },
          { type: 'key-insights', available: true, confidence: 70, reason: 'Default availability' },
          { type: 'statistics', available: true, confidence: 50, reason: 'Default availability' },
          { type: 'questions', available: true, confidence: 70, reason: 'Default availability' },
          { type: 'takeaways', available: true, confidence: 70, reason: 'Default availability' }
        ],
        recommendedTypes: ['hooks', 'key-insights', 'takeaways']
      };
      
      return NextResponse.json({
        success: true,
        result: fallbackResult,
        warning: 'Using fallback detection'
      });
    }

  } catch (error) {
    console.error('Content type detection error:', error);
    return NextResponse.json({ 
      error: 'Failed to detect content types' 
    }, { status: 500 });
  }
} 