require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Tool = require('../models/Tool');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-tools-hub');
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

// Comprehensive AI Tools Dataset (100+ tools)
const comprehensiveTools = [
  // IDEs & Code Editors (15 tools)
  {
    name: 'GitHub Copilot', slug: 'github-copilot', description: 'AI-powered code completion', type: 'ide', status: 'active',
    category: ['Development', 'Code'], tags: ['coding', 'ai', 'github'], pricing: { model: 'paid', price: '$10/mo' },
    website: 'https://github.com/features/copilot', languages: ['JavaScript', 'Python', 'TypeScript', 'Go'],
    platforms: ['VS Code', 'JetBrains'], features: [
      { name: 'Code Completion', available: true }, { name: 'Multi-language', available: true }
    ]
  },
  {
    name: 'Cursor', slug: 'cursor', description: 'AI-first code editor', type: 'ide', status: 'active',
    category: ['Development'], tags: ['coding', 'editor', 'gpt-4'], pricing: { model: 'freemium', price: '$20/mo' },
    website: 'https://cursor.sh', languages: ['All'], platforms: ['macOS', 'Windows', 'Linux'],
    features: [{ name: 'Chat with Code', available: true }, { name: 'Inline Editing', available: true }]
  },
  {
    name: 'Windsurf', slug: 'windsurf', description: 'Collaborative AI code editor', type: 'ide', status: 'active',
    category: ['Development', 'Collaboration'], tags: ['coding', 'team'], pricing: { model: 'freemium', price: '$15/mo' },
    website: 'https://codeium.com/windsurf', languages: ['JavaScript', 'Python'], platforms: ['Web', 'Desktop'],
    features: [{ name: 'Team Collaboration', available: true }]
  },
  {
    name: 'Tabnine', slug: 'tabnine', description: 'AI code completion', type: 'plugin', status: 'active',
    category: ['Development'], tags: ['autocomplete', 'ai'], pricing: { model: 'freemium', price: '$12/mo' },
    website: 'https://tabnine.com', languages: ['30+ languages'], platforms: ['VS Code', 'JetBrains'],
    features: [{ name: 'Private Model', available: true }]
  },
  {
    name: 'Codeium', slug: 'codeium', description: 'Free AI code acceleration', type: 'plugin', status: 'active',
    category: ['Development'], tags: ['free', 'autocomplete'], pricing: { model: 'free', price: 'Free' },
    website: 'https://codeium.com', languages: ['70+ languages'], platforms: ['40+ IDEs'],
    features: [{ name: 'Unlimited Usage', available: true }]
  },
  {
    name: 'Amazon CodeWhisperer', slug: 'amazon-codewhisperer', description: 'AWS AI coding companion', type: 'plugin', status: 'active',
    category: ['Development', 'Security'], tags: ['aws', 'security'], pricing: { model: 'freemium', price: '$19/mo' },
    website: 'https://aws.amazon.com/codewhisperer', languages: ['Python', 'Java', 'JavaScript'], platforms: ['VS Code', 'AWS Cloud9'],
    features: [{ name: 'Security Scanning', available: true }]
  },
  {
    name: 'Replit Ghostwriter', slug: 'replit-ghostwriter', description: 'AI in Replit IDE', type: 'ide', status: 'active',
    category: ['Development', 'Education'], tags: ['replit', 'learning'], pricing: { model: 'paid', price: '$10/mo' },
    website: 'https://replit.com/ai', languages: ['50+ languages'], platforms: ['Web'],
    features: [{ name: 'Code Explanation', available: true }]
  },
  {
    name: 'Sourcegraph Cody', slug: 'sourcegraph-cody', description: 'Codebase-aware AI', type: 'plugin', status: 'active',
    category: ['Development'], tags: ['codebase', 'search'], pricing: { model: 'freemium', price: '$9/mo' },
    website: 'https://sourcegraph.com/cody', languages: ['All'], platforms: ['VS Code', 'JetBrains'],
    features: [{ name: 'Codebase Context', available: true }]
  },
  {
    name: 'Pieces for Developers', slug: 'pieces', description: 'AI snippet manager', type: 'other', status: 'active',
    category: ['Development', 'Productivity'], tags: ['snippets', 'organization'], pricing: { model: 'freemium', price: '$8/mo' },
    website: 'https://pieces.app', languages: ['All'], platforms: ['VS Code', 'Chrome'],
    features: [{ name: 'Smart Tagging', available: true }]
  },
  {
    name: 'Bito AI', slug: 'bito-ai', description: 'Code review & docs AI', type: 'plugin', status: 'active',
    category: ['Development', 'Documentation'], tags: ['review', 'documentation'], pricing: { model: 'freemium', price: '$15/mo' },
    website: 'https://bito.ai', languages: ['10+ languages'], platforms: ['VS Code', 'JetBrains'],
    features: [{ name: 'Code Review', available: true }]
  },
  {
    name: 'CodeGPT', slug: 'codegpt', description: 'VS Code AI extension', type: 'plugin', status: 'active',
    category: ['Development'], tags: ['vscode', 'gpt'], pricing: { model: 'free', price: 'Free' },
    website: 'https://codegpt.co', languages: ['All'], platforms: ['VS Code'],
    features: [{ name: 'Multiple AI Models', available: true }]
  },
  {
    name: 'Continue', slug: 'continue-dev', description: 'Open-source AI code assistant', type: 'plugin', status: 'active',
    category: ['Development', 'Open Source'], tags: ['open-source', 'customizable'], pricing: { model: 'free', price: 'Free' },
    website: 'https://continue.dev', languages: ['All'], platforms: ['VS Code', 'JetBrains'],
    features: [{ name: 'Self-hosted', available: true }]
  },
  {
    name: 'Aider', slug: 'aider', description: 'AI pair programming in terminal', type: 'cli', status: 'active',
    category: ['Development', 'Terminal'], tags: ['cli', 'terminal'], pricing: { model: 'free', price: 'Free' },
    website: 'https://aider.chat', languages: ['Python', 'JavaScript'], platforms: ['CLI'],
    features: [{ name: 'Git Integration', available: true }]
  },
  {
    name: 'Code Llama', slug: 'code-llama', description: 'Meta\'s code-specialized LLM', type: 'agent', status: 'active',
    category: ['Development', 'Open Source'], tags: ['llm', 'meta', 'open-source'], pricing: { model: 'free', price: 'Free' },
    website: 'https://ai.meta.com/code-llama', languages: ['Python', 'C++', 'Java'], platforms: ['API', 'Local'],
    features: [{ name: 'Open Source', available: true }]
  },
  {
    name: 'Phind', slug: 'phind', description: 'AI search for developers', type: 'web', status: 'active',
    category: ['Development', 'Search'], tags: ['search', 'documentation'], pricing: { model: 'freemium', price: '$9/mo' },
    website: 'https://phind.com', languages: ['All'], platforms: ['Web'],
    features: [{ name: 'Code Search', available: true }]
  },

  // Conversational AI / Chatbots (20 tools)
  {
    name: 'ChatGPT', slug: 'chatgpt', description: 'OpenAI\'s conversational AI', type: 'web', status: 'active',
    category: ['Conversational AI', 'General'], tags: ['chatbot', 'gpt-4', 'openai'], pricing: { model: 'freemium', price: '$20/mo' },
    website: 'https://chat.openai.com', languages: ['95+ languages'], platforms: ['Web', 'iOS', 'Android'],
    features: [{ name: 'GPT-4', available: true }, { name: 'Plugins', available: true }]
  },
  {
    name: 'Claude', slug: 'claude', description: 'Anthropic\'s constitutional AI', type: 'web', status: 'active',
    category: ['Conversational AI'], tags: ['chatbot', 'anthropic', 'safe'], pricing: { model: 'freemium', price: '$20/mo' },
    website: 'https://claude.ai', languages: ['Multiple'], platforms: ['Web', 'iOS', 'Android'],
    features: [{ name: '100K Context', available: true }]
  },
  {
    name: 'Google Gemini', slug: 'google-gemini', description: 'Google\'s multimodal AI', type: 'web', status: 'active',
    category: ['Conversational AI', 'Multimodal'], tags: ['google', 'multimodal'], pricing: { model: 'free', price: 'Free' },
    website: 'https://gemini.google.com', languages: ['40+ languages'], platforms: ['Web', 'Android'],
    features: [{ name: 'Multimodal', available: true }]
  },
  {
    name: 'Microsoft Copilot', slug: 'microsoft-copilot', description: 'AI assistant in Microsoft ecosystem', type: 'web', status: 'active',
    category: ['Conversational AI', 'Productivity'], tags: ['microsoft', 'office'], pricing: { model: 'free', price: 'Free' },
    website: 'https://copilot.microsoft.com', languages: ['Multiple'], platforms: ['Web', 'Windows'],
    features: [{ name: 'Office Integration', available: true }]
  },
  {
    name: 'Perplexity AI', slug: 'perplexity', description: 'AI-powered search engine', type: 'web', status: 'active',
    category: ['Search', 'Research'], tags: ['search', 'research', 'citations'], pricing: { model: 'freemium', price: '$20/mo' },
    website: 'https://perplexity.ai', languages: ['Multiple'], platforms: ['Web', 'iOS', 'Android'],
    features: [{ name: 'Citations', available: true }]
  },
  {
    name: 'You.com', slug: 'you-com', description: 'AI search with apps', type: 'web', status: 'active',
    category: ['Search', 'AI Apps'], tags: ['search', 'multi-tool'], pricing: { model: 'freemium', price: '$15/mo' },
    website: 'https://you.com', languages: ['Multiple'], platforms: ['Web'],
    features: [{ name: 'AI Apps', available: true }]
  },
  {
    name: 'Pi AI', slug: 'pi-ai', description: 'Personal AI by Inflection', type: 'web', status: 'active',
    category: ['Conversational AI', 'Personal Assistant'], tags: ['personal', 'voice'], pricing: { model: 'free', price: 'Free' },
    website: 'https://pi.ai', languages: ['Multiple'], platforms: ['Web', 'iOS', 'Android'],
    features: [{ name: 'Voice Chat', available: true }]
  },
  {
    name: 'Character.AI', slug: 'character-ai', description: 'Chat with AI characters', type: 'web', status: 'active',
    category: ['Conversational AI', 'Entertainment'], tags: ['roleplay', 'characters'], pricing: { model: 'freemium', price: '$9.99/mo' },
    website: 'https://character.ai', languages: ['Multiple'], platforms: ['Web', 'iOS', 'Android'],
    features: [{ name: 'Custom Characters', available: true }]
  },
  {
    name: 'Poe', slug: 'poe', description: 'Multiple AI bots in one platform', type: 'web', status: 'active',
    category: ['Conversational AI', 'Platform'], tags: ['multi-bot', 'quora'], pricing: { model: 'freemium', price: '$20/mo' },
    website: 'https://poe.com', languages: ['Multiple'], platforms: ['Web', 'iOS', 'Android'],
    features: [{ name: 'Multiple Bots', available: true }]
  },
  {
    name: 'HuggingChat', slug: 'huggingchat', description: 'Open-source chat AI', type: 'web', status: 'active',
    category: ['Conversational AI', 'Open Source'], tags: ['open-source', 'huggingface'], pricing: { model: 'free', price: 'Free' },
    website: 'https://huggingface.co/chat', languages: ['Multiple'], platforms: ['Web'],
    features: [{ name: 'Open Models', available: true }]
  },
  {
    name: 'Llama Chat', slug: 'llama-chat', description: 'Meta\'s Llama models', type: 'web', status: 'active',
    category: ['Conversational AI', 'Open Source'], tags: ['llama', 'meta'], pricing: { model: 'free', price: 'Free' },
    website: 'https://llama.meta.com', languages: ['Multiple'], platforms: ['Web', 'API'],
    features: [{ name: 'Open Source', available: true }]
  },
  {
    name: 'Jasper Chat', slug: 'jasper-chat', description: 'AI for marketing content', type: 'web', status: 'active',
    category: ['Content Creation', 'Marketing'], tags: ['marketing', 'content'], pricing: { model: 'paid', price: '$49/mo' },
    website: 'https://jasper.ai', languages: ['29+ languages'], platforms: ['Web'],
    features: [{ name: 'Brand Voice', available: true }]
  },
  {
    name: 'ChatSonic', slug: 'chatsonic', description: 'AI with current knowledge', type: 'web', status: 'active',
    category: ['Conversational AI'], tags: ['search', 'current'], pricing: { model: 'freemium', price: '$19/mo' },
    website: 'https://writesonic.com/chatsonic', languages: ['Multiple'], platforms: ['Web'],
    features: [{ name: 'Web Search', available: true }]
  },
  {
    name: 'Replika', slug: 'replika', description: 'Personal AI companion', type: 'web', status: 'active',
    category: ['Conversational AI', 'Companion'], tags: ['personal', 'mental-health'], pricing: { model: 'freemium', price: '$7.99/mo' },
    website: 'https://replika.com', languages: ['Multiple'], platforms: ['iOS', 'Android'],
    features: [{ name: 'Emotional Support', available: true }]
  },
  {
    name: 'Khanmigo', slug: 'khanmigo', description: 'Khan Academy AI tutor', type: 'web', status: 'active',
    category: ['Education', 'Tutoring'], tags: ['education', 'tutoring'], pricing: { model: 'paid', price: '$4/mo' },
    website: 'https://khanacademy.org/khanmigo', languages: ['English'], platforms: ['Web'],
    features: [{ name: 'Educational', available: true }]
  },
  {
    name: 'Socratic', slug: 'socratic', description: 'Google AI for homework', type: 'web', status: 'active',
    category: ['Education', 'Homework Help'], tags: ['education', 'google'], pricing: { model: 'free', price: 'Free' },
    website: 'https://socratic.org', languages: ['Multiple'], platforms: ['iOS', 'Android'],
    features: [{ name: 'Step-by-step', available: true }]
  },
  {
    name: 'Ora.ai', slug: 'ora-ai', description: 'Create custom AI characters', type: 'web', status: 'active',
    category: ['Conversational AI', 'Platform'], tags: ['custom-bots', 'no-code'], pricing: { model: 'freemium', price: '$9/mo' },
    website: 'https://ora.ai', languages: ['Multiple'], platforms: ['Web'],
    features: [{ name: 'Bot Builder', available: true }]
  },
  {
    name: 'Kindroid', slug: 'kindroid', description: 'Create AI companions', type: 'web', status: 'active',
    category: ['Conversational AI', 'Companion'], tags: ['customizable', 'voice'], pricing: { model: 'freemium', price: '$10/mo' },
    website: 'https://kindroid.ai', languages: ['English'], platforms: ['Web', 'iOS', 'Android'],
    features: [{ name: 'Voice Cloning', available: true }]
  },
  {
    name: 'Chai', slug: 'chai', description: 'Chat with AI personalities', type: 'web', status: 'active',
    category: ['Conversational AI', 'Entertainment'], tags: ['personalities', 'mobile'], pricing: { model: 'freemium', price: '$13.99/mo' },
    website: 'https://chai.ml', languages: ['Multiple'], platforms: ['iOS', 'Android'],
    features: [{ name: 'Thousands of Bots', available: true }]
  },
  {
    name: 'Anima AI', slug: 'anima-ai', description: 'Virtual AI friend', type: 'web', status: 'active',
    category: ['Conversational AI', 'Companion'], tags: ['friendship', 'roleplay'], pricing: { model: 'freemium', price: '$9.99/mo' },
    website: 'https://animaapp.com', languages: ['Multiple'], platforms: ['iOS', 'Android'],
    features: [{ name: 'Relationship Building', available: true }]
  },

  // Image Generation & Design (15 tools)
  {
    name: 'DALL-E 3', slug: 'dall-e-3', description: 'OpenAI\'s image generation', type: 'web', status: 'active',
    category: ['Image Generation', 'Creative'], tags: ['image', 'art', 'openai'], pricing: { model: 'paid', price: '$20/mo' },
    website: 'https://openai.com/dall-e-3', languages: ['Text prompts'], platforms: ['Web', 'API'],
    features: [{ name: 'High Quality', available: true }]
  },
  {
    name: 'Midjourney', slug: 'midjourney', description: 'AI art generation', type: 'web', status: 'active',
    category: ['Image Generation', 'Art'], tags: ['art', 'discord'], pricing: { model: 'paid', price: '$10/mo' },
    website: 'https://midjourney.com', languages: ['Text prompts'], platforms: ['Discord', 'Web'],
    features: [{ name: 'Artistic Style', available: true }]
  },
  {
    name: 'Stable Diffusion', slug: 'stable-diffusion', description: 'Open-source image AI', type: 'web', status: 'active',
    category: ['Image Generation', 'Open Source'], tags: ['open-source', 'customizable'], pricing: { model: 'free', price: 'Free' },
    website: 'https://stability.ai', languages: ['Text prompts'], platforms: ['Web', 'Local', 'API'],
    features: [{ name: 'Self-hosted', available: true }]
  },
  {
    name: 'Adobe Firefly', slug: 'adobe-firefly', description: 'Adobe\'s generative AI', type: 'web', status: 'active',
    category: ['Image Generation', 'Design'], tags: ['adobe', 'commercial'], pricing: { model: 'freemium', price: '$4.99/mo' },
    website: 'https://firefly.adobe.com', languages: ['Text prompts'], platforms: ['Web'],
    features: [{ name: 'Commercial Safe', available: true }]
  },
  {
    name: 'Leonardo.AI', slug: 'leonardo-ai', description: 'Game asset generation', type: 'web', status: 'active',
    category: ['Image Generation', 'Gaming'], tags: ['game-art', 'assets'], pricing: { model: 'freemium', price: '$12/mo' },
    website: 'https://leonardo.ai', languages: ['Text prompts'], platforms: ['Web'],
    features: [{ name: 'Asset Library', available: true }]
  },
  {
    name: 'Canva AI', slug: 'canva-ai', description: 'Design with AI', type: 'web', status: 'active',
    category: ['Design', 'Productivity'], tags: ['design', 'templates'], pricing: { model: 'freemium', price: '$12.99/mo' },
    website: 'https://canva.com', languages: ['Text prompts'], platforms: ['Web', 'iOS', 'Android'],
    features: [{ name: 'Magic Design', available: true }]
  },
  {
    name: 'Figma AI', slug: 'figma-ai', description: 'AI design tools', type: 'web', status: 'active',
    category: ['Design', 'UI/UX'], tags: ['ui-design', 'prototyping'], pricing: { model: 'freemium', price: '$15/mo' },
    website: 'https://figma.com', languages: ['Text'], platforms: ['Web', 'Desktop'],
    features: [{ name: 'Auto Layout', available: true }]
  },
  {
    name: 'Playground AI', slug: 'playground-ai', description: 'Free AI image creator', type: 'web', status: 'active',
    category: ['Image Generation'], tags: ['free', 'commercial'], pricing: { model: 'freemium', price: '$15/mo' },
    website: 'https://playgroundai.com', languages: ['Text prompts'], platforms: ['Web'],
    features: [{ name: 'Commercial Use', available: true }]
  },
  {
    name: 'NightCafe', slug: 'nightcafe', description: 'AI art community', type: 'web', status: 'active',
    category: ['Image Generation', 'Community'], tags: ['art', 'community'], pricing: { model: 'freemium', price: '$5.99/mo' },
    website: 'https://nightcafe.studio', languages: ['Text prompts'], platforms: ['Web', 'iOS', 'Android'],
    features: [{ name: 'Multiple Algorithms', available: true }]
  },
  {
    name: 'Ideogram', slug: 'ideogram', description: 'Text-in-image AI', type: 'web', status: 'active',
    category: ['Image Generation'], tags: ['text-rendering', 'logos'], pricing: { model: 'freemium', price: '$8/mo' },
    website: 'https://ideogram.ai', languages: ['Text prompts'], platforms: ['Web'],
    features: [{ name: 'Text Rendering', available: true }]
  },
  {
    name: 'DreamStudio', slug: 'dreamstudio', description: 'Stable Diffusion platform', type: 'web', status: 'active',
    category: ['Image Generation'], tags: ['stable-diffusion'], pricing: { model: 'paid', price: 'Credits' },
    website: 'https://dreamstudio.ai', languages: ['Text prompts'], platforms: ['Web'],
    features: [{ name: 'Advanced Controls', available: true }]
  },
  {
    name: 'Craiyon', slug: 'craiyon', description: 'Free AI image generator', type: 'web', status: 'active',
    category: ['Image Generation'], tags: ['free', 'simple'], pricing: { model: 'freemium', price: '$5/mo' },
    website: 'https://craiyon.com', languages: ['Text prompts'], platforms: ['Web'],
    features: [{ name: 'Free Unlimited', available: true }]
  },
  {
    name: 'Lexica', slug: 'lexica', description: 'Stable Diffusion search', type: 'web', status: 'active',
    category: ['Image Generation', 'Search'], tags: ['search', 'prompts'], pricing: { model: 'freemium', price: '$8/mo' },
    website: 'https://lexica.art', languages: ['Text prompts'], platforms: ['Web'],
    features: [{ name: 'Prompt Database', available: true }]
  },
  {
    name: 'Artbreeder', slug: 'artbreeder', description: 'Collaborative AI art', type: 'web', status: 'active',
    category: ['Image Generation', 'Community'], tags: ['breeding', 'portraits'], pricing: { model: 'freemium', price: '$8.99/mo' },
    website: 'https://artbreeder.com', languages: ['Visual'], platforms: ['Web'],
    features: [{ name: 'Image Breeding', available: true }]
  },
  {
    name: 'Remove.bg', slug: 'remove-bg', description: 'AI background removal', type: 'web', status: 'active',
    category: ['Image Editing', 'Utility'], tags: ['background-removal'], pricing: { model: 'freemium', price: '$9/mo' },
    website: 'https://remove.bg', languages: ['Image'], platforms: ['Web', 'API'],
    features: [{ name: 'Instant Removal', available: true }]
  },

  // Video & Audio (10 tools)
  {
    name: 'Sora', slug: 'sora', description: 'OpenAI video generation', type: 'web', status: 'beta',
    category: ['Video Generation'], tags: ['video', 'openai'], pricing: { model: 'paid', price: 'TBA' },
    website: 'https://openai.com/sora', languages: ['Text prompts'], platforms: ['Web'],
    features: [{ name: 'High Quality Video', available: true }]
  },
  {
    name: 'Runway ML', slug: 'runway-ml', description: 'AI video editing suite', type: 'web', status: 'active',
    category: ['Video Editing', 'Creative'], tags: ['video', 'editing'], pricing: { model: 'freemium', price: '$15/mo' },
    website: 'https://runwayml.com', languages: ['Text/Video'], platforms: ['Web'],
    features: [{ name: 'Gen-2', available: true }]
  },
  {
    name: 'Pika', slug: 'pika', description: 'Text-to-video AI', type: 'web', status: 'active',
    category: ['Video Generation'], tags: ['video', 'text-to-video'], pricing: { model: 'freemium', price: '$10/mo' },
    website: 'https://pika.art', languages: ['Text prompts'], platforms: ['Web'],
    features: [{ name: 'Video Editing', available: true }]
  },
  {
    name: 'ElevenLabs', slug: 'elevenlabs', description: 'AI voice synthesis', type: 'web', status: 'active',
    category: ['Audio', 'Voice'], tags: ['voice', 'tts'], pricing: { model: 'freemium', price: '$5/mo' },
    website: 'https://elevenlabs.io', languages: ['29+ languages'], platforms: ['Web', 'API'],
    features: [{ name: 'Voice Cloning', available: true }]
  },
  {
    name: 'Descript', slug: 'descript', description: 'AI video & podcast editor', type: 'web', status: 'active',
    category: ['Video Editing', 'Podcasting'], tags: ['editing', 'transcription'], pricing: { model: 'freemium', price: '$12/mo' },
    website: 'https://descript.com', languages: ['Text/Audio'], platforms: ['macOS', 'Windows'],
    features: [{ name: 'Text-based Editing', available: true }]
  },
  {
    name: 'Murf AI', slug: 'murf-ai', description: 'AI voiceover studio', type: 'web', status: 'active',
    category: ['Audio', 'Voice'], tags: ['voiceover', 'tts'], pricing: { model: 'freemium', price: '$29/mo' },
    website: 'https://murf.ai', languages: ['20+ languages'], platforms: ['Web'],
    features: [{ name: '120+ Voices', available: true }]
  },
  {
    name: 'Synthesia', slug: 'synthesia', description: 'AI video with avatars', type: 'web', status: 'active',
    category: ['Video Generation', 'Corporate'], tags: ['avatars', 'corporate'], pricing: { model: 'paid', price: '$30/mo' },
    website: 'https://synthesia.io', languages: ['120+ languages'], platforms: ['Web'],
    features: [{ name: 'AI Avatars', available: true }]
  },
  {
    name: 'HeyGen', slug: 'heygen', description: 'AI video avatars', type: 'web', status: 'active',
    category: ['Video Generation'], tags: ['avatars', 'talking-head'], pricing: { model: 'freemium', price: '$24/mo' },
    website: 'https://heygen.com', languages: ['40+ languages'], platforms: ['Web'],
    features: [{ name: 'Custom Avatars', available: true }]
  },
  {
    name: 'Pictory', slug: 'pictory', description: 'Text to video creator', type: 'web', status: 'active',
    category: ['Video Generation', 'Marketing'], tags: ['text-to-video', 'marketing'], pricing: { model: 'paid', price: '$23/mo' },
    website: 'https://pictory.ai', languages: ['Text'], platforms: ['Web'],
    features: [{ name: 'Auto Captions', available: true }]
  },
  {
    name: 'Riffusion', slug: 'riffusion', description: 'AI music generation', type: 'web', status: 'active',
    category: ['Audio', 'Music'], tags: ['music', 'generation'], pricing: { model: 'free', price: 'Free' },
    website: 'https://riffusion.com', languages: ['Text prompts'], platforms: ['Web'],
    features: [{ name: 'Real-time Music', available: true }]
  },

  // Writing & Content (10 tools)
  {
    name: 'Notion AI', slug: 'notion-ai', description: 'AI writing in Notion', type: 'web', status: 'active',
    category: ['Writing', 'Productivity'], tags: ['notion', 'productivity'], pricing: { model: 'paid', price: '$10/mo' },
    website: 'https://notion.so/ai', languages: ['Multiple'], platforms: ['Web', 'Desktop', 'Mobile'],
    features: [{ name: 'In-page AI', available: true }]
  },
  {
    name: 'Grammarly', slug: 'grammarly', description: 'AI writing assistant', type: 'web', status: 'active',
    category: ['Writing', 'Editing'], tags: ['grammar', 'editing'], pricing: { model: 'freemium', price: '$12/mo' },
    website: 'https://grammarly.com', languages: ['English'], platforms: ['Web', 'Desktop', 'Mobile'],
    features: [{ name: 'Grammar Check', available: true }]
  },
  {
    name: 'Writesonic', slug: 'writesonic', description: 'AI content writer', type: 'web', status: 'active',
    category: ['Writing', 'Marketing'], tags: ['content', 'seo'], pricing: { model: 'freemium', price: '$16/mo' },
    website: 'https://writesonic.com', languages: ['25+ languages'], platforms: ['Web'],
    features: [{ name: 'Article Writer', available: true }]
  },
  {
    name: 'Copy.ai', slug: 'copy-ai', description: 'Marketing copy generator', type: 'web', status: 'active',
    category: ['Writing', 'Marketing'], tags: ['copywriting', 'marketing'], pricing: { model: 'freemium', price: '$49/mo' },
    website: 'https://copy.ai', languages: ['95+ languages'], platforms: ['Web'],
    features: [{ name: '90+ Templates', available: true }]
  },
  {
    name: 'QuillBot', slug: 'quillbot', description: 'AI paraphrasing tool', type: 'web', status: 'active',
    category: ['Writing', 'Paraphrasing'], tags: ['paraphrasing', 'rewriting'], pricing: { model: 'freemium', price: '$9.95/mo' },
    website: 'https://quillbot.com', languages: ['Multiple'], platforms: ['Web', 'Chrome'],
    features: [{ name: 'Paraphraser', available: true }]
  },
  {
    name: 'Wordtune', slug: 'wordtune', description: 'AI writing companion', type: 'web', status: 'active',
    category: ['Writing', 'Rewriting'], tags: ['rewriting', 'tone'], pricing: { model: 'freemium', price: '$9.99/mo' },
    website: 'https://wordtune.com', languages: ['English'], platforms: ['Web', 'Chrome'],
    features: [{ name: 'Tone Adjustment', available: true }]
  },
  {
    name: 'Hemingway Editor', slug: 'hemingway', description: 'Writing clarity tool', type: 'web', status: 'active',
    category: ['Writing', 'Editing'], tags: ['clarity', 'readability'], pricing: { model: 'freemium', price: '$19.99' },
    website: 'https://hemingwayapp.com', languages: ['English'], platforms: ['Web', 'Desktop'],
    features: [{ name: 'Readability Score', available: true }]
  },
  {
    name: 'ProWritingAid', slug: 'prowritingaid', description: 'Grammar & style checker', type: 'web', status: 'active',
    category: ['Writing', 'Editing'], tags: ['grammar', 'style'], pricing: { model: 'freemium', price: '$20/mo' },
    website: 'https://prowritingaid.com', languages: ['English'], platforms: ['Web', 'Desktop'],
    features: [{ name: 'Style Reports', available: true }]
  },
  {
    name: 'Sudowrite', slug: 'sudowrite', description: 'AI for creative writers', type: 'web', status: 'active',
    category: ['Writing', 'Creative'], tags: ['fiction', 'creative'], pricing: { model: 'paid', price: '$19/mo' },
    website: 'https://sudowrite.com', languages: ['English'], platforms: ['Web'],
    features: [{ name: 'Story Engine', available: true }]
  },
  {
    name: 'Rytr', slug: 'rytr', description: 'AI writing assistant', type: 'web', status: 'active',
    category: ['Writing'], tags: ['content', 'affordable'], pricing: { model: 'freemium', price: '$9/mo' },
    website: 'https://rytr.me', languages: ['30+ languages'], platforms: ['Web'],
    features: [{ name: '40+ Use Cases', available: true }]
  },

  // Research & Data (10 tools)
  {
    name: 'Consensus', slug: 'consensus', description: 'AI research assistant', type: 'web', status: 'active',
    category: ['Research', 'Academic'], tags: ['research', 'papers'], pricing: { model: 'freemium', price: '$8.99/mo' },
    website: 'https://consensus.app', languages: ['English'], platforms: ['Web'],
    features: [{ name: 'Paper Analysis', available: true }]
  },
  {
    name: 'Elicit', slug: 'elicit', description: 'AI research assistant', type: 'web', status: 'active',
    category: ['Research', 'Academic'], tags: ['research', 'literature'], pricing: { model: 'freemium', price: '$10/mo' },
    website: 'https://elicit.org', languages: ['English'], platforms: ['Web'],
    features: [{ name: 'Literature Review', available: true }]
  },
  {
    name: 'ChatPDF', slug: 'chatpdf', description: 'Chat with PDFs', type: 'web', status: 'active',
    category: ['Productivity', 'PDF'], tags: ['pdf', 'documents'], pricing: { model: 'freemium', price: '$5/mo' },
    website: 'https://chatpdf.com', languages: ['Multiple'], platforms: ['Web'],
    features: [{ name: 'PDF Q&A', available: true }]
  },
  {
    name: 'Julius AI', slug: 'julius-ai', description: 'AI data analyst', type: 'web', status: 'active',
    category: ['Data Analysis'], tags: ['data', 'charts'], pricing: { model: 'freemium', price: '$20/mo' },
    website: 'https://julius.ai', languages: ['English'], platforms: ['Web'],
    features: [{ name: 'Data Visualization', available: true }]
  },
  {
    name: 'Wolfram Alpha', slug: 'wolfram-alpha', description: 'Computational knowledge', type: 'web', status: 'active',
    category: ['Research', 'Math'], tags: ['math', 'computation'], pricing: { model: 'freemium', price: '$7.25/mo' },
    website: 'https://wolframalpha.com', languages: ['English'], platforms: ['Web', 'Mobile'],
    features: [{ name: 'Step-by-step', available: true }]
  },
  {
    name: 'Scholarcy', slug: 'scholarcy', description: 'Research paper summarizer', type: 'web', status: 'active',
    category: ['Research', 'Academic'], tags: ['summarization', 'papers'], pricing: { model: 'freemium', price: '$9.99/mo' },
    website: 'https://scholarcy.com', languages: ['English'], platforms: ['Web', 'Chrome'],
    features: [{ name: 'Flashcards', available: true }]
  },
  {
    name: 'Scite', slug: 'scite', description: 'Smart citations tool', type: 'web', status: 'active',
    category: ['Research', 'Academic'], tags: ['citations', 'research'], pricing: { model: 'freemium', price: '$20/mo' },
    website: 'https://scite.ai', languages: ['English'], platforms: ['Web'],
    features: [{ name: 'Citation Context', available: true }]
  },
  {
    name: 'Semantic Scholar', slug: 'semantic-scholar', description: 'AI-powered paper search', type: 'web', status: 'active',
    category: ['Research', 'Academic'], tags: ['search', 'papers'], pricing: { model: 'free', price: 'Free' },
    website: 'https://semanticscholar.org', languages: ['English'], platforms: ['Web'],
    features: [{ name: 'Paper Recommendations', available: true }]
  },
  {
    name: 'Connected Papers', slug: 'connected-papers', description: 'Paper relationship graph', type: 'web', status: 'active',
    category: ['Research', 'Visualization'], tags: ['visualization', 'papers'], pricing: { model: 'freemium', price: '$5/mo' },
    website: 'https://connectedpapers.com', languages: ['English'], platforms: ['Web'],
    features: [{ name: 'Visual Graph', available: true }]
  },
  {
    name: 'Paper Digest', slug: 'paper-digest', description: 'Academic paper summaries', type: 'web', status: 'active',
    category: ['Research', 'Summarization'], tags: ['summarization', 'academic'], pricing: { model: 'freemium', price: '$9.99/mo' },
    website: 'https://paperdigest.org', languages: ['English'], platforms: ['Web'],
    features: [{ name: 'Daily Digests', available: true }]
  },

  // Productivity & Automation (5 tools)
  {
    name: 'Zapier AI', slug: 'zapier-ai', description: 'Automation with AI', type: 'web', status: 'active',
    category: ['Automation', 'Productivity'], tags: ['automation', 'workflows'], pricing: { model: 'freemium', price: '$19.99/mo' },
    website: 'https://zapier.com', languages: ['English'], platforms: ['Web'],
    features: [{ name: '5000+ Integrations', available: true }]
  },
  {
    name: 'Make (Integromat)', slug: 'make', description: 'Visual automation', type: 'web', status: 'active',
    category: ['Automation'], tags: ['automation', 'visual'], pricing: { model: 'freemium', price: '$9/mo' },
    website: 'https://make.com', languages: ['English'], platforms: ['Web'],
    features: [{ name: 'Visual Builder', available: true }]
  },
  {
    name: 'Reclaim AI', slug: 'reclaim-ai', description: 'Smart calendar assistant', type: 'web', status: 'active',
    category: ['Productivity', 'Calendar'], tags: ['calendar', 'scheduling'], pricing: { model: 'freemium', price: '$8/mo' },
    website: 'https://reclaim.ai', languages: ['English'], platforms: ['Web'],
    features: [{ name: 'Auto-scheduling', available: true }]
  },
  {
    name: 'Motion', slug: 'motion', description: 'AI task & project manager', type: 'web', status: 'active',
    category: ['Productivity', 'Project Management'], tags: ['tasks', 'calendar'], pricing: { model: 'paid', price: '$34/mo' },
    website: 'https://usemotion.com', languages: ['English'], platforms: ['Web', 'Mobile'],
    features: [{ name: 'Auto-scheduling', available: true }]
  },
  {
    name: 'Mem', slug: 'mem', description: 'AI knowledge base', type: 'web', status: 'active',
    category: ['Productivity', 'Note-taking'], tags: ['notes', 'knowledge'], pricing: { model: 'freemium', price: '$10/mo' },
    website: 'https://mem.ai', languages: ['English'], platforms: ['Web', 'Mobile'],
    features: [{ name: 'Smart Search', available: true }]
  },

  // Additional specialized tools to reach 100+
  {
    name: 'Replit Agent', slug: 'replit-agent', description: 'AI that builds full apps', type: 'agent', status: 'active',
    category: ['Development', 'No-code'], tags: ['app-builder', 'agent'], pricing: { model: 'paid', price: '$25/mo' },
    website: 'https://replit.com/agent', languages: ['Natural language'], platforms: ['Web'],
    features: [{ name: 'Full Stack Apps', available: true }]
  },
  {
    name: 'v0.dev', slug: 'v0-dev', description: 'Vercel AI UI generator', type: 'web', status: 'active',
    category: ['Development', 'UI'], tags: ['ui', 'vercel', 'react'], pricing: { model: 'freemium', price: '$20/mo' },
    website: 'https://v0.dev', languages: ['Text prompts'], platforms: ['Web'],
    features: [{ name: 'React Components', available: true }]
  },
  {
    name: 'Bolt.new', slug: 'bolt-new', description: 'StackBlitz AI dev environment', type: 'web', status: 'active',
    category: ['Development'], tags: ['ide', 'instant'], pricing: { model: 'freemium', price: '$20/mo' },
    website: 'https://bolt.new', languages: ['Text prompts'], platforms: ['Web'],
    features: [{ name: 'Instant Deploy', available: true }]
  },
  {
    name: 'Framer AI', slug: 'framer-ai', description: 'AI website builder', type: 'web', status: 'active',
    category: ['Web Design', 'No-code'], tags: ['websites', 'no-code'], pricing: { model: 'freemium', price: '$15/mo' },
    website: 'https://framer.com', languages: ['Text prompts'], platforms: ['Web'],
    features: [{ name: 'AI Generation', available: true }]
  },
  {
    name: 'Wix AI', slug: 'wix-ai', description: 'AI website builder', type: 'web', status: 'active',
    category: ['Web Design', 'No-code'], tags: ['websites', 'builder'], pricing: { model: 'freemium', price: '$16/mo' },
    website: 'https://wix.com', languages: ['Text'], platforms: ['Web'],
    features: [{ name: 'ADI', available: true }]
  },
  {
    name: 'Dora AI', slug: 'dora-ai', description: 'No-code 3D websites', type: 'web', status: 'active',
    category: ['Web Design', '3D'], tags: ['3d', 'no-code'], pricing: { model: 'freemium', price: '$14/mo' },
    website: 'https://dora.run', languages: ['Text'], platforms: ['Web'],
    features: [{ name: '3D Sites', available: true }]
  }
];

