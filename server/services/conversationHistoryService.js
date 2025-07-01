import ConversationHistory from '../models/ConversationHistory.js';
import { personalityConfig, getContextualGreeting, enforceGuidelines } from '../config/personality.js';
import { guardrailsEngine } from '../config/guardrails.js';
import logger from '../utils/logger.js';

class ConversationHistoryService {
  constructor() {
    this.activeConversations = new Map(); // In-memory cache for active conversations
    this.cleanupInterval = 30 * 60 * 1000; // 30 minutes
    this.startCleanupTask();
  }

  // Get or create conversation
  async getOrCreateConversation(conversationId, userId = 'anonymous', sessionId = null) {
    try {
      // Check cache first
      if (this.activeConversations.has(conversationId)) {
        const cached = this.activeConversations.get(conversationId);
        // Update last access time
        cached.lastAccess = Date.now();
        return cached.conversation;
      }

      // Find in database
      let conversation;
      try {
        conversation = await ConversationHistory.findByConversationId(conversationId);
        
        if (!conversation) {
          // Create new conversation
          conversation = await ConversationHistory.createConversation(
            conversationId, 
            userId, 
            sessionId || `session_${Date.now()}`
          );
          
          logger.info(`New conversation created: ${conversationId}`);
        } else {
          // Load existing conversation
          logger.info(`Conversation loaded: ${conversationId}, messages: ${conversation.metadata.totalMessages}`);
        }
      } catch (dbError) {
        if (dbError.message?.includes('buffering timed out')) {
          // MongoDB not available, create in-memory conversation
          logger.warn('MongoDB not available, creating in-memory conversation');
          conversation = {
            conversationId,
            userId,
            sessionId: sessionId || `session_${Date.now()}`,
            shortTermMemory: { messages: [], maxMessages: 20 },
            longTermMemory: { keyTopics: [], userPreferences: { previousForms: [] } },
            metadata: { totalMessages: 0, totalTokens: 0, userType: 'firstTime' },
            addMessage: async function(msg) { 
              this.shortTermMemory.messages.push(msg); 
              this.metadata.totalMessages++;
              return msg.messageId || 'inmem_' + Date.now();
            },
            save: async function() { return this; },
            getContext: function() { 
              return {
                shortTerm: this.shortTermMemory.messages,
                longTerm: '',
                userPreferences: this.longTermMemory.userPreferences,
                keyTopics: this.longTermMemory.keyTopics,
                userType: this.metadata.userType
              };
            }
          };
        } else {
          throw dbError;
        }
      }

      // Cache the conversation
      this.activeConversations.set(conversationId, {
        conversation,
        lastAccess: Date.now()
      });

      return conversation;
    } catch (error) {
      logger.logError(error, { context: 'getOrCreateConversation', conversationId });
      throw error;
    }
  }

  // Add message to conversation
  async addMessage(conversationId, message, userId = 'anonymous') {
    try {
      const conversation = await this.getOrCreateConversation(conversationId, userId);
      
      // Validate message with guardrails
      const safetyCheck = guardrailsEngine.checkContentSafety(message.content);
      if (!safetyCheck.safe) {
        logger.warn(`Unsafe content detected in conversation ${conversationId}`, safetyCheck.violations);
        guardrailsEngine.logViolation({
          type: 'unsafe_content',
          conversationId,
          violations: safetyCheck.violations
        });
      }

      // Estimate tokens (rough calculation)
      const estimatedTokens = Math.ceil(message.content.length / 4);
      const messageWithTokens = {
        ...message,
        tokens: estimatedTokens,
        metadata: {
          ...message.metadata,
          safetyWarnings: safetyCheck.warnings
        }
      };

      // Add message to conversation
      let messageId;
      try {
        messageId = await conversation.addMessage(messageWithTokens);
        
        // Save to database
        await conversation.save();
      } catch (dbError) {
        // Handle MongoDB errors gracefully
        if (dbError.code === 11000 || dbError.message?.includes('duplicate key')) {
          logger.warn(`Duplicate message ID, generating new one for conversation ${conversationId}`);
          // Try again with a more unique ID
          messageWithTokens.messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 20)}`;
          messageId = await conversation.addMessage(messageWithTokens);
          await conversation.save();
        } else if (dbError.message?.includes('buffering timed out')) {
          // MongoDB not available, use in-memory only
          logger.warn('MongoDB not available, using in-memory conversation only');
          messageId = `inmem_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          // Don't try to save to DB
        } else {
          throw dbError;
        }
      }
      
      // Update cache
      if (this.activeConversations.has(conversationId)) {
        this.activeConversations.get(conversationId).conversation = conversation;
        this.activeConversations.get(conversationId).lastAccess = Date.now();
      }

      logger.info(`Message added to conversation ${conversationId}: ${messageId}`);
      
