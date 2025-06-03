// src/lib/scrape.ts
export async function fetchArticle(url: string) {
    try {
      // When running server-side, we need to use the full URL
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      // Use POST endpoint to avoid URL encoding issues with Cyrillic characters
      // Now uses hybrid parsing by default
      const response = await fetch(`${baseUrl}/api/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url,
          hybrid: true // Enable hybrid parsing by default
        })
      });
    
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
    
      const data = await response.json();
      
      // Validate that we got article content
      if (!data.content) {
        throw new Error("No content found in the article");
      }
      
      // Log hybrid parsing metadata if available
      if (data._hybrid) {
        console.log(`📊 Parsing method: ${data._hybrid.parsingMethod} (${data._hybrid.extractionTime}ms, confidence: ${data._hybrid.confidence}%)`);
        if (data._hybrid.extractionMethods?.length > 0) {
          console.log(`🔍 Extraction methods: ${data._hybrid.extractionMethods.join(', ')}`);
        }
      }
      
      return data;
    } catch (error) {
      // Handle network errors or JSON parsing errors
      if (error instanceof Error) {
        throw new Error(`Failed to fetch article: ${error.message}`);
      }
      throw new Error("Unknown error occurred while fetching article");
    }
  }