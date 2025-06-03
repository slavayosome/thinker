import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Use RSS2JSON service to fetch MIT Technology Review feed
    const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.technologyreview.com/feed/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ThinkerBot/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch MIT Tech Review feed via RSS2JSON');
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      throw new Error('No articles found in MIT Tech Review feed');
    }
    
    // Filter for quality articles
    const articles = data.items.filter((item: any) => 
      item.title && 
      item.link && 
      item.title.length > 15 &&
      item.link.includes('technologyreview.com') &&
      !item.title.toLowerCase().includes('podcast') &&
      !item.title.toLowerCase().includes('newsletter')
    );
    
    if (articles.length === 0) {
      return NextResponse.json(
        { error: 'No suitable articles found in MIT Tech Review feed' },
        { status: 404 }
      );
    }
    
    // Pick a random article
    const randomIndex = Math.floor(Math.random() * articles.length);
    const selectedArticle = articles[randomIndex];
    
    return NextResponse.json({
      success: true,
      article: {
        title: selectedArticle.title,
        url: selectedArticle.link,
        description: selectedArticle.description || '',
        source: 'MIT Technology Review'
      }
    });
    
  } catch (error) {
    console.error('Error fetching random MIT Tech Review article:', error);
    return NextResponse.json(
      { error: 'Failed to fetch random article from MIT Technology Review' },
      { status: 500 }
    );
  }
} 