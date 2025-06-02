This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Setup

1. Create a `.env.local` file in the root directory:
```
OPENAI_API_KEY=your_openai_api_key_here
```

**Important**: Never use `NEXT_PUBLIC_` prefix for API keys as it exposes them to the client-side.

### Prerequisites

Make sure you have:
- Node.js installed
- OpenAI API key
- Parser service running on port 3001

### Running the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Troubleshooting

### Common URL Processing Errors

1. **"Parser service error"**: Make sure the parser service is running on port 3001
2. **"OpenAI API error"**: Check that your `OPENAI_API_KEY` is set correctly in `.env.local`
3. **"No content found"**: The URL may not contain readable article content
4. **Network errors**: Check your internet connection and service availability

### Testing the Parser Service

```bash
curl "http://localhost:3001/parser?url=https://example.com"
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
