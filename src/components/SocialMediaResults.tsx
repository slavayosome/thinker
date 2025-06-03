import { ChainContext } from '@/lib/promptChain';
import { useState, useEffect } from 'react';
import { PostGenerationPreferences, PostTone, PostType, Platform, SocialPostsResult, Language, ArticleData, AnalysisResult, HooksResult, ContentResult, PostStyle } from '@/types';
import { historyManager } from '@/lib/history';
import { AppError, createError, handleFetchError, parseApiError } from '@/lib/errorUtils';

interface SocialMediaResultsContext {
  article: ArticleData | null;
  analysis: AnalysisResult | null;
  hooks?: HooksResult | null;
  generatedContent?: ContentResult;
}

interface SocialMediaResultsProps {
  context: SocialMediaResultsContext;
  currentHistoryId?: string | null;
  currentUrl?: string;
  onRequestUrlChange?: () => void;
  detectedLanguage?: Language;
  languageDetectionStatus?: {
    isDetecting: boolean;
    wasAutoDetected: boolean;
    confidence: number;
  };
  historicalPosts?: SocialPostsResult | null;
  historicalPreferences?: PostGenerationPreferences | null;
  isLatestItem?: boolean;
  onNewHistoryItemCreated?: (historyId: string) => void;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  colorScheme: 'indigo' | 'yellow' | 'green';
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({ 
  title, 
  icon, 
  colorScheme, 
  isCollapsed, 
  onToggle, 
  children 
}: CollapsibleSectionProps) {
  const colorClasses = {
    indigo: {
      header: 'bg-indigo-50 border-indigo-200 text-indigo-800',
      border: 'border-indigo-200'
    },
    yellow: {
      header: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      border: 'border-yellow-200'
    },
    green: {
      header: 'bg-green-50 border-green-200 text-green-800',
      border: 'border-green-200'
    }
  };

  const colors = colorClasses[colorScheme];

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fadeInUp">
      <button
        onClick={onToggle}
        className={`${colors.header} border-b ${colors.border} p-4 w-full text-left hover:opacity-80 transition-opacity`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {icon}
            <span className="font-medium">{title}</span>
          </div>
          <svg 
            className={`w-5 h-5 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </button>
      {!isCollapsed && (
        <div className="p-6">
          {children}
        </div>
      )}
    </div>
  );
}

const languageOptions = [
  { value: 'english', label: 'English', flag: '🇺🇸' },
  { value: 'spanish', label: 'Spanish (Español)', flag: '🇪🇸' },
  { value: 'chinese', label: 'Chinese (中文)', flag: '🇨🇳' },
  { value: 'arabic', label: 'Arabic (العربية)', flag: '🇸🇦' },
  { value: 'portuguese', label: 'Portuguese (Português)', flag: '🇧🇷' },
  { value: 'indonesian', label: 'Indonesian (Bahasa Indonesia)', flag: '🇮🇩' },
  { value: 'french', label: 'French (Français)', flag: '🇫🇷' },
  { value: 'japanese', label: 'Japanese (日本語)', flag: '🇯🇵' },
  { value: 'russian', label: 'Russian (Русский)', flag: '🇷🇺' },
  { value: 'german', label: 'German (Deutsch)', flag: '🇩🇪' }
];

export default function SocialMediaResults({ 
  context, 
  currentHistoryId, 
  currentUrl,
  onRequestUrlChange,
  detectedLanguage: propDetectedLanguage,
  languageDetectionStatus,
  historicalPosts,
  historicalPreferences,
  isLatestItem = true,
  onNewHistoryItemCreated
}: SocialMediaResultsProps) {
  // State management
  const [collapsedSections, setCollapsedSections] = useState({
    analysis: false,
    hooks: false,
    socialPosts: true
  });
  
  // Initialize selectedIndexes from generatedContent if items have selected property
  const getInitialSelectedIndexes = () => {
    if (context.generatedContent?.items) {
      return context.generatedContent.items
        .map((item, index) => item.selected ? index : null)
        .filter((index): index is number => index !== null);
    }
    return [];
  };
  
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>(getInitialSelectedIndexes());
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  
  // Post generation preferences
  const [postPreferences, setPostPreferences] = useState<PostGenerationPreferences>(
    historicalPreferences || {
      selectedHooks: [],
      tone: 'authors-voice',
      style: 'storytelling',
      postType: 'sequence',
      platform: 'linkedin',
      language: 'english',
      contentLength: 'medium',
      hashtagPreference: 'moderate',
      emojiUsage: 'minimal',
      ctaType: 'mixed',
      targetAudience: 'professionals'
    }
  );

  // Generated posts state
  const [generatedPosts, setGeneratedPosts] = useState<SocialPostsResult | null>(historicalPosts || null);
  const [isGeneratingPosts, setIsGeneratingPosts] = useState(false);
  const [postGenerationError, setPostGenerationError] = useState<AppError | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Update local state when props change
  useEffect(() => {
    if (propDetectedLanguage !== undefined) {
      // Auto-select the detected language if it was auto-detected
      if (languageDetectionStatus?.wasAutoDetected) {
        setPostPreferences(prev => ({
          ...prev,
          language: propDetectedLanguage
        }));
      }
    }
  }, [propDetectedLanguage, languageDetectionStatus?.wasAutoDetected]);

  // Reset state when context changes
  useEffect(() => {
    const newSelectedIndexes = (() => {
      if (context.generatedContent?.items) {
        return context.generatedContent.items
          .map((item, index) => item.selected ? index : null)
          .filter((index): index is number => index !== null);
      }
      return [];
    })();
    
    setSelectedIndexes(newSelectedIndexes);
    
    if (historicalPosts) {
      setGeneratedPosts(historicalPosts);
    } else {
      setGeneratedPosts(null);
    }
    
    if (historicalPreferences) {
      setPostPreferences(historicalPreferences);
    }
    
    setPostGenerationError(null);
    
    if (!historicalPreferences) {
      setPostPreferences(prev => ({
        ...prev,
        selectedHooks: newSelectedIndexes
      }));
    }
    
    console.log('🔄 Context changed, resetting state');
  }, [context.article?.url, context.generatedContent, currentHistoryId, historicalPosts, historicalPreferences]);

  // Helper functions
  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = async (text: string, index: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatPost = (post: any) => {
    return `${post.hook}\n\n${post.mainMessage}\n\n${post.callToAction}`;
  };

  const handleItemSelection = (index: number) => {
    setSelectedIndexes(prev => {
      const newSelection = prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index];
      
      setPostPreferences(current => ({
        ...current,
        selectedHooks: newSelection
      }));
      
      return newSelection;
    });
  };

  const handleGeneratePosts = async () => {
    if (!context.article || !context.analysis || (!context.hooks && !context.generatedContent)) {
      setPostGenerationError(createError(
        'validation',
        'Missing required data for post generation',
        'Article analysis or content is not available',
        false,
        undefined,
        ['Please ensure the article has been analyzed first', 'Try reloading the page if data is missing']
      ));
      return;
    }

    if (selectedIndexes.length === 0) {
      setPostGenerationError(createError(
        'validation',
        'Please select at least one content item',
        'No content items are selected for post generation',
        false,
        undefined,
        ['Check at least one content item above', 'Select the most relevant hooks or insights for your posts']
      ));
      return;
    }

    setIsGeneratingPosts(true);
    setPostGenerationError(null);

    try {
      const allItems = context.hooks
        ? context.hooks.hooks
        : context.generatedContent?.items.map(it => it.content) || [];

      const hooksPayload: HooksResult = { hooks: allItems };

      const response = await fetch('/api/generate-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          article: context.article,
          analysis: context.analysis,
          hooks: hooksPayload,
          preferences: postPreferences
        }),
      });

      if (!response.ok) {
        const fetchError = await handleFetchError(response, 'post generation');
        throw fetchError;
      }

      const data = await response.json();
      
      if (!data.success) {
        throw createError(
          'api',
          'Failed to generate posts',
          data.error || 'API returned unsuccessful response',
          true,
          undefined,
          ['Try adjusting your content selection', 'Check if the selected content has enough context', 'Try again in a few moments']
        );
      }

      setGeneratedPosts(data.posts);
      
      if (!isLatestItem && context.generatedContent && data.posts) {
        const newHistoryId = historyManager.saveContentGeneration(
          context.article,
          context.generatedContent,
          postPreferences.language,
          context.analysis
        );
        
        historyManager.savePostGeneration(
          newHistoryId,
          data.posts,
          postPreferences,
          selectedIndexes
        );
        
        if (onNewHistoryItemCreated) {
          onNewHistoryItemCreated(newHistoryId);
        }
        
        console.log('📝 Created new history item from old one:', newHistoryId);
      } else if (currentHistoryId && data.posts) {
        historyManager.savePostGeneration(
          currentHistoryId,
          data.posts,
          postPreferences,
          selectedIndexes
        );
      }
      
      setTimeout(() => {
        const postsSection = document.getElementById('generated-posts');
        if (postsSection) {
          postsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);

    } catch (error) {
      console.error('Failed to generate posts:', error);
      const appError = parseApiError(error, 'post generation');
      setPostGenerationError(appError);
    } finally {
      setIsGeneratingPosts(false);
    }
  };

  const renderAnalysisContent = () => {
    if (!context.analysis) return null;

    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">Central Theme:</h4>
          <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{context.analysis.centralTheme}</p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">Summary:</h4>
          <p className="text-gray-700 bg-gray-50 p-3 rounded-lg leading-relaxed">{context.analysis.summary}</p>
        </div>
      </div>
    );
  };

  // Enhanced error display for post generation
  const renderPostGenerationError = () => {
    if (!postGenerationError) return null;

    return (
      <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h4 className="text-sm font-semibold text-red-800 mb-1">
              {postGenerationError.type === 'validation' ? 'Input Required' : 'Generation Failed'}
            </h4>
            <p className="text-red-700 text-sm mb-2">{postGenerationError.message}</p>
            {postGenerationError.suggestions && postGenerationError.suggestions.length > 0 && (
              <ul className="text-red-600 text-sm space-y-1">
                {postGenerationError.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={() => setPostGenerationError(null)}
            className="flex-shrink-0 ml-2 text-red-400 hover:text-red-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const renderSelectableContent = () => {
    const items = context.hooks
      ? context.hooks.hooks
      : context.generatedContent?.items.map(item => item.content);

    if (!items || items.length === 0) return null;
    
    return (
      <div className="space-y-4">
        <div className="grid gap-3">
          {items.map((text, index) => (
            <div key={index} className="relative">
              <div className={`p-3 rounded-lg border transition-all ${
                selectedIndexes.includes(index) 
                  ? 'bg-yellow-100 border-yellow-300 ring-2 ring-yellow-300' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    <input
                      type="checkbox"
                      id={`item-${index}`}
                      checked={selectedIndexes.includes(index)}
                      onChange={() => handleItemSelection(index)}
                      className="mt-1 mr-3 text-yellow-600 border-yellow-300 rounded focus:ring-yellow-500"
                    />
                    <label htmlFor={`item-${index}`} className="text-gray-800 flex-1 cursor-pointer">
                      <div className="text-xs font-medium text-yellow-700 mb-1">Item #{index + 1}</div>
                      <div>{text}</div>
                    </label>
                  </div>
                  <button
                    onClick={() => copyToClipboard(text, `item-${index}`)}
                    className="ml-2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {copiedIndex === `item-${index}` ? '✅' : '📋'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Post Customization Settings */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fadeInUp">
          <div className="bg-green-50 border-b border-green-200 p-4">
            <h3 className="text-lg font-semibold text-green-900 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11 4a4 4 0 114 4 4 4 0 01-4 4v2a1 1 0 11-2 0V8a1 1 0 011-1h3a2 2 0 100-4 2 2 0 100 4 1 1 0 11-2 0z" clipRule="evenodd" />
              </svg>
              Post Customization Settings
            </h3>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Basic Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                <select
                  value={postPreferences.platform}
                  onChange={(e) => setPostPreferences(prev => ({ ...prev, platform: e.target.value as Platform }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="linkedin">LinkedIn</option>
                  <option value="twitter">Twitter/X</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>

              {/* Tone Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
                <select
                  value={postPreferences.tone}
                  onChange={(e) => setPostPreferences(prev => ({ ...prev, tone: e.target.value as PostTone }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="authors-voice">Author's Voice</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="inspirational">Inspirational</option>
                  <option value="educational">Educational</option>
                  <option value="humorous">Humorous</option>
                </select>
              </div>

              {/* Style Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
                <select
                  value={postPreferences.style}
                  onChange={(e) => setPostPreferences(prev => ({ ...prev, style: e.target.value as PostStyle }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="storytelling">Storytelling</option>
                  <option value="data-driven">Data-Driven</option>
                  <option value="question-based">Question-Based</option>
                  <option value="listicle">Listicle</option>
                  <option value="personal-anecdote">Personal Anecdote</option>
                  <option value="educational">Educational</option>
                  <option value="provocative">Provocative</option>
                </select>
              </div>
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Output Language</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {languageOptions.map((language) => (
                  <button
                    key={language.value}
                    onClick={() => setPostPreferences(prev => ({ ...prev, language: language.value as Language }))}
                    className={`flex items-center justify-center px-3 py-2 rounded-md border transition-colors ${
                      postPreferences.language === language.value
                        ? 'bg-green-100 border-green-300 text-green-800'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-1">{language.flag}</span>
                    <span className="text-xs font-medium truncate">{language.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none"
              >
                <span>Advanced Settings</span>
                <svg 
                  className={`w-4 h-4 transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`} 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Advanced Settings Panel */}
              {advancedOpen && (
                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Content Length */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Content Length</label>
                      <select
                        value={postPreferences.contentLength}
                        onChange={(e) => setPostPreferences(prev => ({ ...prev, contentLength: e.target.value as any }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="short">Short</option>
                        <option value="medium">Medium</option>
                        <option value="long">Long</option>
                      </select>
                    </div>

                    {/* Target Audience */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                      <select
                        value={postPreferences.targetAudience}
                        onChange={(e) => setPostPreferences(prev => ({ ...prev, targetAudience: e.target.value as any }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="professionals">Professionals</option>
                        <option value="general">General Audience</option>
                        <option value="entrepreneurs">Entrepreneurs</option>
                        <option value="students">Students</option>
                        <option value="experts">Industry Experts</option>
                      </select>
                    </div>

                    {/* Hashtag Preference */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hashtags</label>
                      <select
                        value={postPreferences.hashtagPreference}
                        onChange={(e) => setPostPreferences(prev => ({ ...prev, hashtagPreference: e.target.value as any }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="none">No Hashtags</option>
                        <option value="minimal">Minimal (1-2)</option>
                        <option value="moderate">Moderate (3-5)</option>
                        <option value="comprehensive">Extensive (6+)</option>
                      </select>
                    </div>

                    {/* Emoji Usage */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Emoji Usage</label>
                      <select
                        value={postPreferences.emojiUsage}
                        onChange={(e) => setPostPreferences(prev => ({ ...prev, emojiUsage: e.target.value as any }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="none">No Emojis</option>
                        <option value="minimal">Minimal</option>
                        <option value="moderate">Moderate</option>
                        <option value="heavy">Heavy</option>
                      </select>
                    </div>
                  </div>

                  {/* Call to Action Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Call to Action</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {['engagement', 'share', 'comment', 'mixed'].map((cta) => (
                        <button
                          key={cta}
                          onClick={() => setPostPreferences(prev => ({ ...prev, ctaType: cta as any }))}
                          className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                            postPreferences.ctaType === cta
                              ? 'bg-green-100 border-green-300 text-green-800'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {cta.charAt(0).toUpperCase() + cta.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-6">
          <button
            onClick={handleGeneratePosts}
            disabled={selectedIndexes.length === 0 || isGeneratingPosts}
            className={`w-full py-3 px-4 rounded-md font-medium transition-all duration-200 ${
              selectedIndexes.length === 0 || isGeneratingPosts
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:from-yellow-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-yellow-500'
            }`}
          >
            {isGeneratingPosts ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Posts...
              </div>
            ) : (
              `Generate Posts (${selectedIndexes.length} item${selectedIndexes.length === 1 ? '' : 's'} selected)`
            )}
          </button>

          {renderPostGenerationError()}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Article Analysis Section */}
      {context.analysis && (
        <CollapsibleSection
          title="Article Analysis"
          icon={<svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>}
          colorScheme="indigo"
          isCollapsed={collapsedSections.analysis}
          onToggle={() => toggleSection('analysis')}
        >
          {renderAnalysisContent()}
        </CollapsibleSection>
      )}

      {/* Content Selection Section */}
      {(context.hooks || context.generatedContent) && (
        <CollapsibleSection
          title={context.hooks ? "Generated Hooks" : "Generated Content"}
          icon={<svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM8 8a1 1 0 000 2h4a1 1 0 100-2H8z" clipRule="evenodd" />
          </svg>}
          colorScheme="yellow"
          isCollapsed={collapsedSections.hooks}
          onToggle={() => toggleSection('hooks')}
        >
          {renderSelectableContent()}
        </CollapsibleSection>
      )}

      {/* Generated Social Media Posts */}
      {generatedPosts && (
        <div id="generated-posts" className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-green-50 border-b border-green-200 p-4">
            <h3 className="text-lg font-semibold text-green-900 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Generated {generatedPosts.platform.toUpperCase()} Posts ({generatedPosts.posts.length})
            </h3>
          </div>
          
          <div className="p-6 space-y-6">
            {generatedPosts.posts.map((post, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold text-gray-800">Post {index + 1}</h4>
                  <button
                    onClick={() => copyToClipboard(formatPost(post), `generated-post-${index}`)}
                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                  >
                    {copiedIndex === `generated-post-${index}` ? '✅ Copied' : '📋 Copy Post'}
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hook</span>
                    <p className="text-gray-800 font-medium">{post.hook}</p>
                  </div>
                  
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Main Message</span>
                    <p className="text-gray-700 leading-relaxed">{post.mainMessage}</p>
                  </div>
                  
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Call to Action</span>
                    <p className="text-gray-800 font-medium">{post.callToAction}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 