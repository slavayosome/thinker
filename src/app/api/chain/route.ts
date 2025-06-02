import { NextRequest, NextResponse } from 'next/server';
import { PromptChain } from '@/lib/promptChain';
import { ArticleData } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { article, step, chainState, platform = 'linkedin' } = await request.json();

    if (!article) {
      return NextResponse.json({ error: 'Article data is required' }, { status: 400 });
    }

    // Initialize or restore the prompt chain
    const chain = new PromptChain(article as ArticleData, platform);
    
    // Restore chain state if provided
    if (chainState) {
      // Restore previous results to context
      if (chainState.analysis) {
        chain.processStepResponse(JSON.stringify(chainState.analysis));
      }
      if (chainState.hooks) {
        chain.processStepResponse(JSON.stringify(chainState.hooks));
      }
      if (chainState.socialPosts) {
        chain.processStepResponse(JSON.stringify(chainState.socialPosts));
      }
    }

    const currentStep = chain.getCurrentStep();
    if (!currentStep) {
      return NextResponse.json({ 
        error: 'No more steps in the chain',
        isComplete: true,
        context: chain.getContext()
      });
    }

    console.log(`🔗 Processing step: ${currentStep.name}`);

    // Get the prompt for the current step
    const prompt = chain.getNextPrompt();
    if (!prompt) {
      return NextResponse.json({ error: 'Failed to generate prompt' }, { status: 500 });
    }

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
    
    console.log(`📝 Raw OpenAI response for ${currentStep.name}:`, rawResponse.substring(0, 200) + '...');
    
    try {
      // Process the response through the chain
      const stepResult = chain.processStepResponse(rawResponse);
      
      console.log(`✅ Step completed: ${currentStep.name}`);
      
      return NextResponse.json({
        stepId: currentStep.id,
        stepName: currentStep.name,
        result: stepResult,
        progress: chain.getProgress(),
        hasMoreSteps: chain.hasMoreSteps(),
        isComplete: !chain.hasMoreSteps(),
        context: chain.getContext()
      });

    } catch (parseError) {
      console.error('❌ Failed to parse step response:', parseError);
      console.error('📄 Full raw response:', rawResponse);
      return NextResponse.json({ 
        error: `Failed to parse ${currentStep.name} response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        rawResponse: rawResponse.substring(0, 500) // Truncate for safety
      }, { status: 422 });
    }

  } catch (error) {
    console.error('💥 Error in chain API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 