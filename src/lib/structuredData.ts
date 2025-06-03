import { JSDOM } from 'jsdom';

export interface StructuredArticleData {
  // Schema.org Article properties
  headline?: string;
  alternativeHeadline?: string;
  description?: string;
  articleBody?: string;
  articleSection?: string;
  author?: {
    name?: string;
    url?: string;
    type?: string;
  }[];
  publisher?: {
    name?: string;
    url?: string;
    logo?: string;
  };
  datePublished?: string;
  dateModified?: string;
  keywords?: string[];
  wordCount?: number;
  image?: string[];
  url?: string;
  mainEntityOfPage?: string;
  // Additional metadata
  language?: string;
  readingTime?: string;
  category?: string[];
  tags?: string[];
  // Quality indicators
  isFactChecked?: boolean;
  credibilityScore?: number;
}

export interface StructuredDataExtractionResult {
  hasStructuredData: boolean;
  jsonLd?: StructuredArticleData[];
  microdata?: StructuredArticleData;
  rdfa?: StructuredArticleData;
  openGraph?: Record<string, string>;
  twitterCard?: Record<string, string>;
  combined?: StructuredArticleData;
  extractionMethod: string[];
}

/**
 * Extract structured data from HTML content
 */
export async function extractStructuredData(url: string): Promise<StructuredDataExtractionResult> {
  try {
    console.log('🔍 Extracting structured data from:', url);
    
    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ThinkerBot/1.0; +https://thinker.com)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    const result: StructuredDataExtractionResult = {
      hasStructuredData: false,
      extractionMethod: []
    };
    
    // Extract JSON-LD structured data
    const jsonLdData = extractJsonLd(document);
    if (jsonLdData.length > 0) {
      result.jsonLd = jsonLdData;
      result.hasStructuredData = true;
      result.extractionMethod.push('JSON-LD');
    }
    
    // Extract microdata
    const microdataResult = extractMicrodata(document);
    if (microdataResult && Object.keys(microdataResult).length > 0) {
      result.microdata = microdataResult;
      result.hasStructuredData = true;
      result.extractionMethod.push('Microdata');
    }
    
    // Extract RDFa (basic implementation)
    const rdfaResult = extractRdfa(document);
    if (rdfaResult && Object.keys(rdfaResult).length > 0) {
      result.rdfa = rdfaResult;
      result.hasStructuredData = true;
      result.extractionMethod.push('RDFa');
    }
    
    // Extract Open Graph data
    const openGraphData = extractOpenGraph(document);
    if (Object.keys(openGraphData).length > 0) {
      result.openGraph = openGraphData;
      result.hasStructuredData = true;
      result.extractionMethod.push('Open Graph');
    }
    
    // Extract Twitter Card data
    const twitterCardData = extractTwitterCard(document);
    if (Object.keys(twitterCardData).length > 0) {
      result.twitterCard = twitterCardData;
      result.hasStructuredData = true;
      result.extractionMethod.push('Twitter Card');
    }
    
    // Combine all structured data into a single object
    if (result.hasStructuredData) {
      result.combined = combineStructuredData(result);
    }
    
    console.log(`✅ Structured data extraction completed. Methods: ${result.extractionMethod.join(', ')}`);
    return result;
    
  } catch (error) {
    console.error('❌ Error extracting structured data:', error);
    return {
      hasStructuredData: false,
      extractionMethod: [],
    };
  }
}

/**
 * Extract JSON-LD structured data
 */
function extractJsonLd(document: Document): StructuredArticleData[] {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  const articles: StructuredArticleData[] = [];
  
  scripts.forEach(script => {
    try {
      const data = JSON.parse(script.textContent || '');
      
      // Handle single objects or arrays
      const items = Array.isArray(data) ? data : [data];
      
      items.forEach(item => {
        if (isArticleSchema(item)) {
          articles.push(normalizeJsonLdArticle(item));
        }
        // Check for nested @graph property
        else if (item['@graph']) {
          item['@graph'].forEach((graphItem: any) => {
            if (isArticleSchema(graphItem)) {
              articles.push(normalizeJsonLdArticle(graphItem));
            }
          });
        }
      });
    } catch (error) {
      console.warn('Failed to parse JSON-LD:', error);
    }
  });
  
  return articles;
}

/**
 * Check if an item is an article schema
 */
