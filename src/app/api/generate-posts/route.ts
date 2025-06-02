import { NextRequest, NextResponse } from 'next/server';
import { PostGenerationRequest, SocialPostsResult } from '@/types';

const toneDescriptions = {
  professional: 'maintain a polished, business-focused tone with clear insights and professional language',
  casual: 'use a relaxed, friendly tone that feels conversational and approachable',
  enthusiastic: 'show excitement and energy about the topic, using dynamic language and engaging expressions',
  thoughtful: 'provide deep insights with a reflective, contemplative approach that encourages thinking',
  conversational: 'write as if speaking directly to the reader, using questions and inclusive language',
  'authors-voice': 'carefully analyze and mimic the original author\'s writing style, tone, vocabulary, and voice from the article'
};

const styleDescriptions = {
  storytelling: 'use narrative structure with beginning, middle, and end, incorporating personal elements and relatable scenarios',
  'data-driven': 'emphasize statistics, facts, and concrete evidence to support points with analytical approach',
  'question-based': 'structure content around thought-provoking questions that engage readers and encourage interaction',
  listicle: 'organize information in numbered or bulleted lists with clear, actionable points',
  'personal-anecdote': 'incorporate personal experiences and stories to make the content relatable and authentic',
  educational: 'focus on teaching and explaining concepts clearly with step-by-step guidance',
  provocative: 'challenge conventional thinking with bold statements and contrarian viewpoints that spark debate'
};

const lengthDescriptions = {
  short: 'keep posts concise and punchy (50-100 words for most platforms)',
  medium: 'use moderate length for balanced detail (100-200 words)',
  long: 'create comprehensive posts with detailed explanations (200+ words)'
};

const hashtagDescriptions = {
  none: 'do not include any hashtags',
  minimal: 'include 1-2 highly relevant hashtags',
  moderate: 'include 3-5 strategic hashtags',
  comprehensive: 'include 5-10 hashtags for maximum discoverability'
};

const emojiDescriptions = {
  none: 'do not use any emojis',
  minimal: 'use 1-2 subtle emojis sparingly',
  moderate: 'include 3-5 relevant emojis to enhance engagement',
  heavy: 'use emojis liberally throughout the content for high engagement'
};

const ctaDescriptions = {
  question: 'end with thought-provoking questions to encourage comments',
  action: 'include clear calls-to-action asking readers to take specific steps',
  share: 'encourage readers to share the content with their networks',
  comment: 'ask for opinions and experiences in the comments',
  poll: 'create engaging polls or ask for preferences',
  mixed: 'vary the call-to-action types across different posts'
};

const audienceDescriptions = {
  general: 'write for a broad, general audience with accessible language',
  professionals: 'target working professionals with industry-relevant insights',
  entrepreneurs: 'focus on business owners and startup founders with growth-oriented content',
  students: 'create educational content suitable for learners and early-career individuals',
  executives: 'target senior leadership with strategic insights and high-level perspectives',
  creators: 'focus on content creators, influencers, and creative professionals'
};

const languageDescriptions = {
  english: 'write in English with natural, fluent expression',
  spanish: 'write in Spanish (Español) with native-level fluency and cultural awareness',
  chinese: 'write in Chinese (中文) with appropriate character usage and cultural context',
  arabic: 'write in Arabic (العربية) with proper grammar and cultural sensitivity',
  portuguese: 'write in Portuguese (Português) with regional awareness and fluent expression',
  indonesian: 'write in Indonesian (Bahasa Indonesia) with proper grammar and local context',
  french: 'write in French (Français) with elegant expression and cultural nuance',
  japanese: 'write in Japanese (日本語) with appropriate formality levels and cultural context',
  russian: 'write in Russian (Русский) with proper grammar and cultural understanding',
  german: 'write in German (Deutsch) with precise expression and cultural awareness'
};

