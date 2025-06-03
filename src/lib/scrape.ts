// src/lib/scrape.ts
import { parseArticleHybrid, getContentAccessibilityStatus } from '@/lib/hybridParser';

export async function fetchArticle(url: string) {
  try {
    console.log('🧪 Parsing article directly:', url);
    
    // Call the parsing logic directly instead of making HTTP requests
    const result = await parseArticleHybrid(url);
    const accessibilityStatus = getContentAccessibilityStatus(result);
    
    console.log(`✅ Parsing completed: ${result.parsingMethod} (${result.extractionTime}ms)`);
    
    // Check if content is accessible
    if (!accessibilityStatus.isAccessible) {
      console.log(`⚠️ Content accessibility issue: ${accessibilityStatus.reason}`);
      throw new Error(accessibilityStatus.reason);
    }
    
    // Validate that we got article content
    if (!result.content) {
      throw new Error("No content found in the article");
    }
    
    // Log parsing metadata
    console.log(`📊 Parsing method: ${result.parsingMethod} (${result.extractionTime}ms, confidence: ${result.confidence}%)`);
    if (result.extractionMethods && result.extractionMethods.length > 0) {
      console.log(`🔍 Extraction methods: ${result.extractionMethods.join(', ')}`);
    }
    
    // Return in the same format as the API for compatibility
    return {
      title: result.title,
      content: result.content,
      url: result.url || url,
      author: result.author,
      date_published: result.date_published,
      excerpt: result.excerpt,
      lead_image_url: result.lead_image_url,
      word_count: result.word_count,
      domain: result.domain,
      _hybrid: {
        parsingMethod: result.parsingMethod,
        structuredDataScore: result.structuredDataScore,
        extractionTime: result.extractionTime,
        hasFullContent: result.hasFullContent,
        confidence: result.confidence,
        extractionMethods: result.extractionMethods,
        metadata: result.metadata,
        accessibility: accessibilityStatus
      }
    };
  } catch (error) {
    // Handle parsing errors
    if (error instanceof Error) {
      throw new Error(`Failed to fetch article: ${error.message}`);
    }
    throw new Error("Unknown error occurred while fetching article");
  }
}