// src/app/page.tsx
'use client';

import { useState } from 'react';
import UrlInput from '@/components/UrlInput';
import ProgressStatus from '@/components/ProgressStatus';
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

      // Article fetched successfully, now show content type selection
      const articleData = {
        title: parseData.title,
        content: parseData.content,
        url: parseData.url || submittedUrl,
        author: parseData.author || '',
        date_published: parseData.date_published || ''
      };
      
      setArticle(articleData);
      
      // Detect available content types
      setIsDetectingTypes(true);
      try {
        const detectResponse = await fetch('/api/detect-content-types', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ article: articleData }),
        });

        if (detectResponse.ok) {
          const detectData = await detectResponse.json();
          if (detectData.success && detectData.result) {
            setAvailableContentTypes(detectData.result.availableTypes);
            setRecommendedTypes(detectData.result.recommendedTypes);
            
            // Set default selection to first recommended type
            if (detectData.result.recommendedTypes.length > 0) {
              setSelectedContentType(detectData.result.recommendedTypes[0]);
            }
          }
        }
      } catch (detectError) {
        console.error('Content type detection failed:', detectError);
        // Use all types as fallback
        setAvailableContentTypes(
          contentTypeOptions.map(opt => ({
            type: opt.value,
            available: true,
            confidence: 70,
            reason: 'Detection unavailable'
          }))
        );
      } finally {
        setIsDetectingTypes(false);
      }
      
      setCurrentStep('contentType');
      
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

  // Generate content after content type selection
  async function handleGenerateContent() {
    if (!article) return;
    
    console.log('🚀 Generating content for:', selectedContentType);
    
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
        body: JSON.stringify({ url }),
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
          body: JSON.stringify({ article }),
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
      
      // Generate content
      setCurrentStep('generating');
      
      const contentResponse = await fetch('/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          article,
          analysis: analysisData.analysis,
          contentType: selectedContentType,
          count: 8,
          language: detectedLanguage
        }),
      });

      if (!contentResponse.ok) {
        const errorData = await contentResponse.json();
        throw new Error(errorData.error || 'Content generation failed');
      }

      const contentData = await contentResponse.json();
      
      if (!contentData.success) {
        throw new Error(contentData.error || 'Content generation failed');
      }

      setGeneratedContent(contentData.result);

      // Save to history
      const historyId = historyManager.saveContentGeneration(
        url,
        article.title,
        contentData.result,
        detectedLanguage,
        analysisData.analysis
      );
      setCurrentHistoryId(historyId);
      setIsLatestItem(true);
      
      // Get the history item to set the title
      const historyItem = historyManager.getHistoryItem(historyId);
      if (historyItem) {
        setCurrentHistoryTitle(historyItem.title);
      }

      console.log('✅ Content generation completed');
      
      // Complete
      setCurrentStep('complete');
      
    } catch (err) {
      console.error('❌ Content generation failed:', err instanceof Error ? err.message : 'Unknown error');
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Error generating content: ${errorMessage}`);
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

  // Legacy submit handler (keeping for backwards compatibility)
  async function handleSubmit(submittedUrl: string) {
    await handleFetchArticle(submittedUrl);
  }

  const handleLoadHistoryItem = (item: HistoryItem) => {
    setUrl(item.articleUrl);
    setEditingUrl(item.articleUrl);
    setSelectedContentType(item.contentType);
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
        summary: `Previously analyzed content for ${item.contentType} generation`
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
    setSelectedContentType('hooks');
    setHistoricalPosts(null);
    setHistoricalPreferences(null);
    setIsLatestItem(true);
    setCurrentHistoryTitle(null);
  };

  // Request to change URL or content type after generation
  const handleRequestChange = (type: 'url' | 'contentType') => {
    if (type === 'url') {
      // Clear everything and start fresh
      handleStartNew();
    } else {
      // Go back to content type selection
      setGeneratedContent(null);
      setAnalysis(null);
      setCurrentStep('contentType');
      // Clear historical posts when changing content type
      setHistoricalPosts(null);
      setHistoricalPreferences(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header with History Button */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-gray-800">
                🧠 Thinker
              </div>
              <div className="ml-4 text-sm text-gray-500">
                AI-Powered Content Creator
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {(generatedContent || currentStep !== 'urlInput') && (
                <button
                  onClick={handleStartNew}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" />
                  </svg>
                  Start New
                </button>
              )}
              
              <button
                onClick={() => setHistoryOpen(true)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                History
              </button>
            </div>
          </div>
        </div>
        
        {/* History Item Status Bar */}
        {currentHistoryTitle && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-gray-200 animate-fadeInDown">
            <div className="max-w-4xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Working With Label */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">Working with:</span>
                    </div>
                    
                    {/* History Item Title */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 max-w-xs truncate">
                        {currentHistoryTitle}
                      </span>
                      
                      {/* Status Badge */}
                      {!isLatestItem ? (
                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0016 0zm-2-5a1 1 0 00-1 1v4a1 1 0 102 0v-4a1 1 0 00-1-1zm0-2a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                          Previous Version
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0016 0zm-1.293-4.293a1 1 0 010-1.414L10 11l1.293 1.293a1 1 0 001.414-1.414l-2-2a1 1 0 00-1.414 0l-2 2a1 1 0 001.414 1.414L10 11l-1.293 1.293a1 1 0 001.414 0z" clipRule="evenodd" />
                          </svg>
                          Latest
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Article Info */}
                  {article && (
                    <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 border-l border-gray-300 pl-4">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z" clipRule="evenodd" />
                      </svg>
                      <span className="truncate max-w-xs" title={article.title}>
                        {article.title}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {!isLatestItem && (
                    <>
                      {/* Info Message - Hidden on mobile */}
                      <div className="hidden md:block text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-md mr-2">
                        <span className="font-medium">⚡ Generating new posts will create a new version</span>
                      </div>
                      
                      {/* Return to Latest Button */}
                      <button
                        onClick={handleLoadLatest}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span className="hidden sm:inline">Jump to Latest</span>
                        <span className="sm:hidden">Latest</span>
                      </button>
                    </>
                  )}
                  
                  {/* View in History Button */}
                  <button
                    onClick={() => setHistoryOpen(true)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4 mr-1.5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2 1 1 0 100-2 2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
                    </svg>
                    <span className="hidden sm:inline">View in History</span>
                    <span className="sm:hidden">History</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <main className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8 animate-fadeInUp">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Transform Articles into Social Media Content
          </h1>
          <p className="text-xl text-gray-600">
            Choose what to extract, paste any article URL, and get instant analysis with optimized social media content
          </p>
        </div>

        {/* Content Type Selection */}
        {currentStep === 'contentType' && article && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 animate-fadeInUp">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Article fetched successfully!
              </h3>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">📄 {article.title}</p>
                <p className="text-xs text-green-700 mt-1">From: {article.url}</p>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              What would you like to extract from this article?
            </h3>
            
            {isDetectingTypes ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-sm text-gray-600">Analyzing article content...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {contentTypeOptions.map((option) => {
                  const availability = availableContentTypes.find(a => a.type === option.value);
                  const isAvailable = availability?.available !== false;
                  const isRecommended = recommendedTypes.includes(option.value);
                  const confidence = availability?.confidence || 0;
                  
                  return (
                    <button
                      key={option.value}
                      onClick={() => isAvailable && setSelectedContentType(option.value)}
                      disabled={!isAvailable}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 text-left relative ${
                        !isAvailable 
                          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed' 
                          : selectedContentType === option.value
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      {isRecommended && (
                        <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                          Recommended
                        </span>
                      )}
                      <div className="flex items-center mb-1">
                        <span className="text-lg mr-2">{option.icon}</span>
                        <h4 className={`font-medium text-sm ${
                          !isAvailable 
                            ? 'text-gray-500'
                            : selectedContentType === option.value 
                            ? 'text-blue-900' 
                            : 'text-gray-900'
                        }`}>
                          {option.label}
                        </h4>
                      </div>
                      <p className={`text-xs ${
                        !isAvailable 
                          ? 'text-gray-400'
                          : selectedContentType === option.value 
                          ? 'text-blue-700' 
                          : 'text-gray-600'
                      }`}>
                        {option.description}
                      </p>
                      {availability && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">Confidence</span>
                            <span className="text-xs font-medium text-gray-700">{confidence}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${
                                confidence >= 80 ? 'bg-green-500' : 
                                confidence >= 60 ? 'bg-yellow-500' : 
                                'bg-red-500'
                              }`}
                              style={{ width: `${confidence}%` }}
                            />
                          </div>
                          {availability.reason && (
                            <p className="text-xs text-gray-500 mt-1">{availability.reason}</p>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between items-center">
              <button
                onClick={handleStartNew}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Use different URL
              </button>
              <button
                onClick={handleGenerateContent}
                disabled={loading || isDetectingTypes}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate {contentTypeOptions.find(opt => opt.value === selectedContentType)?.label} →
              </button>
            </div>
          </div>
        )}
        
        {/* Input Section */}
        {currentStep === 'urlInput' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 animate-fadeInUp hover:shadow-xl transition-shadow duration-300">
            <UrlInput onSubmit={handleFetchArticle} isProcessing={loading} />
          </div>
        )}

        {/* Progress Status */}
        {loading && (
          <div className="animate-slideIn">
            <ProgressStatus 
              currentStep={currentStep === 'fetching' ? 1 : currentStep === 'analysis' ? 2 : currentStep === 'generating' ? 3 : 4}
              totalSteps={4}
              steps={[
                { id: '1', name: 'Fetching Article', description: 'Retrieving article content' },
                { id: '2', name: 'Analysis', description: 'Analyzing content and themes' },
                { id: '3', name: 'Generating Content', description: `Creating ${selectedContentType}` },
                { id: '4', name: 'Complete', description: 'Ready for post generation' }
              ]}
            />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 animate-slideIn">
            <div className="flex items-center">
              <div className="text-red-800">
                <svg className="w-5 h-5 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
            <div className="mt-2 text-xs text-red-600">
              💡 Tip: Check the browser console (F12) for detailed error logs
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
              onRequestContentTypeChange={() => handleRequestChange('contentType')}
              selectedContentType={selectedContentType}
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