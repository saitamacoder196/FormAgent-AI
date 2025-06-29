import { LLM } from 'crewai';
import FormBuilderAgent from '../agents/formBuilderAgent.js';
import ChatAssistantAgent from '../agents/chatAssistantAgent.js';
import logger from '../utils/logger.js';

class CrewAIService {
  constructor() {
    this.aiProvider = process.env.AI_PROVIDER || 'azure';
    this.llm = null;
    this.formBuilderAgent = null;
    this.chatAssistantAgent = null;
    this.initialized = false;
    
    this.initializeService();
  }

  async initializeService() {
    try {
      // Initialize LLM based on provider
      await this.initializeLLM();
      
      // Initialize agents
      this.formBuilderAgent = new FormBuilderAgent(this.llm);
      this.chatAssistantAgent = new ChatAssistantAgent(this.llm);
      
      this.initialized = true;
      
      logger.info('CrewAI Service initialized successfully', {
        provider: this.aiProvider,
        hasFormBuilder: !!this.formBuilderAgent,
        hasChatAssistant: !!this.chatAssistantAgent
      });
    } catch (error) {
      logger.logError(error, { context: 'CrewAIService.initializeService' });
      this.initialized = false;
    }
  }

  async initializeLLM() {
    try {
      if (this.aiProvider === 'azure') {
        if (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_API_KEY) {
          throw new Error('Azure OpenAI credentials not configured');
        }

        this.llm = new LLM({
          provider: 'azure_openai',
          model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-35-turbo',
          api_key: process.env.AZURE_OPENAI_API_KEY,
          azure_endpoint: process.env.AZURE_OPENAI_ENDPOINT,
          api_version: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
          temperature: parseFloat(process.env.AZURE_OPENAI_TEMPERATURE) || 0.7,
          max_tokens: parseInt(process.env.AZURE_OPENAI_MAX_TOKENS) || 2000
        });
        
      } else if (this.aiProvider === 'openai') {
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OpenAI API key not configured');
        }

        this.llm = new LLM({
          provider: 'openai',
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          api_key: process.env.OPENAI_API_KEY,
          temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
          max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000
        });
        
      } else {
        throw new Error(`Unsupported AI provider: ${this.aiProvider}`);
      }

      logger.info('LLM initialized successfully', { provider: this.aiProvider });
    } catch (error) {
      logger.logError(error, { context: 'CrewAIService.initializeLLM' });
      throw error;
    }
  }

  /**
   * Form Generation Methods
   */
  async generateForm(description, requirements = {}) {
    this.ensureInitialized();
    
    try {
      logger.info('Generating form with CrewAI', { 
        description: description.substring(0, 100),
        requirements 
      });

      const result = await this.formBuilderAgent.generateForm(description, requirements);
      
      logger.info('Form generation completed successfully');
      return result;
    } catch (error) {
      logger.logError(error, { context: 'CrewAIService.generateForm' });
      throw new Error(`CrewAI form generation failed: ${error.message}`);
    }
  }

  async optimizeForm(existingForm, goals = ['improve-ux']) {
    this.ensureInitialized();
    
    try {
      logger.info('Optimizing form with CrewAI', { 
        formTitle: existingForm.title,
        goals 
      });

      const result = await this.formBuilderAgent.optimizeForm(existingForm, goals);
      
      logger.info('Form optimization completed successfully');
      return result;
    } catch (error) {
      logger.logError(error, { context: 'CrewAIService.optimizeForm' });
      throw new Error(`CrewAI form optimization failed: ${error.message}`);
    }
  }

  async validateForm(formData) {
    this.ensureInitialized();
    
    try {
      logger.info('Validating form with CrewAI', { 
        formTitle: formData.title 
      });

      const result = await this.formBuilderAgent.validateForm(formData);
      
      logger.info('Form validation completed successfully');
      return result;
    } catch (error) {
      logger.logError(error, { context: 'CrewAIService.validateForm' });
      throw new Error(`CrewAI form validation failed: ${error.message}`);
    }
  }

  /**
   * Chat Methods
   */
  async handleChatMessage(message, conversationId, context = {}) {
    this.ensureInitialized();
    
    try {
      logger.info('Processing chat message with CrewAI', { 
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
      logger.logError(error, { context: 'CrewAIService.handleChatMessage' });
      
      // Return fallback response
      return {
        response: "I apologize, but I'm experiencing technical difficulties. Please try again.",
        conversationId,
        timestamp: new Date().toISOString(),
        error: true
      };
    }
  }

  async handleKnowledgeQuery(query, domain = 'general') {
    this.ensureInitialized();
    
    try {
      logger.info('Processing knowledge query with CrewAI', { 
        query: query.substring(0, 100),
        domain 
      });

      const result = await this.chatAssistantAgent.handleKnowledgeQuery(query, domain);
      
      logger.info('Knowledge query processed successfully');
      return result;
    } catch (error) {
      logger.logError(error, { context: 'CrewAIService.handleKnowledgeQuery' });
      throw new Error(`CrewAI knowledge query failed: ${error.message}`);
    }
  }

  async analyzeConversation(conversationId) {
    this.ensureInitialized();
    
    try {
      const result = await this.chatAssistantAgent.analyzeConversation(conversationId);
      return result;
    } catch (error) {
      logger.logError(error, { context: 'CrewAIService.analyzeConversation' });
      throw new Error(`CrewAI conversation analysis failed: ${error.message}`);
    }
  }

  async getConversationSummary(conversationId) {
    this.ensureInitialized();
    
    try {
      const result = await this.chatAssistantAgent.getConversationSummary(conversationId);
      return result;
    } catch (error) {
      logger.logError(error, { context: 'CrewAIService.getConversationSummary' });
      throw new Error(`CrewAI conversation summary failed: ${error.message}`);
    }
  }

  /**
   * Utility Methods
   */
  isEnabled() {
    return this.initialized && !!this.llm;
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('CrewAI Service not initialized');
    }
  }

  getServiceInfo() {
    return {
      provider: this.aiProvider,
      initialized: this.initialized,
      hasFormBuilder: !!this.formBuilderAgent,
      hasChatAssistant: !!this.chatAssistantAgent,
      llmModel: this.aiProvider === 'azure' ? 
        process.env.AZURE_OPENAI_DEPLOYMENT_NAME : 
        process.env.OPENAI_MODEL,
      temperature: this.aiProvider === 'azure' ? 
        process.env.AZURE_OPENAI_TEMPERATURE : 
        process.env.OPENAI_TEMPERATURE,
      maxTokens: this.aiProvider === 'azure' ? 
        process.env.AZURE_OPENAI_MAX_TOKENS : 
        process.env.OPENAI_MAX_TOKENS
    };
  }

  getStatistics() {
    if (!this.initialized) {
      return { error: 'Service not initialized' };
    }

    return {
      service: 'CrewAI',
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
        'Hello, this is a health check', 
        'health_check_conversation'
      );

      return {
        status: 'healthy',
        provider: this.aiProvider,
        agents: {
          formBuilder: !!this.formBuilderAgent,
          chatAssistant: !!this.chatAssistantAgent
        },
        testResponse: !!testResult.response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.logError(error, { context: 'CrewAIService.healthCheck' });
      
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
      // Clear old conversation histories to free memory
      const stats = this.chatAssistantAgent.getStatistics();
      logger.info('Cleaning up CrewAI Service', { stats });
    }
    
    this.initialized = false;
    logger.info('CrewAI Service cleaned up');
  }
}

export default new CrewAIService();