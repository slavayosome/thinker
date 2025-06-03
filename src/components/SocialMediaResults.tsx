import { ChainContext } from '@/lib/promptChain';
import { useState, useEffect, useCallback } from 'react';
import { PostGenerationPreferences, PostTone, PostType, Platform, SocialPostsResult, Language, ArticleData, AnalysisResult, HooksResult, ContentResult, PostStyle, HookStyle, MessageStyle } from '@/types';
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

// Enhanced style presets that automatically configure advanced settings based on Style + Target Audience matrix
const stylePresets = {
  // Professional Style Presets
  'professional-general': {
    tone: 'professional',
    hookStyle: 'statistic',
    messageStyle: 'bullet-points',
    ctaType: 'soft-invitation',
    contentLength: 'medium',
    hashtagPreference: 'moderate',
    emojiUsage: 'minimal'
  },
  'professional-professionals': {
    tone: 'professional',
    hookStyle: 'statistic',
    messageStyle: 'bullet-points',
    ctaType: 'direct-ask',
    contentLength: 'medium',
    hashtagPreference: 'moderate',
    emojiUsage: 'minimal'
  },
  'professional-entrepreneurs': {
    tone: 'professional',
    hookStyle: 'statistic',
    messageStyle: 'case-study',
    ctaType: 'value-proposition',
    contentLength: 'medium',
    hashtagPreference: 'moderate',
    emojiUsage: 'minimal'
  },
  'professional-students': {
    tone: 'professional',
    hookStyle: 'problem-focused',
    messageStyle: 'step-by-step',
    ctaType: 'soft-invitation',
    contentLength: 'long',
    hashtagPreference: 'moderate',
    emojiUsage: 'minimal'
  },
  'professional-executives': {
    tone: 'professional',
    hookStyle: 'statistic',
    messageStyle: 'compare-contrast',
    ctaType: 'direct-ask',
    contentLength: 'short',
    hashtagPreference: 'minimal',
    emojiUsage: 'none'
  },
  'professional-creators': {
    tone: 'professional',
    hookStyle: 'statistic',
    messageStyle: 'how-to',
    ctaType: 'community-building',
    contentLength: 'medium',
    hashtagPreference: 'moderate',
    emojiUsage: 'minimal'
  },

  // Engaging Style Presets
  'engaging-general': {
    tone: 'enthusiastic',
    hookStyle: 'curiosity-gap',
    messageStyle: 'narrative',
    ctaType: 'challenge',
    contentLength: 'medium',
    hashtagPreference: 'comprehensive',
    emojiUsage: 'moderate'
  },
  'engaging-professionals': {
    tone: 'enthusiastic',
    hookStyle: 'curiosity-gap',
    messageStyle: 'narrative',
    ctaType: 'curiosity-driven',
    contentLength: 'medium',
    hashtagPreference: 'moderate',
    emojiUsage: 'moderate'
  },
  'engaging-entrepreneurs': {
    tone: 'enthusiastic',
    hookStyle: 'bold-statement',
    messageStyle: 'narrative',
    ctaType: 'challenge',
    contentLength: 'medium',
    hashtagPreference: 'comprehensive',
    emojiUsage: 'moderate'
  },
  'engaging-students': {
    tone: 'enthusiastic',
    hookStyle: 'question',
    messageStyle: 'how-to',
    ctaType: 'community-building',
    contentLength: 'long',
    hashtagPreference: 'comprehensive',
    emojiUsage: 'moderate'
  },
  'engaging-executives': {
    tone: 'thoughtful',
    hookStyle: 'controversial',
    messageStyle: 'narrative',
    ctaType: 'curiosity-driven',
    contentLength: 'medium',
    hashtagPreference: 'minimal',
    emojiUsage: 'minimal'
  },
  'engaging-creators': {
    tone: 'enthusiastic',
    hookStyle: 'direct-address',
    messageStyle: 'narrative',
    ctaType: 'community-building',
    contentLength: 'medium',
    hashtagPreference: 'comprehensive',
    emojiUsage: 'moderate'
  },

  // Educational Style Presets
  'educational-general': {
    tone: 'thoughtful',
    hookStyle: 'problem-focused',
    messageStyle: 'step-by-step',
    ctaType: 'soft-invitation',
    contentLength: 'long',
    hashtagPreference: 'moderate',
    emojiUsage: 'minimal'
  },
  'educational-professionals': {
    tone: 'thoughtful',
    hookStyle: 'problem-focused',
    messageStyle: 'how-to',
    ctaType: 'value-proposition',
    contentLength: 'long',
    hashtagPreference: 'moderate',
    emojiUsage: 'minimal'
  },
  'educational-entrepreneurs': {
    tone: 'thoughtful',
    hookStyle: 'problem-focused',
    messageStyle: 'case-study',
    ctaType: 'value-proposition',
    contentLength: 'long',
    hashtagPreference: 'moderate',
    emojiUsage: 'minimal'
  },
  'educational-students': {
    tone: 'thoughtful',
    hookStyle: 'question',
    messageStyle: 'step-by-step',
    ctaType: 'soft-invitation',
    contentLength: 'long',
    hashtagPreference: 'comprehensive',
    emojiUsage: 'minimal'
  },
  'educational-executives': {
    tone: 'professional',
    hookStyle: 'statistic',
    messageStyle: 'compare-contrast',
    ctaType: 'direct-ask',
    contentLength: 'medium',
    hashtagPreference: 'minimal',
    emojiUsage: 'none'
  },
  'educational-creators': {
    tone: 'conversational',
    hookStyle: 'question',
    messageStyle: 'how-to',
    ctaType: 'community-building',
    contentLength: 'long',
    hashtagPreference: 'comprehensive',
    emojiUsage: 'moderate'
  },

  // Authentic Style Presets
  'authentic-general': {
    tone: 'conversational',
    hookStyle: 'story-opener',
    messageStyle: 'personal-reflection',
    ctaType: 'conversational',
    contentLength: 'medium',
    hashtagPreference: 'minimal',
    emojiUsage: 'moderate'
  },
  'authentic-professionals': {
    tone: 'conversational',
    hookStyle: 'story-opener',
    messageStyle: 'personal-reflection',
    ctaType: 'soft-invitation',
    contentLength: 'medium',
    hashtagPreference: 'minimal',
    emojiUsage: 'minimal'
  },
  'authentic-entrepreneurs': {
    tone: 'conversational',
    hookStyle: 'story-opener',
    messageStyle: 'personal-reflection',
    ctaType: 'challenge',
    contentLength: 'medium',
    hashtagPreference: 'moderate',
    emojiUsage: 'moderate'
  },
  'authentic-students': {
    tone: 'casual',
    hookStyle: 'story-opener',
    messageStyle: 'personal-reflection',
    ctaType: 'community-building',
    contentLength: 'medium',
    hashtagPreference: 'moderate',
    emojiUsage: 'moderate'
  },
  'authentic-executives': {
    tone: 'thoughtful',
    hookStyle: 'story-opener',
    messageStyle: 'personal-reflection',
    ctaType: 'conversational',
    contentLength: 'short',
    hashtagPreference: 'minimal',
    emojiUsage: 'minimal'
  },
  'authentic-creators': {
    tone: 'casual',
    hookStyle: 'direct-address',
    messageStyle: 'personal-reflection',
    ctaType: 'community-building',
    contentLength: 'medium',
    hashtagPreference: 'comprehensive',
    emojiUsage: 'moderate'
  },

  // Data-Driven Style Presets
  'data-driven-general': {
    tone: 'professional',
    hookStyle: 'statistic',
    messageStyle: 'compare-contrast',
    ctaType: 'value-proposition',
    contentLength: 'long',
    hashtagPreference: 'minimal',
    emojiUsage: 'none'
  },
  'data-driven-professionals': {
    tone: 'professional',
    hookStyle: 'statistic',
    messageStyle: 'compare-contrast',
    ctaType: 'direct-ask',
    contentLength: 'long',
    hashtagPreference: 'minimal',
    emojiUsage: 'none'
  },
  'data-driven-entrepreneurs': {
    tone: 'professional',
    hookStyle: 'statistic',
    messageStyle: 'case-study',
    ctaType: 'value-proposition',
    contentLength: 'long',
    hashtagPreference: 'minimal',
    emojiUsage: 'none'
  },
  'data-driven-students': {
    tone: 'thoughtful',
    hookStyle: 'statistic',
    messageStyle: 'step-by-step',
    ctaType: 'soft-invitation',
    contentLength: 'long',
    hashtagPreference: 'moderate',
    emojiUsage: 'none'
  },
  'data-driven-executives': {
    tone: 'professional',
    hookStyle: 'statistic',
    messageStyle: 'bullet-points',
    ctaType: 'direct-ask',
    contentLength: 'short',
    hashtagPreference: 'none',
    emojiUsage: 'none'
  },
  'data-driven-creators': {
    tone: 'professional',
    hookStyle: 'statistic',
    messageStyle: 'how-to',
    ctaType: 'value-proposition',
    contentLength: 'long',
    hashtagPreference: 'moderate',
    emojiUsage: 'none'
  },

  // Community-Building Style Presets
  'community-building-general': {
    tone: 'casual',
    hookStyle: 'direct-address',
    messageStyle: 'how-to',
    ctaType: 'community-building',
    contentLength: 'short',
    hashtagPreference: 'comprehensive',
    emojiUsage: 'moderate'
  },
  'community-building-professionals': {
    tone: 'conversational',
    hookStyle: 'direct-address',
    messageStyle: 'how-to',
    ctaType: 'community-building',
    contentLength: 'medium',
    hashtagPreference: 'moderate',
    emojiUsage: 'minimal'
  },
  'community-building-entrepreneurs': {
    tone: 'enthusiastic',
    hookStyle: 'direct-address',
    messageStyle: 'how-to',
    ctaType: 'challenge',
    contentLength: 'medium',
    hashtagPreference: 'comprehensive',
    emojiUsage: 'moderate'
  },
  'community-building-students': {
    tone: 'casual',
    hookStyle: 'question',
    messageStyle: 'how-to',
    ctaType: 'community-building',
    contentLength: 'medium',
    hashtagPreference: 'comprehensive',
    emojiUsage: 'moderate'
  },
  'community-building-executives': {
    tone: 'professional',
    hookStyle: 'direct-address',
    messageStyle: 'how-to',
    ctaType: 'direct-ask',
    contentLength: 'short',
    hashtagPreference: 'minimal',
    emojiUsage: 'minimal'
  },
  'community-building-creators': {
    tone: 'casual',
    hookStyle: 'direct-address',
    messageStyle: 'narrative',
    ctaType: 'community-building',
    contentLength: 'short',
    hashtagPreference: 'comprehensive',
    emojiUsage: 'heavy'
  },

  // Thought-Leadership Style Presets
  'thought-leadership-general': {
    tone: 'thoughtful',
    hookStyle: 'controversial',
    messageStyle: 'myth-busting',
    ctaType: 'curiosity-driven',
    contentLength: 'long',
    hashtagPreference: 'moderate',
    emojiUsage: 'none'
  },
  'thought-leadership-professionals': {
    tone: 'professional',
    hookStyle: 'controversial',
    messageStyle: 'myth-busting',
    ctaType: 'curiosity-driven',
    contentLength: 'long',
    hashtagPreference: 'moderate',
    emojiUsage: 'none'
  },
  'thought-leadership-entrepreneurs': {
    tone: 'thoughtful',
    hookStyle: 'bold-statement',
    messageStyle: 'myth-busting',
    ctaType: 'challenge',
    contentLength: 'long',
    hashtagPreference: 'moderate',
    emojiUsage: 'none'
  },
  'thought-leadership-students': {
    tone: 'thoughtful',
    hookStyle: 'question',
    messageStyle: 'myth-busting',
    ctaType: 'soft-invitation',
    contentLength: 'long',
    hashtagPreference: 'moderate',
    emojiUsage: 'minimal'
  },
  'thought-leadership-executives': {
    tone: 'professional',
    hookStyle: 'controversial',
    messageStyle: 'compare-contrast',
    ctaType: 'direct-ask',
    contentLength: 'medium',
    hashtagPreference: 'minimal',
    emojiUsage: 'none'
  },
  'thought-leadership-creators': {
    tone: 'thoughtful',
    hookStyle: 'controversial',
    messageStyle: 'myth-busting',
    ctaType: 'curiosity-driven',
    contentLength: 'long',
    hashtagPreference: 'comprehensive',
    emojiUsage: 'minimal'
  }
} as const;

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
    historicalPreferences ? {
      ...historicalPreferences,
      // Ensure backwards compatibility with new authorVoice field
      authorVoice: historicalPreferences.authorVoice ?? false
    } : {
      selectedHooks: [],
      tone: 'professional',
      style: 'professional',
      postType: 'single',
      platform: 'linkedin',
      language: 'english',
      contentLength: 'medium',
      hashtagPreference: 'moderate',
      emojiUsage: 'minimal',
      ctaType: 'soft-invitation',
      targetAudience: 'professionals',
      hookStyle: 'curiosity-gap',
      messageStyle: 'narrative',
      authorVoice: true
    }
  );

  // Generated posts state
  const [generatedPosts, setGeneratedPosts] = useState<SocialPostsResult | null>(historicalPosts || null);
  const [isGeneratingPosts, setIsGeneratingPosts] = useState(false);
  const [postGenerationError, setPostGenerationError] = useState<AppError | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [recommendedSequenceLength, setRecommendedSequenceLength] = useState<number>(3);

  // Dynamic sequence length analysis based on selected content
  const analyzeSequenceLength = useCallback((selectedContent: string[]): number => {
    console.log('🧮 Starting sequence length analysis for:', selectedContent.length, 'items');
    
    if (selectedContent.length === 0) {
      console.log('📝 No content selected, returning default length: 3');
      return 3;
    }

    // Calculate content complexity metrics
    const totalWords = selectedContent.reduce((sum, content) => sum + content.split(' ').length, 0);
    const avgWordsPerItem = totalWords / selectedContent.length;
    const uniqueTopics = new Set();
    
    // Extract key topics/themes (simplified analysis)
    selectedContent.forEach(content => {
      const keywords = content.toLowerCase()
        .split(/\W+/)
        .filter(word => word.length > 4)
        .slice(0, 3); // Take first 3 significant words as topic indicators
      keywords.forEach(keyword => uniqueTopics.add(keyword));
    });

    const topicDiversity = uniqueTopics.size;
    const contentDepth = avgWordsPerItem;
    const itemCount = selectedContent.length;

    console.log('📊 Content analysis metrics:', {
      totalWords,
      avgWordsPerItem: Math.round(avgWordsPerItem),
      topicDiversity,
      uniqueTopics: Array.from(uniqueTopics),
      itemCount,
      platform: postPreferences.platform,
      audience: postPreferences.targetAudience
    });

    // Dynamic sequence length algorithm
    let sequenceLength = 3; // Base length
    const adjustments = [];

    // Adjust based on content depth
    if (contentDepth > 30) {
      sequenceLength += 1;
      adjustments.push(`+1 for content depth (${Math.round(contentDepth)} words/item > 30)`);
    }
    if (contentDepth > 50) {
      sequenceLength += 1;
      adjustments.push(`+1 for high content depth (${Math.round(contentDepth)} words/item > 50)`);
    }

    // Adjust based on topic diversity
    if (topicDiversity > 8) {
      sequenceLength += 1;
      adjustments.push(`+1 for topic diversity (${topicDiversity} topics > 8)`);
    }
    if (topicDiversity > 15) {
      sequenceLength += 1;
      adjustments.push(`+1 for high topic diversity (${topicDiversity} topics > 15)`);
    }

    // Adjust based on item count
    if (itemCount > 5) {
      sequenceLength += 1;
      adjustments.push(`+1 for item count (${itemCount} items > 5)`);
    }
    if (itemCount > 8) {
      sequenceLength += 1;
      adjustments.push(`+1 for high item count (${itemCount} items > 8)`);
    }

    // Platform-specific adjustments
    const beforePlatformAdjustment = sequenceLength;
    if (postPreferences.platform === 'twitter') {
      sequenceLength = Math.min(sequenceLength, 5); // Twitter threads shouldn't be too long
      if (beforePlatformAdjustment > 5) {
        adjustments.push(`Capped at 5 for Twitter (was ${beforePlatformAdjustment})`);
      }
    } else if (postPreferences.platform === 'linkedin') {
      sequenceLength = Math.min(sequenceLength, 7); // LinkedIn can handle longer sequences
      if (beforePlatformAdjustment > 7) {
        adjustments.push(`Capped at 7 for LinkedIn (was ${beforePlatformAdjustment})`);
      }
    }

    // Audience-specific adjustments
    const beforeAudienceAdjustment = sequenceLength;
    if (postPreferences.targetAudience === 'executives') {
      sequenceLength = Math.min(sequenceLength, 4); // Executives prefer concise content
      if (beforeAudienceAdjustment > 4) {
        adjustments.push(`Capped at 4 for executives (was ${beforeAudienceAdjustment})`);
      }
    } else if (postPreferences.targetAudience === 'students') {
      sequenceLength = Math.min(sequenceLength + 1, 6); // Students benefit from detailed sequences
      if (beforeAudienceAdjustment < 6) {
        adjustments.push(`+1 for students audience (educational benefit)`);
      }
    }

    const finalLength = Math.max(2, Math.min(sequenceLength, 7)); // Ensure range 2-7
    
    console.log(`🎯 Sequence length calculation complete:`, {
      baseLength: 3,
      adjustments,
      calculatedLength: sequenceLength,
      finalLength,
      reasoning: adjustments.length > 0 ? adjustments.join(', ') : 'No adjustments needed'
    });

    return finalLength;
  }, [postPreferences.platform, postPreferences.targetAudience]);

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

  // Update recommended sequence length when selection changes
  useEffect(() => {
    const items = context.hooks
      ? context.hooks.hooks
      : context.generatedContent?.items.map(item => item.content) || [];
    
    const selectedContent = selectedIndexes.map(index => items[index]).filter(Boolean);
    const newLength = analyzeSequenceLength(selectedContent);
    
    console.log(`🔢 Sequence length analysis:`, {
      selectedCount: selectedIndexes.length,
      selectedContent: selectedContent.map(c => c.substring(0, 50) + '...'),
      recommendedLength: newLength,
      platform: postPreferences.platform,
      audience: postPreferences.targetAudience
    });
    
    setRecommendedSequenceLength(newLength);
  }, [selectedIndexes, context.hooks, context.generatedContent, postPreferences.platform, postPreferences.targetAudience, analyzeSequenceLength]);

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
      setPostPreferences({
        ...historicalPreferences,
        // Ensure backwards compatibility with new authorVoice field
        authorVoice: historicalPreferences.authorVoice ?? false
      });
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
          preferences: {
            ...postPreferences,
            sequenceLength: postPreferences.postType === 'sequence' ? recommendedSequenceLength : undefined
          }
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
      
      // Create updated preferences with sequence length for saving
      const updatedPreferences = {
        ...postPreferences,
        sequenceLength: postPreferences.postType === 'sequence' ? recommendedSequenceLength : undefined
      };
      
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
          updatedPreferences,
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
          updatedPreferences,
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
          
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Post Configuration Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Post Type Selection */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Post Type</h4>
                    <p className="text-xs text-gray-600">
                      {postPreferences.postType === 'single' 
                        ? 'Single standalone post' 
                        : `Connected sequence (${recommendedSequenceLength} posts recommended)`}
                      {postPreferences.postType === 'sequence' && selectedIndexes.length > 0 && (
                        <span className="block mt-1 text-xs text-blue-600">
                          Based on {selectedIndexes.length} selected item{selectedIndexes.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span className={`text-xs font-medium ${postPreferences.postType === 'single' ? 'text-green-600' : 'text-gray-500'}`}>
                      Single
                    </span>
                    <button
                      type="button"
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                        postPreferences.postType === 'sequence' ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                      onClick={() => setPostPreferences(prev => ({ 
                        ...prev, 
                        postType: prev.postType === 'single' ? 'sequence' : 'single' 
                      }))}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          postPreferences.postType === 'sequence' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className={`text-xs font-medium ${postPreferences.postType === 'sequence' ? 'text-green-600' : 'text-gray-500'}`}>
                      Sequence
                    </span>
                  </div>
                </div>
              </div>

              {/* Author's Voice Toggle */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Author's Voice</h4>
                    <p className="text-xs text-gray-600">
                      {postPreferences.authorVoice 
                        ? 'Mimic original author\'s style' 
                        : 'Use selected tone settings'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span className={`text-xs font-medium ${!postPreferences.authorVoice ? 'text-green-600' : 'text-gray-500'}`}>
                      Off
                    </span>
                    <button
                      type="button"
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                        postPreferences.authorVoice ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                      onClick={() => setPostPreferences(prev => ({ 
                        ...prev, 
                        authorVoice: !prev.authorVoice 
                      }))}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          postPreferences.authorVoice ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className={`text-xs font-medium ${postPreferences.authorVoice ? 'text-green-600' : 'text-gray-500'}`}>
                      On
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                <select
                  value={postPreferences.platform}
                  onChange={(e) => setPostPreferences(prev => ({ ...prev, platform: e.target.value as Platform }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="linkedin">LinkedIn</option>
                  <option value="twitter">Twitter/X</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                <select
                  value={postPreferences.targetAudience}
                  onChange={(e) => handleBasicSettingChange('targetAudience', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="professionals">Professionals</option>
                  <option value="general">General Audience</option>
                  <option value="entrepreneurs">Entrepreneurs</option>
                  <option value="students">Students</option>
                  <option value="executives">Executives</option>
                  <option value="creators">Creators</option>
                </select>
              </div>

              {/* Style Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
                <select
                  value={postPreferences.style}
                  onChange={(e) => {
                    const selectedStyle = e.target.value;
                    handleBasicSettingChange('style', selectedStyle);
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="professional">Professional</option>
                  <option value="engaging">Engaging</option>
                  <option value="educational">Educational</option>
                  <option value="authentic">Authentic</option>
                  <option value="data-driven">Data-Driven</option>
                  <option value="community-building">Community Building</option>
                  <option value="thought-leadership">Thought Leadership</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Output Language</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {languageOptions.map((language) => (
                  <button
                    key={language.value}
                    onClick={() => setPostPreferences(prev => ({ ...prev, language: language.value as Language }))}
                    className={`flex items-center justify-center px-2 py-2 rounded-md border transition-colors text-sm ${
                      postPreferences.language === language.value
                        ? 'bg-green-100 border-green-300 text-green-800'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-1 text-base">{language.flag}</span>
                    <span className="truncate text-xs font-medium">{language.label.split(' ')[0]}</span>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Tone Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
                      <select
                        value={postPreferences.tone}
                        onChange={(e) => handleAdvancedSettingChange('tone', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        disabled={postPreferences.authorVoice}
                      >
                        <option value="professional">Professional</option>
                        <option value="casual">Casual</option>
                        <option value="enthusiastic">Enthusiastic</option>
                        <option value="thoughtful">Thoughtful</option>
                        <option value="conversational">Conversational</option>
                      </select>
                      {postPreferences.authorVoice && (
                        <p className="text-xs text-gray-500 mt-1">Disabled when Author's Voice is enabled</p>
                      )}
                    </div>

                    {/* Content Length */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Content Length</label>
                      <select
                        value={postPreferences.contentLength}
                        onChange={(e) => handleAdvancedSettingChange('contentLength', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="short">Short</option>
                        <option value="medium">Medium</option>
                        <option value="long">Long</option>
                      </select>
                    </div>

                    {/* Hashtag Preference */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hashtags</label>
                      <select
                        value={postPreferences.hashtagPreference}
                        onChange={(e) => handleAdvancedSettingChange('hashtagPreference', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="none">No Hashtags</option>
                        <option value="minimal">Minimal (1-2)</option>
                        <option value="moderate">Moderate (3-5)</option>
                        <option value="comprehensive">Comprehensive (5-10)</option>
                      </select>
                    </div>

                    {/* Emoji Usage */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Emoji Usage</label>
                      <select
                        value={postPreferences.emojiUsage}
                        onChange={(e) => handleAdvancedSettingChange('emojiUsage', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="none">No Emojis</option>
                        <option value="minimal">Minimal</option>
                        <option value="moderate">Moderate</option>
                        <option value="heavy">Heavy</option>
                      </select>
                    </div>
                  </div>

                  {/* Advanced Style Customization */}
                  <div className="border-t border-gray-300 pt-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Style Customization</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Hook Style */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Hook Style</label>
                        <select
                          value={postPreferences.hookStyle}
                          onChange={(e) => handleAdvancedSettingChange('hookStyle', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        >
                          <option value="bold-statement">Bold Statement</option>
                          <option value="question">Question</option>
                          <option value="statistic">Statistic</option>
                          <option value="story-opener">Story Opener</option>
                          <option value="controversial">Controversial</option>
                          <option value="curiosity-gap">Curiosity Gap</option>
                          <option value="direct-address">Direct Address</option>
                          <option value="problem-focused">Problem Focused</option>
                        </select>
                      </div>

                      {/* Message Style */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Message Style</label>
                        <select
                          value={postPreferences.messageStyle}
                          onChange={(e) => handleAdvancedSettingChange('messageStyle', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        >
                          <option value="narrative">Narrative</option>
                          <option value="bullet-points">Bullet Points</option>
                          <option value="step-by-step">Step by Step</option>
                          <option value="compare-contrast">Compare & Contrast</option>
                          <option value="case-study">Case Study</option>
                          <option value="personal-reflection">Personal Reflection</option>
                          <option value="how-to">How To</option>
                          <option value="myth-busting">Myth Busting</option>
                        </select>
                      </div>

                      {/* CTA Style */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">CTA Style</label>
                        <select
                          value={postPreferences.ctaType}
                          onChange={(e) => handleAdvancedSettingChange('ctaType', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        >
                          <option value="direct-ask">Direct Ask</option>
                          <option value="soft-invitation">Soft Invitation</option>
                          <option value="challenge">Challenge</option>
                          <option value="community-building">Community Building</option>
                          <option value="value-proposition">Value Proposition</option>
                          <option value="urgency">Urgency</option>
                          <option value="curiosity-driven">Curiosity Driven</option>
                          <option value="conversational">Conversational</option>
                        </select>
                      </div>
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

  // Function to apply style preset based on Style + Target Audience matrix
  const applyStylePreset = (style: string, audience: string = postPreferences.targetAudience) => {
    if (style === 'custom') return;
    
    const presetKey = `${style}-${audience}` as keyof typeof stylePresets;
    const preset = stylePresets[presetKey];
    
    if (preset) {
      setPostPreferences(prev => ({
        ...prev,
        style: style as any,
        ...preset,
        // Preserve platform but use the passed audience parameter
        platform: prev.platform,
        targetAudience: audience as any
      }));
    }
  };

  // Function to detect if current settings match any preset in the matrix
  const detectPresetMatch = (preferences: PostGenerationPreferences) => {
    if (preferences.style === 'custom') return 'custom';
    
    const presetKey = `${preferences.style}-${preferences.targetAudience}` as keyof typeof stylePresets;
    const preset = stylePresets[presetKey];
    
    if (!preset) return 'custom';
    
    // When author's voice is enabled, ignore tone matching since it overrides the preset tone
    const keysToCheck = preferences.authorVoice 
      ? Object.entries(preset).filter(([key]) => key !== 'tone')
      : Object.entries(preset);
      
    const matches = keysToCheck.every(([key, value]) => 
      preferences[key as keyof PostGenerationPreferences] === value
    );
    
    return matches ? preferences.style : 'custom';
  };

  // Function to handle manual setting changes that might affect style detection
  const handleAdvancedSettingChange = (key: string, value: any) => {
    const newPreferences = { ...postPreferences, [key]: value };
    const detectedStyle = detectPresetMatch(newPreferences);
    
    setPostPreferences({
      ...newPreferences,
      style: detectedStyle as any
    });
  };

  // Function to handle basic setting changes that might affect style detection
  const handleBasicSettingChange = (key: string, value: any) => {
    const newPreferences = { ...postPreferences, [key]: value };
    
    // If changing style or target audience, apply the appropriate preset
    if (key === 'style') {
      applyStylePreset(value, newPreferences.targetAudience);
    } else if (key === 'targetAudience') {
      // Re-apply current style with new audience
      applyStylePreset(newPreferences.style, value);
    } else {
      const detectedStyle = detectPresetMatch(newPreferences);
      setPostPreferences({
        ...newPreferences,
        style: detectedStyle as any
      });
    }
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
          title="Key Messages"
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