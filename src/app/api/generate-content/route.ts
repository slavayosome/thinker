import { NextRequest, NextResponse } from 'next/server';
import { ContentGenerationRequest, ContentResult, ContentItem, ContentType, Language } from '@/types';

const contentTypeDescriptions = {
  hooks: 'engaging hooks that grab attention and encourage readers to continue',
  quotes: 'powerful, quotable statements that capture key insights from the article',
  'key-insights': 'the most important insights and learnings from the article',
  statistics: 'compelling statistics, data points, or numerical insights mentioned in the article',
  questions: 'thought-provoking questions that stimulate discussion and engagement',
  takeaways: 'actionable takeaways and practical advice readers can implement'
};

const languageInstructions: Record<Language, string> = {
  english: 'Generate all content in English.',
  spanish: 'Genera todo el contenido en español.',
  chinese: '请用中文生成所有内容。',
  arabic: 'قم بإنشاء كل المحتوى باللغة العربية.',
  portuguese: 'Gere todo o conteúdo em português.',
  indonesian: 'Hasilkan semua konten dalam bahasa Indonesia.',
  french: 'Générez tout le contenu en français.',
  japanese: 'すべてのコンテンツを日本語で生成してください。',
  russian: 'Создайте весь контент на русском языке.',
  german: 'Erstellen Sie alle Inhalte auf Deutsch.'
};

const buildContentGenerationPrompt = (request: ContentGenerationRequest & { language?: Language }): string => {
  const { article, analysis, contentType, count = 8, language = 'english' } = request;
  const description = contentTypeDescriptions[contentType];
  const langInstruction = languageInstructions[language] || languageInstructions.english;

  return `
You are an expert content strategist. Analyze the provided article and generate ${count} ${description}.

${langInstruction}

Article Title: ${article.title}
Article URL: ${article.url}
Central Theme: ${analysis.centralTheme}
Key Messages: ${analysis.keyMessages.join('\n- ')}
Summary: ${analysis.summary}

Your task is to create ${count} high-quality ${contentType.replace('-', ' ')} based on this article content.

IMPORTANT: Generate all content in the same language as the article title and content above.

REQUIREMENTS FOR ${contentType.toUpperCase()}:
${getSpecificRequirements(contentType)}

Generate exactly ${count} items that are:
1. Directly relevant to the article content
2. Engaging and valuable for social media audiences
3. Varied in approach and perspective
4. Suitable for professional social media platforms
5. Between 5-25 words each (unless specified otherwise)
6. In the same language as the source article

Provide your response as valid JSON in this exact format:
{
  "type": "${contentType}",
  "items": [
    {
      "id": "unique_id_1",
      "type": "${contentType}",
      "content": "First ${contentType.replace('-', ' ')} item"
    },
    {
      "id": "unique_id_2", 
      "type": "${contentType}",
      "content": "Second ${contentType.replace('-', ' ')} item"
    }
    // ... continue for all ${count} items
  ]
}

RESPOND WITH VALID JSON ONLY:
  `.trim();
};

function getSpecificRequirements(contentType: ContentType): string {
  switch (contentType) {
    case 'hooks':
      return `- Start with attention-grabbing words or phrases
- Use curiosity gaps, surprising facts, or bold statements
- Make them irresistible to read further
- Include emotional triggers (surprise, fear, excitement, urgency)`;
      
    case 'quotes':
      return `- Extract the most powerful statements from the article
- Ensure they stand alone and make sense out of context
- Focus on wisdom, insights, or memorable phrases
- Make them highly quotable and shareable`;
      
    case 'key-insights':
      return `- Identify the most valuable learnings from the article
- Focus on actionable wisdom and understanding
- Make each insight clear and concise
- Ensure they provide real value to readers`;
      
    case 'statistics':
      return `- Extract numerical data, percentages, or research findings
- Include the context that makes them meaningful
- Format them for maximum impact
- Ensure accuracy and provide surprising or compelling numbers`;
      
    case 'questions':
      return `- Create thought-provoking questions related to the article themes
- Use open-ended questions that encourage discussion
- Make them relevant to the reader's experience
- Include questions that challenge assumptions or inspire reflection`;
      
    case 'takeaways':
      return `- Focus on practical, actionable advice from the article
- Make each takeaway implementable
- Use clear, directive language
- Ensure they provide immediate value to readers`;
      
    default:
      return '- Create engaging, valuable content based on the article themes';
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestData: ContentGenerationRequest & { language?: Language } = await request.json();
    
    // Validate the request
    if (!requestData.article || !requestData.analysis || !requestData.contentType) {
      return NextResponse.json({ error: 'Missing required data for content generation' }, { status: 400 });
    }

    const validContentTypes: ContentType[] = ['hooks', 'quotes', 'key-insights', 'statistics', 'questions', 'takeaways'];
    if (!validContentTypes.includes(requestData.contentType)) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    console.log(`🎯 Generating ${requestData.count || 8} ${requestData.contentType} for: ${requestData.article.title?.substring(0, 50)}...`);

    // Build the prompt
    const prompt = buildContentGenerationPrompt(requestData);

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
        max_tokens: 2000,
        temperature: 0.8 // Higher temperature for more creative variety
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
      
      const parsed: ContentResult = JSON.parse(cleanedResponse);
      
      // Validate the structure
      if (!parsed.type || !parsed.items || !Array.isArray(parsed.items)) {
        throw new Error('Missing or invalid content structure');
      }

      // Ensure all items have proper structure
      parsed.items = parsed.items.map((item, index) => ({
        id: item.id || `${requestData.contentType}_${Date.now()}_${index}`,
        type: requestData.contentType,
        content: item.content || '',
        selected: false
      }));
      
      console.log(`✅ Successfully generated ${parsed.items.length} ${requestData.contentType}`);
      
      return NextResponse.json({
        success: true,
        result: parsed
      });

    } catch (parseError) {
      console.error('❌ Failed to parse content generation response:', parseError);
      console.error('📄 Full raw response:', rawResponse);
      return NextResponse.json({ 
        error: `Failed to parse content generation response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        rawResponse: rawResponse.substring(0, 500) // Truncate for safety
      }, { status: 422 });
    }

  } catch (error) {
    console.error('💥 Error in content generation API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 