const buildPostGenerationPrompt = (request: PostGenerationRequest): string => {
  const { article, analysis, hooks, preferences } = request;
  const selectedHooks = preferences.selectedHooks.map(index => hooks.hooks[index]);
  // Prepare safe article excerpt (first 1000 chars) to give model authentic material
  const articleExcerpt = article.content.slice(0, 1200);
  const toneDescription = toneDescriptions[preferences.tone];
  const styleDescription = styleDescriptions[preferences.style];
  const lengthDescription = lengthDescriptions[preferences.contentLength];
  const hashtagDescription = hashtagDescriptions[preferences.hashtagPreference];
  const emojiDescription = emojiDescriptions[preferences.emojiUsage];
  const ctaDescription = ctaDescriptions[preferences.ctaType];
  const audienceDescription = audienceDescriptions[preferences.targetAudience];
  const languageDescription = languageDescriptions[preferences.language];
  
  const postTypeInstructions = preferences.postType === 'single' 
    ? 'Create 1 standalone post that captures the essence of the article.'
    : 'Create a sequence of 3-5 posts that work together to tell the complete story.';

  // Special handling for author's voice tone
  const authorVoiceInstructions = preferences.tone === 'authors-voice' ? `

CRITICAL - AUTHOR'S VOICE ANALYSIS:
Before writing, carefully analyze the original article for:
- Word choice and vocabulary level
- Sentence structure and length patterns  
- Use of technical vs. casual language
- Personality traits (humor, formality, directness)
- Unique phrases or expressions
- Rhythm and flow of writing
- Perspective (first person, authoritative, humble, etc.)

Then mimic these exact characteristics in your social media posts.
` : '';

  return `
You're an expert ${preferences.platform} copywriter creating posts for ${preferences.targetAudience}. Your task is to create social media posts with specific customization requirements.

${authorVoiceInstructions}

STRICT CONTENT POLICY (CRITICAL):
1. USE ONLY INFORMATION CONTAINED IN THE ARTICLE BELOW.  
2. DO NOT INVENT NEW FACTS, DATA, STORIES, OR EXAMPLES.  
3. Quotes, statistics, anecdotes, and any statements MUST ORIGINATE from the article text provided.  
4. If required information is not in the article, OMIT it rather than inventing.  
5. The output will be reviewed for hallucinations – any fabricated content will be rejected.

ARTICLE ANALYSIS:
Title: ${article.title}
URL: ${article.url}
Central Theme: ${analysis.centralTheme}
Key Messages: ${analysis.keyMessages.join('\n- ')}
Selected Hooks: ${selectedHooks.join('\n- ')}

ARTICLE EXCERPT (REFERENCE MATERIAL – STRICT SOURCE):
"""
${articleExcerpt}
"""

CUSTOMIZATION REQUIREMENTS:

1. LANGUAGE: ${languageDescription.charAt(0).toUpperCase() + languageDescription.slice(1)}
2. TONE: ${toneDescription.charAt(0).toUpperCase() + toneDescription.slice(1)}
3. STYLE: ${styleDescription.charAt(0).toUpperCase() + styleDescription.slice(1)}
4. CONTENT: ${postTypeInstructions}
5. LENGTH: ${lengthDescription.charAt(0).toUpperCase() + lengthDescription.slice(1)}
6. PLATFORM: Optimize for ${preferences.platform}
7. AUDIENCE: ${audienceDescription.charAt(0).toUpperCase() + audienceDescription.slice(1)}
8. HASHTAGS: ${hashtagDescription.charAt(0).toUpperCase() + hashtagDescription.slice(1)}
9. EMOJIS: ${emojiDescription.charAt(0).toUpperCase() + emojiDescription.slice(1)}
10. CTA: ${ctaDescription.charAt(0).toUpperCase() + ctaDescription.slice(1)}

CRITICAL EXECUTION NOTES:
- ALL CONTENT MUST BE WRITTEN IN ${preferences.language.toUpperCase()} LANGUAGE
- Use the selected hooks or create variations that match the ${preferences.tone} tone and ${preferences.style} style
- Ensure every element (hook, message, CTA) follows the ${preferences.contentLength} length guideline
- Adapt content specifically for ${preferences.targetAudience} audience
- Reference the original article appropriately
- ABSOLUTELY NO INVENTED CONTENT – stay 100% faithful to the provided article information
${preferences.tone === 'authors-voice' ? '- MOST IMPORTANT: Mirror the original author\'s exact writing voice and style' : ''}

${preferences.postType === 'single' 
  ? `
Create 1 compelling post with this structure:
{
  "platform": "${preferences.platform}",
  "posts": [
    {
      "hook": "Opening hook in ${preferences.language} (${preferences.tone} tone, ${preferences.style} style, ${preferences.contentLength} length)",
      "mainMessage": "Core message for ${preferences.targetAudience} in ${preferences.language} (matching all requirements)",
      "callToAction": "CTA in ${preferences.language} following ${preferences.ctaType} approach"
    }
  ]
}
`
  : `
Create 3-5 posts that form a cohesive sequence:
{
  "platform": "${preferences.platform}",
  "posts": [
    {
      "hook": "Post 1 hook in ${preferences.language} (${preferences.tone} tone, ${preferences.style} style)",
      "mainMessage": "Message 1 for ${preferences.targetAudience} in ${preferences.language} (${preferences.contentLength} length)",
      "callToAction": "CTA 1 in ${preferences.language} (${preferences.ctaType} approach)"
    },
    {
      "hook": "Post 2 hook in ${preferences.language} (maintaining consistency)",
      "mainMessage": "Message 2 in ${preferences.language} (building on previous post)",
      "callToAction": "CTA 2 in ${preferences.language} (varied but consistent)"
    },
    // ... continue for 3-5 posts total
  ]
}
`}

RESPOND WITH VALID JSON ONLY:
  `.trim();
};

