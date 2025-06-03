// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import SocialMediaResults from '@/components/SocialMediaResults';
import History from '@/components/History';
import { ArticleData, AnalysisResult, ContentResult, ContentType, HistoryItem, Language, SocialPostsResult, PostGenerationPreferences } from '@/types';
import { historyManager } from '@/lib/history';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('urlInput');
  const [selectedContentType, setSelectedContentType] = useState<ContentType>('hooks');
  const [url, setUrl] = useState('');
  const [editingUrl, setEditingUrl] = useState('');
  
  // Generated content state
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [generatedContent, setGeneratedContent] = useState<ContentResult | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<Language>('english');
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

  // New function to fetch article only
  async function handleFetchArticle(submittedUrl: string) {
    console.log('🚀 Fetching article from:', submittedUrl);
    
    try {
      setLoading(true);
      setError('');
      setUrl(submittedUrl);
      setEditingUrl(submittedUrl);
      setCurrentStep('fetching');
      
      // Parse the article to validate it exists
      const parseResponse = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: submittedUrl }),
      });

      if (!parseResponse.ok) {
        const errorData = await parseResponse.json();
        throw new Error(errorData.error || `Failed to fetch article: ${parseResponse.status}`);
      }

      const parseData = await parseResponse.json();
      
      // The parse API returns the article directly, not wrapped in a success field
      if (parseData.error) {
        throw new Error(parseData.error);
      }
      
      // Validate we have required article data
      if (!parseData.title || !parseData.content) {
        throw new Error('Invalid article data received');
      }

      // Article fetched successfully, now analyze it directly
      const articleData = {
        title: parseData.title,
        content: parseData.content,
        url: parseData.url || submittedUrl,
        author: parseData.author || '',
        date_published: parseData.date_published || ''
      };
      
      setArticle(articleData);
      
      // Proceed directly to analysis
      handleAnalyzeArticle(articleData);
      
      console.log('✅ Article fetched successfully');
      
    } catch (err) {
      console.error('❌ Article fetch failed:', err instanceof Error ? err.message : 'Unknown error');
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Error fetching article: ${errorMessage}`);
      setCurrentStep('urlInput');
    } finally {
      setLoading(false);
    }
  }

  // New function to analyze article and extract key messages
  async function handleAnalyzeArticle(articleData: any) {
    console.log('🚀 Analyzing article:', articleData.title);
    
    // Clear historical data since we're generating fresh content
    setHistoricalPosts(null);
    setHistoricalPreferences(null);
    
    try {
      setLoading(true);
      setError('');
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
        const errorData = await analysisResponse.json();
        throw new Error(errorData.error || `Analysis failed: ${analysisResponse.status}`);
      }

      const analysisData = await analysisResponse.json();
      
      if (!analysisData.success) {
        throw new Error(analysisData.error || 'Analysis failed');
      }

      setAnalysis(analysisData.analysis);
      
      // Detect language
      try {
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
            setDetectedLanguage(langData.result.language);
          }
        }
      } catch (langError) {
        console.error('Language detection failed:', langError);
      }
      
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
        articleData.url,
        articleData.title,
        contentResult,
        detectedLanguage,
        analysisData.analysis
      );
      
      setCurrentHistoryId(historyId);
      setCurrentHistoryTitle(articleData.title);
      setIsLatestItem(true);
      setCurrentStep('complete');
      
      console.log('✅ Analysis completed successfully');
      
    } catch (err) {
      console.error('❌ Analysis failed:', err instanceof Error ? err.message : 'Unknown error');
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Error analyzing article: ${errorMessage}`);
      setCurrentStep('urlInput');
    } finally {
      setLoading(false);
    }
  }

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
      author: '',
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
    
    setError('');
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
    setError('');
    setUrl('');
    setEditingUrl('');
    setHistoricalPosts(null);
    setHistoricalPreferences(null);
    setIsLatestItem(true);
    setCurrentHistoryTitle(null);
    setDetectedLanguage('english');
  };

  // Request to change URL after generation
  const handleRequestChange = (type: 'url') => {
    // Clear everything and start fresh
    handleStartNew();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header with History Button */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="text-xl sm:text-2xl font-bold text-gray-800">
                🧠 Thinker
              </div>
              <div className="ml-2 sm:ml-4 text-xs sm:text-sm text-gray-500 hidden xs:block">
                AI-Powered Content Creator
              </div>
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
              
              <button
                onClick={() => setHistoryOpen(true)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                History
              </button>
            </div>
          </div>
        </div>
        
        {/* History Item Status Bar */}
        {currentHistoryTitle && (
          <div className="bg-white border-t border-gray-100 shadow-sm animate-fadeInDown">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                {/* Mobile: Stack vertically, Desktop: Side by side */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  {/* Status Indicator - Always visible */}
                  <div className="flex items-center justify-between sm:justify-start">
                  <div className="flex items-center">
                    {!isLatestItem ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-full border border-amber-200">
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                          <span className="text-xs font-medium text-amber-800">Previous</span>
                      </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-200">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span className="text-xs font-medium text-emerald-800">Latest</span>
                      </div>
                      )}
                    </div>

                    {/* Mobile-only: Latest button inline with status */}
                    {!isLatestItem && (
                      <button
                        onClick={handleLoadLatest}
                        className="sm:hidden inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        <span>Latest</span>
                      </button>
                    )}
                  </div>

                  {/* Divider - Hidden on mobile */}
                  <div className="hidden sm:block h-6 w-px bg-gray-200" />

                  {/* Current Work Context */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    {/* URL Section - Simplified on mobile */}
                    {url && (
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
                              onClick={() => handleRequestChange('url')}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Change
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Content Type Section - Compact on mobile */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-gray-100 rounded-md">
                        <span className="text-xs sm:text-sm">
                          💡
                        </span>
                        <span className="text-xs sm:text-sm font-medium text-gray-700">
                          Key Insights
                        </span>
                      </div>
                    </div>

                    {/* History Title - Hidden on smaller screens */}
                    <div className="hidden md:flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                      <span className="text-gray-400">•</span>
                      <span className="max-w-[150px] lg:max-w-[300px] truncate" title={currentHistoryTitle}>
                        {currentHistoryTitle}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Section - Desktop only Latest button */}
                  {!isLatestItem && (
                  <div className="hidden sm:flex items-center gap-2">
                    <button
                      onClick={handleLoadLatest}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      <span className="hidden sm:inline">Latest</span>
                    </button>
                  </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>

      <main className="max-w-4xl mx-auto py-6 sm:py-8 px-3 sm:px-4">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 animate-fadeInUp">
          {!article ? (
            <>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                Transform Articles into Social Media Content
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 px-4 sm:px-0">
                Paste any article URL and get instant analysis with optimized social media content
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                {/* Show English title by default, original title for non-English articles */}
                {analysis?.centralTheme && detectedLanguage !== 'english' ? (
                  <div className="space-y-2">
                    <div className="text-lg sm:text-xl md:text-2xl text-gray-600 font-medium">
                      {analysis.centralTheme}
                    </div>
                    <div className="text-base sm:text-lg md:text-xl text-gray-500 font-normal">
                      Original: {article.title}
                    </div>
                  </div>
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
          <div className="flex flex-col items-center py-8">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {currentStep === 'fetching' && 'Fetching Article...'}
                {currentStep === 'analysis' && 'Analyzing Content...'}
                {currentStep === 'generating' && 'Generating Content...'}
              </h3>
              <p className="text-gray-600">
                {currentStep === 'fetching' && 'Reading and parsing the article content'}
                {currentStep === 'analysis' && 'Extracting key insights and themes'}
                {currentStep === 'generating' && 'Creating content based on your preferences'}
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0016 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* URL Input Step */}
        {currentStep === 'urlInput' && (
          <div className="bg-white rounded-xl shadow-lg p-6 animate-fadeInUp">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Enter Article URL</h2>
            <p className="text-gray-600 mb-6">
              Paste the URL of any article you'd like to analyze and create content from.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                  Article URL
                </label>
                <input
                  type="url"
                  id="url"
                  value={editingUrl}
                  onChange={(e) => setEditingUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  required
                  disabled={loading}
                />
              </div>
              
              <button
                type="submit"
                disabled={loading || !editingUrl.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Processing...' : 'Analyze Article →'}
              </button>
            </form>
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
              historicalPosts={historicalPosts}
              historicalPreferences={historicalPreferences}
              isLatestItem={isLatestItem}
              onNewHistoryItemCreated={handleNewHistoryItemCreated}
            />
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm animate-fadeInUp">
          <p>Powered by AI • Built with ❤️ by <a href="https://www.linkedin.com/in/slavanikitin/" className="text-blue-600 hover:text-blue-800">Slava</a></p>
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