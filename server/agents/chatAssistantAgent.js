import { Agent, Task, Crew } from 'crewai';
import logger from '../utils/logger.js';

class ChatAssistantAgent {
  constructor(aiService) {
    this.aiService = aiService;
    this.agent = new Agent({
      role: 'Conversational AI Assistant',
      goal: 'Provide helpful, accurate, and engaging responses to user queries while maintaining context and personality',
      backstory: `You are a friendly and knowledgeable AI assistant specialized in helping users with 
                  general questions, providing information, and having natural conversations. You have 
                  expertise in various topics and can engage in meaningful dialogue while being helpful 
                  and informative.`,
      verbose: true,
      allow_delegation: false,
      llm: this.aiService
    });
    
    // Conversation memory
    this.conversationHistory = new Map();
    
    logger.info('ChatAssistant Agent initialized', { agent: 'ChatAssistantAgent' });
  }

  /**
   * Create a chat response task
   */
  createChatTask(message, conversationId, context = {}) {
    const history = this.getConversationHistory(conversationId);
    
    return new Task({
      description: `Respond to the user's message in a helpful and engaging way.
        
        Current Message: ${message}
        
        Conversation History: ${history.length > 0 ? JSON.stringify(history.slice(-5)) : 'No previous conversation'}
        
        Context Information:
        - User ID: ${context.userId || 'anonymous'}
        - Session ID: ${conversationId}
        - Timestamp: ${new Date().toISOString()}
        - Language: ${context.language || 'English'}
        
        Guidelines:
        1. Be friendly, helpful, and conversational
        2. Provide accurate and relevant information
        3. Ask clarifying questions when needed
        4. Maintain context from previous messages
        5. Be concise but thorough
        6. Use appropriate tone for the conversation
        7. If you don't know something, say so honestly
        8. Avoid generating forms unless explicitly requested
        
        Response should be natural and engaging, as if you're having a real conversation with the user.`,
      agent: this.agent,
      expected_output: 'A natural, helpful response that continues the conversation appropriately'
    });
  }

  /**
   * Create a knowledge query task
   */
  createKnowledgeTask(query, domain = 'general') {
    return new Task({
      description: `Answer the following knowledge query with accurate and comprehensive information:
        
        Query: ${query}
        Domain: ${domain}
        
        Provide:
        1. Direct answer to the question
        2. Relevant context and background
        3. Examples if applicable
        4. Additional related information that might be helpful
        5. Sources or references when appropriate
        
        Make the response informative yet accessible, suitable for someone seeking to learn about this topic.`,
      agent: this.agent,
      expected_output: 'Comprehensive and accurate information addressing the query'
    });
  }

  /**
   * Create a conversation analysis task
   */
  createAnalysisTask(conversationHistory) {
    return new Task({
      description: `Analyze the following conversation to understand context and user intent:
        
        Conversation History: ${JSON.stringify(conversationHistory, null, 2)}
        
        Analyze:
        1. User's primary intent and goals
        2. Conversation topics and themes
        3. User's communication style and preferences
        4. Any unresolved questions or concerns
        5. Opportunities to provide additional help
        6. Sentiment and tone of the conversation
        
        Provide insights that will help improve future responses and user experience.`,
      agent: this.agent,
      expected_output: 'Detailed conversation analysis with actionable insights'
    });
  }

