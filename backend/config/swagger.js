const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Tools Hub API',
      version: '2.0.0',
      description: 'Comprehensive API documentation for AI Tools Hub - A full-stack platform for discovering, reviewing, and managing AI tools',
      contact: {
        name: 'AI Tools Hub Team',
        url: 'https://github.com/sahiixx/system-prompts-and-models-of-ai-tools',
        email: 'support@aitoolshub.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.aitoolshub.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            role: { type: 'string', enum: ['user', 'admin', 'moderator'], example: 'user' },
            avatar: { type: 'string', example: 'https://example.com/avatar.jpg' },
            isVerified: { type: 'boolean', example: true },
            preferences: {
              type: 'object',
              properties: {
                theme: { type: 'string', enum: ['dark', 'light', 'auto'], example: 'dark' },
                emailNotifications: { type: 'boolean', example: true },
                language: { type: 'string', example: 'en' }
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Tool: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'ChatGPT' },
            description: { type: 'string', example: 'Advanced AI chatbot for conversations' },
            category: { type: 'string', example: 'Text Generation' },
            url: { type: 'string', format: 'uri', example: 'https://chat.openai.com' },
            pricing: { type: 'string', enum: ['Free', 'Freemium', 'Paid', 'Trial'], example: 'Freemium' },
            features: { type: 'array', items: { type: 'string' } },
            averageRating: { type: 'number', format: 'float', example: 4.5 },
            totalReviews: { type: 'integer', example: 128 },
            views: { type: 'integer', example: 5420 },
            status: { type: 'string', enum: ['active', 'inactive', 'pending'], example: 'active' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Review: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            userId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            toolId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
            comment: { type: 'string', example: 'Excellent tool!' },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'], example: 'approved' },
            helpful: { type: 'integer', example: 15 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'An error occurred' },
            error: { type: 'string', example: 'Detailed error message' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object' }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      { name: 'Authentication', description: 'User authentication and registration' },
      { name: 'Tools', description: 'AI tools management' },
      { name: 'Reviews', description: 'Tool reviews and ratings' },
      { name: 'Favorites', description: 'User favorites management' },
      { name: 'Collections', description: 'Tool collections' },
      { name: 'Analytics', description: 'Platform analytics' },
      { name: 'Admin', description: 'Admin operations (requires admin role)' },
      { name: 'Export', description: 'Data export functionality' },
      { name: 'Users', description: 'User management' }
    ]
  },
  apis: ['./routes/*.js', './server.js'] // Path to API routes
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerSpec };
