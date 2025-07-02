import logger from './logger.js';

/**
 * Validate AI configuration and provide debugging information
 */
export function validateAIConfig(config) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    info: []
  };

  // Check provider
  if (!config.provider) {
    validation.errors.push('AI provider not specified');
    validation.isValid = false;
  } else {
    validation.info.push(`Provider: ${config.provider}`);
  }

  // Validate based on provider
  if (config.provider === 'azure') {
    // Azure OpenAI validation
    if (!config.apiKey || config.apiKey === 'undefined' || config.apiKey === 'null') {
      validation.errors.push('Azure OpenAI API key not provided');
      validation.isValid = false;
    } else {
      validation.info.push('API key provided');
    }

    if (!config.endpoint || config.endpoint === 'undefined' || config.endpoint === 'null') {
      validation.errors.push('Azure OpenAI endpoint not provided');
      validation.isValid = false;
    } else {
      validation.info.push(`Endpoint: ${config.endpoint}`);
      
      // Check endpoint format
      if (!config.endpoint.includes('openai.azure.com')) {
        validation.warnings.push('Endpoint does not appear to be Azure OpenAI format');
      }
      
      // Check if endpoint ends with slash
      if (!config.endpoint.endsWith('/')) {
        validation.warnings.push('Endpoint should end with a slash (/)');
      }
    }

    if (!config.deployment || config.deployment === 'undefined' || config.deployment === 'null') {
      validation.errors.push('Azure OpenAI deployment name not provided');
      validation.isValid = false;
    } else {
      validation.info.push(`Deployment: ${config.deployment}`);
    }

    if (!config.apiVersion) {
      validation.warnings.push('Azure OpenAI API version not specified, using default');
    } else {
      validation.info.push(`API Version: ${config.apiVersion}`);
    }

  } else if (config.provider === 'openai') {
    // OpenAI validation
    if (!config.apiKey || config.apiKey === 'undefined' || config.apiKey === 'null') {
      validation.errors.push('OpenAI API key not provided');
      validation.isValid = false;
    } else {
      validation.info.push('OpenAI API key provided');
    }

    if (!config.model) {
      validation.warnings.push('OpenAI model not specified, using default gpt-3.5-turbo');
      config.model = 'gpt-3.5-turbo'; // Set default
    } else {
      validation.info.push(`Model: ${config.model}`);
    }
  } else {
    validation.errors.push(`Unknown AI provider: ${config.provider}`);
    validation.isValid = false;
  }

  // Common validations
  if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
    validation.warnings.push('Temperature should be between 0 and 2');
  }

  if (config.maxTokens && config.maxTokens > 4096) {
    validation.warnings.push('Max tokens is very high, may cause slower responses');
  }

  return validation;
}

/**
 * Test AI configuration by making a simple request
 */
export async function testAIConfig(config) {
  try {
    logger.info('Testing AI configuration...', { provider: config.provider });
    
    // Validate config first
    const validation = validateAIConfig(config);
    if (!validation.isValid) {
      return {
        success: false,
        error: 'Configuration validation failed',
        details: validation.errors,
        validation
      };
    }

    // Try to initialize client
    let client;
    if (config.provider === 'azure') {
      const { AzureOpenAI } = await import('openai');
      client = new AzureOpenAI({
        apiKey: config.apiKey,
        endpoint: config.endpoint,
        apiVersion: config.apiVersion || '2024-02-15-preview'
      });
    } else {
      const { default: OpenAI } = await import('openai');
      client = new OpenAI({
        apiKey: config.apiKey
      });
    }

    // Make a simple test request
    const completion = await client.chat.completions.create({
      model: config.provider === 'azure' ? config.deployment : (config.model || 'gpt-3.5-turbo'),
      messages: [
        {
          role: 'user',
          content: 'Hello, this is a test message. Please respond with "Test successful".'
        }
      ],
      max_tokens: 50,
      temperature: 0.1
    });

    const response = completion.choices[0].message.content;
    logger.info('AI configuration test successful', { 
      provider: config.provider,
      responseLength: response?.length
    });

    return {
      success: true,
      response,
      validation,
      usage: completion.usage
    };

  } catch (error) {
    logger.logError(error, { context: 'testAIConfig' });
    
    // Provide specific error messages for common issues
    let errorMessage = error.message;
    let suggestions = [];

    if (error.status === 404) {
      errorMessage = 'Resource not found - check deployment name and endpoint';
      suggestions.push('Verify the Azure OpenAI deployment name is correct');
      suggestions.push('Check that the endpoint URL is correct');
      suggestions.push('Ensure the deployment is deployed and active in Azure');
    } else if (error.status === 401) {
      errorMessage = 'Unauthorized - check API key';
      suggestions.push('Verify the API key is correct and active');
      suggestions.push('Check that the key has access to the specified resource');
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded';
      suggestions.push('Wait a moment and try again');
      suggestions.push('Check your quota and usage limits');
    }

    return {
      success: false,
      error: errorMessage,
      originalError: error.message,
      status: error.status,
      suggestions,
      validation: validateAIConfig(config)
    };
  }
}

/**
 * Log configuration status for debugging
 */
export function logConfigStatus(config, testResult = null) {
  const validation = validateAIConfig(config);
  
  logger.info('AI Configuration Status', {
    isValid: validation.isValid,
    provider: config.provider,
    hasApiKey: !!config.apiKey,
    hasEndpoint: !!config.endpoint,
    hasDeployment: !!config.deployment,
    errors: validation.errors,
    warnings: validation.warnings
  });

  if (validation.errors.length > 0) {
    validation.errors.forEach(error => {
      logger.error(`Configuration error: ${error}`);
    });
  }

  if (validation.warnings.length > 0) {
    validation.warnings.forEach(warning => {
      logger.warn(`Configuration warning: ${warning}`);
    });
  }

  if (testResult) {
    if (testResult.success) {
      logger.info('AI service test passed', {
        provider: config.provider,
        responseReceived: !!testResult.response
      });
    } else {
      logger.error('AI service test failed', {
        error: testResult.error,
        suggestions: testResult.suggestions
      });
    }
  }
}

export default {
  validateAIConfig,
  testAIConfig,
  logConfigStatus
};