  /**
   * Handle chat message
   */
  async handleChatMessage(message, conversationId, context = {}) {
    try {
      logger.info('Processing chat message', { 
        conversationId,
        messageLength: message.length,
        userId: context.userId 
      });

      // Add message to conversation history
      this.addToConversationHistory(conversationId, {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

      const task = this.createChatTask(message, conversationId, context);
      
      const crew = new Crew({
        agents: [this.agent],
        tasks: [task],
        verbose: false // Less verbose for chat responses
      });

      const result = await crew.kickoff();
      
      // Add assistant response to history
      this.addToConversationHistory(conversationId, {
        role: 'assistant',
        content: result,
        timestamp: new Date().toISOString()
      });

      logger.info('Chat message processed successfully', { 
        conversationId,
        responseLength: result?.length 
      });

      return {
        response: result,
        conversationId,
        timestamp: new Date().toISOString(),
        context: {
          messageCount: this.getConversationHistory(conversationId).length,
          lastActivity: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.logError(error, { context: 'ChatAssistantAgent.handleChatMessage' });
      
      // Fallback response
      return {
        response: "I apologize, but I'm having trouble processing your message right now. Could you please try again?",
        conversationId,
        timestamp: new Date().toISOString(),
        error: true
      };
    }
  }

  /**
   * Handle knowledge queries
   */
  async handleKnowledgeQuery(query, domain = 'general') {
    try {
      logger.info('Processing knowledge query', { 
        query: query.substring(0, 100),
        domain 
      });

      const task = this.createKnowledgeTask(query, domain);
      
      const crew = new Crew({
        agents: [this.agent],
        tasks: [task],
        verbose: false
      });

      const result = await crew.kickoff();
      
      logger.info('Knowledge query processed successfully');

      return {
        answer: result,
        query,
        domain,
        timestamp: new Date().toISOString(),
        confidence: this.assessConfidence(result)
      };
    } catch (error) {
      logger.logError(error, { context: 'ChatAssistantAgent.handleKnowledgeQuery' });
      throw new Error(`Knowledge query failed: ${error.message}`);
    }
  }

  /**
   * Analyze conversation
   */
  async analyzeConversation(conversationId) {
    try {
      const history = this.getConversationHistory(conversationId);
      
      if (history.length === 0) {
        return {
          analysis: 'No conversation history available',
          insights: [],
          recommendations: []
        };
      }

      logger.info('Analyzing conversation', { 
        conversationId,
        messageCount: history.length 
      });

      const task = this.createAnalysisTask(history);
      
      const crew = new Crew({
        agents: [this.agent],
        tasks: [task],
        verbose: false
      });

      const result = await crew.kickoff();
      
      return this.parseAnalysisResult(result, conversationId);
    } catch (error) {
      logger.logError(error, { context: 'ChatAssistantAgent.analyzeConversation' });
      throw new Error(`Conversation analysis failed: ${error.message}`);
    }
  }

  /**
   * Get conversation summary
   */
  async getConversationSummary(conversationId) {
    try {
      const history = this.getConversationHistory(conversationId);
      
      if (history.length === 0) {
        return {
          summary: 'No conversation history',
          keyPoints: [],
          duration: 0
        };
      }

      const firstMessage = new Date(history[0].timestamp);
      const lastMessage = new Date(history[history.length - 1].timestamp);
      const duration = lastMessage - firstMessage;

      const userMessages = history.filter(msg => msg.role === 'user');
      const assistantMessages = history.filter(msg => msg.role === 'assistant');

      return {
        summary: `Conversation with ${userMessages.length} user messages and ${assistantMessages.length} assistant responses`,
        keyPoints: this.extractKeyPoints(history),
        duration: Math.round(duration / 1000 / 60), // minutes
        messageCount: history.length,
        startTime: firstMessage.toISOString(),
        lastActivity: lastMessage.toISOString()
      };
    } catch (error) {
      logger.logError(error, { context: 'ChatAssistantAgent.getConversationSummary' });
      return {
        summary: 'Unable to generate summary',
        error: error.message
      };
    }
  }

  /**
   * Conversation memory management
   */
  getConversationHistory(conversationId) {
    return this.conversationHistory.get(conversationId) || [];
  }

  addToConversationHistory(conversationId, message) {
    const history = this.getConversationHistory(conversationId);
    history.push(message);
    
    // Keep only last 50 messages to manage memory
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    this.conversationHistory.set(conversationId, history);
  }

  clearConversationHistory(conversationId) {
    this.conversationHistory.delete(conversationId);
    logger.info('Conversation history cleared', { conversationId });
  }

  /**
   * Helper methods
   */
  assessConfidence(result) {
    // Simple confidence assessment based on response characteristics
    if (result.includes('I don\'t know') || result.includes('uncertain')) {
      return 'low';
    } else if (result.includes('probably') || result.includes('might')) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  parseAnalysisResult(result, conversationId) {
    try {
      const insights = this.extractInsights(result);
      const recommendations = this.extractRecommendations(result);
      
      return {
        conversationId,
        analysis: result,
        insights,
        recommendations,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        conversationId,
        analysis: result,
        error: 'Failed to parse analysis result',
        timestamp: new Date().toISOString()
      };
    }
  }

  extractKeyPoints(history) {
    // Extract key topics from conversation
    const userMessages = history
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content);
    
    // Simple keyword extraction (could be enhanced with NLP)
    const topics = new Set();
    userMessages.forEach(message => {
      const words = message.toLowerCase().split(/\s+/);
      words.filter(word => word.length > 4).forEach(word => topics.add(word));
    });
    
    return Array.from(topics).slice(0, 5); // Top 5 keywords
  }

  extractInsights(result) {
    const insightsMatch = result.match(/Insights:([\s\S]*?)(?=Recommendations:|$)/i);
    return insightsMatch ? 
      insightsMatch[1].trim().split('\n').filter(line => line.trim()) : 
      ['No specific insights extracted'];
  }

  extractRecommendations(result) {
    const recommendationsMatch = result.match(/Recommendations:([\s\S]*?)$/i);
    return recommendationsMatch ? 
      recommendationsMatch[1].trim().split('\n').filter(line => line.trim()) : 
      ['No specific recommendations available'];
  }

  /**
   * Get agent statistics
   */
  getStatistics() {
    const totalConversations = this.conversationHistory.size;
    const totalMessages = Array.from(this.conversationHistory.values())
      .reduce((sum, history) => sum + history.length, 0);
    
    return {
      totalConversations,
      totalMessages,
      averageMessagesPerConversation: totalConversations > 0 ? 
        Math.round(totalMessages / totalConversations) : 0,
      activeConversations: Array.from(this.conversationHistory.entries())
        .filter(([_, history]) => {
          const lastMessage = history[history.length - 1];
          const lastActivity = new Date(lastMessage?.timestamp || 0);
          const now = new Date();
          return (now - lastActivity) < 24 * 60 * 60 * 1000; // Active within 24h
        }).length
    };
  }
}

export default ChatAssistantAgent;