import OpenAI from 'openai';
import { AzureOpenAI } from 'openai';
import logger from '../utils/logger.js';

class ChatAssistantAgent {
  constructor(config) {
    this.config = config;
    this.role = 'Conversational AI Assistant';
    this.client = this.initializeClient();
    
    // Conversation memories for different sessions
    this.conversationMemories = new Map();
    
    logger.info('ChatAssistant Agent initialized', { 
      agent: 'ChatAssistantAgent',
      provider: config.provider 
    });
  }

  initializeClient() {
    if (this.config.provider === 'azure') {
      return new AzureOpenAI({
        apiKey: this.config.apiKey,
        endpoint: this.config.endpoint,
        apiVersion: this.config.apiVersion
      });
    } else {
      return new OpenAI({
        apiKey: this.config.apiKey
      });
    }
  }

  /**
   * Get or create conversation memory for a session
   */
  getConversationMemory(conversationId) {
    if (!this.conversationMemories.has(conversationId)) {
      this.conversationMemories.set(conversationId, []);
    }
    return this.conversationMemories.get(conversationId);
  }

  /**
   * Add message to conversation memory
   */
  addToConversationMemory(conversationId, role, content) {
    const memory = this.getConversationMemory(conversationId);
    memory.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 20 messages to manage memory
    if (memory.length > 20) {
      memory.splice(0, memory.length - 20);
    }
  }

