import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Forms API endpoints
app.get('/api/forms', (req, res) => {
  // Get all forms
  res.json({ 
    message: 'Get all forms',
    forms: []
  });
});

app.post('/api/forms', (req, res) => {
  // Create new form
  const { title, description, fields } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  res.status(201).json({ 
    message: 'Form created successfully',
    form: {
      id: Date.now(),
      title,
      description,
      fields: fields || [],
      createdAt: new Date().toISOString()
    }
  });
});

app.get('/api/forms/:id', (req, res) => {
  // Get specific form
  const { id } = req.params;
  res.json({ 
    message: `Get form ${id}`,
    form: {
      id,
      title: 'Sample Form',
      description: 'This is a sample form',
      fields: []
    }
  });
});

app.put('/api/forms/:id', (req, res) => {
  // Update form
  const { id } = req.params;
  const { title, description, fields } = req.body;
  
  res.json({ 
    message: `Form ${id} updated successfully`,
    form: {
      id,
      title,
      description,
      fields,
      updatedAt: new Date().toISOString()
    }
  });
});

app.delete('/api/forms/:id', (req, res) => {
  // Delete form
  const { id } = req.params;
  res.json({ 
    message: `Form ${id} deleted successfully`
  });
});

// Form submissions
app.post('/api/forms/:id/submit', (req, res) => {
  // Submit form data
  const { id } = req.params;
  const formData = req.body;
  
  res.status(201).json({ 
    message: 'Form submitted successfully',
    submissionId: Date.now(),
    formId: id,
    submittedAt: new Date().toISOString()
  });
});

app.get('/api/forms/:id/submissions', (req, res) => {
  // Get form submissions
  const { id } = req.params;
  res.json({ 
    message: `Get submissions for form ${id}`,
    submissions: []
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});