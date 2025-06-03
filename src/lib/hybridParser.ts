import { extractStructuredData, hasUsefulStructuredData, getExtractionPerformanceScore, StructuredArticleData } from './structuredData';
import Parser from '@postlight/parser';
import { decode } from 'html-entities';

export interface HybridParsingResult {
  // Content data
  title?: string;
  content?: string;
  url?: string;
  author?: string;
  date_published?: string;
  excerpt?: string;
  lead_image_url?: string;
  word_count?: number;
  domain?: string;
  
  // Parsing metadata
  parsingMethod: 'structured-only' | 'traditional-only' | 'hybrid' | 'structured-fallback';
  structuredDataScore: number;
  extractionTime: number;
  hasFullContent: boolean;
  
  // Structured data details
  structuredData?: StructuredArticleData;
  extractionMethods?: string[];
  
  // Quality indicators
  confidence: number;
  metadata: {
    keywords?: string[];
    categories?: string[];
    publisher?: string;
    language?: string;
    readingTime?: string;
  };
}

/**
 * Hybrid parsing strategy that tries structured data first, then falls back to traditional parsing
 */
export async function parseArticleHybrid(url: string): Promise<HybridParsingResult> {
  const startTime = Date.now();
  
  try {
    console.log('🧪 Starting hybrid parsing for:', url);
    
    // Step 1: Try structured data extraction
    const structuredResult = await extractStructuredData(url);
    const performanceScore = getExtractionPerformanceScore(structuredResult);
    
    console.log(`📊 Structured data score: ${performanceScore.score}/100 - ${performanceScore.recommendation}`);
    
    // Step 2: Decide parsing strategy based on structured data quality
    let result: HybridParsingResult;
    
    if (performanceScore.recommendation === 'use-structured' && structuredResult.combined) {
      // Use structured data only
      result = await parseWithStructuredDataOnly(structuredResult.combined, url);
      result.parsingMethod = 'structured-only';
    } else if (performanceScore.recommendation === 'hybrid' && structuredResult.combined) {
      // Use hybrid approach: structured data + traditional parsing for missing content
      result = await parseWithHybridApproach(structuredResult.combined, url);
      result.parsingMethod = 'hybrid';
    } else {
      // Fall back to traditional parsing
      result = await parseWithTraditionalOnly(url);
      result.parsingMethod = 'traditional-only';
      
      // If traditional parsing fails and we have some structured data, use it as fallback
      if (!result.content && structuredResult.combined) {
        result = await parseWithStructuredDataOnly(structuredResult.combined, url);
        result.parsingMethod = 'structured-fallback';
      }
    }
    
    // Set metadata
    result.structuredDataScore = performanceScore.score;
    result.extractionTime = Date.now() - startTime;
    result.extractionMethods = structuredResult.extractionMethod;
    result.structuredData = structuredResult.combined;
    result.confidence = calculateConfidence(result);
    
    console.log(`✅ Hybrid parsing completed in ${result.extractionTime}ms using ${result.parsingMethod}`);
    return result;
    
  } catch (error) {
    console.error('❌ Hybrid parsing failed:', error);
    
    // Final fallback: try traditional parsing
    const fallbackResult = await parseWithTraditionalOnly(url);
    fallbackResult.extractionTime = Date.now() - startTime;
    fallbackResult.structuredDataScore = 0;
    fallbackResult.confidence = calculateConfidence(fallbackResult);
    
    return fallbackResult;
  }
}

/**
 * Parse using structured data only
 */
async function parseWithStructuredDataOnly(structuredData: StructuredArticleData, url: string): Promise<HybridParsingResult> {
  return {
    title: structuredData.headline || structuredData.alternativeHeadline,
    content: structuredData.articleBody || structuredData.description || '',
    url: structuredData.url || url,
    author: structuredData.author?.[0]?.name,
    date_published: structuredData.datePublished,
    excerpt: structuredData.description,
    lead_image_url: structuredData.image?.[0],
    word_count: structuredData.wordCount || estimateWordCount(structuredData.articleBody || structuredData.description || ''),
    domain: extractDomain(url),
    parsingMethod: 'structured-only',
    structuredDataScore: 0, // Will be set later
    extractionTime: 0, // Will be set later
    hasFullContent: !!(structuredData.articleBody),
    confidence: 0, // Will be calculated later
    metadata: {
      keywords: structuredData.keywords,
      categories: structuredData.category,
      publisher: structuredData.publisher?.name,
      language: structuredData.language,
      readingTime: structuredData.readingTime,
    }
  };
}

