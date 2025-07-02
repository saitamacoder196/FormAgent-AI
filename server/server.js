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
import formsRoutes from './routes/formsRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { conversationHistoryService } from './services/conversationHistoryService.js';
import { personalityConfig, getContextualGreeting } from './config/personality.js';
import { guardrailsEngine } from './config/guardrails.js';
import EnhancedFormHandlers from './websocket/enhancedFormHandlers.js';
import configValidator from './utils/configValidator.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 5000;

// Helper functions for context-aware responses
function buildContextAwarePrompt(message, context) {
  const { userType, conversationHistory, userPreferences, keyTopics } = context;
  
  let prompt = `Bạn là FormAgent AI, một trợ lý thông minh chuyên tạo form và trò chuyện thân thiện.\n\n`;
  
  // Add user context
  if (userType !== 'firstTime') {
    prompt += `Người dùng là ${userType === 'expert' ? 'chuyên gia' : 'người dùng quen thuộc'}.\n`;
  }
  
  // Add conversation history context
  if (conversationHistory && conversationHistory.length > 0) {
    prompt += `Ngữ cảnh cuộc trò chuyện:\n`;
    conversationHistory.slice(-3).forEach(msg => {
      prompt += `- ${msg.role}: ${msg.content.substring(0, 100)}...\n`;
    });
  }
  
  // Add user preferences
  if (userPreferences && userPreferences.previousForms && userPreferences.previousForms.length > 0) {
    prompt += `Người dùng đã tạo ${userPreferences.previousForms.length} form trước đó.\n`;
  }
  
  // Add key topics
  if (keyTopics && keyTopics.length > 0) {
    prompt += `Chủ đề quan tâm: ${keyTopics.map(t => t.topic).join(', ')}.\n`;
  }
  
  prompt += `\nTin nhắn của người dùng: "${message}"\n\nHãy trả lời một cách tự nhiên, thân thiện và phù hợp với ngữ cảnh:`;
  
  return prompt;
}

