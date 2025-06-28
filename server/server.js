import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/database.js';
import Form from './models/Form.js';
import Submission from './models/Submission.js';
import aiRoutes from './routes/aiRoutes.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});
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

// Import AI routes (disabled for WebSocket demo)
// import aiRoutes from './routes/aiRoutes.js';

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
  
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`🏠 Client ${socket.id} joined room: ${room}`);
  });
});

// Form processing service with AI analysis
const processFormWithAI = async (prompt) => {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const lowerPrompt = prompt.toLowerCase();
  const fields = [];
  let title = 'Form thông tin';
  let description = 'Vui lòng điền thông tin bên dưới';
  let introduction = 'Đây là form thu thập thông tin được tạo tự động.';
  let triggerPhrases = ['thông tin', 'form'];

  // Enhanced AI analysis logic
  if (lowerPrompt.includes('đăng ký') || lowerPrompt.includes('registration')) {
    title = 'Form đăng ký';
    description = 'Form đăng ký thông tin';
    introduction = 'Vui lòng điền đầy đủ thông tin để hoàn tất quá trình đăng ký.';
    triggerPhrases = ['đăng ký', 'registration', 'sign up'];
  }

  if (lowerPrompt.includes('khóa học') || lowerPrompt.includes('course')) {
    title = 'Form đăng ký khóa học';
    description = 'Đăng ký tham gia khóa học';
    introduction = 'Đăng ký khóa học để nhận được thông tin chi tiết và được tư vấn.';
    triggerPhrases = ['khóa học', 'course', 'đào tạo'];
  }

  if (lowerPrompt.includes('liên hệ') || lowerPrompt.includes('contact')) {
    title = 'Form liên hệ';
    description = 'Gửi thông tin liên hệ';
    introduction = 'Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.';
    triggerPhrases = ['liên hệ', 'contact', 'hỗ trợ'];
  }

  // Add fields based on prompt content
  if (lowerPrompt.includes('tên') || lowerPrompt.includes('họ') || lowerPrompt.includes('name')) {
    fields.push({
      id: 'name',
      label: 'Họ và tên',
      type: 'text',
      required: true,
      placeholder: 'Nhập họ và tên...'
    });
  }

  if (lowerPrompt.includes('email')) {
    fields.push({
      id: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      placeholder: 'example@email.com'
    });
  }

  if (lowerPrompt.includes('điện thoại') || lowerPrompt.includes('sdt') || lowerPrompt.includes('phone')) {
    fields.push({
      id: 'phone',
      label: 'Số điện thoại',
      type: 'tel',
      required: true,
      placeholder: '0123456789'
    });
  }

  if (lowerPrompt.includes('tuổi') || lowerPrompt.includes('age')) {
    fields.push({
      id: 'age',
      label: 'Tuổi',
      type: 'number',
      required: false,
      placeholder: 'Nhập tuổi...'
    });
  }

  if (lowerPrompt.includes('địa chỉ') || lowerPrompt.includes('address')) {
    fields.push({
      id: 'address',
      label: 'Địa chỉ',
      type: 'textarea',
      required: false,
      placeholder: 'Nhập địa chỉ...'
    });
  }

  if (lowerPrompt.includes('kinh nghiệm') || lowerPrompt.includes('experience')) {
    fields.push({
      id: 'experience',
      label: 'Mức độ kinh nghiệm',
      type: 'select',
      required: true,
      placeholder: 'Chọn mức độ kinh nghiệm',
      options: ['Mới bắt đầu', 'Trung bình', 'Có kinh nghiệm', 'Chuyên gia']
    });
  }

  if (lowerPrompt.includes('giới tính') || lowerPrompt.includes('gender')) {
    fields.push({
      id: 'gender',
      label: 'Giới tính',
      type: 'radio',
      required: false,
      options: ['Nam', 'Nữ', 'Khác']
    });
  }

  if (lowerPrompt.includes('sở thích') || lowerPrompt.includes('hobby') || lowerPrompt.includes('interest')) {
    fields.push({
      id: 'interests',
      label: 'Sở thích',
      type: 'checkbox',
      required: false,
      options: ['Đọc sách', 'Du lịch', 'Thể thao', 'Âm nhạc', 'Công nghệ']
    });
  }

  if (lowerPrompt.includes('ngày sinh') || lowerPrompt.includes('birthday') || lowerPrompt.includes('date')) {
    fields.push({
      id: 'birthday',
      label: 'Ngày sinh',
      type: 'date',
      required: false,
      placeholder: 'Chọn ngày sinh'
    });
  }

  if (lowerPrompt.includes('ghi chú') || lowerPrompt.includes('note') || lowerPrompt.includes('message')) {
    fields.push({
      id: 'note',
      label: 'Ghi chú',
      type: 'textarea',
      required: false,
      placeholder: 'Nhập ghi chú (tùy chọn)...'
    });
  }

  // Default fields if none detected
  if (fields.length === 0) {
    fields.push(
      {
        id: 'name',
        label: 'Họ và tên',
        type: 'text',
        required: true,
        placeholder: 'Nhập họ và tên...'
      },
      {
        id: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        placeholder: 'example@email.com'
      }
    );
  }

  return {
    title,
    description,
    introduction,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    triggerPhrases,
    emailConfig: {
      enabled: true,
      recipientEmail: 'admin@company.com',
      subject: 'New form submission: ' + title,
      template: 'Có form submission mới từ ' + title
    },
    apiConfig: {
      enabled: false,
      endpoint: '',
      method: 'POST',
      headers: {},
      customHeaders: ''
    },
    fields
  };
};

// New API endpoint for form processing with WebSocket
app.post('/api/process-form', async (req, res) => {
  try {
    const { prompt, clientId } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        success: false,
        error: 'Prompt is required' 
      });
    }

    // Send immediate response to web client
    res.json({ 
      success: true,
      message: 'Form processing started',
      clientId: clientId || 'default'
    });

    // Process form in background and send via WebSocket
    try {
      const processedForm = await processFormWithAI(prompt);
      
      // Send processed form via WebSocket
      if (clientId) {
        io.to(clientId).emit('form-processed', {
          success: true,
          form: processedForm,
          prompt,
          timestamp: new Date().toISOString()
        });
      } else {
        io.emit('form-processed', {
          success: true,
          form: processedForm,
          prompt,
          timestamp: new Date().toISOString()
        });
      }
    } catch (processError) {
      console.error('Form processing error:', processError);
      io.to(clientId || 'default').emit('form-processed', {
        success: false,
        error: 'Failed to process form',
        message: processError.message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to start form processing',
      message: error.message 
    });
  }
});

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
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
  console.log(`🗄️  MongoDB URI: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
  console.log(`🔌 WebSocket server ready`);
});