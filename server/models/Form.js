import mongoose from 'mongoose';

const fieldSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['text', 'email', 'password', 'textarea', 'select', 'radio', 'checkbox', 'number', 'date', 'file']
  },
  name: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  placeholder: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  },
  options: [{
    type: String
  }],
  validation: {
    minLength: Number,
    maxLength: Number,
    pattern: String,
    message: String
  }
});

const formSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  description: {
    type: String,
    trim: true,
    maxLength: 1000
  },
  fields: [fieldSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  settings: {
    allowAnonymous: {
      type: Boolean,
      default: true
    },
    multipleSubmissions: {
      type: Boolean,
      default: true
    },
    showProgressBar: {
      type: Boolean,
      default: false
    },
    redirectUrl: String,
    customCSS: String
  },
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    submissions: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes
formSchema.index({ title: 'text', description: 'text' });
formSchema.index({ createdAt: -1 });
formSchema.index({ isActive: 1 });

// Virtual for submission count
formSchema.virtual('submissionCount', {
  ref: 'Submission',
  localField: '_id',
  foreignField: 'formId',
  count: true
});

// Ensure virtual fields are serialized
formSchema.set('toJSON', { virtuals: true });
formSchema.set('toObject', { virtuals: true });

const Form = mongoose.model('Form', formSchema);

export default Form;