export async function POST(request: NextRequest) {
  try {
    const requestData: PostGenerationRequest = await request.json();
    
    // Validate the request
    if (!requestData.article || !requestData.analysis || !requestData.hooks || !requestData.preferences) {
      return NextResponse.json({ error: 'Missing required data for post generation' }, { status: 400 });
    }

    if (requestData.preferences.selectedHooks.length === 0) {
      return NextResponse.json({ error: 'At least one hook must be selected' }, { status: 400 });
    }

    console.log(`🎯 Generating ${requestData.preferences.postType} posts:`);
    console.log(`   Platform: ${requestData.preferences.platform}`);
    console.log(`   Language: ${requestData.preferences.language}`);
    console.log(`   Tone: ${requestData.preferences.tone}`);
    console.log(`   Style: ${requestData.preferences.style}`);
    console.log(`   Audience: ${requestData.preferences.targetAudience}`);
    console.log(`   Length: ${requestData.preferences.contentLength}`);
    console.log(`   Hashtags: ${requestData.preferences.hashtagPreference}`);
    console.log(`   Emojis: ${requestData.preferences.emojiUsage}`);
    console.log(`   CTA: ${requestData.preferences.ctaType}`);

    // Validate all preferences are set
    const requiredPrefs = ['platform', 'language', 'tone', 'style', 'targetAudience', 'contentLength', 'hashtagPreference', 'emojiUsage', 'ctaType'];
    for (const pref of requiredPrefs) {
      if (!requestData.preferences[pref as keyof typeof requestData.preferences]) {
        console.warn(`⚠️  Missing preference: ${pref}`);
      }
    }

    // Build the prompt
    const prompt = buildPostGenerationPrompt(requestData);

    // Call OpenAI
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2500, // Increased for longer content
        temperature: 0.7
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('❌ OpenAI API error:', openAIResponse.status, errorText);
      return NextResponse.json({ 
        error: `OpenAI API error: ${openAIResponse.status}` 
      }, { status: openAIResponse.status });
    }

    const data = await openAIResponse.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ Invalid OpenAI response structure');
      return NextResponse.json({ 
        error: "Invalid response structure from OpenAI API" 
      }, { status: 500 });
    }

    const rawResponse = data.choices[0].message.content.trim();
    
    console.log(`📝 Raw OpenAI response:`, rawResponse.substring(0, 200) + '...');
    
    try {
      // Parse the response
      let cleanedResponse = rawResponse.trim();
      
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
      
      const parsed: SocialPostsResult = JSON.parse(cleanedResponse);
      
      // Validate the structure
      if (!parsed.platform || !parsed.posts || !Array.isArray(parsed.posts)) {
        throw new Error('Missing or invalid platform/posts structure');
      }
      
      console.log(`✅ Successfully generated ${parsed.posts.length} posts with ${requestData.preferences.tone} tone, ${requestData.preferences.style} style in ${requestData.preferences.language}`);
      
      return NextResponse.json({
        success: true,
        posts: parsed
      });

    } catch (parseError) {
      console.error('❌ Failed to parse post generation response:', parseError);
      console.error('📄 Full raw response:', rawResponse);
      return NextResponse.json({ 
        error: `Failed to parse post generation response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        rawResponse: rawResponse.substring(0, 500) // Truncate for safety
      }, { status: 422 });
    }

  } catch (error) {
    console.error('💥 Error in generate-posts API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 