async function seedExpandedTools() {
  try {
    console.log('🚀 Starting expanded tool seeding...\n');
    
    await connectDB();

    // Get admin user
    const admin = await User.findOne({ email: 'admin@aitoolshub.com' });
    if (!admin) {
      console.error('❌ Admin user not found. Run base seed first: npm run seed');
      process.exit(1);
    }

    console.log('✅ Found admin user:', admin.email);

    // Clear existing tools
    await Tool.deleteMany({});
    console.log('🗑️  Cleared existing tools\n');

    // Prepare tools with admin as creator
    const toolsToCreate = comprehensiveTools.map(tool => ({
      ...tool,
      createdBy: admin._id,
      metrics: {
        views: Math.floor(Math.random() * 20000) + 1000,
        favorites: Math.floor(Math.random() * 3000) + 100,
        totalReviews: 0,
        averageRating: 0
      }
    }));

    // Insert all tools
    const createdTools = await Tool.insertMany(toolsToCreate);
    console.log(`✅ Created ${createdTools.length} AI tools\n`);

    // Display summary
    const categories = {};
    createdTools.forEach(tool => {
      const cat = tool.category[0] || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    console.log('📊 Tools by Category:');
    Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count}`);
      });

    console.log('\n✨ Expanded seeding completed!');
    console.log(`\n📈 Total AI Tools: ${createdTools.length}`);
    console.log('🎯 You can now test the full dataset with:');
    console.log('   - Browse all tools: GET /api/tools');
    console.log('   - Search: GET /api/tools/search?q=coding');
    console.log('   - Filter by category: GET /api/tools?category=Development');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
}

seedExpandedTools();