/**
 * Parse using traditional parsing only - calls Mercury Parser directly to avoid circular dependency
 */
async function parseWithTraditionalOnly(url: string): Promise<HybridParsingResult> {
  try {
    console.log('🔍 Using direct traditional parsing for:', url);
    
    // Call Mercury Parser directly to avoid circular dependency with fetchArticle
    const traditionalResult = await parseWithMercuryParser(url);
    
    return {
      title: traditionalResult.title,
      content: traditionalResult.content,
      url: traditionalResult.url || url,
      author: traditionalResult.author,
      date_published: traditionalResult.date_published,
      excerpt: traditionalResult.excerpt,
      lead_image_url: traditionalResult.lead_image_url,
      word_count: traditionalResult.word_count,
      domain: traditionalResult.domain,
      parsingMethod: 'traditional-only',
      structuredDataScore: 0,
      extractionTime: 0,
      hasFullContent: !!(traditionalResult.content),
      confidence: 0,
      metadata: {}
    };
  } catch (error) {
    console.error('❌ Traditional parsing failed:', error);
    throw error;
  }
}

/**
 * Parse using hybrid approach: structured data + traditional parsing for missing content
 */
async function parseWithHybridApproach(structuredData: StructuredArticleData, url: string): Promise<HybridParsingResult> {
  // Start with structured data
  let result = await parseWithStructuredDataOnly(structuredData, url);
  
  // If we don't have full content, supplement with traditional parsing
  if (!structuredData.articleBody) {
    try {
      console.log('📄 Supplementing with direct traditional parsing for full content...');
      const traditionalResult = await parseWithMercuryParser(url);
      
      if (traditionalResult.content && traditionalResult.content.length > (result.content?.length || 0)) {
        result.content = traditionalResult.content;
        result.hasFullContent = true;
        result.word_count = traditionalResult.word_count || estimateWordCount(traditionalResult.content);
      }
      
      // Fill in missing metadata from traditional parsing
      if (!result.title && traditionalResult.title) result.title = traditionalResult.title;
      if (!result.author && traditionalResult.author) result.author = traditionalResult.author;
      if (!result.date_published && traditionalResult.date_published) result.date_published = traditionalResult.date_published;
      if (!result.excerpt && traditionalResult.excerpt) result.excerpt = traditionalResult.excerpt;
      if (!result.lead_image_url && traditionalResult.lead_image_url) result.lead_image_url = traditionalResult.lead_image_url;
      
    } catch (error) {
      console.warn('⚠️ Traditional parsing failed in hybrid mode:', error);
      // Continue with structured data only
    }
  }
  
  return result;
}

/**
 * Direct Mercury Parser call - avoids circular dependency with fetchArticle
 */
async function parseWithMercuryParser(url: string) {
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
    console.log('🔗 Fetching article using Mercury Parser:', encodedUrl);
    
    // Parse the article using Postlight Parser
    const result = await Parser.parse(encodedUrl, {
      contentType: 'html',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ThinkerBot/1.0; +https://thinker.com)'
      }
    });
    
    if (!result || !result.content) {
      throw new Error("No content found in the article");
    }
    
    // Decode HTML entities in the content
    const decodedContent = decode(result.content);
    const decodedTitle = result.title ? decode(result.title) : result.title;
    
    console.log('✅ Mercury Parser completed successfully:', decodedTitle);
    
    return {
      title: decodedTitle || undefined,
      content: decodedContent,
      url: result.url || cleanUrl,
      author: result.author || undefined,
      date_published: result.date_published || undefined,
      excerpt: result.excerpt || undefined,
      lead_image_url: result.lead_image_url || undefined,
      word_count: result.word_count || undefined,
      domain: result.domain || undefined
    };
    
  } catch (error) {
    console.error('❌ Mercury Parser error:', error);
    
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
          throw new Error("No content found in the article");
        }
        
        // Decode HTML entities in the content
        const decodedContent = decode(result.content);
        const decodedTitle = result.title ? decode(result.title) : result.title;
        
        console.log('✅ Mercury Parser retry completed successfully:', decodedTitle);
        
        return {
          title: decodedTitle || undefined,
          content: decodedContent,
          url: result.url || cleanUrl,
          author: result.author || undefined,
          date_published: result.date_published || undefined,
          excerpt: result.excerpt || undefined,
          lead_image_url: result.lead_image_url || undefined,
          word_count: result.word_count || undefined,
          domain: result.domain || undefined
        };
      } catch (retryError) {
        console.error('❌ Mercury Parser retry failed:', retryError);
        throw retryError;
      }
    }
    
    throw error;
  }
}

