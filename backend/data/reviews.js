const reviewsData = [
  // ChatGPT Reviews
  {
    toolName: "ChatGPT",
    userEmail: "michael.chen@example.com",
    rating: 5,
    comment: "Absolutely game-changing! ChatGPT has transformed how I work. The responses are incredibly natural and helpful for everything from brainstorming to coding assistance.",
    status: "approved"
  },
  {
    toolName: "ChatGPT",
    userEmail: "emily.rodriguez@example.com",
    rating: 4,
    comment: "Very impressive AI. Sometimes it can be a bit repetitive, but overall an excellent tool for content creation and research.",
    status: "approved"
  },
  {
    toolName: "ChatGPT",
    userEmail: "david.kim@example.com",
    rating: 5,
    comment: "Best AI assistant I've used. The multimodal capabilities and context awareness are outstanding.",
    status: "approved"
  },

  // Claude Reviews
  {
    toolName: "Claude",
    userEmail: "sarah.johnson@example.com",
    rating: 5,
    comment: "Claude excels at long-form analysis and nuanced conversations. The ethical considerations built-in are impressive.",
    status: "approved"
  },
  {
    toolName: "Claude",
    userEmail: "james.wilson@example.com",
    rating: 4,
    comment: "Great for document analysis and detailed explanations. Very reliable and honest in its responses.",
    status: "approved"
  },

  // GitHub Copilot Reviews
  {
    toolName: "GitHub Copilot",
    userEmail: "michael.chen@example.com",
    rating: 5,
    comment: "As a developer, this is indispensable. It's like having an expert pair programmer available 24/7. Saves hours every week.",
    status: "approved"
  },
  {
    toolName: "GitHub Copilot",
    userEmail: "alex.turner@example.com",
    rating: 4,
    comment: "Really helpful for boilerplate code and common patterns. Sometimes suggests outdated approaches, but overall excellent.",
    status: "approved"
  },
  {
    toolName: "GitHub Copilot",
    userEmail: "david.kim@example.com",
    rating: 5,
    comment: "Increased my productivity by at least 40%. The AI understands context incredibly well.",
    status: "approved"
  },

  // Midjourney Reviews
  {
    toolName: "Midjourney",
    userEmail: "sophia.martinez@example.com",
    rating: 5,
    comment: "Stunning artistic results! The quality is unmatched for creative projects. Worth every penny.",
    status: "approved"
  },
  {
    toolName: "Midjourney",
    userEmail: "olivia.taylor@example.com",
    rating: 4,
    comment: "Beautiful AI art generation. The Discord interface takes some getting used to, but results are amazing.",
    status: "approved"
  },
  {
    toolName: "Midjourney",
    userEmail: "emily.rodriguez@example.com",
    rating: 5,
    comment: "Perfect for creating marketing visuals and concept art. The style variations are incredible.",
    status: "approved"
  },

  // DALL-E 3 Reviews
  {
    toolName: "DALL-E 3",
    userEmail: "james.wilson@example.com",
    rating: 5,
    comment: "The most accurate text-to-image AI I've used. It actually understands and follows complex prompts.",
    status: "approved"
  },
  {
    toolName: "DALL-E 3",
    userEmail: "michael.chen@example.com",
    rating: 4,
    comment: "Impressive quality and text rendering within images. Sometimes expensive for high volume use.",
    status: "approved"
  },

  // Notion AI Reviews
  {
    toolName: "Notion AI",
    userEmail: "emily.rodriguez@example.com",
    rating: 4,
    comment: "Seamlessly integrated into my workflow. Great for quick summaries and content generation within Notion.",
    status: "approved"
  },
  {
    toolName: "Notion AI",
    userEmail: "sophia.martinez@example.com",
    rating: 5,
    comment: "Love how it works directly in my workspace. No need to switch between tools.",
    status: "approved"
  },

  // ElevenLabs Reviews
  {
    toolName: "ElevenLabs",
    userEmail: "david.kim@example.com",
    rating: 5,
    comment: "Mind-blowing voice quality! The cloned voices are almost indistinguishable from real recordings.",
    status: "approved"
  },
  {
    toolName: "ElevenLabs",
    userEmail: "olivia.taylor@example.com",
    rating: 5,
    comment: "Best text-to-speech I've found. Perfect for audiobooks and voiceovers.",
    status: "approved"
  },
  {
    toolName: "ElevenLabs",
    userEmail: "alex.turner@example.com",
    rating: 4,
    comment: "Excellent voice synthesis. Multilingual support is fantastic. Pricing can add up quickly though.",
    status: "approved"
  },

  // Runway Gen-2 Reviews
  {
    toolName: "Runway Gen-2",
    userEmail: "sophia.martinez@example.com",
    rating: 4,
    comment: "Impressive video generation capabilities. Still early but shows massive potential.",
    status: "approved"
  },
  {
    toolName: "Runway Gen-2",
    userEmail: "james.wilson@example.com",
    rating: 4,
    comment: "Great for quick video prototypes and creative experiments. Quality keeps improving.",
    status: "approved"
  },

  // Grammarly Reviews
  {
    toolName: "Grammarly",
    userEmail: "emily.rodriguez@example.com",
    rating: 5,
    comment: "Essential writing tool. Catches errors I never would have noticed and improves my writing style.",
    status: "approved"
  },
  {
    toolName: "Grammarly",
    userEmail: "michael.chen@example.com",
    rating: 4,
    comment: "Very useful for professional communication. The tone suggestions are particularly helpful.",
    status: "approved"
  },
  {
    toolName: "Grammarly",
    userEmail: "olivia.taylor@example.com",
    rating: 5,
    comment: "Can't imagine writing without it anymore. Helps me communicate more clearly and professionally.",
    status: "approved"
  },

  // Perplexity AI Reviews
  {
    toolName: "Perplexity AI",
    userEmail: "david.kim@example.com",
    rating: 5,
    comment: "My go-to for research. The citations and follow-up questions make it superior to traditional search.",
    status: "approved"
  },
  {
    toolName: "Perplexity AI",
    userEmail: "alex.turner@example.com",
    rating: 4,
    comment: "Excellent for quick research. Love that it provides sources for all claims.",
    status: "approved"
  },

  // Canva AI Reviews
  {
    toolName: "Canva AI",
    userEmail: "sophia.martinez@example.com",
    rating: 5,
    comment: "Perfect for non-designers like me. The AI features make creating professional graphics so easy.",
    status: "approved"
  },
  {
    toolName: "Canva AI",
    userEmail: "emily.rodriguez@example.com",
    rating: 5,
    comment: "Game-changer for social media content. The templates combined with AI tools are unbeatable.",
    status: "approved"
  },
  {
    toolName: "Canva AI",
    userEmail: "olivia.taylor@example.com",
    rating: 4,
    comment: "Great for quick designs. The Magic Design feature saves me hours every week.",
    status: "approved"
  },

  // Cursor Reviews
  {
    toolName: "Cursor",
    userEmail: "michael.chen@example.com",
    rating: 5,
    comment: "Revolutionary code editor. The AI understands my entire codebase and provides contextual suggestions.",
    status: "approved"
  },
  {
    toolName: "Cursor",
    userEmail: "alex.turner@example.com",
    rating: 4,
    comment: "Impressive AI integration. Still has some bugs but the potential is enormous.",
    status: "approved"
  },

  // Jasper AI Reviews
  {
    toolName: "Jasper AI",
    userEmail: "sarah.johnson@example.com",
    rating: 4,
    comment: "Solid tool for marketing content. The templates and brand voice features are very useful.",
    status: "approved"
  },
  {
    toolName: "Jasper AI",
    userEmail: "emily.rodriguez@example.com",
    rating: 4,
    comment: "Speeds up content creation significantly. The SEO integration is a nice touch.",
    status: "approved"
  },

  // Synthesia Reviews
  {
    toolName: "Synthesia",
    userEmail: "james.wilson@example.com",
    rating: 4,
    comment: "Great for corporate training videos. The avatars look professional and save tons of time.",
    status: "approved"
  },
  {
    toolName: "Synthesia",
    userEmail: "david.kim@example.com",
    rating: 5,
    comment: "Perfect for creating multilingual video content without hiring actors or voice actors.",
    status: "approved"
  },

  // Otter.ai Reviews
  {
    toolName: "Otter.ai",
    userEmail: "emily.rodriguez@example.com",
    rating: 5,
    comment: "Must-have for meetings. The transcription accuracy and automatic summaries are excellent.",
    status: "approved"
  },
  {
    toolName: "Otter.ai",
    userEmail: "sophia.martinez@example.com",
    rating: 4,
    comment: "Very helpful for keeping track of meetings. The action items feature is particularly useful.",
    status: "approved"
  },

  // Stable Diffusion Reviews
  {
    toolName: "Stable Diffusion",
    userEmail: "alex.turner@example.com",
    rating: 5,
    comment: "Love that it's open source and can run locally. Endless possibilities with custom models.",
    status: "approved"
  },
  {
    toolName: "Stable Diffusion",
    userEmail: "michael.chen@example.com",
    rating: 4,
    comment: "Powerful and flexible. Requires technical knowledge but worth the learning curve.",
    status: "approved"
  },

  // HubSpot AI Reviews
  {
    toolName: "HubSpot AI",
    userEmail: "sarah.johnson@example.com",
    rating: 5,
    comment: "Comprehensive marketing solution. The AI features have made campaign creation much faster.",
    status: "approved"
  },
  {
    toolName: "HubSpot AI",
    userEmail: "james.wilson@example.com",
    rating: 4,
    comment: "Solid platform for marketing automation. The AI content assistant is surprisingly good.",
    status: "approved"
  },

  // Pending Reviews (for testing moderation)
  {
    toolName: "ChatGPT",
    userEmail: "jessica.brown@example.com",
    rating: 3,
    comment: "It's okay but sometimes gives incorrect information. Need to fact-check everything.",
    status: "pending"
  },
  {
    toolName: "Gemini",
    userEmail: "alex.turner@example.com",
    rating: 2,
    comment: "Not as good as other options. Responses feel generic.",
    status: "pending"
  }
];

module.exports = reviewsData;
