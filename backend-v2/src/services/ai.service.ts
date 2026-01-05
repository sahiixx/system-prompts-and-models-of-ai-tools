import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Pinecone } from '@pinecone-database/pinecone';
import { logger } from '@/utils/logger';

// OpenAI Client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Anthropic Client
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Pinecone Client
export const pinecone = process.env.PINECONE_API_KEY
  ? new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    })
  : null;

export class AIService {
  /**
   * Generate embeddings for text using OpenAI
   */
  static async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Error generating embeddings:', error);
      throw new Error('Failed to generate embeddings');
    }
  }

  /**
   * Chat completion with GPT-4
   */
  static async chatCompletion(messages: OpenAI.Chat.ChatCompletionMessageParam[], options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: options?.model || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 1000,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      logger.error('Error in chat completion:', error);
      throw new Error('Failed to generate chat completion');
    }
  }

  /**
   * Generate tool recommendations using AI
   */
  static async generateToolRecommendations(
    userPreferences: { type?: string; features?: string[]; usageHistory?: string[] },
    limit = 10
  ): Promise<any[]> {
    try {
      const prompt = `Based on the following user preferences, recommend ${limit} AI coding tools:
      - Preferred Type: ${userPreferences.type || 'Any'}
      - Desired Features: ${userPreferences.features?.join(', ') || 'Any'}
      - Usage History: ${userPreferences.usageHistory?.join(', ') || 'None'}

      Provide recommendations with reasoning in JSON format.`;

      const response = await this.chatCompletion([
        { role: 'system', content: 'You are an AI tools expert providing personalized recommendations.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Semantic search using vector embeddings
   */
  static async semanticSearch(query: string, topK = 10): Promise<any[]> {
    try {
      if (!pinecone) {
        logger.warn('Pinecone not configured, falling back to text search');
        return [];
      }

      // Generate query embedding
      const queryEmbedding = await this.generateEmbeddings(query);

      // Search in Pinecone
      const index = pinecone.index(process.env.PINECONE_INDEX || 'ai-tools-embeddings');
      const queryResponse = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
      });

      return queryResponse.matches?.map(match => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata,
      })) || [];
    } catch (error) {
      logger.error('Error in semantic search:', error);
      return [];
    }
  }

  /**
   * Generate tool description using AI
   */
  static async generateToolDescription(toolName: string, features: string[]): Promise<string> {
    try {
      const prompt = `Generate a concise, compelling description for "${toolName}", an AI coding tool with these features: ${features.join(', ')}. Keep it under 200 words.`;

      return await this.chatCompletion([
        { role: 'system', content: 'You are a technical writer specializing in AI tools.' },
        { role: 'user', content: prompt }
      ]);
    } catch (error) {
      logger.error('Error generating description:', error);
      return '';
    }
  }

  /**
   * Analyze tool comparison
   */
  static async compareTools(tool1: any, tool2: any): Promise<string> {
    try {
      const prompt = `Compare these two AI tools:

      Tool 1: ${tool1.name}
      - Type: ${tool1.type}
      - Features: ${tool1.features?.map((f: any) => f.feature).join(', ')}
      - Pricing: ${tool1.pricing}

      Tool 2: ${tool2.name}
      - Type: ${tool2.type}
      - Features: ${tool2.features?.map((f: any) => f.feature).join(', ')}
      - Pricing: ${tool2.pricing}

      Provide a detailed comparison highlighting strengths, weaknesses, and use cases.`;

      return await this.chatCompletion([
        { role: 'system', content: 'You are an AI tools expert providing objective comparisons.' },
        { role: 'user', content: prompt }
      ], { maxTokens: 2000 });
    } catch (error) {
      logger.error('Error comparing tools:', error);
      return 'Comparison unavailable';
    }
  }

  /**
   * Generate code snippets for tool usage
   */
  static async generateCodeSnippet(toolName: string, language: string): Promise<string> {
    try {
      const prompt = `Generate a code snippet showing how to use "${toolName}" in ${language}. Include setup, basic usage, and a practical example.`;

      return await this.chatCompletion([
        { role: 'system', content: 'You are a senior developer creating clear, production-ready code examples.' },
        { role: 'user', content: prompt }
      ]);
    } catch (error) {
      logger.error('Error generating code snippet:', error);
      return '';
    }
  }

  /**
   * Sentiment analysis for reviews
   */
  static async analyzeReviewSentiment(reviewText: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
    keywords: string[];
  }> {
    try {
      const prompt = `Analyze the sentiment of this tool review and extract key points:
      "${reviewText}"

      Respond in JSON format with: sentiment (positive/neutral/negative), score (0-1), and keywords array.`;

      const response = await this.chatCompletion([
        { role: 'system', content: 'You are a sentiment analysis expert.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      logger.error('Error analyzing sentiment:', error);
      return { sentiment: 'neutral', score: 0.5, keywords: [] };
    }
  }

  /**
   * Generate personalized learning path
   */
  static async generateLearningPath(userSkills: string[], goalTool: string): Promise<any> {
    try {
      const prompt = `Create a personalized learning path for someone with skills in ${userSkills.join(', ')} 
      who wants to master "${goalTool}". Include resources, estimated timeline, and milestones.`;

      const response = await this.chatCompletion([
        { role: 'system', content: 'You are a learning and development expert for AI tools.' },
        { role: 'user', content: prompt }
      ], { maxTokens: 2000 });

      return JSON.parse(response);
    } catch (error) {
      logger.error('Error generating learning path:', error);
      return null;
    }
  }

  /**
   * Auto-complete search suggestions
   */
  static async generateSearchSuggestions(partialQuery: string, limit = 5): Promise<string[]> {
    try {
      const prompt = `Given the partial search query "${partialQuery}", suggest ${limit} complete search queries for AI tools. Return only the array of suggestions.`;

      const response = await this.chatCompletion([
        { role: 'system', content: 'You are a search suggestion engine for AI tools.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      logger.error('Error generating suggestions:', error);
      return [];
    }
  }
}

export default AIService;
