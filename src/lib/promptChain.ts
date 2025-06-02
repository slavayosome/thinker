import { ArticleData, AnalysisResult, HooksResult, SocialPostsResult, Platform, PostType } from '@/types';

export interface ChainContext {
  article: ArticleData;
  analysis?: AnalysisResult;
  hooks?: HooksResult;
  socialPosts?: SocialPostsResult;
  platform?: Platform;
  postType?: PostType;
}

export const promptTemplates = {
  analysis: (article: ArticleData) => `
You're an expert content analyst specialized in identifying the core message and insights from long-form articles.

Your task is to analyze the article and provide a structured response in JSON format.

Provide your response as valid JSON in this exact format:
{
  "centralTheme": "Clear statement of the primary argument or theme",
  "keyMessages": ["Message 1", "Message 2", "Message 3", "Message 4", "Message 5"],
  "summary": "Comprehensive paragraph summary of the author's core message"
}

ARTICLE TO ANALYZE:
${article.content}

RESPOND WITH VALID JSON ONLY:
  `.trim(),

  hooks: (context: ChainContext) => `
You're an expert social media content strategist. Using the provided article analysis, generate compelling hooks.

Article Title: ${context.article.title}
Central Theme: ${context.analysis?.centralTheme}
Key Messages: ${context.analysis?.keyMessages.join(', ')}

Your task is to create 5 highly engaging hooks that align with the key messages and will grab attention on social media.

Provide your response as valid JSON in this exact format:
{
  "hooks": [
    "Hook 1 - compelling and engaging",
    "Hook 2 - attention-grabbing", 
    "Hook 3 - thought-provoking",
    "Hook 4 - curiosity-inducing",
    "Hook 5 - action-oriented"
  ]
}

RESPOND WITH VALID JSON ONLY:
  `.trim(),

  socialPosts: (context: ChainContext) => `
You're an expert ${context.platform || 'LinkedIn'} copywriter. Using the provided analysis and hooks, create a sequence of social media posts.

Article Title: ${context.article.title}
Article URL: ${context.article.url}
Central Theme: ${context.analysis?.centralTheme}
Key Messages: ${context.analysis?.keyMessages?.join('\n- ')}
Available Hooks: ${context.hooks?.hooks?.join('\n- ')}

Your task is to create 5 ${context.platform || 'LinkedIn'} posts that form a cohesive sequence, each focusing on different aspects of the article.

Each post should:
- Use one of the provided hooks or create a variation
- Focus on one key message
- Be optimized for ${context.platform || 'LinkedIn'} (professional tone, engaging format)
- Include a compelling call-to-action or engagement question
- Reference the original article appropriately

Provide your response as valid JSON in this exact format:
{
  "platform": "${context.platform || 'linkedin'}",
  "posts": [
    {
      "hook": "Opening hook for post 1",
      "mainMessage": "Core message and insights for this post",
      "callToAction": "Engaging question or CTA"
    },
    {
      "hook": "Opening hook for post 2", 
      "mainMessage": "Core message and insights for this post",
      "callToAction": "Engaging question or CTA"
    },
    {
      "hook": "Opening hook for post 3",
      "mainMessage": "Core message and insights for this post", 
      "callToAction": "Engaging question or CTA"
    },
    {
      "hook": "Opening hook for post 4",
      "mainMessage": "Core message and insights for this post",
      "callToAction": "Engaging question or CTA"
    },
    {
      "hook": "Opening hook for post 5",
      "mainMessage": "Core message and insights for this post",
      "callToAction": "Engaging question or CTA"
    }
  ]
}

RESPOND WITH VALID JSON ONLY:
  `.trim()
};

export const promptChainSteps = [
  {
    id: 'analysis',
    name: 'Article Analysis',
    description: 'Analyzing article content and extracting key insights',
    promptTemplate: (context: ChainContext) => promptTemplates.analysis(context.article),
    parseResponse: (response: string): AnalysisResult => {
      try {
        // Clean the response - remove any markdown formatting or extra text
        let cleanedResponse = response.trim();
        
        // Remove potential markdown code blocks
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Try to find JSON within the response
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedResponse = jsonMatch[0];
        }
        
        const parsed = JSON.parse(cleanedResponse);
        
        // Validate the structure
        if (!parsed.centralTheme || !parsed.keyMessages || !parsed.summary) {
          throw new Error('Missing required fields in analysis response');
        }
        
        return parsed;
      } catch (error) {
        console.error('Failed to parse analysis response:', response);
        throw new Error(`Invalid JSON response from analysis step: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  },
  {
    id: 'hooks',
    name: 'Hook Generation',
    description: 'Creating engaging hooks and headlines',
    promptTemplate: (context: ChainContext) => promptTemplates.hooks(context),
    parseResponse: (response: string): HooksResult => {
      try {
        let cleanedResponse = response.trim();
        
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedResponse = jsonMatch[0];
        }
        
        const parsed = JSON.parse(cleanedResponse);
        
        if (!parsed.hooks || !Array.isArray(parsed.hooks)) {
          throw new Error('Missing or invalid hooks array');
        }
        
        return parsed;
      } catch (error) {
        console.error('Failed to parse hooks response:', response);
        throw new Error(`Invalid JSON response from hooks step: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  },
  {
    id: 'socialPosts',
    name: 'Social Media Posts',
    description: 'Generating optimized social media content sequence',
    promptTemplate: (context: ChainContext) => promptTemplates.socialPosts(context),
    parseResponse: (response: string): SocialPostsResult => {
      try {
        let cleanedResponse = response.trim();
        
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedResponse = jsonMatch[0];
        }
        
        const parsed = JSON.parse(cleanedResponse);
        
        if (!parsed.platform || !parsed.posts || !Array.isArray(parsed.posts)) {
          throw new Error('Missing or invalid platform/posts structure');
        }
        
        return parsed;
      } catch (error) {
        console.error('Failed to parse social posts response:', response);
        throw new Error(`Invalid JSON response from social posts step: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
];

export class PromptChain {
  private context: ChainContext;
  private currentStepIndex: number = 0;

  constructor(article: ArticleData, platform: Platform = 'linkedin', postType: PostType = 'sequence') {
    this.context = {
      article,
      platform,
      postType
    };
  }

  getCurrentStep() {
    return promptChainSteps[this.currentStepIndex];
  }

  getNextPrompt(): string | null {
    const step = this.getCurrentStep();
    if (!step) return null;

    return step.promptTemplate(this.context);
  }

  processStepResponse(response: string) {
    const step = this.getCurrentStep();
    if (!step) throw new Error('No current step to process');

    const parsed = step.parseResponse(response);
    
    // Update context with the result
    switch (step.id) {
      case 'analysis':
        this.context.analysis = parsed as AnalysisResult;
        break;
      case 'hooks':
        this.context.hooks = parsed as HooksResult;
        break;
      case 'socialPosts':
        this.context.socialPosts = parsed as SocialPostsResult;
        break;
    }

    this.currentStepIndex++;
    return parsed;
  }

  hasMoreSteps(): boolean {
    return this.currentStepIndex < promptChainSteps.length;
  }

  getProgress(): { current: number; total: number; percentage: number } {
    return {
      current: this.currentStepIndex,
      total: promptChainSteps.length,
      percentage: Math.round((this.currentStepIndex / promptChainSteps.length) * 100)
    };
  }

  getContext(): ChainContext {
    return { ...this.context };
  }

  reset() {
    this.currentStepIndex = 0;
    // Keep article and settings, reset results
    this.context = {
      article: this.context.article,
      platform: this.context.platform,
      postType: this.context.postType
    };
  }
} 