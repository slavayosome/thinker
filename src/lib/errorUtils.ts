// src/lib/errorUtils.ts

export interface AppError {
  type: 'network' | 'validation' | 'parsing' | 'api' | 'unknown';
  subtype?: 'paywall' | 'no-content' | 'invalid-article' | 'content-blocked' | 'format-unsupported' | 'gist-redirect';
  message: string;
  details?: string;
  retryable: boolean;
  timestamp: number;
  suggestions?: string[];
  // New properties for enhanced error handling
  errorType?: 'paywall' | 'no-content' | 'parsing-failed' | 'network' | 'unknown';
  metadata?: {
    title?: string;
    author?: string;
    date_published?: string;
    domain?: string;
    publisher?: string;
  };
}

export const createError = (
  type: AppError['type'],
  message: string,
  details?: string,
  retryable: boolean = true,
  subtype?: AppError['subtype'],
  suggestions?: string[]
): AppError => ({
  type,
  subtype,
  message,
  details,
  retryable,
  timestamp: Date.now(),
  suggestions
});

export const logError = (error: AppError, context: string, originalError?: any): void => {
  console.group(`🚨 Error in ${context}`);
  console.error('Error Type:', error.type);
  if (error.subtype) console.error('Subtype:', error.subtype);
  console.error('Message:', error.message);
  if (error.details) console.error('Details:', error.details);
  console.error('Retryable:', error.retryable);
  console.error('Timestamp:', new Date(error.timestamp).toISOString());
  if (error.suggestions) console.error('Suggestions:', error.suggestions);
  if (originalError) console.error('Original Error:', originalError);
  console.groupEnd();
};

export const handleFetchError = async (response: Response, context: string): Promise<AppError> => {
  let errorData;
  try {
    errorData = await response.json();
  } catch {
    // If we can't parse JSON, use status text
    errorData = { error: response.statusText || 'Unknown error' };
  }

  const message = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
  
  if (response.status >= 400 && response.status < 500) {
    // Client error
    return createError('validation', message, `Status: ${response.status}`, response.status === 429);
  } else if (response.status >= 500) {
    // Server error
    return createError('api', message, `Status: ${response.status}`, true);
  } else {
    // Other error
    return createError('network', message, `Status: ${response.status}`, true);
  }
};

export const createParsingError = (originalError: string, url: string): AppError => {
  console.log('🚨 Creating parsing error for URL:', url);
  console.log('🚨 Original error message:', originalError);
  
  const lowerError = originalError.toLowerCase();
  let domain = '';
  
  try {
    if (url) {
      domain = new URL(url).hostname;
      console.log('🔍 Extracted domain:', domain);
    }
  } catch (urlError) {
    console.log('⚠️ Failed to parse URL for domain extraction:', url);
    console.log('⚠️ URL parse error:', urlError);
  }
  
  // Detect specific parsing failure scenarios
  if (lowerError.includes('paywall') || lowerError.includes('subscription') || lowerError.includes('premium')) {
    return createError(
      'parsing',
      'This article appears to be behind a paywall',
      'Content is restricted to subscribers',
      false,
      'paywall',
      [
        'Try a different article that\'s freely accessible',
        'Look for the same content on other news sites',
        'Check if the site offers free articles per month'
      ]
    );
  }
  
  if (lowerError.includes('no content') || lowerError.includes('empty') || lowerError.includes('not found')) {
    return createError(
      'parsing',
      'No readable content found in this article',
      'The article may be empty, deleted, or in an unsupported format',
      true,
      'no-content',
      [
        'Verify the URL points to a complete article',
        'Try a different article from the same website',
        'Some websites require JavaScript to load content'
      ]
    );
  }
  
  if (lowerError.includes('blocked') || lowerError.includes('forbidden') || lowerError.includes('access denied')) {
    return createError(
      'parsing',
      'Access to this content is blocked',
      'The website is preventing content extraction',
      false,
      'content-blocked',
      [
        'Try an article from a different news source',
        'Some sites block automated content reading',
        'Look for the same story on other websites'
      ]
    );
  }
  
  // Check for GitHub Gist redirects (common with Medium articles)
  if (lowerError.includes('github gist') || lowerError.includes('gist.github.com') || url.includes('gist.github.com')) {
    return createError(
      'parsing',
      'This article redirects to a GitHub Gist',
      'GitHub Gists contain code snippets, not full articles',
      true,
      'gist-redirect',
      [
        'Try finding the original full article on Medium or the author\'s blog',
        'Look for a "View story at Medium.com" link if this was shared',
        'Search for the article title on the original publication site'
      ]
    );
  }
  
  // Check for known problematic domains
  const problematicDomains = ['medium.com', 'substack.com', 'linkedin.com'];
  if (problematicDomains.some(d => domain.includes(d))) {
    return createError(
      'parsing',
      `Content extraction is limited for ${domain}`,
      'This platform often restricts automated content reading',
      true,
      'format-unsupported',
      [
        'Try copying the article text directly if it\'s short',
        'Look for the same content republished elsewhere',
        'Some platforms work better with direct article links'
      ]
    );
  }
  
  // Generic parsing error
  return createError(
    'parsing',
    'Unable to extract content from this article',
    originalError,
    true,
    'invalid-article',
    [
      'Make sure the URL points to a complete article, not a homepage',
      'Try a different article from a major news website',
      'Some sites may be temporarily unavailable'
    ]
  );
};

