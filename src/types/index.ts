export interface ArticleData {
  title: string;
  content: string;
  url: string;
  author?: string;
  date_published?: string;
}

export interface AnalysisResult {
  centralTheme: string;
  keyMessages: string[];
  summary: string;
}

export interface HooksResult {
  hooks: string[];
}

export interface SocialPost {
  hook: string;
  mainMessage: string;
  callToAction: string;
}

export interface SocialPostsResult {
  platform: string;
  posts: SocialPost[];
}

export interface ProcessingStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: any;
}

export interface PromptChainConfig {
  steps: {
    id: string;
    name: string;
    description: string;
    promptTemplate: (data: any) => string;
    responseFormat: string;
  }[];
}

// New types for enhanced workflow
export interface HookSelection {
  hookIndex: number;
  selected: boolean;
}

export interface PostGenerationPreferences {
  selectedHooks: number[];
  tone: PostTone;
  style: PostStyle;
  postType: PostType;
  platform: Platform;
  language: Language;
  contentLength: ContentLength;
  hashtagPreference: HashtagPreference;
  emojiUsage: EmojiUsage;
  ctaType: CTAType;
  targetAudience: TargetAudience;
}

export interface PostGenerationRequest {
  article: ArticleData;
  analysis: AnalysisResult;
  hooks: HooksResult;
  preferences: PostGenerationPreferences;
}

export interface LanguageDetectionRequest {
  article: ArticleData;
}

export interface LanguageDetectionResult {
  language: Language;
  confidence: number;
}

// Content types for flexible content generation
export interface ContentGenerationRequest {
  article: ArticleData;
  analysis: AnalysisResult;
  contentType: ContentType;
  count?: number;
}

export interface ContentItem {
  id: string;
  type: ContentType;
  content: string;
  selected?: boolean;
}

export interface ContentResult {
  type: ContentType;
  items: ContentItem[];
}

// History management
export interface HistoryItem {
  id: string;
  title: string;
  articleUrl: string;
  articleTitle: string;
  contentType: ContentType;
  generatedContent: ContentResult;
  generatedPosts?: SocialPostsResult;
  preferences?: PostGenerationPreferences;
  createdAt: string;
  language: Language;
}

export interface HistoryState {
  items: HistoryItem[];
  currentItem?: HistoryItem;
}

export type Platform = 'linkedin' | 'twitter' | 'facebook' | 'instagram';
export type PostType = 'single' | 'sequence';
export type PostTone = 'professional' | 'casual' | 'enthusiastic' | 'thoughtful' | 'conversational' | 'authors-voice';
export type PostStyle = 'storytelling' | 'data-driven' | 'question-based' | 'listicle' | 'personal-anecdote' | 'educational' | 'provocative';
export type Language = 'english' | 'spanish' | 'chinese' | 'arabic' | 'portuguese' | 'indonesian' | 'french' | 'japanese' | 'russian' | 'german';
export type ContentLength = 'short' | 'medium' | 'long';
export type HashtagPreference = 'none' | 'minimal' | 'moderate' | 'comprehensive';
export type EmojiUsage = 'none' | 'minimal' | 'moderate' | 'heavy';
export type CTAType = 'question' | 'action' | 'share' | 'comment' | 'poll' | 'mixed';
export type TargetAudience = 'general' | 'professionals' | 'entrepreneurs' | 'students' | 'executives' | 'creators';
export type ContentType = 'hooks' | 'quotes' | 'key-insights' | 'statistics' | 'questions' | 'takeaways';
