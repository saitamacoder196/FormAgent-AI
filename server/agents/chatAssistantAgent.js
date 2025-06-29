import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { BufferMemory } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';
import logger from '../utils/logger.js';

class ChatAssistantAgent {
  constructor(llmConfig) {
    this.llm = new ChatOpenAI({
      model: llmConfig.model || 'gpt-3.5-turbo',
      temperature: llmConfig.temperature || 0.7,
      maxTokens: llmConfig.maxTokens || 2000,
      openAIApiKey: llmConfig.apiKey,
      azureOpenAIApiKey: llmConfig.azureApiKey,
      azureOpenAIApiVersion: llmConfig.azureApiVersion,
      azureOpenAIApiInstanceName: llmConfig.azureInstanceName,
      azureOpenAIApiDeploymentName: llmConfig.azureDeploymentName
    });
    
    this.outputParser = new StringOutputParser();
    this.role = 'Conversational AI Assistant';
    
    // Conversation memories for different sessions
    this.conversationMemories = new Map();
    
    logger.info('ChatAssistant Agent initialized', { 
      agent: 'ChatAssistantAgent',
      model: llmConfig.model 
    });
  }

  /**
   * Get or create conversation memory for a session
   */
  getConversationMemory(conversationId) {
    if (!this.conversationMemories.has(conversationId)) {
      const memory = new BufferMemory({
        returnMessages: true,
        memoryKey: 'history',
        inputKey: 'input'
      });
      this.conversationMemories.set(conversationId, memory);
    }
    return this.conversationMemories.get(conversationId);
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
      
      const prompt = ChatPromptTemplate.fromTemplate(`
You are FormAgent AI, a friendly and knowledgeable AI assistant specialized in helping users with form creation and general conversation.

Your capabilities include:
1. Answering general questions in a natural and helpful way
2. Providing advice on form design and user experience
3. Explaining FormAgent features and capabilities
4. Having engaging conversations while being informative

Context Information:
- User ID: {userId}
- Language: {language}
- Timestamp: {timestamp}

Guidelines:
- Be friendly, helpful, and conversational
- Provide accurate and relevant information
- Ask clarifying questions when needed
- Maintain context from previous messages
- Be concise but thorough
- Use appropriate tone for the conversation
- If you don't know something, say so honestly
- For form creation requests, guide users to use specific keywords like "tạo form", "tạo biểu mẫu"

Previous conversation context: {history}

Current message: {input}

Respond naturally and helpfully in {language}:`);

      const chain = new ConversationChain({
        llm: this.llm,
        memory: memory,
        prompt: prompt,
        outputParser: this.outputParser
      });

      const result = await chain.call({
        input: message,
        userId: context.userId || 'anonymous',
        language: context.language || 'English',
        timestamp: new Date().toISOString()
      });

      logger.info('Chat message processed successfully', { 
        conversationId,
        responseLength: result.response?.length 
      });

      return {
        response: result.response,
        conversationId,
        timestamp: new Date().toISOString(),
        context: {
          messageCount: await this.getMessageCount(conversationId),
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

      const prompt = ChatPromptTemplate.fromTemplate(`
You are a knowledgeable assistant specializing in {domain}. Answer the following query with accurate and comprehensive information.

Query: {query}
Domain: {domain}

Provide:
1. Direct answer to the question
2. Relevant context and background
3. Examples if applicable  
4. Additional related information that might be helpful
5. Sources or references when appropriate

Make the response informative yet accessible, suitable for someone seeking to learn about this topic.

Answer in a clear, structured format:`);

      const chain = prompt.pipe(this.llm).pipe(this.outputParser);
      
      const result = await chain.invoke({
        query,
        domain
      });
      
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
      const chatHistory = await memory.chatHistory.getMessages();
      
      if (chatHistory.length === 0) {
        return {
          analysis: 'No conversation history available',
          insights: [],
          recommendations: []
        };
      }

      logger.info('Analyzing conversation', { 
        conversationId,
        messageCount: chatHistory.length 
      });

      const prompt = ChatPromptTemplate.fromTemplate(`
Analyze the following conversation to understand patterns, user intent, and provide insights.

Conversation History: {chatHistory}

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
[Overall tone assessment]`);

      const chain = prompt.pipe(this.llm).pipe(this.outputParser);
      
      const historyText = chatHistory.map(msg => 
        `${msg._getType()}: ${msg.content}`
      ).join('\n');
      
      const result = await chain.invoke({
        chatHistory: historyText
      });
      
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
      const chatHistory = await memory.chatHistory.getMessages();
      
      if (chatHistory.length === 0) {
        return {
          summary: 'No conversation history',
          keyPoints: [],
          duration: 0
        };
      }

      const messageCount = chatHistory.length;
      const userMessages = chatHistory.filter(msg => msg._getType() === 'human');
      const assistantMessages = chatHistory.filter(msg => msg._getType() === 'ai');

      return {
        summary: `Conversation với ${userMessages.length} tin nhắn từ người dùng và ${assistantMessages.length} phản hồi từ trợ lý`,
        keyPoints: this.extractKeyPoints(chatHistory),
        messageCount: messageCount,
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
  async getMessageCount(conversationId) {
    try {
      const memory = this.getConversationMemory(conversationId);
      const chatHistory = await memory.chatHistory.getMessages();
      return chatHistory.length;
    } catch (error) {
      return 0;
    }
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

  extractKeyPoints(chatHistory) {
    // Extract key topics from conversation
    const userMessages = chatHistory
      .filter(msg => msg._getType() === 'human')
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
    this.conversationMemories.forEach(async (memory) => {
      try {
        const chatHistory = await memory.chatHistory.getMessages();
        totalMessages += chatHistory.length;
      } catch (error) {
        // Ignore errors in counting
      }
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
}

export default ChatAssistantAgent;