function generateContextualFallbackResponse(message, context) {
  const { userType, userPreferences, keyTopics } = context;
  const lowerMessage = message.toLowerCase();
  
  // Personalized greeting
  if (lowerMessage.includes('xin chào') || lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    let response = `Xin chào! Tôi là FormAgent AI 🤖\n\n`;
    
    if (userType === 'returning') {
      response += `Rất vui được gặp lại bạn! `;
    } else if (userType === 'expert') {
      response += `Chào bạn! Sẵn sàng cho một dự án form mới? `;
    }
    
    if (userPreferences && userPreferences.previousForms && userPreferences.previousForms.length > 0) {
      const lastForm = userPreferences.previousForms.slice(-1)[0];
      response += `\n📋 Lần trước bạn đã tạo "${lastForm.title}".`;
    }
    
    response += `\n\nTôi có thể giúp bạn:\n📝 Tạo form đăng ký, khảo sát, phản hồi\n💬 Trò chuyện và tư vấn\n🔧 Thiết kế form chuyên nghiệp\n\nBạn muốn làm gì hôm nay?`;
    
    return response;
  }
  
  // Contextual help
  if (lowerMessage.includes('làm gì') || lowerMessage.includes('giúp gì')) {
    let response = `Tôi có thể giúp bạn:\n\n`;
    
    if (keyTopics && keyTopics.length > 0) {
      response += `🔍 Dựa trên cuộc trò chuyện, bạn quan tâm đến: ${keyTopics.map(t => t.topic).join(', ')}\n\n`;
    }
    
    response += `🚀 **Tạo form nhanh chóng:**\n- "Tạo form đăng ký sự kiện"\n- "Tạo khảo sát khách hàng"\n- "Tạo form phản hồi"\n\n💡 **Tư vấn thiết kế:**\n- Cách thiết kế form hiệu quả\n- Loại trường nào phù hợp\n- Cấu hình email và API\n\nBạn muốn thử tạo form không?`;
    
    return response;
  }
  
  // Default contextual response
  let response = `Tôi hiểu bạn đang hỏi về: "${message}"\n\n`;
  
  if (userType === 'expert') {
    response += `Với kinh nghiệm của bạn, tôi có thể hỗ trợ:\n• Advanced form validation\n• Custom field types\n• API integrations\n• Performance optimization\n\n`;
  } else {
    response += `Tôi là FormAgent AI, chuyên gia về tạo form! 🎯\n\n`;
  }
  
  response += `Một số gợi ý:\n• Hỏi "làm thế nào để tạo form hiệu quả?"\n• Thử nói "tạo form đăng ký workshop"\n• Hoặc hỏi bất cứ điều gì về form và thiết kế!\n\nBạn muốn tôi giúp gì khác?`;
  
  return response;
}

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

  // Handle form generation via WebSocket with persistent context
  socket.on('generate-form', async (data) => {
    try {
      console.log(`📝 Form generation request from ${socket.id}:`, data);
      
      const { 
        description, 
        requirements = {}, 
        autoSave = false, 
        useCrewAI = true,
        conversationId = `conv_${Date.now()}_${socket.id}`,
        userId = 'anonymous'
      } = data;

      // Get or create conversation with persistent context
      const conversation = await conversationHistoryService.getOrCreateConversation(
        conversationId, 
        userId, 
        socket.id
      );

      // Add user message to conversation history
      await conversationHistoryService.addMessage(conversationId, {
        role: 'user',
        content: `Tạo form: ${description}`,
        metadata: { 
          type: 'form_generation_request',
          requirements: requirements
        }
      }, userId);

      // Get conversation context for personalized generation
      const context = await conversationHistoryService.getConversationContext(conversationId);
      const greeting = await conversationHistoryService.getContextualGreeting(conversationId, userId);
      
      // Send personalized acknowledgment
      socket.emit('form-generation-started', {
        success: true,
        message: 'Đang tạo form...',
        personalizedMessage: greeting.personalTouch,
        suggestions: greeting.tips,
        timestamp: new Date().toISOString()
      });

      // Check content safety with guardrails
      const safetyCheck = guardrailsEngine.checkContentSafety(description);
      if (!safetyCheck.safe) {
        await conversationHistoryService.addMessage(conversationId, {
          role: 'system',
          content: 'Content safety violation detected',
          metadata: { violations: safetyCheck.violations }
        }, userId);
        
        socket.emit('form-generation-error', {
          success: false,
          error: 'Nội dung không phù hợp với chính sách bảo mật',
          details: safetyCheck.violations,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Import AI services
      const aiService = (await import('./services/aiService.js')).default;
      const enhancedAgentService = (await import('./services/crewAIService.js')).default;
      
      let generatedForm;
      let service = 'fallback-template';

      // Enhanced requirements with conversation context
      const enhancedRequirements = {
        ...requirements,
        context: context,
        userPreferences: context.userPreferences,
        previousForms: context.userPreferences.previousForms,
        userType: context.userType,
        conversationHistory: context.shortTerm.slice(-5) // Last 5 messages for context
      };

      // Try Enhanced service first with context
      if (useCrewAI && enhancedAgentService.isEnabled()) {
        try {
          generatedForm = await enhancedAgentService.generateForm(description, enhancedRequirements);
          service = 'LangChain';
        } catch (crewError) {
          console.error('LangChain form generation error:', crewError);
          // Fall back to legacy service
          if (aiService.isEnabled()) {
            try {
              generatedForm = await aiService.generateFormFields(description, requirements);
              service = 'legacy-fallback';
            } catch (legacyError) {
              console.error('Legacy AI service error:', legacyError);
              // Use fallback template
              const { generateDefaultForm } = await import('./utils/formTemplates.js');
              generatedForm = generateDefaultForm(description, requirements);
              service = 'fallback-template';
            }
          } else {
            // Use fallback template
            const generateDefaultForm = (await import('./utils/formTemplates.js')).generateDefaultForm;
            generatedForm = generateDefaultForm(description, requirements);
            service = 'fallback-template';
          }
        }
      } else if (aiService.isEnabled()) {
        try {
          generatedForm = await aiService.generateFormFields(description, requirements);
          service = 'legacy';
        } catch (legacyError) {
          console.error('Legacy AI service main error:', legacyError);
          // Use fallback template
          const generateDefaultForm = (await import('./utils/formTemplates.js')).generateDefaultForm;
          generatedForm = generateDefaultForm(description, requirements);
          service = 'fallback-template';
        }
      } else {
        // Use fallback template
        const generateDefaultForm = (await import('./utils/formTemplates.js')).generateDefaultForm;
        generatedForm = generateDefaultForm(description, requirements);
        service = 'fallback-template';
      }

      // Validate generated form with guardrails
      const formValidation = guardrailsEngine.validateFormDesign(generatedForm);
      
      // Add assistant response to persistent conversation history
      await conversationHistoryService.addMessage(conversationId, {
        role: 'assistant',
        content: `Đã tạo form "${generatedForm.title}" với ${generatedForm.fields.length} trường`,
        metadata: { 
          type: 'form_generation_response',
          service: service,
          formData: generatedForm,
          validationIssues: formValidation.issues
        }
      }, userId);

      // Record form creation in conversation history if auto-save
      if (autoSave) {
        try {
          const form = new Form({
            title: generatedForm.title,
            description: generatedForm.description,
            fields: generatedForm.fields,
            settings: {
              aiGenerated: true,
              generationPrompt: description,
              generationRequirements: enhancedRequirements
            },
            metadata: {
              conversationId: conversationId,
              userId: userId,
              service: service
            }
          });

          const savedForm = await form.save();
          await conversationHistoryService.recordFormCreation(conversationId, savedForm);
          console.log('Form auto-saved and recorded in conversation:', savedForm._id);
        } catch (saveError) {
          console.error('Failed to auto-save form:', saveError);
        }
      }

      // Send successful result with context
      socket.emit('form-generated', {
        success: true,
        generatedForm,
        conversationId,
        context: {
          userType: context.userType,
          suggestions: greeting.tips,
          previousFormsCount: context.userPreferences.previousForms.length,
          keyTopics: context.keyTopics.slice(0, 3)
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          service: service,
          provider: service === 'LangChain' ? 'azure' : 'template',
          autoSaved: autoSave,
          safetyWarnings: safetyCheck.warnings,
          validationIssues: formValidation.issues,
          conversationLength: context.shortTerm.length
        }
      });

    } catch (error) {
      console.error('WebSocket form generation error:', error);
      socket.emit('form-generation-error', {
        success: false,
        error: 'Failed to generate form',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle chat via WebSocket with persistent context
  socket.on('chat-message', async (data) => {
    try {
      console.log(`💬 Chat message from ${socket.id}:`, data);
      
      const { 
        message, 
        conversation_id, 
        context = {}, 
        useCrewAI = true,
        userId = 'anonymous'
      } = data;
      
      const conversationId = conversation_id || `chat_${Date.now()}_${socket.id}`;

      // Get or create conversation with persistent context
      const conversation = await conversationHistoryService.getOrCreateConversation(
        conversationId, 
        userId, 
        socket.id
      );

      // Check content safety
      const safetyCheck = guardrailsEngine.checkContentSafety(message);
      if (!safetyCheck.safe) {
        await conversationHistoryService.addMessage(conversationId, {
          role: 'system',
          content: 'Content safety violation in chat',
          metadata: { violations: safetyCheck.violations }
        }, userId);
        
        socket.emit('chat-error', {
          success: false,
          error: 'Nội dung không phù hợp với chính sách bảo mật',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Add user message to conversation history
      await conversationHistoryService.addMessage(conversationId, {
        role: 'user',
        content: message,
        metadata: { 
          type: 'chat_message',
          socketId: socket.id
        }
      }, userId);

      // Get conversation context for personalized responses
      const persistentContext = await conversationHistoryService.getConversationContext(conversationId);
      const greeting = await conversationHistoryService.getContextualGreeting(conversationId, userId);
      
      // Send personalized typing indicator
      socket.emit('chat-typing', {
        typing: true,
        personalizedMessage: greeting.topicSuggestion,
        timestamp: new Date().toISOString()
      });

      // Import AI services
      const aiService = (await import('./services/aiService.js')).default;
      const enhancedAgentService = (await import('./services/crewAIService.js')).default;
      
      let response;
      let service = 'fallback';

      // Enhanced context with conversation history
      const enhancedContext = {
        ...context,
        ...persistentContext,
        language: 'Vietnamese',
        conversationHistory: persistentContext.shortTerm,
        userPreferences: persistentContext.userPreferences,
        userType: persistentContext.userType,
        keyTopics: persistentContext.keyTopics,
        personality: personalityConfig.personality,
        guidelines: persistentContext.guidelines
      };

      // Try LangChain first with persistent context
      if (useCrewAI && enhancedAgentService.isEnabled()) {
        try {
          const chatResponse = await enhancedAgentService.handleChatMessage(
            message,
            conversationId,
            enhancedContext
          );
          
          response = chatResponse.response;
          service = 'LangChain';
        } catch (crewError) {
          console.error('LangChain chat error:', crewError);
          // Fall through to legacy service
        }
      }

      // Try legacy AI service with context if LangChain failed
      if (!response && aiService.isEnabled()) {
        try {
          // Build context-aware prompt
          const contextPrompt = buildContextAwarePrompt(message, enhancedContext);
          response = await aiService.generateCompletion(contextPrompt);
          service = 'legacy';
        } catch (aiError) {
          console.error('Legacy AI chat error:', aiError);
          // Fall through to default response
        }
      }

      // Context-aware default responses
      if (!response) {
        response = generateContextualFallbackResponse(message, enhancedContext);
        service = 'fallback';
      }

      // Improve response quality with guardrails
      response = guardrailsEngine.improveResponse(response, {
        conversationHistory: persistentContext.shortTerm,
        userType: persistentContext.userType,
        topic: 'chat'
      });

      // Add assistant response to conversation history
      await conversationHistoryService.addMessage(conversationId, {
        role: 'assistant',
        content: response,
        metadata: { 
          type: 'chat_response',
          service: service,
          safetyWarnings: safetyCheck.warnings
        }
      }, userId);

      // Stop typing and send enhanced response
      socket.emit('chat-typing', { typing: false });
      socket.emit('chat-response', {
        success: true,
        response: response,
        conversation_id: conversationId,
        service: service,
        context: {
          userType: persistentContext.userType,
          suggestions: greeting.tips,
          previousFormsCount: persistentContext.userPreferences.previousForms.length,
          keyTopics: persistentContext.keyTopics.slice(0, 3),
          conversationLength: persistentContext.shortTerm.length
        },
        metadata: {
          safetyWarnings: safetyCheck.warnings,
          personalizedGreeting: greeting.personalTouch
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('WebSocket chat error:', error);
      socket.emit('chat-typing', { typing: false });
      socket.emit('chat-error', {
        success: false,
        error: 'Failed to process chat message',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Validate and initialize enhanced form handlers
  const aiConfig = {
    provider: process.env.AI_PROVIDER || 'openai',
    apiKey: process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || process.env.AZURE_OPENAI_DEPLOYMENT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2000
  };

  // Log configuration status for debugging
  configValidator.logConfigStatus(aiConfig);

  // Test configuration
  configValidator.testAIConfig(aiConfig)
    .then(testResult => {
      configValidator.logConfigStatus(aiConfig, testResult);
      if (!testResult.success) {
        console.warn('⚠️ AI service may not work properly. Using fallback responses.');
      }
    })
    .catch(error => {
      console.error('Failed to test AI configuration:', error);
    });

  const enhancedHandlers = new EnhancedFormHandlers(aiConfig);

  // Handle enhanced chat with form context
  socket.on('chat-message-with-context', async (data) => {
    await enhancedHandlers.handleChatWithFormContext(socket, data);
  });

  // Handle form status queries
  socket.on('form-status', async (data) => {
    await enhancedHandlers.handleFormStatusQuery(socket, data);
  });

  // Handle form manipulation
  socket.on('form-manipulate', async (data) => {
    await enhancedHandlers.handleFormManipulation(socket, data);
  });

  // Handle form save requests
  socket.on('form-save', async (data) => {
    await enhancedHandlers.handleFormSave(socket, data);
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
app.use('/api/forms-enhanced', formsRoutes);
app.use('/api', healthRoutes);

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
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🗄️  MongoDB URI: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
  console.log(`🔌 WebSocket server ready`);
});