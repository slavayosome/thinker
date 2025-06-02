// src/lib/prompts.ts
export function buildSummaryPrompt(articleText: string): string {
    const prompt = `
You're an expert content analyst specialized in identifying the core message and insights from long-form articles:


Your task is:
1. Clearly state the central theme or primary argument as explicitly found in the master data.
2. List up to 5 key insights or messages directly aligned with the master data, each summarized clearly in one concise sentence.
3. Write a short paragraph summary reflecting accurately the author's core message based strictly on the master data.
Provide your response formatted as:
- Central Theme:
- Key Messages:
  1. 
  2. 
  3. 
  4. 
  5. 
- Summary:
  
  ARTICLE:
${articleText}
    `.trim();
    
    console.log('📝 Prompt built for article analysis');
    
    return prompt;
}