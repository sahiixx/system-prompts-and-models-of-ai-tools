const toolsData = [
  // AI Code Assistants
  {
    name: "GitHub Copilot",
    slug: "github-copilot",
    description: "AI pair programmer that helps write code faster with autocomplete-style suggestions.",
    longDescription: "GitHub Copilot is powered by OpenAI Codex and provides intelligent code suggestions directly in your IDE. It can generate entire functions, write tests, and help with documentation based on natural language comments.",
    type: "ide",
    status: "active",
    pricing: {
      model: "paid",
      price: "$10/month",
      details: "Free for students and verified open-source contributors"
    },
    features: [
      { name: "Code Completion", description: "AI-powered code suggestions", available: true },
      { name: "Multi-language Support", description: "Supports 10+ languages", available: true },
      { name: "Context Awareness", description: "Understands your codebase", available: true },
      { name: "Test Generation", description: "Automatically generate unit tests", available: true }
    ],
    models: [
      { name: "Codex", provider: "OpenAI", capabilities: ["Code generation", "Code completion", "Documentation"] }
    ],
    website: "https://github.com/features/copilot",
    documentation: "https://docs.github.com/copilot",
    github: "https://github.com/github/copilot",
    tags: ["code", "ai", "github", "vscode", "coding-assistant"],
    category: ["Development", "IDE Plugin"],
    integrations: ["VSCode", "JetBrains", "Neovim", "Visual Studio"],
    languages: ["JavaScript", "Python", "TypeScript", "Go", "Ruby", "Java"],
    platforms: ["Windows", "macOS", "Linux"],
    metrics: {
      views: 15420,
      favorites: 2345,
      averageRating: 4.6,
      totalReviews: 892,
      trending: true,
      trendingScore: 245
    },
    aiRecommendationScore: 95,
    isVerified: true
  },
  {
    name: "Cursor",
    slug: "cursor",
    description: "AI-first code editor built for pair programming with AI. Fork of VSCode with powerful AI features.",
    longDescription: "Cursor is a modern IDE built from the ground up to be AI-native. It includes chat, edit, and generation features powered by GPT-4 and other models, making it easy to write code with AI assistance.",
    type: "ide",
    status: "active",
    pricing: {
      model: "freemium",
      price: "$20/month for Pro",
      details: "Free tier available with limited requests"
    },
    features: [
      { name: "AI Chat", description: "Chat with AI about your code", available: true },
      { name: "Multi-file Editing", description: "Edit multiple files at once", available: true },
      { name: "Cmd+K", description: "Natural language code generation", available: true },
      { name: "Codebase Indexing", description: "AI understands your entire project", available: true }
    ],
    models: [
      { name: "GPT-4", provider: "OpenAI", capabilities: ["Code generation", "Debugging", "Refactoring"] },
      { name: "Claude", provider: "Anthropic", capabilities: ["Code review", "Documentation", "Analysis"] }
    ],
    website: "https://cursor.sh",
    documentation: "https://docs.cursor.sh",
    tags: ["ide", "ai", "vscode", "gpt-4", "coding-assistant"],
    category: ["Development", "IDE"],
    integrations: ["Git", "GitHub", "Terminal"],
    languages: ["All languages"],
    platforms: ["Windows", "macOS", "Linux"],
    metrics: {
      views: 12890,
      favorites: 1987,
      averageRating: 4.7,
      totalReviews: 654,
      trending: true,
      trendingScore: 220
    },
    aiRecommendationScore: 92,
    isVerified: true
  },
  {
    name: "Windsurf",
    slug: "windsurf",
    description: "Agentic IDE with Flows and Cascade for autonomous code generation and debugging.",
    longDescription: "Windsurf combines traditional IDE features with agentic AI capabilities. The Cascade feature allows AI to autonomously explore your codebase, run commands, and make changes across multiple files.",
    type: "ide",
    status: "active",
    pricing: {
      model: "freemium",
      price: "$15/month for Pro",
      details: "Free tier with basic AI features"
    },
    features: [
      { name: "Cascade", description: "Multi-step AI workflows", available: true },
      { name: "Flows", description: "Autonomous task execution", available: true },
      { name: "Codebase Search", description: "Semantic code search", available: true },
      { name: "Terminal Integration", description: "AI can run commands", available: true }
    ],
    models: [
      { name: "GPT-4", provider: "OpenAI", capabilities: ["Code generation", "Autonomous agents"] },
      { name: "Claude 2", provider: "Anthropic", capabilities: ["Long context", "Analysis"] }
    ],
    website: "https://windsurf.com",
    tags: ["ide", "agentic", "ai", "autonomous", "coding-assistant"],
    category: ["Development", "IDE"],
    platforms: ["Windows", "macOS", "Linux"],
    metrics: {
      views: 8450,
      favorites: 1234,
      averageRating: 4.5,
      totalReviews: 423,
      trending: true,
      trendingScore: 185
    },
    aiRecommendationScore: 88,
    isVerified: true
  },
  {
    name: "Replit Agent",
    slug: "replit-agent",
    description: "AI that builds entire applications from a single prompt. Deploy instantly on Replit.",
    longDescription: "Replit Agent is an autonomous AI developer that can create full-stack applications, set up databases, handle deployments, and even debug issues. It works within the Replit IDE and can deploy to production automatically.",
    type: "agent",
    status: "active",
    pricing: {
      model: "paid",
      price: "$20/month",
      details: "Included in Replit Core subscription"
    },
    features: [
      { name: "Full-Stack Generation", description: "Build complete apps", available: true },
      { name: "Auto-Deploy", description: "Deploy with one click", available: true },
      { name: "Database Setup", description: "Configure databases automatically", available: true },
      { name: "Bug Fixing", description: "AI debugs and fixes issues", available: true }
    ],
    models: [
      { name: "Custom Model", provider: "Replit", capabilities: ["Full-stack development", "Deployment", "Debugging"] }
    ],
    website: "https://replit.com/agent",
    documentation: "https://docs.replit.com/replitai/agent",
    tags: ["agent", "full-stack", "deployment", "autonomous", "web-dev"],
    category: ["Development", "Agent", "Web Platform"],
    integrations: ["Replit", "Hosting", "Databases"],
    languages: ["JavaScript", "Python", "Go", "Java", "C++", "Rust"],
    platforms: ["Web", "Cloud"],
    metrics: {
      views: 9870,
      favorites: 1567,
      averageRating: 4.4,
      totalReviews: 512,
      trending: true,
      trendingScore: 195
    },
    aiRecommendationScore: 90,
    isVerified: true
  },
  {
    name: "v0 by Vercel",
    slug: "v0",
    description: "Generate UI components from text prompts. Built with React, Tailwind, and Shadcn.",
    longDescription: "v0 is Vercel's AI-powered generative UI tool. Describe the component you want in natural language, and v0 generates production-ready React code with Tailwind CSS and Shadcn UI components.",
    type: "web",
    status: "active",
    pricing: {
      model: "freemium",
      price: "$20/month for unlimited",
      details: "Free tier with monthly credits"
    },
    features: [
      { name: "Component Generation", description: "Generate React components", available: true },
      { name: "Tailwind CSS", description: "Beautiful, responsive styling", available: true },
      { name: "Shadcn UI", description: "Pre-built component library", available: true },
      { name: "Live Preview", description: "See changes in real-time", available: true }
    ],
    models: [
      { name: "Custom UI Model", provider: "Vercel", capabilities: ["UI generation", "React code", "Styling"] }
    ],
    website: "https://v0.dev",
    documentation: "https://v0.dev/docs",
    tags: ["ui", "react", "tailwind", "components", "frontend"],
    category: ["Development", "UI/UX", "Web"],
    integrations: ["Vercel", "Next.js", "React"],
    languages: ["TypeScript", "JavaScript"],
    platforms: ["Web", "Cloud"],
    metrics: {
      views: 11230,
      favorites: 1890,
      averageRating: 4.6,
      totalReviews: 678,
      trending: true,
      trendingScore: 210
    },
    aiRecommendationScore: 91,
    isVerified: true
  },

  // AI Chat & Writing Tools
  {
    name: "ChatGPT",
    slug: "chatgpt",
    description: "OpenAI's conversational AI for general queries, creative writing, and problem-solving.",
    longDescription: "ChatGPT is a state-of-the-art language model that can assist with a wide range of tasks including writing, analysis, coding, math, and general knowledge questions. It supports GPT-3.5 and GPT-4 models.",
    type: "web",
    status: "active",
    pricing: {
      model: "freemium",
      price: "$20/month for Plus",
      details: "Free tier with GPT-3.5, Plus includes GPT-4"
    },
    features: [
      { name: "Conversational AI", description: "Natural dialogue", available: true },
      { name: "Code Generation", description: "Write and debug code", available: true },
      { name: "Creative Writing", description: "Stories, essays, content", available: true },
      { name: "Multi-language", description: "50+ languages", available: true },
      { name: "DALL-E Integration", description: "Generate images", available: true }
    ],
    models: [
      { name: "GPT-3.5", provider: "OpenAI", capabilities: ["Text generation", "Conversation", "Code"] },
      { name: "GPT-4", provider: "OpenAI", capabilities: ["Advanced reasoning", "Multimodal", "Analysis"] },
      { name: "GPT-4o", provider: "OpenAI", capabilities: ["Fast inference", "Vision", "Voice"] }
    ],
    website: "https://chat.openai.com",
    documentation: "https://platform.openai.com/docs",
    tags: ["chatbot", "nlp", "gpt", "openai", "writing"],
    category: ["Chat", "Writing", "General AI"],
    languages: ["50+ languages"],
    platforms: ["Web", "iOS", "Android"],
    metrics: {
      views: 25680,
      favorites: 4567,
      averageRating: 4.5,
      totalReviews: 2341,
      trending: true,
      trendingScore: 320
    },
    aiRecommendationScore: 96,
    isVerified: true
  },
  {
    name: "Claude",
    slug: "claude",
    description: "Anthropic's AI assistant focused on safety, accuracy, and long-context understanding.",
    longDescription: "Claude is an AI assistant created by Anthropic with a focus on being helpful, harmless, and honest. It excels at long-form content, analysis, and maintaining context across lengthy documents.",
    type: "web",
    status: "active",
    pricing: {
      model: "freemium",
      price: "$20/month for Pro",
      details: "Free tier available, Pro for priority access"
    },
    features: [
      { name: "200K Context", description: "Process long documents", available: true },
      { name: "Code Analysis", description: "Review and explain code", available: true },
      { name: "Document Processing", description: "Analyze PDFs and docs", available: true },
      { name: "Creative Writing", description: "Long-form content", available: true }
    ],
    models: [
      { name: "Claude 3 Haiku", provider: "Anthropic", capabilities: ["Fast responses", "Quick tasks"] },
      { name: "Claude 3 Sonnet", provider: "Anthropic", capabilities: ["Balanced", "General purpose"] },
      { name: "Claude 3 Opus", provider: "Anthropic", capabilities: ["Most capable", "Complex reasoning"] }
    ],
    website: "https://claude.ai",
    documentation: "https://docs.anthropic.com",
    tags: ["chatbot", "assistant", "anthropic", "safety", "analysis"],
    category: ["Chat", "Writing", "Analysis"],
    languages: ["Multiple languages"],
    platforms: ["Web"],
    metrics: {
      views: 18900,
      favorites: 3210,
      averageRating: 4.7,
      totalReviews: 1456,
      trending: true,
      trendingScore: 275
    },
    aiRecommendationScore: 94,
    isVerified: true
  },
  {
    name: "Gemini",
    slug: "gemini",
    description: "Google's multimodal AI for text, images, and code. Integrated with Google services.",
    longDescription: "Gemini (formerly Bard) is Google's most capable AI model family. It can understand and generate text, images, and code, with deep integration into Google's ecosystem including Search, Gmail, and Drive.",
    type: "web",
    status: "active",
    pricing: {
      model: "freemium",
      price: "$19.99/month for Advanced",
      details: "Free tier available, Advanced includes Gemini Ultra"
    },
    features: [
      { name: "Multimodal", description: "Text, image, and code", available: true },
      { name: "Google Integration", description: "Works with Google apps", available: true },
      { name: "Real-time Info", description: "Up-to-date information", available: true },
      { name: "Image Understanding", description: "Analyze images", available: true }
    ],
    models: [
      { name: "Gemini Pro", provider: "Google", capabilities: ["Text", "Code", "General tasks"] },
      { name: "Gemini Ultra", provider: "Google", capabilities: ["Most capable", "Complex reasoning", "Multimodal"] }
    ],
    website: "https://gemini.google.com",
    documentation: "https://ai.google.dev/docs",
    tags: ["google", "multimodal", "chatbot", "search", "integration"],
    category: ["Chat", "Multimodal", "Search"],
    languages: ["40+ languages"],
    platforms: ["Web", "iOS", "Android"],
    metrics: {
      views: 16780,
      favorites: 2890,
      averageRating: 4.4,
      totalReviews: 1234,
      trending: true,
      trendingScore: 240
    },
    aiRecommendationScore: 89,
    isVerified: true
  },

  // Image Generation Tools
  {
    name: "DALL-E 3",
    slug: "dall-e-3",
    description: "OpenAI's most advanced text-to-image model. Create photorealistic images from descriptions.",
    longDescription: "DALL-E 3 is OpenAI's latest image generation model with significantly improved prompt following, detail, and creative capabilities. Integrated into ChatGPT Plus and available via API.",
    type: "web",
    status: "active",
    pricing: {
      model: "paid",
      price: "Included in ChatGPT Plus ($20/mo)",
      details: "Also available via API at $0.04-$0.12 per image"
    },
    features: [
      { name: "Photorealistic", description: "Highly detailed images", available: true },
      { name: "Prompt Following", description: "Accurate interpretation", available: true },
      { name: "Style Control", description: "Various artistic styles", available: true },
      { name: "Safety Features", description: "Built-in content filtering", available: true }
    ],
    models: [
      { name: "DALL-E 3", provider: "OpenAI", capabilities: ["Image generation", "Text rendering", "Style variation"] }
    ],
    website: "https://openai.com/dall-e-3",
    documentation: "https://platform.openai.com/docs/guides/images",
    tags: ["image", "art", "openai", "generation", "photorealistic"],
    category: ["Image Generation", "Art"],
    platforms: ["Web", "API"],
    metrics: {
      views: 14560,
      favorites: 2345,
      averageRating: 4.6,
      totalReviews: 987,
      trending: true,
      trendingScore: 225
    },
    aiRecommendationScore: 93,
    isVerified: true
  },
  {
    name: "Midjourney",
    slug: "midjourney",
    description: "AI art generator creating stunning artistic and aesthetic images via Discord.",
    longDescription: "Midjourney is renowned for its artistic quality and aesthetic appeal. It excels at creating stylized, creative images and is popular among digital artists and designers.",
    type: "web",
    status: "active",
    pricing: {
      model: "paid",
      price: "$10-$120/month",
      details: "Multiple tiers: Basic, Standard, Pro, Mega"
    },
    features: [
      { name: "Artistic Style", description: "Unique aesthetic", available: true },
      { name: "High Quality", description: "Detailed outputs", available: true },
      { name: "Style Reference", description: "Consistent styles", available: true },
      { name: "Upscaling", description: "Enhance resolution", available: true }
    ],
    models: [
      { name: "Midjourney v6", provider: "Midjourney", capabilities: ["Artistic generation", "Style control", "High detail"] }
    ],
    website: "https://midjourney.com",
    documentation: "https://docs.midjourney.com",
    tags: ["art", "creative", "discord", "artistic", "aesthetic"],
    category: ["Image Generation", "Art"],
    integrations: ["Discord"],
    platforms: ["Web", "Discord"],
    metrics: {
      views: 13890,
      favorites: 2567,
      averageRating: 4.7,
      totalReviews: 1123,
      trending: true,
      trendingScore: 235
    },
    aiRecommendationScore: 91,
    isVerified: true
  },
  {
    name: "Stable Diffusion",
    slug: "stable-diffusion",
    description: "Open-source image generation that runs locally. Highly customizable and extensible.",
    longDescription: "Stable Diffusion is an open-source text-to-image model that can be run on consumer hardware. With ControlNet, LoRA, and other extensions, it offers unparalleled customization.",
    type: "other",
    status: "active",
    pricing: {
      model: "free",
      price: "Free (Open Source)",
      details: "Can run locally or use cloud services"
    },
    features: [
      { name: "Open Source", description: "Fully open and free", available: true },
      { name: "Local Deployment", description: "Run on your hardware", available: true },
      { name: "ControlNet", description: "Advanced control", available: true },
      { name: "LoRA Models", description: "Style customization", available: true },
      { name: "Extensions", description: "Huge ecosystem", available: true }
    ],
    models: [
      { name: "SD 1.5", provider: "Stability AI", capabilities: ["Image generation", "Extensible"] },
      { name: "SDXL", provider: "Stability AI", capabilities: ["High resolution", "Better quality"] },
      { name: "SD Turbo", provider: "Stability AI", capabilities: ["Fast generation", "Real-time"] }
    ],
    website: "https://stability.ai",
    github: "https://github.com/Stability-AI/stablediffusion",
    documentation: "https://github.com/AUTOMATIC1111/stable-diffusion-webui",
    tags: ["opensource", "image", "local", "customizable", "stable-diffusion"],
    category: ["Image Generation", "Open Source"],
    platforms: ["Windows", "macOS", "Linux", "Cloud"],
    metrics: {
      views: 17890,
      favorites: 3456,
      averageRating: 4.5,
      totalReviews: 2134,
      trending: true,
      trendingScore: 260
    },
    aiRecommendationScore: 88,
    isVerified: true
  },

  // Video Generation
  {
    name: "Sora",
    slug: "sora",
    description: "OpenAI's text-to-video model. Generate realistic and imaginative video scenes.",
    longDescription: "Sora is OpenAI's video generation model capable of creating high-quality videos up to a minute long. It understands physics, motion, and can generate complex scenes with multiple characters.",
    type: "web",
    status: "beta",
    pricing: {
      model: "paid",
      price: "Limited access",
      details: "Currently in limited beta"
    },
    features: [
      { name: "Long Videos", description: "Up to 60 seconds", available: true },
      { name: "Realistic Motion", description: "Physics-aware", available: true },
      { name: "Complex Scenes", description: "Multiple elements", available: true },
      { name: "High Resolution", description: "1080p output", available: true }
    ],
    models: [
      { name: "Sora", provider: "OpenAI", capabilities: ["Video generation", "Motion synthesis", "Scene understanding"] }
    ],
    website: "https://openai.com/sora",
    tags: ["video", "generation", "openai", "text-to-video"],
    category: ["Video Generation", "Multimedia"],
    platforms: ["Web"],
    metrics: {
      views: 12340,
      favorites: 2123,
      averageRating: 4.8,
      totalReviews: 456,
      trending: true,
      trendingScore: 250
    },
    aiRecommendationScore: 95,
    isVerified: true
  },
  {
    name: "Runway ML",
    slug: "runway-ml",
    description: "Creative suite with video generation, editing, and AI magic tools for content creators.",
    longDescription: "Runway is a comprehensive creative platform offering Gen-2 video generation, AI Magic Tools for editing, and much more. Popular among filmmakers and content creators.",
    type: "web",
    status: "active",
    pricing: {
      model: "freemium",
      price: "$12-$76/month",
      details: "Free tier with credits, paid plans for more credits"
    },
    features: [
      { name: "Gen-2", description: "Text/image to video", available: true },
      { name: "Motion Brush", description: "Animate specific areas", available: true },
      { name: "Inpainting", description: "Remove/replace objects", available: true },
      { name: "Green Screen", description: "Background removal", available: true }
    ],
    models: [
      { name: "Gen-2", provider: "Runway", capabilities: ["Video generation", "Video editing", "Style transfer"] }
    ],
    website: "https://runwayml.com",
    documentation: "https://docs.runwayml.com",
    tags: ["video", "editing", "generation", "creative", "filmmaking"],
    category: ["Video Generation", "Video Editing"],
    platforms: ["Web"],
    metrics: {
      views: 10890,
      favorites: 1789,
      averageRating: 4.5,
      totalReviews: 678,
      trending: true,
      trendingScore: 205
    },
    aiRecommendationScore: 87,
    isVerified: true
  },

  // Voice & Audio
  {
    name: "ElevenLabs",
    slug: "elevenlabs",
    description: "Realistic AI voice generation with voice cloning. Create natural-sounding speech.",
    longDescription: "ElevenLabs provides cutting-edge text-to-speech and voice cloning technology. Used by creators, developers, and businesses for audiobooks, videos, games, and more.",
    type: "web",
    status: "active",
    pricing: {
      model: "freemium",
      price: "$5-$330/month",
      details: "Free tier with 10k characters/month"
    },
    features: [
      { name: "Voice Cloning", description: "Clone any voice", available: true },
      { name: "Multi-language", description: "29+ languages", available: true },
      { name: "Voice Library", description: "Pre-made voices", available: true },
      { name: "API Access", description: "Integrate into apps", available: true }
    ],
    models: [
      { name: "Eleven Multilingual", provider: "ElevenLabs", capabilities: ["TTS", "Voice cloning", "Multi-language"] }
    ],
    website: "https://elevenlabs.io",
    documentation: "https://docs.elevenlabs.io",
    tags: ["voice", "tts", "audio", "cloning", "speech"],
    category: ["Audio", "Voice Generation"],
    platforms: ["Web", "API"],
    metrics: {
      views: 9870,
      favorites: 1654,
      averageRating: 4.7,
      totalReviews: 789,
      trending: true,
      trendingScore: 195
    },
    aiRecommendationScore: 90,
    isVerified: true
  },
  {
    name: "Murf AI",
    slug: "murf-ai",
    description: "AI voiceover platform with studio-quality voices for videos, presentations, and more.",
    longDescription: "Murf AI offers a comprehensive voiceover solution with 120+ voices in 20+ languages. Includes a built-in editor for timing, emphasis, and tone adjustments.",
    type: "web",
    status: "active",
    pricing: {
      model: "freemium",
      price: "$19-$99/month",
      details: "Free trial available"
    },
    features: [
      { name: "120+ Voices", description: "Wide voice selection", available: true },
      { name: "Voice Changer", description: "Transform your voice", available: true },
      { name: "Built-in Editor", description: "Edit voiceovers", available: true },
      { name: "Commercial License", description: "Use commercially", available: true }
    ],
    models: [
      { name: "Murf TTS", provider: "Murf", capabilities: ["Text-to-speech", "Voice editing", "Multi-language"] }
    ],
    website: "https://murf.ai",
    documentation: "https://murf.ai/resources",
    tags: ["voice", "tts", "voiceover", "audio", "presentation"],
    category: ["Audio", "Voice Generation"],
    platforms: ["Web"],
    metrics: {
      views: 7650,
      favorites: 1234,
      averageRating: 4.4,
      totalReviews: 567,
      trending: false,
      trendingScore: 165
    },
    aiRecommendationScore: 83,
    isVerified: true
  },

  // Productivity & Business
  {
    name: "Notion AI",
    slug: "notion-ai",
    description: "AI assistant integrated into Notion. Write, edit, and organize content effortlessly.",
    longDescription: "Notion AI brings the power of AI directly into your Notion workspace. Generate content, summarize notes, create action items, and more without leaving your workspace.",
    type: "plugin",
    status: "active",
    pricing: {
      model: "paid",
      price: "$10/month per member",
      details: "Add-on to existing Notion plans"
    },
    features: [
      { name: "Content Generation", description: "Create drafts quickly", available: true },
      { name: "Summarization", description: "Extract key points", available: true },
      { name: "Action Items", description: "Generate to-do lists", available: true },
      { name: "Translation", description: "Multiple languages", available: true }
    ],
    models: [
      { name: "Custom Model", provider: "Notion", capabilities: ["Writing", "Summarization", "Translation"] }
    ],
    website: "https://notion.so/product/ai",
    documentation: "https://notion.so/help/guides/ai",
    tags: ["productivity", "notion", "writing", "workspace"],
    category: ["Productivity", "Writing"],
    integrations: ["Notion"],
    platforms: ["Web", "macOS", "Windows", "iOS", "Android"],
    metrics: {
      views: 11230,
      favorites: 2012,
      averageRating: 4.5,
      totalReviews: 890,
      trending: false,
      trendingScore: 185
    },
    aiRecommendationScore: 86,
    isVerified: true
  },
  {
    name: "Grammarly",
    slug: "grammarly",
    description: "AI writing assistant for grammar, style, and tone. Write clearly and confidently.",
    longDescription: "Grammarly uses AI to help you write mistake-free, effective communication. Beyond grammar and spelling, it offers suggestions for clarity, engagement, and delivery.",
    type: "plugin",
    status: "active",
    pricing: {
      model: "freemium",
      price: "$12-$15/month",
      details: "Free tier available, Premium for advanced features"
    },
    features: [
      { name: "Grammar Check", description: "Real-time corrections", available: true },
      { name: "Style Suggestions", description: "Improve clarity", available: true },
      { name: "Tone Detector", description: "Adjust your tone", available: true },
      { name: "Plagiarism Check", description: "Ensure originality", available: true }
    ],
    models: [
      { name: "Grammarly AI", provider: "Grammarly", capabilities: ["Grammar", "Style", "Tone", "Clarity"] }
    ],
    website: "https://grammarly.com",
    documentation: "https://support.grammarly.com",
    tags: ["writing", "grammar", "editing", "productivity"],
    category: ["Writing", "Productivity"],
    integrations: ["Browser", "Word", "Google Docs", "Slack"],
    platforms: ["Web", "Windows", "macOS", "iOS", "Android"],
    metrics: {
      views: 13450,
      favorites: 2456,
      averageRating: 4.6,
      totalReviews: 1234,
      trending: false,
      trendingScore: 195
    },
    aiRecommendationScore: 89,
    isVerified: true
  },

  // Research & Analysis
  {
    name: "Perplexity AI",
    slug: "perplexity-ai",
    description: "AI-powered search engine that provides sourced, conversational answers to your questions.",
    longDescription: "Perplexity combines search and AI to provide comprehensive answers with citations. It's like having a research assistant that can find and synthesize information from across the web.",
    type: "web",
    status: "active",
    pricing: {
      model: "freemium",
      price: "$20/month for Pro",
      details: "Free tier available, Pro includes GPT-4 and more searches"
    },
    features: [
      { name: "Sourced Answers", description: "Citations included", available: true },
      { name: "Follow-up Questions", description: "Conversational search", available: true },
      { name: "Multi-source", description: "Multiple perspectives", available: true },
      { name: "Collections", description: "Organize research", available: true }
    ],
    models: [
      { name: "Custom Search Model", provider: "Perplexity", capabilities: ["Search", "Synthesis", "Citation"] },
      { name: "GPT-4", provider: "OpenAI", capabilities: ["Advanced reasoning"] }
    ],
    website: "https://perplexity.ai",
    tags: ["search", "research", "citations", "qa", "analysis"],
    category: ["Research", "Search"],
    platforms: ["Web", "iOS", "Android"],
    metrics: {
      views: 10890,
      favorites: 1876,
      averageRating: 4.6,
      totalReviews: 765,
      trending: true,
      trendingScore: 200
    },
    aiRecommendationScore: 88,
    isVerified: true
  },
  {
    name: "Consensus",
    slug: "consensus",
    description: "AI-powered academic search engine. Find and summarize scientific research papers.",
    longDescription: "Consensus uses AI to search through over 200 million academic papers, extract key findings, and provide evidence-based answers. Ideal for researchers, students, and professionals.",
    type: "web",
    status: "active",
    pricing: {
      model: "freemium",
      price: "$8.99/month for Premium",
      details: "Free tier with limited searches"
    },
    features: [
      { name: "Academic Search", description: "200M+ papers", available: true },
      { name: "Study Snapshots", description: "Quick summaries", available: true },
      { name: "Consensus Meter", description: "Agreement level", available: true },
      { name: "Citation Export", description: "Export references", available: true }
    ],
    models: [
      { name: "Consensus AI", provider: "Consensus", capabilities: ["Academic search", "Summarization", "Analysis"] }
    ],
    website: "https://consensus.app",
    documentation: "https://consensus.app/help",
    tags: ["research", "academic", "papers", "science", "citations"],
    category: ["Research", "Academic"],
    platforms: ["Web"],
    metrics: {
      views: 6780,
      favorites: 987,
      averageRating: 4.7,
      totalReviews: 432,
      trending: false,
      trendingScore: 145
    },
    aiRecommendationScore: 85,
    isVerified: true
  },

  // Design Tools
  {
    name: "Canva AI",
    slug: "canva-ai",
    description: "Design platform with AI-powered tools for graphics, videos, and presentations.",
    longDescription: "Canva has integrated multiple AI features including Magic Design, Background Remover, and Text to Image. Create professional designs with AI assistance in minutes.",
    type: "web",
    status: "active",
    pricing: {
      model: "freemium",
      price: "$12.99/month for Pro",
      details: "Free tier available with limited AI features"
    },
    features: [
      { name: "Magic Design", description: "AI layout generation", available: true },
      { name: "Background Remover", description: "Remove backgrounds", available: true },
      { name: "Text to Image", description: "Generate images", available: true },
      { name: "Magic Write", description: "AI copywriting", available: true }
    ],
    models: [
      { name: "Canva AI Suite", provider: "Canva", capabilities: ["Design", "Image generation", "Writing"] }
    ],
    website: "https://canva.com",
    documentation: "https://canva.com/help",
    tags: ["design", "graphics", "ai-tools", "templates"],
    category: ["Design", "Graphics"],
    platforms: ["Web", "iOS", "Android"],
    metrics: {
      views: 15670,
      favorites: 2890,
      averageRating: 4.5,
      totalReviews: 1567,
      trending: false,
      trendingScore: 210
    },
    aiRecommendationScore: 87,
    isVerified: true
  },
  {
    name: "Figma AI",
    slug: "figma-ai",
    description: "Design tool with AI features for auto-layout, content generation, and design assistance.",
    longDescription: "Figma's AI capabilities help designers work faster with features like AI-powered prototyping, content generation, and design suggestions. The future of collaborative design.",
    type: "web",
    status: "active",
    pricing: {
      model: "freemium",
      price: "$12-$45/month",
      details: "Free for individuals, paid for teams"
    },
    features: [
      { name: "AI Design Suggestions", description: "Smart layout", available: true },
      { name: "Content Fill", description: "Generate text/images", available: true },
      { name: "Auto-layout", description: "Responsive designs", available: true },
      { name: "Dev Mode", description: "Code generation", available: true }
    ],
    models: [
      { name: "Figma AI", provider: "Figma", capabilities: ["Design assistance", "Code generation", "Content"] }
    ],
    website: "https://figma.com",
    documentation: "https://help.figma.com",
    tags: ["design", "prototyping", "collaboration", "ui-ux"],
    category: ["Design", "UI/UX"],
    platforms: ["Web", "macOS", "Windows"],
    metrics: {
      views: 14230,
      favorites: 2567,
      averageRating: 4.7,
      totalReviews: 1345,
      trending: false,
      trendingScore: 215
    },
    aiRecommendationScore: 91,
    isVerified: true
  },

  // Data & Analytics
  {
    name: "Julius AI",
    slug: "julius-ai",
    description: "AI data analyst that interprets, analyzes, and visualizes your data with natural language.",
    longDescription: "Julius is an AI-powered data analyst that can clean, analyze, and visualize your data. Simply upload a file and ask questions in plain English.",
    type: "web",
    status: "active",
    pricing: {
      model: "freemium",
      price: "$20/month for Pro",
      details: "Free tier with limited analyses"
    },
    features: [
      { name: "Data Analysis", description: "Statistical analysis", available: true },
      { name: "Visualization", description: "Auto-generate charts", available: true },
      { name: "Natural Language", description: "Ask questions", available: true },
      { name: "Export Reports", description: "PDF/Excel export", available: true }
    ],
    models: [
      { name: "Julius AI", provider: "Julius", capabilities: ["Data analysis", "Visualization", "Statistics"] }
    ],
    website: "https://julius.ai",
    tags: ["data", "analytics", "visualization", "statistics"],
    category: ["Data Analytics", "Business Intelligence"],
    platforms: ["Web"],
    metrics: {
      views: 5670,
      favorites: 890,
      averageRating: 4.5,
      totalReviews: 345,
      trending: false,
      trendingScore: 125
    },
    aiRecommendationScore: 82,
    isVerified: true
  },
  {
    name: "ChatPDF",
    slug: "chatpdf",
    description: "Chat with any PDF document. Ask questions and get instant answers from your documents.",
    longDescription: "ChatPDF allows you to upload PDF documents and interact with them conversationally. Perfect for research papers, reports, manuals, and any PDF-based content.",
    type: "web",
    status: "active",
    pricing: {
      model: "freemium",
      price: "$5/month for Plus",
      details: "Free tier with file size limits"
    },
    features: [
      { name: "PDF Chat", description: "Ask questions about PDFs", available: true },
      { name: "Multi-file", description: "Multiple PDFs at once", available: true },
      { name: "Citations", description: "Page references", available: true },
      { name: "Summaries", description: "Quick overviews", available: true }
    ],
    models: [
      { name: "Custom RAG", provider: "ChatPDF", capabilities: ["Document Q&A", "Summarization", "Citation"] }
    ],
    website: "https://chatpdf.com",
    tags: ["pdf", "documents", "qa", "research", "reading"],
    category: ["Productivity", "Documents"],
    platforms: ["Web"],
    metrics: {
      views: 8900,
      favorites: 1456,
      averageRating: 4.4,
      totalReviews: 678,
      trending: false,
      trendingScore: 155
    },
    aiRecommendationScore: 84,
    isVerified: true
  }
];

module.exports = toolsData;
