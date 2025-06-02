import { NextRequest, NextResponse } from 'next/server';
import { fetchArticle } from '@/lib/scrape';
import { OpenAI } from 'openai';
import { AnalysisResult } from '@/types';

const buildAnalysisPrompt = (article: any): string => {
  return `
You are an expert content analyst. Analyze the provided article and extract key insights.

Article Title: ${article.title}
Article Content: ${article.content}
Article URL: ${article.url}

Please analyze this article and provide:
1. Central Theme: The main topic or message of the article
2. Key Messages: 3-5 most important points or insights
3. Summary: A concise summary of the article content

Respond with valid JSON in this exact format:
{
  "centralTheme": "The main theme of the article",
  "keyMessages": [
    "First key message",
    "Second key message",
    "Third key message"
  ],
  "summary": "A comprehensive summary of the article content and main points"
}

RESPOND WITH VALID JSON ONLY:
  `.trim();
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ 
        error: "URL is required" 
      }, { status: 400 });
    }

    console.log('🔗 Analyzing article:', url);
    console.log('🔍 URL contains %:', url.includes('%'));
    console.log('🔍 URL length:', url.length);

    // Fetch and parse the article
    const article = await fetchArticle(url);
    
    console.log('✅ Article fetched:', article.title);
    
    // Build the analysis prompt
    const prompt = buildAnalysisPrompt(article);
    
    console.log('🤖 Sending to OpenAI...');
    
    // Call OpenAI for analysis
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No response from OpenAI");
    }
    
    console.log('📝 Raw OpenAI response:', content.substring(0, 200) + '...');

    // Parse the JSON response
    let analysis: AnalysisResult;
    try {
      // Extract JSON from code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      analysis = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', parseError);
      throw new Error("Failed to parse analysis result");
    }

    console.log('✅ Analysis completed successfully');

    return NextResponse.json({
      success: true,
      article,
      analysis
    });

  } catch (error) {
    console.error('💥 Error in analyze API:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Analysis failed" 
    }, { status: 500 });
  }
} 