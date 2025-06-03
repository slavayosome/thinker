declare module '@postlight/parser' {
  interface ParserOptions {
    contentType?: 'html' | 'markdown' | 'text';
    headers?: Record<string, string>;
  }

  interface ParserResult {
    title: string | null;
    content: string | null;
    author: string | null;
    date_published: string | null;
    lead_image_url: string | null;
    dek: string | null;
    next_page_url: string | null;
    url: string | null;
    domain: string | null;
    excerpt: string | null;
    word_count: number | null;
    direction: string | null;
    total_pages: number | null;
    rendered_pages: number | null;
  }

  const Parser: {
    parse: (url: string, options?: ParserOptions) => Promise<ParserResult>;
  };

  export default Parser;
} 