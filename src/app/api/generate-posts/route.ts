import { NextRequest, NextResponse } from 'next/server';
import { PostGenerationRequest, SocialPostsResult } from '@/types';

const toneDescriptions = {
  professional: 'maintain a polished, business-focused tone with clear insights and professional language',
  casual: 'use a relaxed, friendly tone that feels conversational and approachable',
  enthusiastic: 'show excitement and energy about the topic, using dynamic language and engaging expressions',
  thoughtful: 'provide deep insights with a reflective, contemplative approach that encourages thinking',
  conversational: 'write as if speaking directly to the reader, using questions and inclusive language'
};

const styleDescriptions = {
  professional: 'polished business content with data-driven insights and clear calls-to-action',
  engaging: 'high-engagement content designed to spark conversation and maximize interaction',
  educational: 'informative teaching content with step-by-step guidance and gentle engagement',
  authentic: 'personal storytelling content that builds genuine connections with your audience',
  'data-driven': 'analytical content backed by statistics and research with value-focused messaging',
  'community-building': 'audience-growing content that fosters discussion and builds loyal followers',
  'thought-leadership': 'authoritative industry content that challenges thinking and establishes expertise',
  custom: 'manually customized settings tailored to your specific requirements'
};

const audienceDescriptions = {
  general: 'write for a broad, general audience with accessible language',
  professionals: 'target working professionals with industry-relevant insights',
  entrepreneurs: 'focus on business owners and startup founders with growth-oriented content',
  students: 'create educational content suitable for learners and early-career individuals',
  executives: 'target senior leadership with strategic insights and high-level perspectives',
  creators: 'focus on content creators, influencers, and creative professionals'
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
  'direct-ask': 'make clear, specific requests for action using direct language and explicit instructions',
  'soft-invitation': 'gently encourage engagement with welcoming, non-pushy language that feels optional',
  'challenge': 'motivate action by framing requests as challenges or opportunities to prove something',
  'community-building': 'foster connection and belonging by inviting readers to join a community or movement',
  'value-proposition': 'emphasize the benefits and value readers will receive from taking the requested action',
  'urgency': 'create time sensitivity or scarcity to motivate immediate action and response',
  'curiosity-driven': 'entice engagement by promising exclusive insights or information as a reward',
  'conversational': 'use casual, friendly language that feels like a natural conversation between friends'
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

const hookStyleDescriptions = {
  'bold-statement': 'create powerful, confident declarations that immediately capture attention and establish authority',
  'question': 'pose intriguing, thought-provoking questions that make readers pause and think deeply',
  'statistic': 'lead with compelling numbers, data points, or research findings that surprise or inform',
  'story-opener': 'begin with a brief, engaging narrative or anecdote that draws readers into the content',
  'controversial': 'present contrarian viewpoints or challenge conventional wisdom to spark debate and discussion',
  'curiosity-gap': 'create information gaps that make readers want to know more about what comes next',
  'direct-address': 'speak directly to the reader using "you" statements that feel personal and immediate',
  'problem-focused': 'identify specific pain points or challenges that resonate with the target audience'
};

const messageStyleDescriptions = {
  'narrative': 'tell a cohesive story with clear progression, characters, and resolution that illustrates key points',
  'bullet-points': 'organize information in clear, scannable bullet points or numbered lists for easy consumption',
  'step-by-step': 'provide sequential instructions or processes that readers can follow and implement',
  'compare-contrast': 'highlight differences and similarities between concepts, options, or approaches',
  'case-study': 'present detailed real-world examples or scenarios that demonstrate practical applications',
  'personal-reflection': 'share personal insights, experiences, and lessons learned in a reflective manner',
  'how-to': 'provide practical guidance and actionable advice that teaches readers to accomplish something',
  'myth-busting': 'debunk common misconceptions or challenge widely-held but incorrect beliefs'
};

const buildPostGenerationPrompt = (request: PostGenerationRequest): string => {
  const { article, analysis, hooks, preferences } = request;
  const selectedHooks = preferences.selectedHooks.map(index => hooks.hooks[index]);
  // Prepare safe article excerpt (first 1000 chars) to give model authentic material
  const articleExcerpt = article.content.slice(0, 1200);
  
  // Use author's voice description when enabled, otherwise use selected tone
  const toneDescription = preferences.authorVoice 
    ? 'carefully analyze and mimic the original author\'s writing style, tone, vocabulary, and voice from the article (overriding other tone settings)'
    : toneDescriptions[preferences.tone];
    
  const styleDescription = styleDescriptions[preferences.style];
  const lengthDescription = lengthDescriptions[preferences.contentLength];
  const hashtagDescription = hashtagDescriptions[preferences.hashtagPreference];
  const emojiDescription = emojiDescriptions[preferences.emojiUsage];
  const ctaDescription = ctaDescriptions[preferences.ctaType];
  const audienceDescription = audienceDescriptions[preferences.targetAudience];
  const hookStyleDescription = hookStyleDescriptions[preferences.hookStyle];
  const messageStyleDescription = messageStyleDescriptions[preferences.messageStyle];
  
  // Generate dynamic JSON format based on sequence length
  const generateSequenceJsonFormat = (sequenceLength: number) => {
    const posts = Array.from({ length: sequenceLength }, (_, i) => {
      const postNum = i + 1;
      const isFirst = postNum === 1;
      const isLast = postNum === sequenceLength;
      const isMiddle = !isFirst && !isLast;
      
      let ctaGuidance = '';
      if (isFirst) {
        ctaGuidance = 'Include forward reference like \'Tomorrow I\'ll share...\' or \'In my next post...\'';
      } else if (isLast) {
        ctaGuidance = 'Provide strong final call to action that ties back to the sequence theme';
      } else {
        ctaGuidance = 'Continue narrative thread with references to both previous and upcoming posts';
      }
      
      const hookGuidance = isFirst 
        ? 'sequence opener' 
        : isMiddle 
          ? 'continuation with transition like \'Yesterday I shared...\' or \'Building on my previous post...\'' 
          : 'finale with culmination reference';
          
      const messageGuidance = isFirst 
        ? 'Introduce the main concept' 
        : isMiddle 
          ? 'Build upon previous posts with clear connection' 
          : 'Conclude the sequence with key insights';
      
      return `    {
      "hook": "Post ${postNum} hook in ${preferences.language} (${hookGuidance}) - Use ${preferences.hookStyle} approach",
      "mainMessage": "Message ${postNum} in ${preferences.language} (${preferences.contentLength} length) - ${messageGuidance} using ${preferences.messageStyle} structure",
      "callToAction": "CTA ${postNum} in ${preferences.language} (${preferences.ctaType} approach) - ${ctaGuidance}"
    }`;
    }).join(',\n');
    
    return posts;
  };

  const jsonFormat = preferences.postType === 'single' 
    ? `{
  "platform": "${preferences.platform}",
  "posts": [
    {
      "hook": "Opening hook in ${preferences.language} (${preferences.authorVoice ? 'Author\'s Voice' : preferences.tone} tone, ${preferences.style} style, ${preferences.contentLength} length) - Use ${preferences.hookStyle} approach",
      "mainMessage": "Core message for ${preferences.targetAudience} in ${preferences.language} (matching all requirements) - Structure as ${preferences.messageStyle}",
      "callToAction": "CTA in ${preferences.language} following ${preferences.ctaType} approach"
    }
  ]
}`
    : `{
  "platform": "${preferences.platform}",
  "posts": [
${generateSequenceJsonFormat(preferences.sequenceLength || 3)}
  ]
}`;
  
  const postTypeInstructions = preferences.postType === 'single' 
    ? 'Create 1 standalone post that captures the essence of the article.'
    : `Create a sequence of ${preferences.sequenceLength || 3} posts that work together to tell a cohesive story. Each post should:
       - Build upon the previous post naturally
       - Include subtle references or transitions that connect to other posts in the sequence
       - Use consistent narrative threading (e.g., "In my previous post...", "Building on this idea...", "As I mentioned earlier...")
       - Maintain thematic continuity while exploring different aspects of the topic
       - Create anticipation for the next post when appropriate (e.g., "Tomorrow I'll share...", "In my next post...")
       - Form a complete narrative arc when read in sequence
       
       SEQUENCE STRUCTURE (${preferences.sequenceLength || 3} posts):
       ${preferences.sequenceLength === 2 ? `
       - Post 1: Hook + Main concept introduction + Forward tease
       - Post 2: Deep dive + Conclusion + Call to action` :
       preferences.sequenceLength === 3 ? `
       - Post 1: Hook + Problem/opportunity setup + Forward tease
       - Post 2: Solution/insight development + Examples + Continuation tease  
       - Post 3: Implementation + Results + Strong call to action` :
       preferences.sequenceLength === 4 ? `
       - Post 1: Hook + Problem identification + Context setting
       - Post 2: Solution introduction + Benefits overview + Forward reference
       - Post 3: Detailed implementation + Real examples + Progress indicator
       - Post 4: Results + Lessons learned + Strong call to action` :
       preferences.sequenceLength === 5 ? `
       - Post 1: Hook + Problem/opportunity identification + Stakes establishment
       - Post 2: Background + Why this matters + Solution preview
       - Post 3: Core solution + Key insights + Evidence
       - Post 4: Implementation details + Practical steps + Progress check
       - Post 5: Results + Advanced tips + Strong call to action` :
       preferences.sequenceLength === 6 ? `
       - Post 1: Hook + Problem identification + Personal stakes
       - Post 2: Background research + Why now + Solution discovery
       - Post 3: Core methodology + First insights + Early validation
       - Post 4: Implementation challenges + Breakthrough moments + Key learnings
       - Post 5: Advanced applications + Unexpected benefits + Success metrics
       - Post 6: Final results + Future implications + Strong call to action` :
       `
       - Post 1: Hook + Problem/challenge introduction + Personal connection
       - Post 2: Research phase + Initial discoveries + Mindset shifts
       - Post 3: Methodology development + First principles + Foundation building
       - Post 4: Implementation journey + Early obstacles + Breakthrough insights
       - Post 5: Advanced techniques + Scaling strategies + Compound effects
       - Post 6: Mastery insights + Optimization secrets + Teaching others
       - Post 7: Long-term results + Broader implications + Legacy building + Ultimate call to action`}`;

  // Special handling for author's voice tone
  const authorVoiceInstructions = preferences.authorVoice ? `

AUTHOR'S VOICE ANALYSIS REQUIRED:
Before writing, you must carefully analyze the original article for:
- Word choice and vocabulary level
- Sentence structure and length patterns  
- Use of technical vs. casual language
- Personality traits (humor, formality, directness)
- Unique phrases or expressions
- Rhythm and flow of writing
- Perspective (first person, authoritative, humble, etc.)

Then mimic these exact characteristics in your social media posts, overriding the selected tone to match the author's authentic voice.
` : '';

  return `
You are tasked with creating engaging social media posts from an article. Your goal is to transform the article content into platform-appropriate posts that maintain authenticity while maximizing engagement. Follow these instructions carefully to craft effective social media content.

You will be provided with the following information:

<article_title>
${article.title}
</article_title>

<article_url>
${article.url}
</article_url>

<article_content>
${articleExcerpt}
</article_content>

<central_theme>
${analysis.centralTheme}
</central_theme>

<key_messages>
${analysis.keyMessages.join('\n')}
</key_messages>

<selected_hooks>
${selectedHooks.join('\n')}
</selected_hooks>

<platform>
${preferences.platform}
</platform>

<language>
${preferences.language}
</language>

<tone>
${preferences.authorVoice ? 'Author\'s Voice (Active)' : preferences.tone}
</tone>

<author_voice>
${preferences.authorVoice}
</author_voice>

<style>
${preferences.style}
</style>

<target_audience>
${preferences.targetAudience}
</target_audience>

<content_length>
${preferences.contentLength}
</content_length>

<hashtag_preference>
${preferences.hashtagPreference}
</hashtag_preference>

<emoji_usage>
${preferences.emojiUsage}
</emoji_usage>

<cta_type>
${preferences.ctaType}
</cta_type>

<post_type>
${preferences.postType}
</post_type>

<hook_style>
${preferences.hookStyle}
</hook_style>

<message_style>
${preferences.messageStyle}
</message_style>

${authorVoiceInstructions}

Using this information, create social media posts that effectively communicate the article's content while adhering to the following guidelines:

1. **STRICT CONTENT AUTHENTICITY**: Use ONLY information contained in the provided article content. Do not invent new facts, data, stories, or examples. All quotes, statistics, anecdotes, and statements must originate from the article text provided. If required information is not in the article, omit it rather than inventing.

2. **Platform Optimization**: Tailor your posts to ${preferences.platform}. Consider character limits, formatting options, and typical content style for this platform.

3. **Tone Implementation**: ${toneDescription}. Ensure that the language and style match this tone throughout all posts.

4. **Style Application**: ${styleDescription}. Structure your content using this approach consistently.

5. **Audience Targeting**: ${audienceDescription}. Adjust complexity, examples, and focus accordingly.

6. **Content Length**: ${lengthDescription}. Maintain appropriate length for each post component.

7. **Language Requirement**: Write exclusively in ${preferences.language}. All content must be fluent and natural in this language.

8. **Hook Utilization**: Use the provided selected hooks or create variations that align with the specified tone and style requirements.

9. **Hashtag Strategy**: ${hashtagDescription}. Choose hashtags that are relevant to the content and appropriate for the target audience.

10. **Emoji Integration**: ${emojiDescription}. Use emojis strategically to enhance readability and engagement.

11. **Call-to-Action**: ${ctaDescription}. Ensure each post has an appropriate engagement driver.

12. **Post Structure**: ${postTypeInstructions}

13. **Hook Style**: ${hookStyleDescription}. Apply this approach consistently to all post openings.

14. **Message Style**: ${messageStyleDescription}. Structure your main content using this format throughout.

${preferences.postType !== 'single' ? `
**SEQUENCE-SPECIFIC REQUIREMENTS**:
- **Post 1**: Set up the main theme and hook readers into the sequence. End with a teaser for what's coming next.
- **Post 2-4**: Build upon previous posts with clear connections. Use transitional phrases like "Yesterday I shared...", "Building on this...", or "As promised..."
- **Final Post**: Provide a satisfying conclusion that ties back to the opening and summarizes key insights from the sequence.
- **Cross-References**: Each post should feel connected through consistent terminology, ongoing narratives, or progressive revelations.
- **Sequential Flow**: Ensure each post can stand alone but gains additional meaning when read as part of the sequence.
- **Transition Techniques**: Use specific linking phrases:
  * Forward references: "Tomorrow I'll reveal...", "In my next post, I'll show you...", "Coming up: the strategy that changed everything..."
  * Backward references: "Yesterday I shared...", "Building on what I mentioned...", "Remember when I said..."
  * Continuation phrases: "Let's dive deeper...", "Here's where it gets interesting...", "The plot thickens..."
- **Narrative Consistency**: Maintain consistent character voice, recurring themes, and progressive revelation of insights throughout the sequence.
- **Engagement Threading**: Each post should create curiosity for the next while satisfying the current post's promise.
` : ''}

15. **Content Verification**: Review all content to ensure it directly relates to the article and contains no fabricated elements.

After creating the posts, ensure they meet these quality standards:
- All content is factually accurate to the source article
- Language and tone are consistent throughout
- Platform-specific best practices are followed
- Target audience needs are addressed
- Engagement elements are strategically placed

Present your response as valid JSON only in the following format:

${jsonFormat}

Remember to maintain authenticity to the source material while creating engaging content that resonates with your target audience on ${preferences.platform}.
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
    console.log(`   Hook Style: ${requestData.preferences.hookStyle}`);
    console.log(`   Message Style: ${requestData.preferences.messageStyle}`);

    // Validate all preferences are set
    const requiredPrefs = ['platform', 'language', 'tone', 'style', 'targetAudience', 'contentLength', 'hashtagPreference', 'emojiUsage', 'ctaType', 'hookStyle', 'messageStyle'];
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