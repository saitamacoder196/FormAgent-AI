import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  submissionInfo: {
    ipAddress: String,
    userAgent: String,
    referrer: String,
    submissionTime: {
      type: Date,
      default: Date.now
    }
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'archived'],
    default: 'pending'
  },
  metadata: {
    source: String,
    tags: [String],
    notes: String
  }
}, {
  timestamps: true
});

// Indexes
submissionSchema.index({ formId: 1, createdAt: -1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ 'submissionInfo.submissionTime': -1 });

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;