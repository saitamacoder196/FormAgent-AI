import FormBuilderAgent from '../agents/formBuilderAgent.js';
import ChatAssistantAgent from '../agents/chatAssistantAgent.js';
import logger from '../utils/logger.js';

class LangChainAgentService {
  constructor() {
    this.aiProvider = process.env.AI_PROVIDER || 'azure';
    this.llmConfig = null;
    this.formBuilderAgent = null;
    this.chatAssistantAgent = null;
    this.initialized = false;
    
    this.initializeService();
  }

  async initializeService() {
    try {
      // Initialize LLM configuration
      this.initializeLLMConfig();
      
      // Initialize agents
      this.formBuilderAgent = new FormBuilderAgent(this.llmConfig);
      this.chatAssistantAgent = new ChatAssistantAgent(this.llmConfig);
      
      this.initialized = true;
      
      logger.info('LangChain Agent Service initialized successfully', {
        provider: this.aiProvider,
        hasFormBuilder: !!this.formBuilderAgent,
        hasChatAssistant: !!this.chatAssistantAgent
      });
    } catch (error) {
      logger.logError(error, { context: 'LangChainAgentService.initializeService' });
      this.initialized = false;
    }
  }

  initializeLLMConfig() {
    try {
      if (this.aiProvider === 'azure') {
        if (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_API_KEY) {
          throw new Error('Azure OpenAI credentials not configured');
        }

        this.llmConfig = {
          model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-35-turbo',
          azureApiKey: process.env.AZURE_OPENAI_API_KEY,
          azureApiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
          azureInstanceName: this.extractInstanceName(process.env.AZURE_OPENAI_ENDPOINT),
          azureDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
          temperature: parseFloat(process.env.AZURE_OPENAI_TEMPERATURE) || 0.7,
          maxTokens: parseInt(process.env.AZURE_OPENAI_MAX_TOKENS) || 2000
        };
        
      } else if (this.aiProvider === 'openai') {
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OpenAI API key not configured');
        }

        this.llmConfig = {
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          apiKey: process.env.OPENAI_API_KEY,
          temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
          maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000
        };
        
      } else {
        throw new Error(`Unsupported AI provider: ${this.aiProvider}`);
      }

      logger.info('LLM configuration initialized successfully', { provider: this.aiProvider });
    } catch (error) {
      logger.logError(error, { context: 'LangChainAgentService.initializeLLMConfig' });
      throw error;
    }
  }

  extractInstanceName(endpoint) {
    // Extract instance name from Azure OpenAI endpoint
    // Format: https://your-resource.openai.azure.com/
    const match = endpoint.match(/https:\/\/([^.]+)\.openai\.azure\.com/);
    return match ? match[1] : null;
  }

  /**
   * Form Generation Methods
   */
  async generateForm(description, requirements = {}) {
    this.ensureInitialized();
    
    try {
      logger.info('Generating form with LangChain agents', { 
        description: description.substring(0, 100),
        requirements 
      });

      const result = await this.formBuilderAgent.generateForm(description, requirements);
      
      logger.info('Form generation completed successfully');
      return result;
    } catch (error) {
      logger.logError(error, { context: 'LangChainAgentService.generateForm' });
      throw new Error(`LangChain form generation failed: ${error.message}`);
    }
  }

  async optimizeForm(existingForm, goals = ['improve-ux']) {
    this.ensureInitialized();
    
    try {
      logger.info('Optimizing form with LangChain agents', { 
        formTitle: existingForm.title,
        goals 
      });

      const result = await this.formBuilderAgent.optimizeForm(existingForm, goals);
      
      logger.info('Form optimization completed successfully');
      return result;
    } catch (error) {
      logger.logError(error, { context: 'LangChainAgentService.optimizeForm' });
      throw new Error(`LangChain form optimization failed: ${error.message}`);
    }
  }

  async validateForm(formData) {
    this.ensureInitialized();
    
    try {
      logger.info('Validating form with LangChain agents', { 
        formTitle: formData.title 
      });

      const result = await this.formBuilderAgent.validateForm(formData);
      
      logger.info('Form validation completed successfully');
      return result;
    } catch (error) {
      logger.logError(error, { context: 'LangChainAgentService.validateForm' });
      throw new Error(`LangChain form validation failed: ${error.message}`);
    }
  }

  /**
   * Chat Methods
   */
  async handleChatMessage(message, conversationId, context = {}) {
    this.ensureInitialized();
    
    try {
      logger.info('Processing chat message with LangChain agents', { 
        conversationId,
        messageLength: message.length 
      });

      const result = await this.chatAssistantAgent.handleChatMessage(
        message, 
        conversationId, 
        context
      );
      
      logger.info('Chat message processed successfully');
      return result;
    } catch (error) {
      logger.logError(error, { context: 'LangChainAgentService.handleChatMessage' });
      
      // Return fallback response
      return {
        response: "Xin lỗi, tôi đang gặp khó khăn kỹ thuật. Vui lòng thử lại.",
        conversationId,
        timestamp: new Date().toISOString(),
        error: true
      };
    }
  }

  async handleKnowledgeQuery(query, domain = 'general') {
    this.ensureInitialized();
    
    try {
      logger.info('Processing knowledge query with LangChain agents', { 
        query: query.substring(0, 100),
        domain 
      });

      const result = await this.chatAssistantAgent.handleKnowledgeQuery(query, domain);
      
      logger.info('Knowledge query processed successfully');
      return result;
    } catch (error) {
      logger.logError(error, { context: 'LangChainAgentService.handleKnowledgeQuery' });
      throw new Error(`LangChain knowledge query failed: ${error.message}`);
    }
  }

  async analyzeConversation(conversationId) {
    this.ensureInitialized();
    
    try {
      const result = await this.chatAssistantAgent.analyzeConversation(conversationId);
      return result;
    } catch (error) {
      logger.logError(error, { context: 'LangChainAgentService.analyzeConversation' });
      throw new Error(`LangChain conversation analysis failed: ${error.message}`);
    }
  }

  async getConversationSummary(conversationId) {
    this.ensureInitialized();
    
    try {
      const result = await this.chatAssistantAgent.getConversationSummary(conversationId);
      return result;
    } catch (error) {
      logger.logError(error, { context: 'LangChainAgentService.getConversationSummary' });
      throw new Error(`LangChain conversation summary failed: ${error.message}`);
    }
  }

  /**
   * Utility Methods
   */
  isEnabled() {
    return this.initialized && !!this.llmConfig;
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('LangChain Agent Service not initialized');
    }
  }

  getServiceInfo() {
    return {
      service: 'LangChain Agents',
      provider: this.aiProvider,
      initialized: this.initialized,
      hasFormBuilder: !!this.formBuilderAgent,
      hasChatAssistant: !!this.chatAssistantAgent,
      llmModel: this.llmConfig?.model,
      temperature: this.llmConfig?.temperature,
      maxTokens: this.llmConfig?.maxTokens
    };
  }

  getStatistics() {
    if (!this.initialized) {
      return { error: 'Service not initialized' };
    }

    return {
      service: 'LangChain Agents',
      formBuilder: this.formBuilderAgent ? 'available' : 'unavailable',
      chatAssistant: this.chatAssistantAgent ? 'available' : 'unavailable',
      chatStats: this.chatAssistantAgent ? 
        this.chatAssistantAgent.getStatistics() : null,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Agent Management
   */
  getFormBuilderAgent() {
    this.ensureInitialized();
    return this.formBuilderAgent;
  }

  getChatAssistantAgent() {
    this.ensureInitialized();
    return this.chatAssistantAgent;
  }

  /**
   * Health Check
   */
  async healthCheck() {
    try {
      if (!this.initialized) {
        return {
          status: 'unhealthy',
          reason: 'Service not initialized',
          timestamp: new Date().toISOString()
        };
      }

      // Test a simple operation
      const testResult = await this.handleChatMessage(
        'Xin chào, đây là health check', 
        'health_check_conversation'
      );

      return {
        status: 'healthy',
        service: 'LangChain Agents',
        provider: this.aiProvider,
        agents: {
          formBuilder: !!this.formBuilderAgent,
          chatAssistant: !!this.chatAssistantAgent
        },
        testResponse: !!testResult.response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.logError(error, { context: 'LangChainAgentService.healthCheck' });
      
      return {
        status: 'unhealthy',
        reason: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.chatAssistantAgent) {
      // Clean up conversation memories
      this.chatAssistantAgent.cleanup();
      
      const stats = this.chatAssistantAgent.getStatistics();
      logger.info('Cleaning up LangChain Agent Service', { stats });
    }
    
    this.initialized = false;
    logger.info('LangChain Agent Service cleaned up');
  }

  /**
   * Clear specific conversation
   */
  clearConversation(conversationId) {
    if (this.chatAssistantAgent) {
      this.chatAssistantAgent.clearConversationHistory(conversationId);
      logger.info('Conversation cleared', { conversationId });
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(conversationId) {
    this.ensureInitialized();
    
    try {
      const memory = this.chatAssistantAgent.getConversationMemory(conversationId);
      const chatHistory = await memory.chatHistory.getMessages();
      
      return {
        conversationId,
        messages: chatHistory.map(msg => ({
          type: msg._getType(),
          content: msg.content,
          timestamp: msg.timestamp || new Date().toISOString()
        })),
        messageCount: chatHistory.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.logError(error, { context: 'LangChainAgentService.getConversationHistory' });
      return {
        conversationId,
        messages: [],
        messageCount: 0,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export default new LangChainAgentService();