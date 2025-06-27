import mongoose from 'mongoose';

const aiInteractionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['form_generation', 'title_generation', 'description_generation', 'submission_analysis', 'content_moderation', 'form_enhancement']
  },
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form'
  },
  provider: {
    type: String,
    required: true,
    enum: ['azure', 'openai']
  },
  model: {
    type: String,
    required: true
  },
  input: {
    prompt: String,
    parameters: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed
  },
  output: {
    result: mongoose.Schema.Types.Mixed,
    rawResponse: String,
    success: {
      type: Boolean,
      default: true
    }
  },
  usage: {
    promptTokens: Number,
    completionTokens: Number,
    totalTokens: Number,
    cost: Number
  },
  performance: {
    responseTime: Number, // in milliseconds
    latency: Number
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'timeout'],
    default: 'pending'
  },
  error: {
    message: String,
    code: String,
    details: mongoose.Schema.Types.Mixed
  },
  requestInfo: {
    ipAddress: String,
    userAgent: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Indexes for analytics and queries
aiInteractionSchema.index({ type: 1, createdAt: -1 });
aiInteractionSchema.index({ formId: 1, type: 1 });
aiInteractionSchema.index({ provider: 1, createdAt: -1 });
aiInteractionSchema.index({ status: 1 });
aiInteractionSchema.index({ createdAt: -1 });

// Static methods for analytics
aiInteractionSchema.statics.getUsageStats = async function(dateRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  return await this.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          type: '$type',
          provider: '$provider',
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          }
        },
        count: { $sum: 1 },
        totalTokens: { $sum: '$usage.totalTokens' },
        totalCost: { $sum: '$usage.cost' },
        avgResponseTime: { $avg: '$performance.responseTime' },
        successRate: {
          $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
      }
    },
    { $sort: { '_id.date': -1, '_id.type': 1 } }
  ]);
};

aiInteractionSchema.statics.getProviderComparison = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: '$provider',
        totalInteractions: { $sum: 1 },
        totalTokens: { $sum: '$usage.totalTokens' },
        totalCost: { $sum: '$usage.cost' },
        avgResponseTime: { $avg: '$performance.responseTime' },
        successRate: {
          $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        typeBreakdown: {
          $push: {
            type: '$type',
            count: 1
          }
        }
      }
    }
  ]);
};

// Instance methods
aiInteractionSchema.methods.markCompleted = function(result, usage = {}) {
  this.status = 'completed';
  this.output.result = result;
  this.output.success = true;
  this.usage = { ...this.usage, ...usage };
  return this.save();
};

aiInteractionSchema.methods.markFailed = function(error) {
  this.status = 'failed';
  this.output.success = false;
  this.error = {
    message: error.message,
    code: error.code,
    details: error.details || {}
  };
  return this.save();
};

const AIInteraction = mongoose.model('AIInteraction', aiInteractionSchema);

export default AIInteraction;