// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import SocialMediaResults from '@/components/SocialMediaResults';
import History from '@/components/History';
import { ArticleData, AnalysisResult, ContentResult, ContentType, HistoryItem, Language, SocialPostsResult, PostGenerationPreferences } from '@/types';
import { historyManager } from '@/lib/history';
import { AppError, createError, logError, handleFetchError, parseApiError, createParsingError, getErrorIcon, getErrorTitle, getUserFriendlyMessage } from '@/lib/errorUtils';

const contentTypeOptions = [
  { 
    value: 'hooks' as ContentType, 
    label: 'Hooks', 
    icon: '🪝',
    description: 'Attention-grabbing opening lines'
  },
  { 
    value: 'quotes' as ContentType, 
    label: 'Quotes', 
    icon: '💬',
    description: 'Powerful, quotable statements'
  },
  { 
    value: 'key-insights' as ContentType, 
    label: 'Key Insights', 
    icon: '💡',
    description: 'Most important learnings'
  },
  { 
    value: 'statistics' as ContentType, 
    label: 'Statistics', 
    icon: '📊',
    description: 'Compelling data points'
  },
  { 
    value: 'questions' as ContentType, 
    label: 'Questions', 
    icon: '❓',
    description: 'Discussion starters'
  },
  { 
    value: 'takeaways' as ContentType, 
    label: 'Takeaways', 
    icon: '📝',
    description: 'Actionable advice'
  }
];

type ProcessingStep = 'urlInput' | 'fetching' | 'contentType' | 'analysis' | 'generating' | 'complete';

