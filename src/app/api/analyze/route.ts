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
    const { url, article } = await request.json();
    
    if (!url) {
      return NextResponse.json({ 
        error: "URL is required" 
      }, { status: 400 });
    }

    // Handle cases where url might be an object (from structured data)
    let actualUrl: string;
    if (typeof url === 'string') {
      actualUrl = url;
    } else if (typeof url === 'object' && url['@id']) {
      // Extract URL from structured data object
      actualUrl = url['@id'];
      console.log('🔗 Extracted URL from structured data:', actualUrl);
    } else if (typeof url === 'object' && url.url) {
      // Alternative structure
      actualUrl = url.url;
      console.log('🔗 Extracted URL from object.url:', actualUrl);
    } else {
      console.error('❌ Invalid URL format:', url);
      return NextResponse.json({ 
        error: "Invalid URL format" 
      }, { status: 400 });
    }

    console.log('🔗 Analyzing article:', actualUrl);
    console.log('🔍 URL contains %:', actualUrl.includes('%'));
    console.log('🔍 URL length:', actualUrl.length);

    let articleData;
    
    // If article data is provided, use it directly; otherwise fetch it
    if (article && article.title && article.content) {
      console.log('📄 Using provided article data:', article.title);
      articleData = article;
    } else {
      console.log('🔍 No article data provided, fetching from URL...');
      // Fetch and parse the article
      articleData = await fetchArticle(actualUrl);
      console.log('✅ Article fetched:', articleData.title);
    }
    
    // Build the analysis prompt
    const prompt = buildAnalysisPrompt(articleData);
    
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
      article: articleData,
      analysis
    });

  } catch (error) {
    console.error('💥 Error in analyze API:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Analysis failed" 
    }, { status: 500 });
  }
} 