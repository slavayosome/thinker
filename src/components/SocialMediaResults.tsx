import { ChainContext } from '@/lib/promptChain';
import { useState, useEffect } from 'react';
import { PostGenerationPreferences, PostTone, PostType, Platform, SocialPostsResult, Language, ArticleData, AnalysisResult, HooksResult, ContentResult, ContentType } from '@/types';
import { historyManager } from '@/lib/history';

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
  onRequestContentTypeChange?: () => void;
  selectedContentType?: ContentType;
  detectedLanguage?: Language;
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
  onRequestContentTypeChange,
  selectedContentType,
  detectedLanguage: propDetectedLanguage,
  historicalPosts,
  historicalPreferences,
  isLatestItem = true,
  onNewHistoryItemCreated
}: SocialMediaResultsProps) {
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
  
  // Language detection state
  const [detectedLanguage, setDetectedLanguage] = useState<Language>(propDetectedLanguage || 'english');
  const [languageConfidence, setLanguageConfidence] = useState<number>(0);
  const [isDetectingLanguage, setIsDetectingLanguage] = useState(false);
  
  // Post generation preferences - with all defaults explicitly set
  const [postPreferences, setPostPreferences] = useState<PostGenerationPreferences>(
    historicalPreferences || {
      selectedHooks: [],
      tone: 'authors-voice', // Author's voice as default
      style: 'storytelling',
      postType: 'sequence',
      platform: 'linkedin',
      language: 'english', // Will be updated after detection
      contentLength: 'medium',
      hashtagPreference: 'moderate',
      emojiUsage: 'minimal',
      ctaType: 'mixed',
      targetAudience: 'professionals'
    }
  );

  // Generated posts state - initialize with historical posts if available
  const [generatedPosts, setGeneratedPosts] = useState<SocialPostsResult | null>(historicalPosts || null);
  const [isGeneratingPosts, setIsGeneratingPosts] = useState(false);
  const [postGenerationError, setPostGenerationError] = useState<string | null>(null);

  // Advanced settings toggle
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Update local state when props change
  useEffect(() => {
    if (propDetectedLanguage !== undefined) {
      setDetectedLanguage(propDetectedLanguage);
    }
  }, [propDetectedLanguage]);

  // Reset state when context changes (new article loaded)
  useEffect(() => {
    // Reset selected indexes based on the new context
    const newSelectedIndexes = (() => {
      if (context.generatedContent?.items) {
        return context.generatedContent.items
          .map((item, index) => item.selected ? index : null)
          .filter((index): index is number => index !== null);
      }
      return [];
    })();
    
    setSelectedIndexes(newSelectedIndexes);
    
    // If this is a different article (different history ID), clear generated posts
    // Otherwise, use historical posts if available
    if (historicalPosts) {
      setGeneratedPosts(historicalPosts);
    } else {
      setGeneratedPosts(null);
    }
    
    // Use historical preferences if available
    if (historicalPreferences) {
      setPostPreferences(historicalPreferences);
    }
    
    // Clear any error messages
    setPostGenerationError(null);
    
    // Update post preferences with the new selection (only if no historical preferences)
    if (!historicalPreferences) {
      setPostPreferences(prev => ({
        ...prev,
        selectedHooks: newSelectedIndexes
      }));
    }
    
    console.log('🔄 Context changed, resetting state');
  }, [context.article?.url, context.generatedContent, currentHistoryId, historicalPosts, historicalPreferences]);

  // Detect language when context is available
  useEffect(() => {
    const detectLanguage = async () => {
      if (!context.article) return;
      
      setIsDetectingLanguage(true);
      try {
        const response = await fetch('/api/detect-language', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            article: context.article
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.result) {
            setDetectedLanguage(data.result.language);
            setLanguageConfidence(data.result.confidence);
            
            // Update the preferences with detected language
            setPostPreferences(prev => ({
              ...prev,
              language: data.result.language
            }));
            
            console.log(`🌍 Language detected: ${data.result.language} (${data.result.confidence}% confidence)`);
          }
        }
      } catch (error) {
        console.error('Failed to detect language:', error);
        // Keep English as default if detection fails
      } finally {
        setIsDetectingLanguage(false);
      }
    };

    detectLanguage();
  }, [context.article]);

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
      
      // Update preferences
      setPostPreferences(current => ({
        ...current,
        selectedHooks: newSelection
      }));
      
      return newSelection;
    });
  };

  const handleGeneratePosts = async () => {
    if (!context.article || !context.analysis || (!context.hooks && !context.generatedContent)) {
      setPostGenerationError('Missing required data for post generation');
      return;
    }

    if (selectedIndexes.length === 0) {
      setPostGenerationError('Please select at least one item');
      return;
    }

    setIsGeneratingPosts(true);
    setPostGenerationError(null);

    try {
      // Build hooks data from whichever source is available
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
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      setGeneratedPosts(data.posts);
      
      // If we're working with an old history item, create a new one
      if (!isLatestItem && context.generatedContent && data.posts) {
        // Create a new history item with updated content
        const newHistoryId = historyManager.saveContentGeneration(
          context.article.url,
          context.article.title,
          context.generatedContent,
          postPreferences.language,
          context.analysis
        );
        
        // Save the posts to the new history item
        historyManager.savePostGeneration(
          newHistoryId,
          data.posts,
          postPreferences,
          selectedIndexes
        );
        
        // Notify parent component about the new history item
        if (onNewHistoryItemCreated) {
          onNewHistoryItemCreated(newHistoryId);
        }
        
        console.log('📝 Created new history item from old one:', newHistoryId);
      } else if (currentHistoryId && data.posts) {
        // Update existing history item if it's the latest
        historyManager.savePostGeneration(
          currentHistoryId,
          data.posts,
          postPreferences,
          selectedIndexes
        );
      }
      
      // Scroll to the posts section
      setTimeout(() => {
        const postsSection = document.getElementById('generated-posts');
        if (postsSection) {
          postsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);

    } catch (error) {
      console.error('Failed to generate posts:', error);
      setPostGenerationError(error instanceof Error ? error.message : 'Failed to generate posts');
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
          <h4 className="font-semibold text-gray-800 mb-2">Key Messages:</h4>
          <ul className="space-y-2">
            {context.analysis.keyMessages.map((message, index) => (
              <li key={index} className="flex items-start">
                <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-full mr-3 mt-1">
                  {index + 1}
                </span>
                <span className="text-gray-700">{message}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-800 mb-2">Summary:</h4>
          <p className="text-gray-700 bg-gray-50 p-3 rounded-lg leading-relaxed">{context.analysis.summary}</p>
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

        {/* Translate items button */}
        {detectedLanguage !== 'english' && (
          <div className="mb-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0116 0zm-4 2a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3.586l1.707-1.707a1 1 0 111.414 1.414l-3.414 3.414a1 1 0 01-1.414 0l-3.414-3.414a1 1 0 011.414-1.414L9 7.586V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  Original language: <span className="font-semibold">{languageOptions.find(l=>l.value===detectedLanguage)?.label || 'Unknown'}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="translate-select">Translate to:</label>
                <select
                  id="translate-select"
                  onChange={async (e) => {
                    const targetLang = e.target.value;
                    if (!targetLang) return;
                    
                    try {
                      const itemsText = items.join('\n---\n');
                      const res = await fetch('/api/translate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          text: itemsText,
                          targetLanguage: targetLang
                        })
                      });
                      
                      if (res.ok) {
                        const data = await res.json();
                        // Create a modal or better display for translated content
                        const translatedItems = data.translated.split('\n---\n');
                        
                        // Create a formatted display
                        const formattedTranslation = translatedItems.map((item: string, idx: number) => 
                          `Item #${idx + 1}:\n${item}`
                        ).join('\n\n');
                        
                        // For now using alert, but you could implement a modal
                        alert(`Translated to ${languageOptions.find(l=>l.value===targetLang)?.label}:\n\n${formattedTranslation}`);
                      } else {
                        alert('Translation failed. Please try again.');
                      }
                    } catch (e) {
                      alert('Translation failed. Please try again.');
                    }
                    
                    // Reset the select
                    e.target.value = '';
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
                >
                  <option value="">Select language...</option>
                  {languageOptions
                    .filter(lang => lang.value !== detectedLanguage)
                    .map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.flag} {lang.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Post Generation Controls */}
        <div className="mt-6 p-6 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Advanced Post Customization
          </h4>
          
          {/* BASIC SETTINGS */}
          <div className="space-y-6 mb-6">
            <h5 className="font-semibold text-gray-700">Basic Settings</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                <select
                  value={postPreferences.platform}
                  onChange={(e) => setPostPreferences(prev => ({ ...prev, platform: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                >
                  <option value="linkedin">LinkedIn</option>
                  <option value="twitter">Twitter</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>

              {/* Language Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                  {isDetectingLanguage && (
                    <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      🔍 Detecting...
                    </span>
                  )}
                  {!isDetectingLanguage && languageConfidence > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                      Auto-detected ({languageConfidence}%)
                    </span>
                  )}
                </label>
                <select
                  value={postPreferences.language}
                  onChange={(e) => setPostPreferences(prev => ({ ...prev, language: e.target.value as Language }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                  disabled={isDetectingLanguage}
                >
                  {languageOptions.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.flag} {lang.label}
                    </option>
                  ))}
                </select>
                {!isDetectingLanguage && detectedLanguage === postPreferences.language && languageConfidence > 70 && (
                  <p className="text-xs text-green-600 mt-1">
                    ✨ Article language auto-detected with high confidence
                  </p>
                )}
                {!isDetectingLanguage && languageConfidence < 70 && languageConfidence > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Language detection confidence is low - please verify selection
                  </p>
                )}
              </div>

              {/* Post Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Post Type</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="postType"
                      value="single"
                      checked={postPreferences.postType === 'single'}
                      onChange={(e) => setPostPreferences(prev => ({ ...prev, postType: e.target.value as any }))}
                      className="mr-2 text-yellow-600 focus:ring-yellow-500"
                    />
                    <span className="text-sm text-gray-900">Single Post</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="postType"
                      value="sequence"
                      checked={postPreferences.postType === 'sequence'}
                      onChange={(e) => setPostPreferences(prev => ({ ...prev, postType: e.target.value as any }))}
                      className="mr-2 text-yellow-600 focus:ring-yellow-500"
                    />
                    <span className="text-sm text-gray-900">Post Sequence (3-5 posts)</span>
                  </label>
                </div>
              </div>

              {/* Tone Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tone
                  {postPreferences.tone === 'authors-voice' && (
                    <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Recommended</span>
                  )}
                </label>
                <select
                  value={postPreferences.tone}
                  onChange={(e) => setPostPreferences(prev => ({ ...prev, tone: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                >
                  <option value="authors-voice">Author's Voice (Recommended)</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="enthusiastic">Enthusiastic</option>
                  <option value="thoughtful">Thoughtful</option>
                  <option value="conversational">Conversational</option>
                </select>
              </div>

              {/* Content Length */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content Length</label>
                <select
                  value={postPreferences.contentLength}
                  onChange={(e) => setPostPreferences(prev => ({ ...prev, contentLength: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                >
                  <option value="short">Short (50-100 words)</option>
                  <option value="medium">Medium (100-200 words)</option>
                  <option value="long">Long (200+ words)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ADVANCED SETTINGS COLLAPSIBLE */}
          <div className="mb-6">
            <button
              onClick={()=>setAdvancedOpen(o=>!o)}
              className="flex items-center text-sm font-medium text-blue-600 mb-3">
              <svg className={`w-4 h-4 mr-1 transition-transform ${advancedOpen?'rotate-90':''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 6a1 1 0 011.707-.707l4 4a1 1 0 010 1.414l-4 4A1 1 0 016 14V6z" clipRule="evenodd"/></svg>
              {advancedOpen?'Hide':'Show'} Advanced Settings
            </button>

            {advancedOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Writing Style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Writing Style</label>
                <select
                  value={postPreferences.style}
                  onChange={(e) => setPostPreferences(prev => ({ ...prev, style: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
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

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                <select
                  value={postPreferences.targetAudience}
                  onChange={(e) => setPostPreferences(prev => ({ ...prev, targetAudience: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                >
                  <option value="general">General Audience</option>
                  <option value="professionals">Working Professionals</option>
                  <option value="entrepreneurs">Entrepreneurs</option>
                  <option value="students">Students & Learners</option>
                  <option value="executives">Executives</option>
                  <option value="creators">Content Creators</option>
                </select>
              </div>

              {/* CTA */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Call-to-Action Style</label>
                <select
                  value={postPreferences.ctaType}
                  onChange={(e) => setPostPreferences(prev => ({ ...prev, ctaType: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                >
                  <option value="mixed">Mixed</option>
                  <option value="question">Questions</option>
                  <option value="action">Action-Oriented</option>
                  <option value="share">Share-Focused</option>
                  <option value="comment">Comment-Driven</option>
                  <option value="poll">Polls</option>
                </select>
              </div>

              {/* Emoji Usage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Emoji Usage</label>
                <select
                  value={postPreferences.emojiUsage}
                  onChange={(e) => setPostPreferences(prev => ({ ...prev, emojiUsage: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                >
                  <option value="none">None</option>
                  <option value="minimal">Minimal</option>
                  <option value="moderate">Moderate</option>
                  <option value="heavy">Heavy</option>
                </select>
              </div>

              {/* Hashtags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hashtags</label>
                <select
                  value={postPreferences.hashtagPreference}
                  onChange={(e) => setPostPreferences(prev => ({ ...prev, hashtagPreference: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900"
                >
                  <option value="none">No Hashtags</option>
                  <option value="minimal">Minimal</option>
                  <option value="moderate">Moderate</option>
                  <option value="comprehensive">Comprehensive</option>
                </select>
              </div>
            </div>)}
          </div>

          {/* Preview & Generate */}
          <div className="space-y-4">
            <h5 className="font-medium text-gray-700 border-b border-gray-200 pb-2">Generate</h5>
            
            {/* Settings Summary */}
            <div className="p-3 bg-white rounded-md border border-gray-200">
              <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Current Settings</h6>
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Platform:</span> {postPreferences.platform.toUpperCase()}</div>
                <div><span className="font-medium">Language:</span> {languageOptions.find(l => l.value === postPreferences.language)?.flag} {languageOptions.find(l => l.value === postPreferences.language)?.label.split(' ')[0]}</div>
                <div><span className="font-medium">Tone:</span> {postPreferences.tone === 'authors-voice' ? "Author's Voice" : postPreferences.tone}</div>
                <div><span className="font-medium">Style:</span> {postPreferences.style}</div>
                <div><span className="font-medium">Audience:</span> {postPreferences.targetAudience}</div>
                <div><span className="font-medium">Length:</span> {postPreferences.contentLength}</div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGeneratePosts}
              disabled={selectedIndexes.length === 0 || isGeneratingPosts}
              className={`w-full py-4 px-4 rounded-md font-medium transition-all duration-200 ${
                selectedIndexes.length === 0 || isGeneratingPosts
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:from-yellow-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
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
                <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0116 0zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
              </svg>
                    Generate {postPreferences.postType === 'single' ? '1 Post' : 'Post Sequence'} ({selectedIndexes.length} item{selectedIndexes.length === 1 ? '' : 's'} selected)
                </div>
              )}
            </button>

            {/* Error Display */}
            {postGenerationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{postGenerationError}</p>
              </div>
            )}

            {/* Selection Info */}
            <div className="text-xs text-gray-500 text-center">
              {selectedIndexes.length === 0 
                ? 'Select one or more items above to generate posts'
                : `${selectedIndexes.length} item${selectedIndexes.length === 1 ? '' : 's'} selected • Ready to generate!`
              }
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSocialPostsContent = () => {
    if (!generatedPosts) return null;
    
    return (
      <div className="space-y-6">
        {generatedPosts.posts.map((post, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold text-gray-800">Post {index + 1}</h4>
              <button
                onClick={() => copyToClipboard(formatPost(post), `generated-post-${index}`)}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                {copiedIndex === `generated-post-${index}` ? '✅ Copied' : '📋 Copy Post'}
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Item</span>
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
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center text-blue-800 mb-2">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-sm">Generation Details</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">Platform:</span>
              <p className="text-blue-700">{postPreferences.platform.toUpperCase()}</p>
            </div>
            <div>
              <span className="font-medium text-blue-800">Language:</span>
              <p className="text-blue-700">{languageOptions.find(l => l.value === postPreferences.language)?.flag} {languageOptions.find(l => l.value === postPreferences.language)?.label.split(' ')[0]}</p>
            </div>
            <div>
              <span className="font-medium text-blue-800">Tone:</span>
              <p className="text-blue-700">{postPreferences.tone === 'authors-voice' ? "Author's Voice" : postPreferences.tone}</p>
            </div>
            <div>
              <span className="font-medium text-blue-800">Style:</span>
              <p className="text-blue-700">{postPreferences.style}</p>
            </div>
            <div>
              <span className="font-medium text-blue-800">Audience:</span>
              <p className="text-blue-700">{postPreferences.targetAudience}</p>
            </div>
            <div>
              <span className="font-medium text-blue-800">Length:</span>
              <p className="text-blue-700">{postPreferences.contentLength}</p>
            </div>
            <div>
              <span className="font-medium text-blue-800">Hashtags:</span>
              <p className="text-blue-700">{postPreferences.hashtagPreference}</p>
            </div>
            <div>
              <span className="font-medium text-blue-800">Emojis:</span>
              <p className="text-blue-700">{postPreferences.emojiUsage}</p>
            </div>
            <div>
              <span className="font-medium text-blue-800">CTA Style:</span>
              <p className="text-blue-700">{postPreferences.ctaType}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-blue-700 text-sm">
              {postPreferences.postType === 'sequence' 
                ? 'These posts are designed as a sequence. Consider posting them over several days to maximize engagement and reach.'
                : 'This post is optimized for standalone impact and engagement.'
              }
              {postPreferences.tone === 'authors-voice' && (
                <span className="block mt-1 font-medium">
                  ✨ Posts generated using the original author's writing style and voice.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (!context.analysis && !context.hooks && !generatedPosts) {
    return null;
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Analysis Results */}
      {context.analysis && (
        <CollapsibleSection
          title="Article Analysis"
          icon={
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          }
          colorScheme="indigo"
          isCollapsed={collapsedSections.analysis}
          onToggle={() => toggleSection('analysis')}
        >
          {renderAnalysisContent()}
        </CollapsibleSection>
      )}

      {/* Selected Content */}
      {(context.hooks || context.generatedContent) && (
        <CollapsibleSection
          title="Selected Content"
          icon={<span className="mr-2">📝</span>}
          colorScheme="yellow"
          isCollapsed={collapsedSections.hooks}
          onToggle={() => toggleSection('hooks')}
        >
          {renderSelectableContent()}
        </CollapsibleSection>
      )}

      {/* Generated Social Media Posts */}
      {generatedPosts && (
        <div id="generated-posts">
          <CollapsibleSection
            title={`Generated ${generatedPosts.platform.toUpperCase()} Posts (${generatedPosts.posts.length})`}
            icon={
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            }
            colorScheme="green"
            isCollapsed={collapsedSections.socialPosts}
            onToggle={() => toggleSection('socialPosts')}
          >
            {renderSocialPostsContent()}
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
} 