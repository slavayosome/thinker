import { NextRequest, NextResponse } from 'next/server';
import { decode } from 'html-entities';
import Parser from '@postlight/parser';
import { parseArticleHybrid, getPlatformRecommendations, getContentAccessibilityStatus } from '@/lib/hybridParser';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let url = searchParams.get('url');
    const useHybrid = searchParams.get('hybrid') !== 'false'; // Default to true

    if (!url) {
      return NextResponse.json({ 
        error: "URL parameter is required" 
      }, { status: 400 });
    }

    if (useHybrid) {
      return await parseUrlHybrid(url);
    } else {
      return await parseUrlTraditional(url);
    }
  } catch (error) {
    console.error('❌ Parse GET endpoint error:', error);
    return NextResponse.json({ 
      error: "Failed to parse article" 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, hybrid = true } = await request.json();

    if (!url) {
      return NextResponse.json({ 
        error: "URL is required" 
      }, { status: 400 });
    }

    if (hybrid) {
      return await parseUrlHybrid(url);
    } else {
      return await parseUrlTraditional(url);
    }
  } catch (error) {
    console.error('❌ Parse POST endpoint error:', error);
    return NextResponse.json({ 
      error: "Failed to parse article" 
    }, { status: 500 });
  }
}

async function parseUrlHybrid(url: string) {
  console.log('🧪 Using hybrid parsing for:', url);
  
  try {
    const result = await parseArticleHybrid(url);
    const recommendations = getPlatformRecommendations(url);
    const accessibilityStatus = getContentAccessibilityStatus(result);
    
    console.log(`✅ Hybrid parsing completed: ${result.parsingMethod} (${result.extractionTime}ms)`);
    
    // Check if content is accessible
    if (!accessibilityStatus.isAccessible) {
      console.log(`⚠️ Content accessibility issue: ${accessibilityStatus.reason}`);
      
      // Return detailed error information
      return NextResponse.json({
        error: accessibilityStatus.reason,
        errorType: accessibilityStatus.errorType,
        suggestions: accessibilityStatus.suggestions,
        metadata: {
          title: result.title,
          author: result.author,
          date_published: result.date_published,
          domain: result.domain,
          publisher: result.metadata.publisher
        },
        _hybrid: {
          parsingMethod: result.parsingMethod,
          structuredDataScore: result.structuredDataScore,
          extractionTime: result.extractionTime,
          hasFullContent: result.hasFullContent,
          confidence: result.confidence,
          extractionMethods: result.extractionMethods,
          recommendations
        }
      }, { status: 422 });
    }
    
    // Return data in the same format as traditional parsing for compatibility
    return NextResponse.json({
      title: result.title,
      content: result.content,
      url: result.url || url,
      author: result.author,
      date_published: result.date_published,
      excerpt: result.excerpt,
      lead_image_url: result.lead_image_url,
      word_count: result.word_count,
      domain: result.domain,
      // Additional hybrid parsing metadata
      _hybrid: {
        parsingMethod: result.parsingMethod,
        structuredDataScore: result.structuredDataScore,
        extractionTime: result.extractionTime,
        hasFullContent: result.hasFullContent,
        confidence: result.confidence,
        extractionMethods: result.extractionMethods,
        metadata: result.metadata,
        recommendations,
        accessibility: accessibilityStatus
      }
    });
  } catch (error) {
    console.error('❌ Hybrid parsing failed, falling back to traditional:', error);
    return await parseUrlTraditional(url);
  }
}

async function parseUrlTraditional(url: string) {
  console.log('🔍 Using traditional parsing for:', url);

  // Decode the URL first if it's already encoded to get the raw URL
  let cleanUrl = url;
  if (url.includes('%')) {
    try {
      cleanUrl = decodeURIComponent(url);
      console.log('🔗 Decoded URL:', cleanUrl);
    } catch (e) {
      console.log('⚠️ Failed to decode URL, using original');
    }
  }

  try {
    // Properly encode the URL for Postlight Parser
    const encodedUrl = encodeURI(cleanUrl).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16));
    console.log('🔗 Fetching article using Postlight Parser:', encodedUrl);
    
    // Parse the article using Postlight Parser
    const result = await Parser.parse(encodedUrl, {
      contentType: 'html',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ThinkerBot/1.0; +https://thinker.com)'
      }
    });
    
    if (!result || !result.content) {
      console.log('❌ No content found in article');
      return NextResponse.json({ 
        error: "No content found in the article" 
      }, { status: 422 });
    }
    
    // Decode HTML entities in the content
    const decodedContent = decode(result.content);
    const decodedTitle = result.title ? decode(result.title) : result.title;
    
    console.log('✅ Article parsed successfully:', decodedTitle);
    
    // Return the parsed data
    return NextResponse.json({
      title: decodedTitle,
      content: decodedContent,
      url: result.url || cleanUrl,
      author: result.author,
      date_published: result.date_published,
      excerpt: result.excerpt,
      lead_image_url: result.lead_image_url,
      word_count: result.word_count,
      domain: result.domain,
      _hybrid: {
        parsingMethod: 'traditional-only',
        structuredDataScore: 0,
        extractionTime: 0,
        hasFullContent: !!(result.content),
        confidence: 85, // Traditional parsing baseline confidence
        extractionMethods: ['Mercury Parser'],
        metadata: {},
        recommendations: getPlatformRecommendations(url)
      }
    });
    
  } catch (error) {
    console.error('❌ Postlight Parser error:', error);
    
    // If we get an unescaped characters error, try double encoding
    if (error instanceof Error && error.message.includes('unescaped characters')) {
      try {
        console.log('⚠️ Retrying with double encoding...');
        const doubleEncodedUrl = encodeURIComponent(cleanUrl);
        console.log('🔗 Double encoded URL:', doubleEncodedUrl);
        
        const result = await Parser.parse(doubleEncodedUrl, {
          contentType: 'html',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ThinkerBot/1.0; +https://thinker.com)'
          }
        });
        
        if (!result || !result.content) {
          console.log('❌ No content found in article');
          return NextResponse.json({ 
            error: "No content found in the article" 
          }, { status: 422 });
        }
        
        // Decode HTML entities in the content
        const decodedContent = decode(result.content);
        const decodedTitle = result.title ? decode(result.title) : result.title;
        
        console.log('✅ Article parsed successfully:', decodedTitle);
        
        // Return the parsed data
        return NextResponse.json({
          title: decodedTitle,
          content: decodedContent,
          url: result.url || cleanUrl,
          author: result.author,
          date_published: result.date_published,
          excerpt: result.excerpt,
          lead_image_url: result.lead_image_url,
          word_count: result.word_count,
          domain: result.domain,
          _hybrid: {
            parsingMethod: 'traditional-retry',
            structuredDataScore: 0,
            extractionTime: 0,
            hasFullContent: !!(result.content),
            confidence: 80, // Slightly lower confidence for retry
            extractionMethods: ['Mercury Parser (retry)'],
            metadata: {},
            recommendations: getPlatformRecommendations(url)
          }
        });
      } catch (retryError) {
        console.error('❌ Parser retry failed:', retryError);
      }
    }
    
    return NextResponse.json({ 
      error: `Failed to parse article: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
} 