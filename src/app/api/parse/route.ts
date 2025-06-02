import { NextRequest, NextResponse } from 'next/server';
import { decode } from 'html-entities';

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

  console.log('🔗 Fetching article from Mercury:', cleanUrl);

  // For Cyrillic URLs, Mercury seems to need double encoding
  // Try single encoding first, then double encoding if that fails
  let encodedUrl = encodeURI(cleanUrl);
  console.log('🌐 Single encoded URL for Mercury:', encodedUrl);

  let response = await fetch(`http://localhost:3001/parser?url=${encodedUrl}`);
  
  // If single encoding fails with Cyrillic characters, try double encoding
  if (!response.ok || (await response.clone().json()).error) {
    console.log('⚠️ Single encoding failed, trying double encoding...');
    const doubleEncodedUrl = encodeURIComponent(encodedUrl);
    console.log('🌐 Double encoded URL for Mercury:', doubleEncodedUrl);
    response = await fetch(`http://localhost:3001/parser?url=${doubleEncodedUrl}`);
  }

  if (!response.ok) {
    console.log('❌ Mercury parser error:', response.status, response.statusText);
    return NextResponse.json({ 
      error: `Mercury parser error: ${response.status}` 
    }, { status: response.status });
  }

  const data = await response.json();
  
  console.log('📄 Mercury response keys:', Object.keys(data));
  
  // If Mercury returned an error object instead of content
  if (data.error) {
    console.log('❌ Mercury error response:', data.error);
    console.log('📝 Mercury messages:', data.messages);
    return NextResponse.json({ 
      error: `Mercury parser failed: ${data.messages || data.error}` 
    }, { status: 422 });
  }
  
  console.log('📏 Content length before decoding:', data.content ? data.content.length : 'NO CONTENT');
  
  // Validate that we got article content
  if (!data.content) {
    console.log('❌ No content found in article:', data.title || 'Unknown title');
    return NextResponse.json({ 
      error: "No content found in the article" 
    }, { status: 422 });
  }
  
  console.log('📝 Raw content preview:', data.content.substring(0, 200) + '...');
  
  // Decode HTML entities in the content using html-entities library
  const decodedContent = decode(data.content);
  const decodedTitle = data.title ? decode(data.title) : data.title;
  
  console.log('📏 Content length after decoding:', decodedContent.length);
  console.log('✅ Decoded content preview:', decodedContent.substring(0, 200) + '...');
  
  // Check if content became empty after decoding
  if (!decodedContent || decodedContent.trim().length === 0) {
    console.log('❌ Content became empty after decoding');
    return NextResponse.json({ 
      error: "Content became empty after decoding" 
    }, { status: 422 });
  }

  console.log('✅ Article parsed successfully:', decodedTitle);

  // Return the data with decoded content
  return NextResponse.json({
    ...data,
    content: decodedContent,
    title: decodedTitle
  });
} 