export const parseApiError = (err: any, context: string): AppError => {
  if (err && typeof err === 'object' && 'type' in err) {
    // Already an AppError
    return err as AppError;
  } else if (err instanceof TypeError && err.message.includes('fetch')) {
    // Network error
    return createError('network', 'Unable to connect to the server', 'Network connection failed', true);
  } else if (err instanceof Error) {
    // Generic error - check if it's a parsing error and enhance it
    if (context.includes('parsing') || context.includes('fetch')) {
      // This is likely a parsing error, enhance it
      return createParsingError(err.message, '');
    }
    return createError('unknown', err.message, `Unexpected error in ${context}`, true);
  } else {
    // Unknown error
    return createError('unknown', 'An unexpected error occurred', 'Unknown error type', true);
  }
};

export const getErrorIcon = (errorType: AppError['type'], subtype?: AppError['subtype']): string => {
  if (errorType === 'parsing') {
    switch (subtype) {
      case 'paywall':
        return 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z';
      case 'no-content':
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
      case 'content-blocked':
        return 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636';
      case 'format-unsupported':
        return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z';
      case 'gist-redirect':
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
      default:
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
    }
  }
  
  switch (errorType) {
    case 'network':
      return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z';
    case 'validation':
      return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    case 'api':
    case 'unknown':
    default:
      return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z';
  }
};

export const getErrorTitle = (errorType: AppError['type'], subtype?: AppError['subtype']): string => {
  if (errorType === 'parsing') {
    switch (subtype) {
      case 'paywall':
        return 'Content Behind Paywall';
      case 'no-content':
        return 'No Content Found';
      case 'content-blocked':
        return 'Content Access Blocked';
      case 'format-unsupported':
        return 'Limited Support';
      case 'invalid-article':
        return 'Article Not Accessible';
      case 'gist-redirect':
        return 'Code Snippet Found';
      default:
        return 'Content Extraction Failed';
    }
  }
  
  switch (errorType) {
    case 'network':
      return 'Connection Error';
    case 'validation':
      return 'Invalid Input';
    case 'api':
      return 'Service Error';
    case 'unknown':
    default:
      return 'Unexpected Error';
  }
};

export const getUserFriendlyMessage = (error: AppError): string => {
  if (error.type === 'parsing') {
    switch (error.subtype) {
      case 'paywall':
        return 'This article requires a subscription or payment to access. Try finding similar content on free news sites.';
      case 'no-content':
        return 'We couldn\'t find any readable text in this article. The page might be empty or use a format we can\'t process.';
      case 'content-blocked':
        return 'This website is blocking automated content reading. Try a different news source for similar content.';
      case 'format-unsupported':
        return 'This platform has limitations for automated content extraction. Try finding the article on a different site.';
      case 'invalid-article':
        return 'We couldn\'t access the article content. Make sure the URL points to a complete article page.';
      case 'gist-redirect':
        return 'This article link redirects to a GitHub Gist (code snippet) instead of the full article. Try finding the complete article on the original publication.';
      default:
        return 'We couldn\'t extract the article content. This might be due to the website\'s restrictions or format.';
    }
  }
  
  switch (error.type) {
    case 'network':
      return 'Please check your internet connection and try again.';
    case 'validation':
      return 'Please check your input and make sure it\'s valid.';
    case 'api':
      return 'Our service is temporarily unavailable. Please try again in a few moments.';
    case 'unknown':
    default:
      return 'Something unexpected happened. Please try again or contact support if the problem persists.';
  }
}; 