function isArticleSchema(item: any): boolean {
  const type = item['@type'];
  if (!type) return false;
  
  const articleTypes = [
    'Article', 'NewsArticle', 'BlogPosting', 'ScholarlyArticle', 
    'TechArticle', 'Report', 'Review'
  ];
  
  return articleTypes.some(articleType => 
    type === articleType || 
    (Array.isArray(type) && type.includes(articleType))
  );
}

/**
 * Normalize JSON-LD article data
 */
function normalizeJsonLdArticle(item: any): StructuredArticleData {
  return {
    headline: item.headline || item.name,
    alternativeHeadline: item.alternativeHeadline,
    description: item.description,
    articleBody: item.articleBody,
    articleSection: item.articleSection,
    author: normalizeAuthor(item.author),
    publisher: normalizePublisher(item.publisher),
    datePublished: item.datePublished,
    dateModified: item.dateModified,
    keywords: normalizeKeywords(item.keywords),
    wordCount: item.wordCount,
    image: normalizeImages(item.image),
    url: item.url || item.mainEntityOfPage,
    mainEntityOfPage: item.mainEntityOfPage,
  };
}

/**
 * Extract microdata
 */
function extractMicrodata(document: Document): StructuredArticleData | null {
  const articleElement = document.querySelector('[itemtype*="Article"]');
  if (!articleElement) return null;
  
  const result: StructuredArticleData = {};
  
  // Extract basic properties
  const headline = articleElement.querySelector('[itemprop="headline"]')?.textContent;
  const description = articleElement.querySelector('[itemprop="description"]')?.textContent;
  const datePublished = articleElement.querySelector('[itemprop="datePublished"]')?.getAttribute('datetime');
  const author = articleElement.querySelector('[itemprop="author"]')?.textContent;
  
  if (headline) result.headline = headline.trim();
  if (description) result.description = description.trim();
  if (datePublished) result.datePublished = datePublished;
  if (author) result.author = [{ name: author.trim() }];
  
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Extract RDFa data (basic implementation)
 */
function extractRdfa(document: Document): StructuredArticleData | null {
  const result: StructuredArticleData = {};
  
  // Look for article-related RDFa properties
  const headline = document.querySelector('[property*="headline"]')?.textContent;
  const description = document.querySelector('[property*="description"]')?.textContent;
  const author = document.querySelector('[property*="author"]')?.textContent;
  
  if (headline) result.headline = headline.trim();
  if (description) result.description = description.trim();
  if (author) result.author = [{ name: author.trim() }];
  
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Extract Open Graph data
 */
function extractOpenGraph(document: Document): Record<string, string> {
  const ogData: Record<string, string> = {};
  const ogTags = document.querySelectorAll('meta[property^="og:"]');
  
  ogTags.forEach(tag => {
    const property = tag.getAttribute('property');
    const content = tag.getAttribute('content');
    if (property && content) {
      ogData[property] = content;
    }
  });
  
  return ogData;
}

/**
 * Extract Twitter Card data
 */
function extractTwitterCard(document: Document): Record<string, string> {
  const twitterData: Record<string, string> = {};
  const twitterTags = document.querySelectorAll('meta[name^="twitter:"]');
  
  twitterTags.forEach(tag => {
    const name = tag.getAttribute('name');
    const content = tag.getAttribute('content');
    if (name && content) {
      twitterData[name] = content;
    }
  });
  
  return twitterData;
}

/**
 * Combine all structured data sources into a single object
 */
function combineStructuredData(result: StructuredDataExtractionResult): StructuredArticleData {
  const combined: StructuredArticleData = {};
  
  // Priority order: JSON-LD > Microdata > RDFa > Open Graph > Twitter Card
  const sources = [
    result.jsonLd?.[0],
    result.microdata,
    result.rdfa,
    openGraphToArticleData(result.openGraph),
    twitterCardToArticleData(result.twitterCard)
  ].filter(Boolean);
  
  // Merge data with priority to earlier sources
  sources.forEach(source => {
    Object.entries(source || {}).forEach(([key, value]) => {
      if (value && !combined[key as keyof StructuredArticleData]) {
        (combined as any)[key] = value;
      }
    });
  });
  
  return combined;
}

/**
 * Helper functions for normalization
 */
function normalizeAuthor(author: any): StructuredArticleData['author'] {
  if (!author) return undefined;
  if (typeof author === 'string') return [{ name: author }];
  if (Array.isArray(author)) {
    return author.map(a => typeof a === 'string' ? { name: a } : { name: a.name, url: a.url });
  }
  return [{ name: author.name, url: author.url }];
}

function normalizePublisher(publisher: any): StructuredArticleData['publisher'] {
  if (!publisher) return undefined;
  return {
    name: publisher.name,
    url: publisher.url,
    logo: publisher.logo?.url || publisher.logo
  };
}

function normalizeKeywords(keywords: any): string[] | undefined {
  if (!keywords) return undefined;
  if (typeof keywords === 'string') return keywords.split(',').map(k => k.trim());
  if (Array.isArray(keywords)) return keywords;
  return undefined;
}

function normalizeImages(image: any): string[] | undefined {
  if (!image) return undefined;
  if (typeof image === 'string') return [image];
  if (Array.isArray(image)) return image.map(img => typeof img === 'string' ? img : img.url);
  return [image.url || image];
}

function openGraphToArticleData(og?: Record<string, string>): StructuredArticleData | null {
  if (!og) return null;
  return {
    headline: og['og:title'],
    description: og['og:description'],
    image: og['og:image'] ? [og['og:image']] : undefined,
    url: og['og:url'],
    datePublished: og['og:published_time'] || og['article:published_time'],
    dateModified: og['og:modified_time'] || og['article:modified_time'],
    author: og['article:author'] ? [{ name: og['article:author'] }] : undefined,
    articleSection: og['article:section'],
    tags: og['article:tag'] ? [og['article:tag']] : undefined
  };
}

function twitterCardToArticleData(twitter?: Record<string, string>): StructuredArticleData | null {
  if (!twitter) return null;
  return {
    headline: twitter['twitter:title'],
    description: twitter['twitter:description'],
    image: twitter['twitter:image'] ? [twitter['twitter:image']] : undefined,
    author: twitter['twitter:creator'] ? [{ name: twitter['twitter:creator'] }] : undefined
  };
}

/**
 * Check if structured data provides sufficient content for analysis
 */
export function hasUsefulStructuredData(data: StructuredDataExtractionResult): boolean {
  if (!data.hasStructuredData || !data.combined) return false;
  
  const combined = data.combined;
  
  // Check if we have essential content
  const hasTitle = !!(combined.headline || combined.alternativeHeadline);
  const hasContent = !!(combined.articleBody || combined.description);
  const hasMetadata = !!(combined.author || combined.datePublished || combined.keywords);
  
  return hasTitle && (hasContent || hasMetadata);
}

/**
 * Get performance score for structured data extraction vs traditional parsing
 */
export function getExtractionPerformanceScore(data: StructuredDataExtractionResult): {
  score: number;
  reasons: string[];
  recommendation: 'use-structured' | 'use-traditional' | 'hybrid';
} {
  const reasons: string[] = [];
  let score = 0;
  
  if (data.hasStructuredData) {
    score += 30;
    reasons.push('Structured data available');
  }
  
  if (data.combined?.articleBody) {
    // Check if the article body is substantial
    const contentLength = data.combined.articleBody.length;
    if (contentLength > 1000) {
      score += 40;
      reasons.push('Full article content in structured data');
    } else if (contentLength > 200) {
      score += 25;
      reasons.push('Partial article content in structured data');
    } else {
      score += 10;
      reasons.push('Very short article content - likely incomplete');
    }
  } else if (data.combined?.description) {
    score += 15; // Reduced from 20 since description is often just a teaser
    reasons.push('Article description available (may be incomplete)');
  }
  
  if (data.combined?.author) {
    score += 10;
    reasons.push('Author information available');
  }
  
  if (data.combined?.datePublished) {
    score += 10;
    reasons.push('Publication date available');
  }
  
  if (data.combined?.keywords) {
    score += 10;
    reasons.push('Keywords/tags available');
  }
  
  let recommendation: 'use-structured' | 'use-traditional' | 'hybrid';
  
  // More conservative thresholds to ensure proper fallback
  if (score >= 80 && data.combined?.articleBody && data.combined.articleBody.length > 1000) {
    recommendation = 'use-structured';
  } else if (score >= 35) {
    recommendation = 'hybrid'; // More aggressive hybrid recommendation
  } else {
    recommendation = 'use-traditional';
  }
  
  return { score, reasons, recommendation };
} 