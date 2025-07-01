import mongoose from 'mongoose';

// Schema for individual messages
const MessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Object,
    default: {}
  },
  tokens: {
    type: Number,
    default: 0
  },
  messageId: {
    type: String,
    required: true
  }
});

// Schema for conversation sessions
const ConversationHistorySchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    default: 'anonymous'
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  
  // Short-term memory (recent messages)
  shortTermMemory: {
    messages: [MessageSchema],
    maxMessages: {
      type: Number,
      default: 20
    },
    contextWindow: {
      type: Number,
      default: 4000 // tokens
    }
  },

  // Long-term memory (conversation summary)
  longTermMemory: {
    summary: {
      type: String,
      maxlength: 2000
    },
    keyTopics: [{
      topic: String,
      frequency: Number,
      lastMentioned: Date
    }],
    userPreferences: {
      formTypes: [String],
      designStyle: String,
      language: String,
      complexity: String,
      previousForms: [{
        formId: String,
        title: String,
        createdAt: Date
      }]
    },
    context: {
      type: Object,
      default: {}
    },
    lastSummaryUpdate: {
      type: Date,
      default: Date.now
    }
  },

  // Conversation metadata
  metadata: {
    totalMessages: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    aiService: {
      type: String,
      default: 'unknown'
    },
    conversationType: {
      type: String,
      enum: ['form_creation', 'chat', 'support', 'optimization'],
      default: 'chat'
    },
    userType: {
      type: String,
      enum: ['firstTime', 'returning', 'expert'],
      default: 'firstTime'
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active'
    },
    quality: {
      helpfulness: Number,
      satisfaction: Number,
      completeness: Number
    }
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Auto-archival
  expiresAt: {
    type: Date,
    default: function() {
      // Archive after 30 days of inactivity
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true,
  collection: 'conversationhistories'
});

// Indexes for performance
ConversationHistorySchema.index({ conversationId: 1, sessionId: 1 });
ConversationHistorySchema.index({ userId: 1, lastActivity: -1 });
ConversationHistorySchema.index({ createdAt: -1 });
ConversationHistorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Instance methods
ConversationHistorySchema.methods.addMessage = async function(message) {
  // Ensure unique messageId with timestamp + random + counter
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  const counter = this.shortTermMemory.messages.length;
  const messageId = `msg_${timestamp}_${random}_${counter}`;
  
  const newMessage = {
    ...message,
    messageId: messageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
    timestamp: new Date()
  };

  // Add to short-term memory
  this.shortTermMemory.messages.push(newMessage);
  
  // Maintain short-term memory limits
  if (this.shortTermMemory.messages.length > this.shortTermMemory.maxMessages) {
    // Move oldest messages to long-term summary
    const oldMessages = this.shortTermMemory.messages.splice(0, 
      this.shortTermMemory.messages.length - this.shortTermMemory.maxMessages);
    
    await this.updateLongTermMemory(oldMessages);
  }

  // Update metadata
  this.metadata.totalMessages += 1;
  this.metadata.totalTokens += message.tokens || 0;
  this.lastActivity = new Date();
  this.updatedAt = new Date();

  return messageId;
};

ConversationHistorySchema.methods.updateLongTermMemory = async function(messagesToSummarize = []) {
  try {
    // Extract key topics from messages
    const topics = this.extractTopics(messagesToSummarize);
    
    // Update key topics
    topics.forEach(topic => {
      const existingTopic = this.longTermMemory.keyTopics.find(t => t.topic === topic);
      if (existingTopic) {
        existingTopic.frequency += 1;
        existingTopic.lastMentioned = new Date();
      } else {
        this.longTermMemory.keyTopics.push({
          topic,
          frequency: 1,
          lastMentioned: new Date()
        });
      }
    });

    // Generate summary if needed
    if (messagesToSummarize.length > 0) {
      const newSummary = this.generateSummary(messagesToSummarize);
      if (this.longTermMemory.summary) {
        this.longTermMemory.summary = this.mergeSummaries(this.longTermMemory.summary, newSummary);
      } else {
        this.longTermMemory.summary = newSummary;
      }
    }

    this.longTermMemory.lastSummaryUpdate = new Date();
  } catch (error) {
    console.error('Error updating long-term memory:', error);
  }
};

ConversationHistorySchema.methods.extractTopics = function(messages) {
  const topics = [];
  const topicPatterns = {
    'form_creation': /tạo form|tạo biểu mẫu|form mới/i,
    'registration': /đăng ký|registration/i,
    'survey': /khảo sát|survey|ý kiến/i,
    'contact': /liên hệ|contact|hỗ trợ/i,
    'optimization': /tối ưu|optimize|cải thiện/i,
    'design': /thiết kế|design|giao diện/i,
    'validation': /validation|kiểm tra|xác thực/i,
    'integration': /tích hợp|integration|api/i
  };

  messages.forEach(message => {
    Object.entries(topicPatterns).forEach(([topic, pattern]) => {
      if (pattern.test(message.content)) {
        topics.push(topic);
      }
    });
  });

  return [...new Set(topics)]; // Remove duplicates
};

ConversationHistorySchema.methods.generateSummary = function(messages) {
  // Simple summary generation (would use AI in production)
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  
  const summary = {
    userQuestions: userMessages.length,
    assistantResponses: assistantMessages.length,
    mainTopics: this.extractTopics(messages),
    timespan: {
      start: messages[0]?.timestamp,
      end: messages[messages.length - 1]?.timestamp
    }
  };

  return `Conversation summary: ${summary.userQuestions} user questions, ${summary.assistantResponses} responses. Topics: ${summary.mainTopics.join(', ')}`;
};

ConversationHistorySchema.methods.mergeSummaries = function(oldSummary, newSummary) {
  return `${oldSummary}\n\nRecent activity: ${newSummary}`;
};

ConversationHistorySchema.methods.getContext = function(maxTokens = 4000) {
  const context = {
    shortTerm: [],
    longTerm: this.longTermMemory.summary,
    userPreferences: this.longTermMemory.userPreferences,
    keyTopics: this.longTermMemory.keyTopics.slice(0, 5), // Top 5 topics
    conversationType: this.metadata.conversationType,
    userType: this.metadata.userType
  };

  let tokenCount = 0;
  const recentMessages = [...this.shortTermMemory.messages].reverse();

  for (const message of recentMessages) {
    const messageTokens = message.tokens || message.content.length / 4; // Rough estimate
    if (tokenCount + messageTokens > maxTokens) break;
    
    context.shortTerm.unshift({
      role: message.role,
      content: message.content,
      timestamp: message.timestamp
    });
    
    tokenCount += messageTokens;
  }

  return context;
};

// Static methods
ConversationHistorySchema.statics.findByConversationId = function(conversationId) {
  return this.findOne({ conversationId });
};

ConversationHistorySchema.statics.findByUserId = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ lastActivity: -1 })
    .limit(limit);
};