/**
 * Calculate confidence score based on available data
 */
function calculateConfidence(result: HybridParsingResult): number {
  let confidence = 0;
  
  // Core content - more stringent requirements
  if (result.title) confidence += 20;
  
  if (result.content) {
    const contentLength = result.content.length;
    if (contentLength > 1000) {
      confidence += 40; // Full content
    } else if (contentLength > 500) {
      confidence += 30; // Substantial content
    } else if (contentLength > 200) {
      confidence += 20; // Some content
    } else if (contentLength > 50) {
      confidence += 10; // Minimal content
    } else {
      confidence += 5; // Very short - likely incomplete
    }
  }
  
  // Metadata
  if (result.author) confidence += 10;
  if (result.date_published) confidence += 10;
  if (result.excerpt) confidence += 5;
  if (result.lead_image_url) confidence += 5;
  
  // Quality indicators
  if (result.hasFullContent) {
    confidence += 10;
  } else {
    // Penalize incomplete content more heavily
    confidence = Math.max(confidence - 15, 20); // Ensure minimum confidence but apply penalty
  }
  
  if (result.metadata.keywords?.length) confidence += 5;
  if (result.metadata.publisher) confidence += 5;
  
  // Additional penalty for very short articles that claim to be complete
  if (result.content && result.content.length < 300 && result.hasFullContent) {
    confidence = Math.max(confidence - 20, 30); // Strong penalty for suspicious "complete" short content
  }
  
  // Paywall detection penalty reduction
  if (isProbablyPaywall(result)) {
    // Don't penalize as much for paywall content if we have good metadata
    const hasGoodMetadata = !!(result.title && result.author && result.date_published);
    if (hasGoodMetadata) {
      confidence = Math.max(confidence, 65); // Ensure minimum confidence for paywall with good metadata
    }
  }
  
  return Math.min(confidence, 100);
}

/**
 * Detect if content is likely behind a paywall
 */
function isProbablyPaywall(result: HybridParsingResult): boolean {
  if (!result.content) return false;
  
  const content = result.content.toLowerCase();
  const paywallIndicators = [
    'read more at',
    'subscribe to continue',
    'subscribe for full access',
    'sign in to continue',
    'this article is reserved',
    'premium content',
    'subscriber content',
    'to read the full article'
  ];
  
  const hasPaywallText = paywallIndicators.some(indicator => content.includes(indicator));
  const isVeryShort = result.content.length < 200;
  const hasGoodMetadata = !!(result.title && result.author && result.date_published);
  
  return hasPaywallText || (isVeryShort && hasGoodMetadata);
}

/**
 * Get content accessibility status with detailed error information
 */
export function getContentAccessibilityStatus(result: HybridParsingResult): {
  isAccessible: boolean;
  reason: string;
  errorType: 'paywall' | 'no-content' | 'parsing-failed' | 'accessible';
  suggestions: string[];
} {
  if (!result.title && !result.content) {
    return {
      isAccessible: false,
      reason: 'Failed to extract any content from the article',
      errorType: 'parsing-failed',
      suggestions: [
        'Check if the URL is correct and accessible',
        'Try a different article from the same site',
        'Some sites may be temporarily unavailable'
      ]
    };
  }
  
  if (isProbablyPaywall(result)) {
    return {
      isAccessible: false,
      reason: 'Article appears to be behind a paywall or requires subscription',
      errorType: 'paywall',
      suggestions: [
        'Try accessing the article directly in your browser first',
        'Look for a free version of the article on the publisher\'s site',
        'Try articles from free news sources like BBC, Reuters, or AP News'
      ]
    };
  }
  
  if (!result.content || result.content.length < 50) {
    return {
      isAccessible: false,
      reason: 'Article content is too short or incomplete',
      errorType: 'no-content',
      suggestions: [
        'Make sure the URL points to a complete article, not a homepage',
        'Try a different article from a major news website',
        'Some sites may require JavaScript to load content'
      ]
    };
  }
  
  return {
    isAccessible: true,
    reason: 'Article content successfully extracted',
    errorType: 'accessible',
    suggestions: []
  };
}

