import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch top stories from Hacker News
    const topStoriesResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    
    if (!topStoriesResponse.ok) {
      throw new Error('Failed to fetch top stories');
    }
    
    const topStoryIds = await topStoriesResponse.json();
    
    // Take first 30 stories to avoid too many requests
    const storyIds = topStoryIds.slice(0, 30);
    
    // Fetch details for multiple stories
    const storyPromises = storyIds.map(async (id: number) => {
      try {
        const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        if (response.ok) {
          return await response.json();
        }
        return null;
      } catch {
        return null;
      }
    });
    
    const stories = await Promise.all(storyPromises);
    
    // Filter for stories with URLs (not Ask HN, Show HN text posts, etc.)
    const articlesWithUrls = stories.filter(story => 
      story && 
      story.url && 
      story.title &&
      !story.url.includes('news.ycombinator.com') && // Exclude HN internal links
      (story.url.includes('http://') || story.url.includes('https://')) &&
      story.title.length > 10 // Ensure decent title length
    );
    
    if (articlesWithUrls.length === 0) {
      return NextResponse.json(
        { error: 'No suitable articles found' },
        { status: 404 }
      );
    }
    
    // Pick a random article
    const randomIndex = Math.floor(Math.random() * articlesWithUrls.length);
    const selectedArticle = articlesWithUrls[randomIndex];
    
    return NextResponse.json({
      success: true,
      article: {
        title: selectedArticle.title,
        url: selectedArticle.url,
        score: selectedArticle.score,
        source: 'Hacker News'
      }
    });
    
  } catch (error) {
    console.error('Error fetching random article:', error);
    return NextResponse.json(
      { error: 'Failed to fetch random article' },
      { status: 500 }
    );
  }
} 