import { NextRequest, NextResponse } from 'next/server';
import { decode } from 'html-entities';
import Parser from '@postlight/parser';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ 
        error: "URL parameter is required" 
      }, { status: 400 });
    }

    return await parseUrl(url);
  } catch (error) {
    console.error('❌ Parse GET endpoint error:', error);
    return NextResponse.json({ 
      error: "Failed to parse article" 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ 
        error: "URL is required" 
      }, { status: 400 });
    }

    return await parseUrl(url);
  } catch (error) {
    console.error('❌ Parse POST endpoint error:', error);
    return NextResponse.json({ 
      error: "Failed to parse article" 
    }, { status: 500 });
  }
}

async function parseUrl(url: string) {
  console.log('🔍 Parsing URL:', url);

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
      domain: result.domain
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
          domain: result.domain
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