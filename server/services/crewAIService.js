import FormBuilderAgent from '../agents/formBuilderAgent.js';
import ChatAssistantAgent from '../agents/chatAssistantAgent.js';
import logger from '../utils/logger.js';

class EnhancedAgentService {
  constructor() {
    this.aiProvider = process.env.AI_PROVIDER || 'azure';
    this.config = null;
    this.formBuilderAgent = null;
    this.chatAssistantAgent = null;
    this.initialized = false;
    
    this.initializeService();
  }

  async initializeService() {
    try {
      // Initialize configuration
      this.initializeConfig();
      
      // Initialize agents
      this.formBuilderAgent = new FormBuilderAgent(this.config);
      this.chatAssistantAgent = new ChatAssistantAgent(this.config);
      
      this.initialized = true;
      
      logger.info('Enhanced Agent Service initialized successfully', {
        provider: this.aiProvider,
        hasFormBuilder: !!this.formBuilderAgent,
        hasChatAssistant: !!this.chatAssistantAgent
      });
    } catch (error) {
      logger.logError(error, { context: 'EnhancedAgentService.initializeService' });
      this.initialized = false;
    }
  }

  initializeConfig() {
    try {
      if (this.aiProvider === 'azure') {
        if (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_API_KEY) {
          throw new Error('Azure OpenAI credentials not configured');
        }

        this.config = {
          provider: 'azure',
          apiKey: process.env.AZURE_OPENAI_API_KEY,
          endpoint: process.env.AZURE_OPENAI_ENDPOINT,
          apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
          deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
          model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-35-turbo',
          temperature: parseFloat(process.env.AZURE_OPENAI_TEMPERATURE) || 0.7,
          maxTokens: parseInt(process.env.AZURE_OPENAI_MAX_TOKENS) || 2000
        };
        
      } else if (this.aiProvider === 'openai') {
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OpenAI API key not configured');
        }

        this.config = {
          provider: 'openai',
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
          maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000
        };
        
      } else {
        throw new Error(`Unsupported AI provider: ${this.aiProvider}`);
      }

      logger.info('Configuration initialized successfully', { provider: this.aiProvider });
    } catch (error) {
      logger.logError(error, { context: 'EnhancedAgentService.initializeConfig' });
      throw error;
    }
  }

  /**
   * Form Generation Methods
   */
  async generateForm(description, requirements = {}) {
    this.ensureInitialized();
    
    try {
      logger.info('Generating form with Enhanced agents', { 
        description: description.substring(0, 100),
        requirements 
      });

      const result = await this.formBuilderAgent.generateForm(description, requirements);
      
      logger.info('Form generation completed successfully');
      return result;
    } catch (error) {
      logger.logError(error, { context: 'EnhancedAgentService.generateForm' });
      throw new Error(`Enhanced form generation failed: ${error.message}`);
    }
  }

  async optimizeForm(existingForm, goals = ['improve-ux']) {
    this.ensureInitialized();
    
    try {
      logger.info('Optimizing form with Enhanced agents', { 
        formTitle: existingForm.title,
        goals 
      });

      const result = await this.formBuilderAgent.optimizeForm(existingForm, goals);
      
      logger.info('Form optimization completed successfully');
      return result;
    } catch (error) {
      logger.logError(error, { context: 'EnhancedAgentService.optimizeForm' });
      throw new Error(`Enhanced form optimization failed: ${error.message}`);
    }
  }

  async validateForm(formData) {
    this.ensureInitialized();
    
    try {
      logger.info('Validating form with Enhanced agents', { 
        formTitle: formData.title 
      });

      const result = await this.formBuilderAgent.validateForm(formData);
      
      logger.info('Form validation completed successfully');
      return result;
    } catch (error) {
      logger.logError(error, { context: 'EnhancedAgentService.validateForm' });
      throw new Error(`Enhanced form validation failed: ${error.message}`);
    }
  }

  /**
   * Chat Methods
   */
  async handleChatMessage(message, conversationId, context = {}) {
    this.ensureInitialized();
    
    try {
      logger.info('Processing chat message with Enhanced agents', { 
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
      logger.logError(error, { context: 'EnhancedAgentService.handleChatMessage' });
      
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
      logger.info('Processing knowledge query with Enhanced agents', { 
        query: query.substring(0, 100),
        domain 
      });

      const result = await this.chatAssistantAgent.handleKnowledgeQuery(query, domain);
      
      logger.info('Knowledge query processed successfully');
      return result;
    } catch (error) {
      logger.logError(error, { context: 'EnhancedAgentService.handleKnowledgeQuery' });
      throw new Error(`Enhanced knowledge query failed: ${error.message}`);
    }
  }

  async analyzeConversation(conversationId) {
    this.ensureInitialized();
    
    try {
      const result = await this.chatAssistantAgent.analyzeConversation(conversationId);
      return result;
    } catch (error) {
      logger.logError(error, { context: 'EnhancedAgentService.analyzeConversation' });
      throw new Error(`Enhanced conversation analysis failed: ${error.message}`);
    }
  }

  async getConversationSummary(conversationId) {
    this.ensureInitialized();
    
    try {
      const result = await this.chatAssistantAgent.getConversationSummary(conversationId);
      return result;
    } catch (error) {
      logger.logError(error, { context: 'EnhancedAgentService.getConversationSummary' });
      throw new Error(`Enhanced conversation summary failed: ${error.message}`);
    }
  }

  /**
   * Utility Methods
   */
  isEnabled() {
    return this.initialized && !!this.config;
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Enhanced Agent Service not initialized');
    }
  }

  getServiceInfo() {
    return {
      service: 'Enhanced AI Agents',
      provider: this.aiProvider,
      initialized: this.initialized,
      hasFormBuilder: !!this.formBuilderAgent,
      hasChatAssistant: !!this.chatAssistantAgent,
      model: this.config?.model,
      temperature: this.config?.temperature,
      maxTokens: this.config?.maxTokens
    };
  }

  getStatistics() {
    if (!this.initialized) {
      return { error: 'Service not initialized' };
    }

    return {
      service: 'Enhanced AI Agents',
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
        service: 'Enhanced AI Agents',
        provider: this.aiProvider,
        agents: {
          formBuilder: !!this.formBuilderAgent,
          chatAssistant: !!this.chatAssistantAgent
        },
        testResponse: !!testResult.response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.logError(error, { context: 'EnhancedAgentService.healthCheck' });
      
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
      logger.info('Cleaning up Enhanced Agent Service', { stats });
    }
    
    this.initialized = false;
    logger.info('Enhanced Agent Service cleaned up');
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
      const result = this.chatAssistantAgent.getConversationHistory(conversationId);
      return result;
    } catch (error) {
      logger.logError(error, { context: 'EnhancedAgentService.getConversationHistory' });
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
export default new EnhancedAgentService();