ConversationHistorySchema.statics.createConversation = async function(conversationId, userId = 'anonymous', sessionId = null) {
  const conversation = new this({
    conversationId,
    userId,
    sessionId: sessionId || `session_${Date.now()}`,
    shortTermMemory: {
      messages: [],
      maxMessages: 20,
      contextWindow: 4000
    },
    longTermMemory: {
      keyTopics: [],
      userPreferences: {
        formTypes: [],
        designStyle: 'modern',
        language: 'Vietnamese',
        complexity: 'medium',
        previousForms: []
      },
      context: {}
    },
    metadata: {
      totalMessages: 0,
      totalTokens: 0,
      conversationType: 'chat',
      userType: 'firstTime',
      status: 'active'
    }
  });

  return await conversation.save();
};

ConversationHistorySchema.statics.archiveOldConversations = async function(daysSinceLastActivity = 30) {
  const cutoffDate = new Date(Date.now() - daysSinceLastActivity * 24 * 60 * 60 * 1000);
  
  return await this.updateMany(
    { 
      lastActivity: { $lt: cutoffDate },
      'metadata.status': { $ne: 'archived' }
    },
    { 
      $set: { 
        'metadata.status': 'archived',
        updatedAt: new Date()
      }
    }
  );
};

ConversationHistorySchema.statics.getConversationStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$metadata.conversationType',
        count: { $sum: 1 },
        totalMessages: { $sum: '$metadata.totalMessages' },
        totalTokens: { $sum: '$metadata.totalTokens' },
        avgMessagesPerConv: { $avg: '$metadata.totalMessages' }
      }
    }
  ]);

  const userTypeStats = await this.aggregate([
    {
      $group: {
        _id: '$metadata.userType',
        count: { $sum: 1 }
      }
    }
  ]);

  return { conversationTypes: stats, userTypes: userTypeStats };
};

// Pre-save middleware
ConversationHistorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update user type based on activity
  if (this.metadata.totalMessages > 50) {
    this.metadata.userType = 'expert';
  } else if (this.metadata.totalMessages > 10) {
    this.metadata.userType = 'returning';
  }
  
  next();
});

const ConversationHistory = mongoose.model('ConversationHistory', ConversationHistorySchema);

export default ConversationHistory;