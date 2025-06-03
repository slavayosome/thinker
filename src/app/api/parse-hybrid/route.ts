import { NextRequest, NextResponse } from 'next/server';
import { parseArticleHybrid, getPlatformRecommendations, benchmarkParsingMethods } from '@/lib/hybridParser';

export async function POST(request: NextRequest) {
  try {
    const { url, mode = 'hybrid' } = await request.json();

    if (!url) {
      return NextResponse.json({ 
        error: "URL is required" 
      }, { status: 400 });
    }

    console.log(`🔍 Parsing URL with ${mode} mode:`, url);

    if (mode === 'benchmark') {
      // Benchmark all parsing methods
      const benchmarkResults = await benchmarkParsingMethods([url]);
      return NextResponse.json({
        success: true,
        mode: 'benchmark',
        benchmark: benchmarkResults[0],
        recommendations: getPlatformRecommendations(url)
      });
    }

    // Standard hybrid parsing
    const result = await parseArticleHybrid(url);
    const recommendations = getPlatformRecommendations(url);

    return NextResponse.json({
      success: true,
      mode: 'hybrid',
      article: {
        title: result.title,
        content: result.content,
        url: result.url,
        author: result.author,
        date_published: result.date_published,
        excerpt: result.excerpt,
        lead_image_url: result.lead_image_url,
        word_count: result.word_count,
        domain: result.domain
      },
      parsing: {
        method: result.parsingMethod,
        structuredDataScore: result.structuredDataScore,
        extractionTime: result.extractionTime,
        hasFullContent: result.hasFullContent,
        confidence: result.confidence,
        extractionMethods: result.extractionMethods
      },
      metadata: result.metadata,
      recommendations
    });

  } catch (error) {
    console.error('💥 Error in hybrid parse API:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Hybrid parsing failed" 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const mode = searchParams.get('mode') || 'hybrid';

    if (!url) {
      return NextResponse.json({ 
        error: "URL parameter is required" 
      }, { status: 400 });
    }

    // For GET requests, just return recommendations and structured data availability
    const recommendations = getPlatformRecommendations(url);
    
    return NextResponse.json({
      success: true,
      url,
      recommendations,
      info: {
        description: "Hybrid parsing combines structured data extraction with traditional parsing for optimal results",
        modes: {
          hybrid: "Automatically chooses the best parsing method based on structured data availability",
          benchmark: "Tests all parsing methods and compares performance"
        },
        supportedStructuredData: [
          "JSON-LD (Schema.org)",
          "Microdata",
          "RDFa", 
          "Open Graph",
          "Twitter Card"
        ]
      }
    });

  } catch (error) {
    console.error('💥 Error in hybrid parse GET API:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to get parsing info" 
    }, { status: 500 });
  }
} 