import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB from './config/database.js';
import Form from './models/Form.js';
import Submission from './models/Submission.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import AI routes
import aiRoutes from './routes/aiRoutes.js';

// Routes
app.use('/api/ai', aiRoutes);
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: error.message 
    });
  }
});

// Forms API endpoints
app.get('/api/forms', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const forms = await Form.find({ isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('submissionCount');

    const total = await Form.countDocuments({ isActive: true });

    res.json({ 
      success: true,
      forms,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch forms',
      message: error.message 
    });
  }
});

app.post('/api/forms', async (req, res) => {
  try {
    const { title, description, fields, settings } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false,
        error: 'Title is required' 
      });
    }

    const form = new Form({
      title,
      description,
      fields: fields || [],
      settings: settings || {}
    });

    await form.save();
    
    res.status(201).json({ 
      success: true,
      message: 'Form created successfully',
      form
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      error: 'Failed to create form',
      message: error.message 
    });
  }
});

app.get('/api/forms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const form = await Form.findById(id).populate('submissionCount');
    
    if (!form) {
      return res.status(404).json({ 
        success: false,
        error: 'Form not found' 
      });
    }

    // Increment view count
    await Form.findByIdAndUpdate(id, { $inc: { 'analytics.views': 1 } });

    res.json({ 
      success: true,
      form 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch form',
      message: error.message 
    });
  }
});

app.put('/api/forms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, fields, settings, isActive } = req.body;
    
    const form = await Form.findByIdAndUpdate(
      id,
      { title, description, fields, settings, isActive },
      { new: true, runValidators: true }
    );

    if (!form) {
      return res.status(404).json({ 
        success: false,
        error: 'Form not found' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'Form updated successfully',
      form
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      error: 'Failed to update form',
      message: error.message 
    });
  }
});

app.delete('/api/forms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const form = await Form.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!form) {
      return res.status(404).json({ 
        success: false,
        error: 'Form not found' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'Form deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete form',
      message: error.message 
    });
  }
});

// Form submissions
app.post('/api/forms/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const formData = req.body;
    
    // Check if form exists and is active
    const form = await Form.findById(id);
    if (!form || !form.isActive) {
      return res.status(404).json({ 
        success: false,
        error: 'Form not found or inactive' 
      });
    }

    // Create submission
    const submission = new Submission({
      formId: id,
      data: formData,
      submissionInfo: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referer'),
        submissionTime: new Date()
      }
    });

    await submission.save();

    // Update form analytics
    await Form.findByIdAndUpdate(id, { 
      $inc: { 'analytics.submissions': 1 } 
    });
    
    res.status(201).json({ 
      success: true,
      message: 'Form submitted successfully',
      submissionId: submission._id
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      error: 'Failed to submit form',
      message: error.message 
    });
  }
});

app.get('/api/forms/:id/submissions', async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const submissions = await Submission.find({ formId: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Submission.countDocuments({ formId: id });

    res.json({ 
      success: true,
      submissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch submissions',
      message: error.message 
    });
  }
});

// Analytics endpoint
app.get('/api/forms/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;
    const form = await Form.findById(id);
    
    if (!form) {
      return res.status(404).json({ 
        success: false,
        error: 'Form not found' 
      });
    }

    const submissionStats = await Submission.aggregate([
      { $match: { formId: form._id } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
      { $limit: 30 }
    ]);

    res.json({
      success: true,
      analytics: {
        ...form.analytics.toObject(),
        dailySubmissions: submissionStats
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch analytics',
      message: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🗄️  MongoDB URI: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
});