/**
 * Estimate word count from text
 */
function estimateWordCount(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Get parsing recommendations based on URL patterns
 */
export function getPlatformRecommendations(url: string): {
  likelyHasStructuredData: boolean;
  recommendedStrategy: 'structured-first' | 'traditional-first' | 'hybrid';
  reason: string;
} {
  const domain = extractDomain(url).toLowerCase();
  
  // Major news sites typically have good structured data
  const newsDomainsWithStructuredData = [
    'cnn.com', 'bbc.com', 'reuters.com', 'theguardian.com', 'nytimes.com',
    'washingtonpost.com', 'bloomberg.com', 'techcrunch.com', 'wired.com',
    'arstechnica.com', 'theverge.com', 'engadget.com'
  ];
  
  // E-commerce and large platforms
  const platformsWithStructuredData = [
    'medium.com', 'substack.com', 'linkedin.com', 'dev.to',
    'stackoverflow.com', 'github.com'
  ];
  
  // Personal blogs and smaller sites (less likely to have structured data)
  const traditionalFirstDomains = [
    'wordpress.com', 'blogspot.com', 'tumblr.com'
  ];
  
  if (newsDomainsWithStructuredData.some(d => domain.includes(d))) {
    return {
      likelyHasStructuredData: true,
      recommendedStrategy: 'structured-first',
      reason: 'Major news site with typically good structured data'
    };
  }
  
  if (platformsWithStructuredData.some(d => domain.includes(d))) {
    return {
      likelyHasStructuredData: true,
      recommendedStrategy: 'structured-first',
      reason: 'Platform known for implementing structured data'
    };
  }
  
  if (traditionalFirstDomains.some(d => domain.includes(d))) {
    return {
      likelyHasStructuredData: false,
      recommendedStrategy: 'traditional-first',
      reason: 'Platform with historically poor structured data implementation'
    };
  }
  
  return {
    likelyHasStructuredData: true,
    recommendedStrategy: 'hybrid',
    reason: 'Unknown domain, using hybrid approach for best results'
  };
}

/**
 * Performance benchmark: compare parsing methods
 */
export async function benchmarkParsingMethods(urls: string[]): Promise<{
  url: string;
  structuredTime: number;
  traditionalTime: number;
  hybridTime: number;
  structuredSuccess: boolean;
  traditionalSuccess: boolean;
  hybridSuccess: boolean;
  winner: 'structured' | 'traditional' | 'hybrid';
}[]> {
  const results = [];
  
  for (const url of urls) {
    console.log(`🧪 Benchmarking parsing methods for: ${url}`);
    
    const result = {
      url,
      structuredTime: 0,
      traditionalTime: 0,
      hybridTime: 0,
      structuredSuccess: false,
      traditionalSuccess: false,
      hybridSuccess: false,
      winner: 'traditional' as 'structured' | 'traditional' | 'hybrid'
    };
    
    // Test structured data extraction
    try {
      const start = Date.now();
      const structuredResult = await extractStructuredData(url);
      result.structuredTime = Date.now() - start;
      result.structuredSuccess = hasUsefulStructuredData(structuredResult);
    } catch (error) {
      console.warn('Structured data extraction failed:', error);
    }
    
    // Test traditional parsing - use direct Mercury Parser to avoid circular dependency
    try {
      const start = Date.now();
      await parseWithMercuryParser(url);
      result.traditionalTime = Date.now() - start;
      result.traditionalSuccess = true;
    } catch (error) {
      console.warn('Traditional parsing failed:', error);
    }
    
    // Test hybrid parsing
    try {
      const start = Date.now();
      const hybridResult = await parseArticleHybrid(url);
      result.hybridTime = Date.now() - start;
      result.hybridSuccess = hybridResult.confidence > 60;
    } catch (error) {
      console.warn('Hybrid parsing failed:', error);
    }
    
    // Determine winner based on success rate and speed
    if (result.structuredSuccess && result.structuredTime < result.traditionalTime) {
      result.winner = 'structured';
    } else if (result.hybridSuccess && result.hybridTime < Math.max(result.structuredTime, result.traditionalTime) * 1.2) {
      result.winner = 'hybrid';
    } else {
      result.winner = 'traditional';
    }
    
    results.push(result);
  }
  
  return results;
} 