      return {
        messageId,
        conversation,
        safetyCheck
      };
    } catch (error) {
      logger.logError(error, { context: 'addMessage', conversationId });
      throw error;
    }
  }

  // Get conversation context for AI
  async getConversationContext(conversationId, maxTokens = 4000) {
    try {
      const conversation = await this.getOrCreateConversation(conversationId);
      const context = conversation.getContext(maxTokens);
      
      // Add personality guidelines
      const guidelines = enforceGuidelines('', {
        userType: context.userType,
        conversationHistory: context.shortTerm
      });

      return {
        ...context,
        guidelines,
        personalityConfig: personalityConfig.personality,
        conversationId
      };
    } catch (error) {
      logger.logError(error, { context: 'getConversationContext', conversationId });
      return {
        shortTerm: [],
        longTerm: '',
        userPreferences: {},
        keyTopics: [],
        conversationType: 'chat',
        userType: 'firstTime'
      };
    }
  }

  // Update user preferences
  async updateUserPreferences(conversationId, preferences) {
    try {
      const conversation = await this.getOrCreateConversation(conversationId);
      
      // Merge new preferences with existing ones
      conversation.longTermMemory.userPreferences = {
        ...conversation.longTermMemory.userPreferences,
        ...preferences
      };

      await conversation.save();
      
      // Update cache
      if (this.activeConversations.has(conversationId)) {
        this.activeConversations.get(conversationId).conversation = conversation;
      }

      logger.info(`User preferences updated for conversation ${conversationId}`);
      return conversation.longTermMemory.userPreferences;
    } catch (error) {
      logger.logError(error, { context: 'updateUserPreferences', conversationId });
      throw error;
    }
  }

  // Record form creation
  async recordFormCreation(conversationId, formData) {
    try {
      const conversation = await this.getOrCreateConversation(conversationId);
      
      // Add to user's form history
      const formRecord = {
        formId: formData._id || formData.id,
        title: formData.title,
        createdAt: new Date()
      };

      conversation.longTermMemory.userPreferences.previousForms.push(formRecord);
      
      // Update conversation type
      conversation.metadata.conversationType = 'form_creation';
      
      // Keep only last 10 forms
      if (conversation.longTermMemory.userPreferences.previousForms.length > 10) {
        conversation.longTermMemory.userPreferences.previousForms = 
          conversation.longTermMemory.userPreferences.previousForms.slice(-10);
      }

      await conversation.save();
      
      logger.info(`Form creation recorded for conversation ${conversationId}: ${formData.title}`);
      return formRecord;
    } catch (error) {
      logger.logError(error, { context: 'recordFormCreation', conversationId });
      throw error;
    }
  }

  // Get contextual greeting based on user history
  async getContextualGreeting(conversationId, userId = 'anonymous') {
    try {
      const conversation = await this.getOrCreateConversation(conversationId, userId);
      const userType = conversation.metadata.userType;
      const greeting = getContextualGreeting(userType);
      
      // Add personal touches based on history
      if (conversation.longTermMemory.userPreferences.previousForms.length > 0) {
        const lastForm = conversation.longTermMemory.userPreferences.previousForms.slice(-1)[0];
        greeting.personalTouch = `Lần trước bạn đã tạo "${lastForm.title}" 📋`;
      }

      if (conversation.longTermMemory.keyTopics.length > 0) {
        const topTopic = conversation.longTermMemory.keyTopics
          .sort((a, b) => b.frequency - a.frequency)[0];
        greeting.topicSuggestion = `Bạn thường quan tâm đến ${topTopic.topic} 💡`;
      }

      return greeting;
    } catch (error) {
      logger.logError(error, { context: 'getContextualGreeting', conversationId });
      return getContextualGreeting('firstTime');
    }
  }

  // Analyze conversation quality
  async analyzeConversationQuality(conversationId) {
    try {
      const conversation = await this.getOrCreateConversation(conversationId);
      
      const analysis = {
        totalMessages: conversation.metadata.totalMessages,
        conversationLength: conversation.shortTermMemory.messages.length,
        userEngagement: this.calculateUserEngagement(conversation),
        topicCoverage: conversation.longTermMemory.keyTopics.length,
        formCreationRate: conversation.longTermMemory.userPreferences.previousForms.length,
        conversationDuration: new Date() - conversation.createdAt,
        averageResponseLength: this.calculateAverageResponseLength(conversation),
        guardrailsViolations: guardrailsEngine.getViolationStats()
      };

      // Calculate quality score
      analysis.qualityScore = this.calculateQualityScore(analysis);
      
      return analysis;
    } catch (error) {
      logger.logError(error, { context: 'analyzeConversationQuality', conversationId });
      return null;
    }
  }

  // Get user conversation history
  async getUserConversationHistory(userId, limit = 10) {
    try {
      const conversations = await ConversationHistory.findByUserId(userId, limit);
      
      return conversations.map(conv => ({
        conversationId: conv.conversationId,
        createdAt: conv.createdAt,
        lastActivity: conv.lastActivity,
        totalMessages: conv.metadata.totalMessages,
        conversationType: conv.metadata.conversationType,
        status: conv.metadata.status,
        formsCreated: conv.longTermMemory.userPreferences.previousForms.length,
        keyTopics: conv.longTermMemory.keyTopics.slice(0, 3)
      }));
    } catch (error) {
      logger.logError(error, { context: 'getUserConversationHistory', userId });
      return [];
    }
  }

  // Export conversation data
  async exportConversationData(conversationId, format = 'json') {
    try {
      const conversation = await this.getOrCreateConversation(conversationId);
      
      const exportData = {
        conversationId: conversation.conversationId,
        userId: conversation.userId,
        createdAt: conversation.createdAt,
        lastActivity: conversation.lastActivity,
        messages: conversation.shortTermMemory.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        summary: conversation.longTermMemory.summary,
        userPreferences: conversation.longTermMemory.userPreferences,
        metadata: conversation.metadata
      };

      if (format === 'csv') {
        return this.convertToCSV(exportData);
      }
      
      return exportData;
    } catch (error) {
      logger.logError(error, { context: 'exportConversationData', conversationId });
      throw error;
    }
  }

  // Helper methods
  calculateUserEngagement(conversation) {
    const userMessages = conversation.shortTermMemory.messages.filter(m => m.role === 'user');
    const totalMessages = conversation.shortTermMemory.messages.length;
    
    return totalMessages > 0 ? (userMessages.length / totalMessages) * 100 : 0;
  }

  calculateAverageResponseLength(conversation) {
    const assistantMessages = conversation.shortTermMemory.messages.filter(m => m.role === 'assistant');
    
    if (assistantMessages.length === 0) return 0;
    
    const totalLength = assistantMessages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.round(totalLength / assistantMessages.length);
  }

  calculateQualityScore(analysis) {
    let score = 0;
    
    // Engagement score (0-30 points)
    score += Math.min(analysis.userEngagement / 100 * 30, 30);
    
    // Topic coverage (0-20 points)
    score += Math.min(analysis.topicCoverage * 4, 20);
    
    // Form creation success (0-25 points)
    score += Math.min(analysis.formCreationRate * 5, 25);
    
    // Response quality (0-25 points)
    const avgLength = analysis.averageResponseLength;
    if (avgLength > 50 && avgLength < 500) {
      score += 25;
    } else if (avgLength > 20 && avgLength < 1000) {
      score += 15;
    } else {
      score += 5;
    }
    
    return Math.round(score);
  }

  convertToCSV(data) {
    const messages = data.messages;
    const csvHeader = 'Timestamp,Role,Content,Length\n';
    const csvRows = messages.map(msg => 
      `"${msg.timestamp}","${msg.role}","${msg.content.replace(/"/g, '""')}","${msg.content.length}"`
    ).join('\n');
    
    return csvHeader + csvRows;
  }

  // Cleanup task
  startCleanupTask() {
    setInterval(() => {
      this.cleanupInactiveConversations();
    }, this.cleanupInterval);
  }

  cleanupInactiveConversations() {
    const now = Date.now();
    const inactiveThreshold = 60 * 60 * 1000; // 1 hour
    
    for (const [conversationId, data] of this.activeConversations.entries()) {
      if (now - data.lastAccess > inactiveThreshold) {
        this.activeConversations.delete(conversationId);
        logger.info(`Cleaned up inactive conversation from cache: ${conversationId}`);
      }
    }
  }

  // Archive old conversations
  async archiveOldConversations(days = 30) {
    try {
      const result = await ConversationHistory.archiveOldConversations(days);
      logger.info(`Archived ${result.modifiedCount} old conversations`);
      return result;
    } catch (error) {
      logger.logError(error, { context: 'archiveOldConversations' });
      throw error;
    }
  }

  // Get system statistics
  async getSystemStats() {
    try {
      const stats = await ConversationHistory.getConversationStats();
      const activeConversations = this.activeConversations.size;
      const violations = guardrailsEngine.getViolationStats();
      
      return {
        ...stats,
        activeConversations,
        cacheSize: this.activeConversations.size,
        violations,
        systemHealth: this.calculateSystemHealth(stats, violations)
      };
    } catch (error) {
      logger.logError(error, { context: 'getSystemStats' });
      return {};
    }
  }

  calculateSystemHealth(stats, violations) {
    const totalViolations = Object.values(violations).reduce((sum, count) => sum + count, 0);
    const totalConversations = stats.conversationTypes?.reduce((sum, type) => sum + type.count, 0) || 1;
    
    const violationRate = totalViolations / totalConversations;
    
    if (violationRate < 0.01) return 'excellent';
    if (violationRate < 0.05) return 'good';
    if (violationRate < 0.1) return 'fair';
    return 'needs_attention';
  }
}

// Export singleton instance
export const conversationHistoryService = new ConversationHistoryService();
export default ConversationHistoryService;