export default function Home() {
  // Testing preview deployment with env vars configured
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('urlInput');
  const [selectedContentType, setSelectedContentType] = useState<ContentType>('hooks');
  const [url, setUrl] = useState('');
  const [editingUrl, setEditingUrl] = useState('');
  
  // Generated content state
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [generatedContent, setGeneratedContent] = useState<ContentResult | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<Language>('english');
  const [languageDetectionStatus, setLanguageDetectionStatus] = useState<{
    isDetecting: boolean;
    wasAutoDetected: boolean;
    confidence: number;
  }>({
    isDetecting: false,
    wasAutoDetected: false,
    confidence: 0
  });
  const [availableContentTypes, setAvailableContentTypes] = useState<any[]>([]);
  const [recommendedTypes, setRecommendedTypes] = useState<ContentType[]>([]);
  const [isDetectingTypes, setIsDetectingTypes] = useState(false);
  
  // History state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [historicalPosts, setHistoricalPosts] = useState<SocialPostsResult | null>(null);
  const [historicalPreferences, setHistoricalPreferences] = useState<PostGenerationPreferences | null>(null);
  const [isLatestItem, setIsLatestItem] = useState(true);
  const [currentHistoryTitle, setCurrentHistoryTitle] = useState<string | null>(null);
  const [hasHistory, setHasHistory] = useState(false);
  const [loadingRandomArticle, setLoadingRandomArticle] = useState(false);

  // Check for existing history on component mount
  useEffect(() => {
    setHasHistory(historyManager.getHistory().length > 0);
  }, []);

  // Clear error helper
  const clearError = () => setError(null);

  // Helper function to handle fetch errors from both /api/parse and /api/analyze
  async function handleFetchArticle(submittedUrl: string) {
    console.log('🚀 Fetching article:', submittedUrl);
    
    try {
      clearError();
      setLoading(true);
      setCurrentStep('fetching');
      setUrl(submittedUrl);
      setEditingUrl(submittedUrl);
      
      // Parse the article to validate it exists
      const parseResponse = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: submittedUrl }),
      });

      console.log('📡 Parse response status:', parseResponse.status);

      if (!parseResponse.ok) {
        // Handle the new structured error responses
        if (parseResponse.status === 422) {
          const errorData = await parseResponse.json();
          
          // Create enhanced error with structured information
          const enhancedError = createError(
            'parsing',
            errorData.error || 'Failed to parse article',
            errorData.errorType === 'paywall' 
              ? 'This article appears to be behind a paywall or requires a subscription'
              : 'Content extraction failed',
            false // Not retryable for structured parsing issues
          );
          
          // Add structured error metadata
          enhancedError.errorType = errorData.errorType;
          enhancedError.suggestions = errorData.suggestions || [];
          enhancedError.metadata = errorData.metadata;
          
          throw enhancedError;
        } else {
          const fetchError = await handleFetchError(parseResponse, 'article parsing');
          throw fetchError;
        }
      }

      const parseData = await parseResponse.json();
      
      console.log('📋 Parse response data URL:', parseData.url);
      console.log('📋 Parse response data title:', parseData.title);
      
      // Check for hybrid parsing metadata and log it
      if (parseData._hybrid) {
        console.log(`📊 Parsing method: ${parseData._hybrid.parsingMethod} (${parseData._hybrid.extractionTime}ms, confidence: ${parseData._hybrid.confidence}%)`);
        if (parseData._hybrid.extractionMethods?.length > 0) {
          console.log(`🔍 Extraction methods: ${parseData._hybrid.extractionMethods.join(', ')}`);
        }
      }
      
      // The parse API returns the article directly, not wrapped in a success field
      if (parseData.error) {
        // Create a specific parsing error with URL context
        throw createParsingError(parseData.error, submittedUrl);
      }
      
      // Validate we have required article data
      if (!parseData.title || !parseData.content) {
        if (!parseData.title && !parseData.content) {
          throw createParsingError('No content found in the article', submittedUrl);
        } else if (!parseData.title) {
          throw createParsingError('Article title could not be extracted', submittedUrl);
        } else {
          throw createParsingError('Article content could not be extracted', submittedUrl);
        }
      }

      // Check if content is too short (might indicate extraction issues)
      if (parseData.content.length < 100) {
        throw createParsingError('Article content appears incomplete or too short', submittedUrl);
      }

      // Article fetched successfully, now analyze it directly
      const articleData = {
        title: parseData.title,
        content: parseData.content,
        url: parseData.url || submittedUrl,
        author: parseData.author || '',
        date_published: parseData.date_published || ''
      };
      
      console.log('✅ Final article data URL:', articleData.url);
      
      // Check if the resolved URL is very different from the input
      const inputDomain = new URL(submittedUrl).hostname;
      const resolvedDomain = parseData.url ? new URL(parseData.url).hostname : inputDomain;
      
      // Warn if this resolved to a GitHub Gist (which often has incomplete content)
      if (parseData.url && parseData.url.includes('gist.github.com')) {
        console.warn('⚠️ Article resolved to GitHub Gist, content may be incomplete');
        
        // Check if content is too short for a typical article
        if (parseData.content.length < 500) {
          throw createParsingError(
            `This Medium article redirects to a GitHub Gist with limited content. GitHub Gists are code snippets, not full articles.`,
            submittedUrl
          );
        }
      }
      
      // Check for domain changes and log them
      if (inputDomain !== resolvedDomain) {
        console.log(`🔀 URL resolved from ${inputDomain} to ${resolvedDomain}`);
      }

      // Set article immediately so title/author appear
      setArticle(articleData);
      
      // Continue to analysis without setting loading=false
      // This ensures smooth transition to analysis
      await handleAnalyzeArticle(articleData);
      
      console.log('✅ Article fetched successfully');
      
    } catch (err) {
      const appError = parseApiError(err, 'handleFetchArticle');
      logError(appError, 'handleFetchArticle', err);
      setError(appError);
      setCurrentStep('urlInput');
      setLoading(false);
    }
    // Note: No finally block here to avoid setting loading=false prematurely
  }

  // New function to analyze article and extract key messages
  async function handleAnalyzeArticle(articleData: any) {
    console.log('🚀 Analyzing article:', articleData.title);
    
    // Clear historical data since we're generating fresh content
    setHistoricalPosts(null);
    setHistoricalPreferences(null);
    
    try {
      // Don't set loading=true again since it's already true from handleFetchArticle
      clearError();
      setCurrentStep('analysis');
      
      // Analyze article
      const analysisResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: articleData.url }),
      });

      if (!analysisResponse.ok) {
        const fetchError = await handleFetchError(analysisResponse, 'article analysis');
        throw fetchError;
      }

      const analysisData = await analysisResponse.json();
      
      if (!analysisData.success) {
        throw createError('api', analysisData.error || 'Analysis failed', 'API returned unsuccessful response', true);
      }

      // Validate analysis data
      if (!analysisData.analysis || !analysisData.analysis.keyMessages) {
        throw createError('parsing', 'Invalid analysis data received', 'Missing analysis or key messages', true);
      }

      // Set analysis immediately so central theme and key messages appear
      setAnalysis(analysisData.analysis);
      
      // Detect language in the background
      detectLanguageInBackground(articleData);
      
      // Create content result from key messages for backward compatibility
      const contentResult = {
        type: 'key-insights' as ContentType,
        items: analysisData.analysis.keyMessages.map((message: string, index: number) => ({
          id: `key_message_${index}`,
          type: 'key-insights' as ContentType,
          content: message,
          selected: false
        }))
      };
      
      setGeneratedContent(contentResult);
      
      // Save to history
      const historyId = historyManager.saveContentGeneration(
        articleData,
        contentResult,
        detectedLanguage,
        analysisData.analysis
      );
      
      setCurrentHistoryId(historyId);
      setCurrentHistoryTitle(articleData.title);
      setIsLatestItem(true);
      setCurrentStep('complete');
      setHasHistory(true);
      
      console.log('✅ Analysis completed successfully');
      
    } catch (err) {
      const appError = parseApiError(err, 'handleAnalyzeArticle');
      logError(appError, 'handleAnalyzeArticle', err);
      setError(appError);
      setCurrentStep('urlInput');
    } finally {
      setLoading(false);
    }
  }

  // Helper function to detect language in the background
  const detectLanguageInBackground = async (articleData: any) => {
    try {
      setLanguageDetectionStatus(prev => ({ ...prev, isDetecting: true }));
      
      const langResponse = await fetch('/api/detect-language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ article: articleData }),
      });

      if (langResponse.ok) {
        const langData = await langResponse.json();
        if (langData.success && langData.result) {
          const detectedLang = langData.result.language;
          const confidence = langData.result.confidence;
          
          setDetectedLanguage(detectedLang);
          setLanguageDetectionStatus({
            isDetecting: false,
            wasAutoDetected: true,
            confidence: confidence
          });
          
          console.log(`✅ Language auto-detected: ${detectedLang} (${confidence}% confidence)`);
        } else {
          console.warn('⚠️ Language detection returned unsuccessful response');
        }
      } else {
        console.warn(`⚠️ Language detection failed with status: ${langResponse.status}`);
      }
    } catch (langError) {
      console.warn('⚠️ Language detection failed:', langError);
    } finally {
      setLanguageDetectionStatus(prev => ({ ...prev, isDetecting: false }));
    }
  };

  // Retry function
  const handleRetry = () => {
    if (error && error.retryable) {
      if (currentStep === 'urlInput' && url) {
        handleFetchArticle(url);
      }
    }
  };

  const handleNewHistoryItemCreated = (newHistoryId: string) => {
    // Update state to reflect the new history item
    setCurrentHistoryId(newHistoryId);
    setIsLatestItem(true);
    
    // Load the new history item details
    const newItem = historyManager.getHistoryItem(newHistoryId);
    if (newItem) {
      setCurrentHistoryTitle(newItem.title);
    }
    
    console.log('🆕 Switched to new history item:', newHistoryId);
  };

  // Form submission handler
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingUrl.trim()) {
      handleFetchArticle(editingUrl.trim());
    }
  };

  const handleLoadHistoryItem = (item: HistoryItem) => {
    setUrl(item.articleUrl);
    setEditingUrl(item.articleUrl);
    setCurrentHistoryId(item.id);
    setDetectedLanguage(item.language);
    setCurrentStep('complete');
    setCurrentHistoryTitle(item.title);
    
    // Check if this is the latest item
    setIsLatestItem(historyManager.isLatestItem(item.id));
    
    // Reconstruct the context from history
    setArticle({
      title: item.articleTitle,
      url: item.articleUrl,
      content: '',
      author: item.articleAuthor || '',
      date_published: ''
    });
    
    // Use the saved analysis if available, otherwise create a basic one
    if (item.articleAnalysis) {
      setAnalysis(item.articleAnalysis);
    } else {
      setAnalysis({
        centralTheme: `Content from: ${item.articleTitle}`,
        keyMessages: ['Loaded from history'],
        summary: `Previously analyzed content for key insights generation`
      });
    }
    
    // Mark selected items if posts were generated
    if (item.selectedContentIndexes && item.generatedContent) {
      const updatedContent = {
        ...item.generatedContent,
        items: item.generatedContent.items.map((contentItem, index) => ({
          ...contentItem,
          selected: item.selectedContentIndexes?.includes(index) || false
        }))
      };
      setGeneratedContent(updatedContent);
    } else {
      setGeneratedContent(item.generatedContent);
    }
    
    // Set historical posts and preferences
    setHistoricalPosts(item.generatedPosts || null);
    setHistoricalPreferences(item.preferences || null);
    
    clearError();
  };

  const handleLoadLatest = () => {
    const latest = historyManager.getLatestItem();
    if (latest) {
      handleLoadHistoryItem(latest);
      setHistoryOpen(false);
    }
  };

  const handleStartNew = () => {
    setArticle(null);
    setAnalysis(null);
    setGeneratedContent(null);
    setCurrentHistoryId(null);
    setCurrentStep('urlInput');
    clearError();
    setUrl('');
    setEditingUrl('');
    setHistoricalPosts(null);
    setHistoricalPreferences(null);
    setIsLatestItem(true);
    setCurrentHistoryTitle(null);
    setDetectedLanguage('english');
    setLanguageDetectionStatus({
      isDetecting: false,
      wasAutoDetected: false,
      confidence: 0
    });
  };

  // Request to change URL after generation
  const handleRequestChange = (type: 'url') => {
    // Clear everything and start fresh
    handleStartNew();
  };

  // Function to fetch and analyze a random article
  const handleTryRandomArticle = async () => {
    try {
      setLoadingRandomArticle(true);
      clearError();
      
      const response = await fetch('/api/random-article');
      
      if (!response.ok) {
        throw new Error('Failed to fetch random article');
      }
      
      const data = await response.json();
      
      if (!data.success || !data.article) {
        throw new Error('No article returned');
      }
      
      // Set the URL and start analysis
      const articleUrl = data.article.url;
      setEditingUrl(articleUrl);
      
      // Start analyzing the random article
      await handleFetchArticle(articleUrl);
      
    } catch (err) {
      console.error('Error fetching random article:', err);
      setError(createError('api', 'Failed to load random article', 'Please try again or enter a URL manually', true));
    } finally {
      setLoadingRandomArticle(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header with History Button */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button 
                onClick={handleStartNew}
                className="text-xl sm:text-2xl font-bold text-gray-800 hover:text-blue-600 transition-colors cursor-pointer"
              >
                🧠 Thinker
              </button>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {(generatedContent || currentStep !== 'urlInput') && (
                <button
                  onClick={handleStartNew}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden xs:inline">Start New</span>
                  <span className="xs:hidden">New</span>
                </button>
              )}
              
              {/* Only show history button if there's actual history */}
              {hasHistory && (
                <button
                  onClick={() => setHistoryOpen(true)}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  History
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* History Item Status Bar */}
        {currentHistoryTitle && (
          <div className="bg-white border-t border-gray-100 shadow-sm animate-fadeInDown">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">

                {/* --- Reusable Components --- */}
                {/*
                  StatusIndicator: Shows "Previous" or "Latest" with colored dot.
                  LanguageDetectionBadge: Shows language detection status (detecting or detected).
                  LatestButton: Button to load latest, with different props for mobile/desktop.
                */}
                {(() => {
                  // Status indicator
                  function StatusIndicator({ isLatest }: { isLatest: boolean }) {
                    return isLatest ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-200">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span className="text-xs font-medium text-emerald-800">Latest</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-full border border-amber-200">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-amber-800">Previous</span>
                      </div>
                    );
                  }

                  // Language detection badge
                  function LanguageDetectionBadge({
                    isDetecting,
                    wasAutoDetected,
                    detectedLanguage,
                    confidence,
                    className = "",
                    detectingText = "Detecting...",
                    detectedTextPrefix = "Auto-detected: ",
                  }: {
                    isDetecting: boolean;
                    wasAutoDetected: boolean;
                    detectedLanguage: string;
                    confidence: number;
                    className?: string;
                    detectingText?: string;
                    detectedTextPrefix?: string;
                  }) {
                    if (!isDetecting && !wasAutoDetected) return null;
                    return (
                      <div className={`flex items-center gap-2 ${className}`}>
                        {isDetecting ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-full border border-blue-200">
                            <svg className="animate-spin w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-xs font-medium text-blue-800">{detectingText}</span>
                          </div>
                        ) : wasAutoDetected && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-full border border-green-200">
                            <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs font-medium text-green-800">
                              {detectedTextPrefix}
                              {detectedLanguage.charAt(0).toUpperCase() + detectedLanguage.slice(1)}
                            </span>
                            {confidence > 0 && (
                              <span className="text-xs text-green-600">
                                ({confidence}%)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Latest button
                  function LatestButton({
                    onClick,
                    className = "",
                    iconClass = "w-4 h-4",
                    text = "Latest",
                    showTextClass = "",
                  }: {
                    onClick: () => void;
                    className?: string;
                    iconClass?: string;
                    text?: string;
                    showTextClass?: string;
                  }) {
                    return (
                      <button
                        onClick={onClick}
                        className={className}
                      >
                        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        <span className={showTextClass}>{text}</span>
                      </button>
                    );
                  }

                  // URL display
                  function UrlSection({ url, generatedContent, onChange }: { url: string, generatedContent: any, onChange: () => void }) {
                    return (
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm text-gray-600 max-w-[120px] sm:max-w-[200px] truncate" title={url}>
                            {url.startsWith('http') ? new URL(url).hostname : url}
                          </span>
                          {generatedContent && (
                            <button
                              onClick={onChange}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Change
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // --- Main Render ---
                  return (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        {/* Status Indicator - Always visible */}
                        <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
                          <div className="flex items-center">
                            <StatusIndicator isLatest={isLatestItem} />
                          </div>

                          {/* Language Detection Display - Mobile */}
                          <div className="sm:hidden">
                            <LanguageDetectionBadge
                              isDetecting={languageDetectionStatus.isDetecting}
                              wasAutoDetected={languageDetectionStatus.wasAutoDetected}
                              detectedLanguage={detectedLanguage}
                              confidence={languageDetectionStatus.confidence}
                              detectingText="Detecting..."
                              detectedTextPrefix="Auto-detected: "
                            />
                          </div>

                          {/* Mobile-only: Latest button inline with status */}
                          {!isLatestItem && (
                            <LatestButton
                              onClick={handleLoadLatest}
                              className="sm:hidden inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-colors"
                              iconClass="w-3 h-3"
                              text="Latest"
                              showTextClass=""
                            />
                          )}
                        </div>

                        {/* Divider - Hidden on mobile */}
                        <div className="hidden sm:block h-6 w-px bg-gray-200" />

                        {/* Current Work Context */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                          {/* URL Section - Simplified on mobile */}
                          {url && (
                            <UrlSection
                              url={url}
                              generatedContent={generatedContent}
                              onChange={() => handleRequestChange('url')}
                            />
                          )}

                          {/* History Title - Hidden on smaller screens */}
                          <div className="hidden md:flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                            <span className="text-gray-400">•</span>
                            <span className="max-w-[150px] lg:max-w-[300px] truncate" title={currentHistoryTitle}>
                              {currentHistoryTitle}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Section - Language Detection (Desktop only) */}
                      <div className="hidden sm:flex items-center gap-3">
                        <LanguageDetectionBadge
                          isDetecting={languageDetectionStatus.isDetecting}
                          wasAutoDetected={languageDetectionStatus.wasAutoDetected}
                          detectedLanguage={detectedLanguage}
                          confidence={languageDetectionStatus.confidence}
                          className="ml-auto"
                          detectingText="Detecting Language..."
                          detectedTextPrefix="Auto-detected: "
                        />

                        {!isLatestItem && (
                          <LatestButton
                            onClick={handleLoadLatest}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-colors"
                            iconClass="w-4 h-4"
                            text="Latest"
                            showTextClass="hidden sm:inline"
                          />
                        )}
                      </div>
                    </>
                  );
                })()}
                {/* --- End Reusable Components --- */}

              </div>
            </div>
          </div>
        )}
      </div>

      <main className="max-w-4xl mx-auto py-6 sm:py-8 px-3 sm:px-4">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-12 animate-fadeInUp">
          {!article ? (
            <div className="max-w-2xl mx-auto">
              <div className="mb-10">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4 leading-tight tracking-tight">
                  Turn Articles Into Social Assets
                </h1>
                <p className="text-lg sm:text-xl text-gray-500 leading-relaxed font-light">
                  Paste an article link. Get ready-to-post content instantly.
                </p>
              </div>

              {/* URL Input Step */}
              {currentStep === 'urlInput' && (
                <div className="max-w-xl mx-auto">
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 sm:p-8 shadow-lg shadow-gray-500/5">
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="relative">
                        <input
                          type="url"
                          id="url"
                          value={editingUrl}
                          onChange={(e) => setEditingUrl(e.target.value)}
                          placeholder="https://example.com/article"
                          className="w-full px-6 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-3 focus:ring-blue-500/10 focus:border-blue-500 text-gray-900 placeholder-gray-400 bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-300 hover:border-gray-300"
                          required
                          disabled={loading}
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </div>
                      </div>
                      
                      <button
                        type="submit"
                        disabled={loading || !editingUrl.trim()}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transform hover:-translate-y-0.5"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analyzing...
                          </div>
                        ) : (
                          'Analyze Article'
                        )}
                      </button>

                      {/* Try Random Article Button */}
                      <div className="mt-6 pt-6 border-t border-gray-200/50">
                        <button
                          onClick={handleTryRandomArticle}
                          disabled={loading || loadingRandomArticle}
                          className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                        >
                          {loadingRandomArticle ? (
                            <div className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Finding article...
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Try Random Article
                            </div>
                          )}
                        </button>
                        <p className="text-xs text-gray-400 text-center mt-2">
                          Get a random article from Hacker News to test with
                        </p>
                      </div>
                    </form>

                    {/* <div className="mt-5 pt-4 border-t border-gray-200/50">
                      <div className="flex justify-center items-center gap-6 text-xs text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
                          <span>AI-Powered</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                          <span>Multi-Platform</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                          <span>Instant</span>
                        </div>
                      </div>
                    </div> */}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                {/* Show English title by default, original title for non-English articles */}
                {analysis?.centralTheme && detectedLanguage !== 'english' ? (
                  article.title
                ) : (
                  article.title
                )}
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 px-4 sm:px-0">
                {article.author ? `by ${article.author}` : 'Article Analysis & Social Media Content Generation'}
              </p>
            </>
          )}
        </div>

        {/* Loading States */}
        {loading && (
          <div className="flex flex-col items-center py-10">
            <div className="relative w-12 h-12 mb-6">
              <div className="absolute inset-0 border-3 border-gray-100 rounded-full"></div>
              <div className="absolute inset-0 border-3 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {currentStep === 'fetching' && 'Fetching Article...'}
                {currentStep === 'analysis' && 'Analyzing Content...'}
                {currentStep === 'generating' && 'Generating Content...'}
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto text-sm">
                {currentStep === 'fetching' && 'Reading and parsing the article content'}
                {currentStep === 'analysis' && 'Extracting key insights and themes'}
                {currentStep === 'generating' && 'Creating content based on your preferences'}
              </p>
            </div>
          </div>
        )}

        {/* Enhanced Error Display */}
        {error && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-l-4 border-red-500 animate-fadeInUp">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getErrorIcon(error.type, error.subtype)} />
                </svg>
              </div>
              
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {getErrorTitle(error.type, error.subtype)}
                </h3>
                <p className="text-gray-700 mb-2">{error.message}</p>
                {error.details && (
                  <p className="text-sm text-gray-500 mb-3">{error.details}</p>
                )}
                <p className="text-sm text-gray-600 mb-3">{getUserFriendlyMessage(error)}</p>
                
                {/* Display actionable suggestions */}
                {error.suggestions && error.suggestions.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">
                      💡 What you can try:
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      {error.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Show the problematic URL for parsing errors */}
                {error.type === 'parsing' && url && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      🔗 URL being processed:
                    </h4>
                    <p className="text-xs text-gray-600 font-mono break-all bg-white p-2 rounded border">
                      {url}
                    </p>
                    {url !== editingUrl && (
                      <p className="text-xs text-gray-500 mt-1">
                        (Original input: {editingUrl})
                      </p>
                    )}
                  </div>
                )}
                
                {/* Example URLs for parsing errors */}
                {error.type === 'parsing' && (
                  <div className="bg-green-50 rounded-lg p-3 mb-4">
                    <h4 className="text-sm font-medium text-green-900 mb-2">
                      ✅ Try these reliable sources:
                    </h4>
                    <div className="text-sm text-green-800 space-y-1">
                      <div>• BBC News, Reuters, Associated Press</div>
                      <div>• TechCrunch, Ars Technica (for tech articles)</div>
                      <div>• Harvard Business Review (for business content)</div>
                      <div>• Most major newspaper websites</div>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {error.retryable && (
                    <button
                      onClick={handleRetry}
                      disabled={loading}
                      className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Try Again
                    </button>
                  )}
                  
                  <button
                    onClick={clearError}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Dismiss
                  </button>
                  
                  {error.type !== 'validation' && (
                    <button
                      onClick={handleStartNew}
                      className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Start Over
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {generatedContent && article && analysis && (
          <div className="space-y-6">
            {/* Social Media Results */}
            <SocialMediaResults 
              context={{
                article,
                analysis,
                hooks: generatedContent ? { hooks: generatedContent.items.map(item => item.content) } : null,
                generatedContent
              }}
              currentHistoryId={currentHistoryId}
              currentUrl={url}
              onRequestUrlChange={() => handleRequestChange('url')}
              detectedLanguage={detectedLanguage}
              languageDetectionStatus={languageDetectionStatus}
              historicalPosts={historicalPosts}
              historicalPreferences={historicalPreferences}
              isLatestItem={isLatestItem}
              onNewHistoryItemCreated={handleNewHistoryItemCreated}
            />
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm animate-fadeInUp">
          <p>Built & powered by AI • Designed by a <a href="https://www.linkedin.com/in/slavanikitin/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors">human</a></p>
        </div>
      </main>

      {/* History Sidebar */}
      <History
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onLoadItem={handleLoadHistoryItem}
        currentHistoryId={currentHistoryId}
      />
    </div>
  );
}