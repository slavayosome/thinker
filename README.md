# 🧠 Thinker - AI-Powered Content Creator

Transform any article into engaging social media content with the power of AI. Thinker analyzes articles and generates optimized content for different social media platforms and content types.

![Thinker Screenshot](https://img.shields.io/badge/Next.js-15.3.3-blue) ![React](https://img.shields.io/badge/React-19.0.0-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-blue)

## ✨ Features

### 🎯 Content Generation Types
- **🪝 Hooks** - Attention-grabbing opening lines
- **💬 Quotes** - Powerful, quotable statements  
- **💡 Key Insights** - Most important learnings
- **📊 Statistics** - Compelling data points
- **❓ Questions** - Discussion starters
- **📝 Takeaways** - Actionable advice

### 🚀 Smart Analysis
- **Content Type Detection** - AI automatically detects which content types work best for each article
- **Language Detection** - Supports multiple languages with automatic detection
- **Confidence Scoring** - Shows how well each content type fits the article
- **Personalized Recommendations** - AI suggests the most effective content types

### 📱 Social Media Optimization
- **Platform-Specific Formatting** - Optimized for Twitter, LinkedIn, Facebook, Instagram
- **Character Count Management** - Respects platform limits
- **Hashtag Generation** - Relevant hashtags for better reach
- **Engagement Optimization** - Content designed for maximum engagement

### 💾 History & Management
- **Content History** - Save and revisit previously generated content
- **Quick Access** - Easily reload past articles and regenerate content
- **Export Options** - Copy content for immediate use

## 🛠️ Technology Stack

- **Frontend**: Next.js 15.3.3, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **AI Integration**: OpenAI API
- **Content Processing**: JSDOM, HTML Entities
- **Development**: ESLint, Turbopack

## 📋 Prerequisites

Before you begin, ensure you have:
- **Node.js** (v18 or higher)
- **OpenAI API Key** - Get one from [OpenAI Platform](https://platform.openai.com/api-keys)
- **npm/yarn/pnpm** package manager

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd thinker
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

⚠️ **Important**: Never use `NEXT_PUBLIC_` prefix for API keys as it exposes them to the client-side.

### 4. Run the Development Server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📖 How to Use

### 1. Input Article URL
- Paste any article URL into the input field
- Click "Analyze Article" to fetch and process the content

### 2. Choose Content Type
- Select from available content types (hooks, quotes, insights, etc.)
- See AI recommendations and confidence scores
- View which content types work best for your article

### 3. Generate Content
- AI analyzes the article and generates optimized content
- Get 8+ variations for each content type
- Copy content directly for social media use

### 4. Access History
- View previously processed articles
- Quickly regenerate content for past articles
- Manage your content library

## 🏗️ Project Structure

```
src/
├── app/
│   ├── api/                 # API routes
│   │   ├── analyze/         # Article analysis endpoint
│   │   ├── detect-content-types/  # Content type detection
│   │   ├── detect-language/ # Language detection
│   │   ├── generate-content/# Content generation
│   │   ├── generate-posts/  # Social media post generation
│   │   ├── parse/          # Article parsing
│   │   ├── summarize/      # Article summarization
│   │   └── translate/      # Content translation
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx           # Main application page
├── components/
│   ├── History.tsx         # History management component
│   ├── LoadingSpinner.tsx  # Loading indicator
│   ├── ProgressStatus.tsx  # Processing progress display
│   ├── SocialMediaResults.tsx # Results display component
│   └── UrlInput.tsx       # URL input component
├── lib/
│   ├── ai.ts              # AI client configuration
│   ├── history.ts         # History management utilities
│   ├── promptChain.ts     # AI prompt chaining logic
│   ├── prompts.ts         # AI prompts
│   └── scrape.ts          # Web scraping utilities
└── types/
    └── index.ts           # TypeScript type definitions
```

## 🔧 Available Scripts

```bash
npm run dev      # Start development server with Turbopack
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🐛 Troubleshooting

### Common Issues

#### 1. OpenAI API Errors
```
Error: OpenAI API key not found
```
**Solution**: Ensure your `OPENAI_API_KEY` is correctly set in `.env.local`

#### 2. Article Parsing Failures
```
Error: Failed to fetch article content
```
**Solutions**:
- Check if the URL is accessible
- Ensure the page contains readable article content
- Some sites may block automated access

#### 3. Content Generation Issues
```
Error: Content generation failed
```
**Solutions**:
- Verify your OpenAI API key has sufficient credits
- Check network connectivity
- Try with a different article

### Debug Mode
Enable detailed logging by checking the browser console (F12) for error details.

## 🌟 Features in Detail

### Content Type Detection
The AI analyzes article content to determine which content types would be most effective:
- **High Confidence (80%+)**: Green indicator, highly recommended
- **Medium Confidence (60-79%)**: Yellow indicator, good option
- **Low Confidence (<60%)**: Red indicator, may not be optimal

### Language Support
Automatic language detection supports:
- English
- Spanish
- French
- German
- Italian
- Portuguese
- And more...

### Social Media Optimization
Generated content is optimized for:
- **Twitter/X**: Character limits, hashtag placement
- **LinkedIn**: Professional tone, longer form content
- **Facebook**: Engagement-focused formatting
- **Instagram**: Visual-friendly captions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 👨‍💻 Author

Built with ❤️ by [Slava Nikitin](https://www.linkedin.com/in/slavanikitin/)

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add your `OPENAI_API_KEY` to environment variables
4. Deploy!

### Other Platforms
The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

---

**Made with Next.js** - The React Framework for Production
