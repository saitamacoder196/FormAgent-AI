import express from 'express';
import configValidator from '../utils/configValidator.js';

const router = express.Router();

/**
 * Basic health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'FormAgent AI',
    version: '1.0.0'
  });
});

/**
 * Detailed health check with AI configuration status
 */
router.get('/health/detailed', async (req, res) => {
  try {
    // Get AI configuration
    const aiConfig = {
      provider: process.env.AI_PROVIDER || 'openai',
      apiKey: process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
    };

    // Validate configuration
    const validation = configValidator.validateAIConfig(aiConfig);

    // Test AI service (optional, controlled by query parameter)
    let aiTest = null;
    if (req.query.testAI === 'true') {
      try {
        aiTest = await configValidator.testAIConfig(aiConfig);
      } catch (error) {
        aiTest = {
          success: false,
          error: error.message
        };
      }
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'FormAgent AI',
      version: '1.0.0',
      environment: {
        node_version: process.version,
        platform: process.platform,
        memory_usage: process.memoryUsage()
      },
      ai_configuration: {
        provider: aiConfig.provider,
        has_api_key: !!aiConfig.apiKey,
        has_endpoint: !!aiConfig.endpoint,
        has_deployment: !!aiConfig.deployment,
        validation: {
          is_valid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings
        },
        test_result: aiTest
      },
      database: {
        status: 'connected' // This could be enhanced to actually check DB connection
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * AI configuration test endpoint
 */
router.post('/health/test-ai', async (req, res) => {
  try {
    const aiConfig = {
      provider: process.env.AI_PROVIDER || 'openai',
      apiKey: process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 100
    };

    const testResult = await configValidator.testAIConfig(aiConfig);
    
    res.json({
      timestamp: new Date().toISOString(),
      ai_test: testResult
    });

  } catch (error) {
    res.status(500).json({
      timestamp: new Date().toISOString(),
      error: error.message,
      ai_test: {
        success: false,
        error: error.message
      }
    });
  }
});

export default router;