  /**
   * Handle chat message with context and memory
   */
  async handleChatMessage(message, conversationId, context = {}) {
    try {
      logger.info('Processing chat message', { 
        conversationId,
        messageLength: message.length,
        userId: context.userId 
      });

      const memory = this.getConversationMemory(conversationId);
      
      // Add user message to memory
      this.addToConversationMemory(conversationId, 'user', message);
      
      // Build conversation context
      const messages = [
        {
          role: 'system',
          content: `You are FormAgent AI, a friendly and knowledgeable AI assistant specialized in helping users with form creation and general conversation.

Your capabilities include:
1. Answering general questions in a natural and helpful way
2. Providing advice on form design and user experience
3. Explaining FormAgent features and capabilities
4. Having engaging conversations while being informative

Context Information:
- User ID: ${context.userId || 'anonymous'}
- Language: ${context.language || 'English'}
- Timestamp: ${new Date().toISOString()}

Guidelines:
- Be friendly, helpful, and conversational
- Provide accurate and relevant information
- Ask clarifying questions when needed
- Maintain context from previous messages
- Be concise but thorough
- Use appropriate tone for the conversation
- If you don't know something, say so honestly
- For form creation requests, guide users to use specific keywords like "tạo form", "tạo biểu mẫu"

Respond naturally and helpfully in ${context.language || 'English'}.`
        }
      ];

      // Add conversation history (last 10 messages)
      const recentHistory = memory.slice(-10);
      messages.push(...recentHistory);

      const completion = await this.client.chat.completions.create({
        model: this.config.provider === 'azure' ? this.config.deployment : this.config.model,
        messages: messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });

      const response = completion.choices[0].message.content;
      
      // Add assistant response to memory
      this.addToConversationMemory(conversationId, 'assistant', response);

      logger.info('Chat message processed successfully', { 
        conversationId,
        responseLength: response?.length 
      });

      return {
        response: response,
        conversationId,
        timestamp: new Date().toISOString(),
        context: {
          messageCount: memory.length,
          lastActivity: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.logError(error, { context: 'ChatAssistantAgent.handleChatMessage' });
      
      // Fallback response
      return {
        response: "Xin lỗi, tôi đang gặp một chút khó khăn trong việc xử lý tin nhắn của bạn. Bạn có thể thử lại không?",
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

      const completion = await this.client.chat.completions.create({
        model: this.config.provider === 'azure' ? this.config.deployment : this.config.model,
        messages: [
          {
            role: 'system',
            content: `You are a knowledgeable assistant specializing in ${domain}. Answer the following query with accurate and comprehensive information.`
          },
          {
            role: 'user',
            content: `Query: ${query}
Domain: ${domain}

Provide:
1. Direct answer to the question
2. Relevant context and background
3. Examples if applicable  
4. Additional related information that might be helpful
5. Sources or references when appropriate

Make the response informative yet accessible, suitable for someone seeking to learn about this topic.

Answer in a clear, structured format:`
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });

      const result = completion.choices[0].message.content;
      
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
   * Analyze conversation patterns and insights
   */
  async analyzeConversation(conversationId) {
    try {
      const memory = this.getConversationMemory(conversationId);
      
      if (memory.length === 0) {
        return {
          analysis: 'No conversation history available',
          insights: [],
          recommendations: []
        };
      }

      logger.info('Analyzing conversation', { 
        conversationId,
        messageCount: memory.length 
      });

      const historyText = memory.map(msg => 
        `${msg.role}: ${msg.content}`
      ).join('\n');

      const completion = await this.client.chat.completions.create({
        model: this.config.provider === 'azure' ? this.config.deployment : this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are a conversation analyst. Analyze conversations to understand patterns, user intent, and provide insights.'
          },
          {
            role: 'user',
            content: `Analyze the following conversation to understand patterns, user intent, and provide insights:

Conversation History: ${historyText}

Analyze:
1. **User Intent**: Primary goals and objectives of the user
2. **Conversation Topics**: Main themes and subjects discussed
3. **User Communication Style**: How the user prefers to communicate
4. **Unresolved Issues**: Any questions or concerns not fully addressed
5. **Improvement Opportunities**: Ways to enhance future interactions
6. **Sentiment Analysis**: Overall tone and satisfaction level

Provide insights in the following format:
## User Intent
[Primary goals and objectives]

## Key Topics
[Main themes discussed]

## Communication Style  
[User preferences and patterns]

## Unresolved Issues
[Outstanding questions or concerns]

## Recommendations
[Suggestions for improvement]

## Sentiment
[Overall tone assessment]`
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });

      const result = completion.choices[0].message.content;
      
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
      const memory = this.getConversationMemory(conversationId);
      
      if (memory.length === 0) {
        return {
          summary: 'No conversation history',
          keyPoints: [],
          duration: 0
        };
      }

      const userMessages = memory.filter(msg => msg.role === 'user');
      const assistantMessages = memory.filter(msg => msg.role === 'assistant');

      return {
        summary: `Conversation với ${userMessages.length} tin nhắn từ người dùng và ${assistantMessages.length} phản hồi từ trợ lý`,
        keyPoints: this.extractKeyPoints(memory),
        messageCount: memory.length,
        userMessageCount: userMessages.length,
        assistantMessageCount: assistantMessages.length,
        conversationId,
        timestamp: new Date().toISOString()
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
   * Clear conversation history
   */
  clearConversationHistory(conversationId) {
    this.conversationMemories.delete(conversationId);
    logger.info('Conversation history cleared', { conversationId });
  }

  /**
   * Get message count for a conversation
   */
  getMessageCount(conversationId) {
    const memory = this.getConversationMemory(conversationId);
    return memory.length;
  }

  /**
   * Helper methods
   */
  assessConfidence(result) {
    // Simple confidence assessment based on response characteristics
    const lowerResult = result.toLowerCase();
    if (lowerResult.includes("i don't know") || lowerResult.includes('uncertain') || 
        lowerResult.includes('không biết') || lowerResult.includes('không chắc')) {
      return 'low';
    } else if (lowerResult.includes('probably') || lowerResult.includes('might') ||
               lowerResult.includes('có thể') || lowerResult.includes('có lẽ')) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  parseAnalysisResult(result, conversationId) {
    try {
      const userIntent = this.extractSection(result, 'User Intent', 'Key Topics');
      const keyTopics = this.extractSection(result, 'Key Topics', 'Communication Style');
      const communicationStyle = this.extractSection(result, 'Communication Style', 'Unresolved Issues');
      const unresolvedIssues = this.extractSection(result, 'Unresolved Issues', 'Recommendations');
      const recommendations = this.extractSection(result, 'Recommendations', 'Sentiment');
      const sentiment = this.extractSection(result, 'Sentiment', null);
      
      return {
        conversationId,
        analysis: {
          userIntent,
          keyTopics: keyTopics?.split('\n').filter(line => line.trim()),
          communicationStyle,
          unresolvedIssues: unresolvedIssues?.split('\n').filter(line => line.trim()),
          recommendations: recommendations?.split('\n').filter(line => line.trim()),
          sentiment
        },
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

  extractKeyPoints(memory) {
    // Extract key topics from conversation
    const userMessages = memory
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

  extractSection(text, startMarker, endMarker) {
    const startPattern = new RegExp(`##\\s*${startMarker}\\s*`, 'i');
    const startMatch = text.search(startPattern);
    
    if (startMatch === -1) return null;
    
    let endMatch = text.length;
    if (endMarker) {
      const endPattern = new RegExp(`##\\s*${endMarker}\\s*`, 'i');
      const endIndex = text.search(endPattern);
      if (endIndex > startMatch) {
        endMatch = endIndex;
      }
    }
    
    return text.substring(startMatch, endMatch)
      .replace(startPattern, '')
      .trim();
  }

  /**
   * Get agent statistics
   */
  getStatistics() {
    const totalConversations = this.conversationMemories.size;
    let totalMessages = 0;
    
    // Count total messages across all conversations
    this.conversationMemories.forEach((memory) => {
      totalMessages += memory.length;
    });
    
    return {
      totalConversations,
      totalMessages,
      averageMessagesPerConversation: totalConversations > 0 ? 
        Math.round(totalMessages / totalConversations) : 0,
      activeConversations: totalConversations, // All stored conversations are considered active
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cleanup old conversations to manage memory
   */
  cleanup() {
    const maxConversations = 100; // Keep only last 100 conversations
    
    if (this.conversationMemories.size > maxConversations) {
      const conversationIds = Array.from(this.conversationMemories.keys());
      const toDelete = conversationIds.slice(0, conversationIds.length - maxConversations);
      
      toDelete.forEach(id => {
        this.conversationMemories.delete(id);
      });
      
      logger.info('Cleaned up old conversations', { 
        deleted: toDelete.length,
        remaining: this.conversationMemories.size 
      });
    }
  }

  /**
   * Get conversation history
   */
  getConversationHistory(conversationId) {
    const memory = this.getConversationMemory(conversationId);
    return {
      conversationId,
      messages: memory.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      })),
      messageCount: memory.length,
      timestamp: new Date().toISOString()
    };
  }
}

export default ChatAssistantAgent;