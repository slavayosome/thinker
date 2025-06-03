# 🧠 Thinker - AI-Powered Content Creator

Transform any article into engaging social media content with the power of AI. Thinker analyzes articles and generates optimized content for different social media platforms and content types.

![Thinker Screenshot](https://img.shields.io/badge/Next.js-15.3.3-blue) ![React](https://img.shields.io/badge/React-19.0.0-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-blue)

## ✨ Features

### 🎨 Modern UI/UX Design
- **Minimalist Homepage** - Clean, Google/ChatGPT-style interface focused on action
- **Clickable Logo** - Thinker logo returns you to homepage with smooth navigation
- **Smart Navigation** - History button only appears when you have saved content
- **Responsive Design** - Perfect experience across desktop, tablet, and mobile
- **Elegant Animations** - Smooth transitions and hover effects throughout

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
- **Smart History Display** - History panel only appears when you have saved content
- **Modern Card Design** - Clean, aesthetically pleasing history cards with hover effects
- **Content History** - Save and revisit previously generated content
- **Quick Access** - Easily reload past articles and regenerate content
- **Intelligent Organization** - See what content types and posts were generated
- **Visual Status Indicators** - Clear indicators for current vs. previous items

## 🎯 User Experience Highlights

### Homepage Excellence
- **Clean Input Focus** - Large, centered URL input field like modern AI tools
- **Actionable Design** - Clear call-to-action with prominent "Analyze Article" button
- **Minimal Distractions** - No clutter, just what you need to get started

### Navigation Flow
- **One-Click Home** - Click the Thinker logo anytime to start fresh
- **Contextual Buttons** - Smart appearance of navigation elements when needed
- **Smooth Transitions** - Seamless flow between different states of the app

### Aesthetic Details
- **Modern Typography** - Clean, readable fonts with proper hierarchy
- **Thoughtful Spacing** - Generous whitespace for comfortable reading
- **Subtle Shadows** - Elegant depth without overwhelming the interface
- **Color Psychology** - Carefully chosen colors that enhance usability

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

### 1. Simple Start
- Visit the clean, minimalist homepage
- Paste any article URL into the prominent input field
- Click "Analyze Article →" to begin processing

### 2. Smart Analysis
- Watch as Thinker fetches and analyzes your article
- See real-time progress with elegant loading indicators
- Get intelligent content type recommendations

### 3. Content Generation
- Choose from AI-recommended content types
- Generate 8+ variations optimized for social media
- Copy content directly with one-click actions

### 4. History Management
- Access your history via the smart history button (appears when you have content)
- Browse beautifully designed history cards
- Quickly reload and regenerate content from past articles

## 🎨 Design Philosophy

Thinker's interface is built around these core principles:

### Minimalism
- **Clean Interface** - Remove everything that doesn't directly help users
- **Focus on Action** - Make the primary task (analyzing articles) immediately obvious
- **Progressive Disclosure** - Show features when they become relevant

### Accessibility
- **Mobile-First** - Designed to work perfectly on all screen sizes
- **Keyboard Navigation** - Full keyboard support for power users
- **Clear Feedback** - Always know what's happening with visual indicators

### Performance
- **Fast Loading** - Optimized for quick startup and smooth interactions
- **Smart Caching** - Efficient history management without bloat
- **Responsive Design** - Consistent experience across all devices

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

Built & powered by AI • Designed by a [human](https://www.linkedin.com/in/slavanikitin/)

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
