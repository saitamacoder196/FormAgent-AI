import express from 'express';
import aiService from '../services/aiService.js';
import enhancedAgentService from '../services/crewAIService.js';
import Form from '../models/Form.js';
import Submission from '../models/Submission.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Generate a default form template when AI services are unavailable
function generateDefaultForm(description, requirements = {}) {
  const {
    fieldCount = 5,
    includeValidation = true,
    formType = 'contact',
    targetAudience = 'general',
    language = 'Vietnamese'
  } = requirements;

  // Basic form template based on description keywords
  const isRegistration = description.toLowerCase().includes('đăng ký') || description.toLowerCase().includes('registration');
  const isSurvey = description.toLowerCase().includes('khảo sát') || description.toLowerCase().includes('survey');
  const isContact = description.toLowerCase().includes('liên hệ') || description.toLowerCase().includes('contact');
  
  let formTitle = 'Form Đăng Ký';
  let formDescription = 'Vui lòng điền thông tin vào form dưới đây';
  let fields = [];

  if (isRegistration) {
    formTitle = 'Form Đăng Ký';
    formDescription = 'Vui lòng điền đầy đủ thông tin để hoàn tất đăng ký';
    fields = [
      { type: 'text', name: 'fullName', label: 'Họ và tên', required: true, placeholder: 'Nhập họ và tên đầy đủ' },
      { type: 'email', name: 'email', label: 'Email', required: true, placeholder: 'example@email.com' },
      { type: 'tel', name: 'phone', label: 'Số điện thoại', required: true, placeholder: '0123456789' },
      { type: 'select', name: 'category', label: 'Loại đăng ký', required: true, options: ['Cá nhân', 'Doanh nghiệp', 'Tổ chức'] },
      { type: 'textarea', name: 'note', label: 'Ghi chú', required: false, placeholder: 'Ghi chú thêm (nếu có)' }
    ];
  } else if (isSurvey) {
    formTitle = 'Khảo Sát Ý Kiến';
    formDescription = 'Ý kiến của bạn rất quan trọng với chúng tôi';
    fields = [
      { type: 'text', name: 'name', label: 'Tên của bạn', required: false, placeholder: 'Tên (tùy chọn)' },
      { type: 'radio', name: 'satisfaction', label: 'Mức độ hài lòng', required: true, options: ['Rất hài lòng', 'Hài lòng', 'Bình thường', 'Không hài lòng'] },
      { type: 'checkbox', name: 'features', label: 'Tính năng quan tâm', required: false, options: ['Giao diện', 'Hiệu năng', 'Tính năng', 'Hỗ trợ'] },
      { type: 'textarea', name: 'feedback', label: 'Góp ý', required: true, placeholder: 'Chia sẻ ý kiến của bạn' },
      { type: 'number', name: 'rating', label: 'Đánh giá (1-10)', required: true, placeholder: '10' }
    ];
  } else if (isContact) {
    formTitle = 'Liên Hệ';
    formDescription = 'Chúng tôi sẽ phản hồi trong thời gian sớm nhất';
    fields = [
      { type: 'text', name: 'name', label: 'Họ tên', required: true, placeholder: 'Nhập họ tên' },
      { type: 'email', name: 'email', label: 'Email', required: true, placeholder: 'your@email.com' },
      { type: 'text', name: 'subject', label: 'Chủ đề', required: true, placeholder: 'Chủ đề liên hệ' },
      { type: 'textarea', name: 'message', label: 'Nội dung', required: true, placeholder: 'Nội dung tin nhắn' },
      { type: 'select', name: 'priority', label: 'Mức độ ưu tiên', required: false, options: ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'] }
    ];
  } else {
    // Generic form
    fields = [
      { type: 'text', name: 'name', label: 'Tên', required: true, placeholder: 'Nhập tên' },
      { type: 'email', name: 'email', label: 'Email', required: true, placeholder: 'email@example.com' },
      { type: 'tel', name: 'phone', label: 'Điện thoại', required: false, placeholder: 'Số điện thoại' },
      { type: 'textarea', name: 'message', label: 'Tin nhắn', required: true, placeholder: 'Nhập tin nhắn' },
      { type: 'date', name: 'date', label: 'Ngày', required: false }
    ];
  }

  // Adjust field count if specified
  if (fieldCount && fieldCount !== fields.length) {
    if (fieldCount < fields.length) {
      fields = fields.slice(0, fieldCount);
    } else {
      // Add more generic fields if needed
      while (fields.length < fieldCount) {
        fields.push({
          type: 'text',
          name: `field_${fields.length + 1}`,
          label: `Trường ${fields.length + 1}`,
          required: false,
          placeholder: `Nhập thông tin trường ${fields.length + 1}`
        });
      }
    }
  }

  return {
    title: formTitle,
    description: formDescription,
    fields: fields,
    generatedBy: 'template',
    language: language
  };
}

// AI Configuration Info
router.get('/config', (req, res) => {
  try {
    const legacyConfig = aiService.getProviderInfo();
    const langChainConfig = enhancedAgentService.getServiceInfo();
    
    res.json({
      success: true,
      config: {
        legacy: legacyConfig,
        langChain: langChainConfig,
        activeService: enhancedAgentService.isEnabled() ? 'LangChain' : 'Legacy'
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'AI config endpoint' });
    res.status(500).json({
      success: false,
      error: 'Failed to get AI configuration',
      message: error.message
    });
  }
});

// Generate Form with AI (LangChain Enhanced)
router.post('/generate-form', async (req, res) => {
  try {
    const { 
      description, 
      requirements = {},
      autoSave = false,
      useCrewAI = true
    } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Description is required for form generation'
      });
    }

    let generatedForm;
    let service = 'legacy';

    // Try LangChain first if enabled and requested
    if (useCrewAI && enhancedAgentService.isEnabled()) {
      try {
        generatedForm = await enhancedAgentService.generateForm(description, requirements);
        service = 'LangChain';
        logger.info('Form generated using LangChain', { description: description.substring(0, 50) });
      } catch (crewError) {
        logger.logError(crewError, { context: 'LangChain form generation fallback' });
        // Fall back to legacy service
        if (aiService.isEnabled()) {
          try {
            generatedForm = await aiService.generateFormFields(description, requirements);
            service = 'legacy-fallback';
          } catch (legacyError) {
            logger.logError(legacyError, { context: 'Legacy AI service fallback' });
            // Generate a default form based on description
            generatedForm = generateDefaultForm(description, requirements);
            service = 'fallback-template';
          }
        } else {
          // Generate a default form based on description
          generatedForm = generateDefaultForm(description, requirements);
          service = 'fallback-template';
        }
      }
    } else if (aiService.isEnabled()) {
      // Use legacy AI service
      try {
        generatedForm = await aiService.generateFormFields(description, requirements);
        service = 'legacy';
      } catch (legacyError) {
        logger.logError(legacyError, { context: 'Legacy AI service main' });
        // Generate a default form based on description
        generatedForm = generateDefaultForm(description, requirements);
        service = 'fallback-template';
      }
    } else {
      // Generate a default form based on description
      generatedForm = generateDefaultForm(description, requirements);
      service = 'fallback-template';
    }

    let savedForm = null;
    if (autoSave) {
      // Save the generated form to database
      const form = new Form({
        title: generatedForm.title,
        description: generatedForm.description,
        fields: generatedForm.fields,
        settings: {
          aiGenerated: true,
          generationPrompt: description,
          generationRequirements: requirements
        }
      });

      savedForm = await form.save();
    }

    res.json({
      success: true,
      message: 'Form generated successfully',
      generatedForm,
      savedForm,
      metadata: {
        generatedAt: new Date().toISOString(),
        service: service,
        provider: service === 'LangChain' ? enhancedAgentService.getServiceInfo().provider : aiService.aiProvider,
        autoSaved: autoSave
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'AI form generation' });
    res.status(500).json({
      success: false,
      error: 'Failed to generate form',
      message: error.message
    });
  }
});

// Generate Form Title
router.post('/generate-title', async (req, res) => {
  try {
    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not enabled or configured'
      });
    }

    const { description, tone = 'professional' } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Description is required for title generation'
      });
    }

    const title = await aiService.generateFormTitle(description, tone);

    res.json({
      success: true,
      title,
      metadata: {
        generatedAt: new Date().toISOString(),
        tone,
        provider: aiService.aiProvider
      }
    });
  } catch (error) {
    console.error('AI title generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate title',
      message: error.message
    });
  }
});

// Generate Form Description
router.post('/generate-description', async (req, res) => {
  try {
    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not enabled or configured'
      });
    }

    const { title, purpose } = req.body;

    if (!title || !purpose) {
      return res.status(400).json({
        success: false,
        error: 'Title and purpose are required for description generation'
      });
    }

    const description = await aiService.generateFormDescription(title, purpose);

    res.json({
      success: true,
      description,
      metadata: {
        generatedAt: new Date().toISOString(),
        provider: aiService.aiProvider
      }
    });
  } catch (error) {
    console.error('AI description generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate description',
      message: error.message
    });
  }
});

// Analyze Form Submissions
router.post('/analyze-submissions/:formId', async (req, res) => {
  try {
    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not enabled or configured'
      });
    }

    const { formId } = req.params;
    const { analysisType = 'summary', limit = 100 } = req.body;

    // Check if form exists
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }

    // Get submissions for analysis
    const submissions = await Submission.find({ formId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    if (submissions.length === 0) {
      return res.json({
        success: true,
        analysis: {
          message: 'No submissions available for analysis',
          formId,
          submissionCount: 0
        }
      });
    }

    // Analyze submissions using AI
    const analysis = await aiService.analyzeFormSubmissions(submissions, analysisType);

    res.json({
      success: true,
      analysis,
      metadata: {
        formId,
        submissionCount: submissions.length,
        analysisType,
        analyzedAt: new Date().toISOString(),
        provider: aiService.aiProvider
      }
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze submissions',
      message: error.message
    });
  }
});

// Content Moderation
router.post('/moderate-content', async (req, res) => {
  try {
    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not enabled or configured'
      });
    }

    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required for moderation'
      });
    }

    const moderation = await aiService.moderateContent(content);

    res.json({
      success: true,
      moderation,
      metadata: {
        moderatedAt: new Date().toISOString(),
        provider: aiService.aiProvider
      }
    });
  } catch (error) {
    console.error('AI moderation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to moderate content',
      message: error.message
    });
  }
});

// Enhance Existing Form with AI
router.post('/enhance-form/:formId', async (req, res) => {
  try {
    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not enabled or configured'
      });
    }

    const { formId } = req.params;
    const { enhancementType = 'improve', suggestions = true } = req.body;

    // Get existing form
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }

    let enhancementPrompt;
    switch (enhancementType) {
      case 'improve':
        enhancementPrompt = `Analyze this form and suggest improvements:
        Title: ${form.title}
        Description: ${form.description}
        Fields: ${JSON.stringify(form.fields, null, 2)}
        
        Provide specific suggestions for:
        1. Field improvements
        2. User experience enhancements
        3. Validation improvements
        4. Additional fields that might be useful`;
        break;
      case 'accessibility':
        enhancementPrompt = `Review this form for accessibility improvements:
        ${JSON.stringify(form, null, 2)}
        
        Suggest accessibility enhancements following WCAG guidelines.`;
        break;
      case 'validation':
        enhancementPrompt = `Analyze and improve form validation:
        ${JSON.stringify(form.fields, null, 2)}
        
        Suggest better validation rules and error messages.`;
        break;
      default:
        enhancementPrompt = `Provide general suggestions for this form:
        ${JSON.stringify(form, null, 2)}`;
    }

    const enhancement = await aiService.generateCompletion(enhancementPrompt);

    res.json({
      success: true,
      originalForm: form,
      enhancement,
      enhancementType,
      metadata: {
        enhancedAt: new Date().toISOString(),
        provider: aiService.aiProvider
      }
    });
  } catch (error) {
    console.error('AI enhancement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enhance form',
      message: error.message
    });
  }
});

// Bulk Generate Forms
router.post('/bulk-generate', async (req, res) => {
  try {
    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not enabled or configured'
      });
    }

    const { requests, autoSave = false } = req.body;

    if (!requests || !Array.isArray(requests)) {
      return res.status(400).json({
        success: false,
        error: 'Requests array is required'
      });
    }

    if (requests.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 forms can be generated at once'
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < requests.length; i++) {
      try {
        const { description, requirements = {} } = requests[i];
        
        if (!description) {
          errors.push({ index: i, error: 'Description is required' });
          continue;
        }

        const generatedForm = await aiService.generateFormFields(description, requirements);
        
        let savedForm = null;
        if (autoSave) {
          const form = new Form({
            title: generatedForm.title,
            description: generatedForm.description,
            fields: generatedForm.fields,
            settings: {
              aiGenerated: true,
              generationPrompt: description,
              generationRequirements: requirements
            }
          });
          savedForm = await form.save();
        }

        results.push({
          index: i,
          generatedForm,
          savedForm
        });
      } catch (error) {
        errors.push({ 
          index: i, 
          error: error.message 
        });
      }
    }

    res.json({
      success: true,
      results,
      errors,
      metadata: {
        totalRequests: requests.length,
        successCount: results.length,
        errorCount: errors.length,
        generatedAt: new Date().toISOString(),
        provider: aiService.aiProvider
      }
    });
  } catch (error) {
    console.error('Bulk generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk generate forms',
      message: error.message
    });
  }
});

// Chat endpoint for general conversation (LangChain Enhanced)
router.post('/chat', async (req, res) => {
  try {
    const { message, conversation_id, context = {}, useCrewAI = true } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    let response;
    let service = 'fallback';
    const conversationId = conversation_id || `chat_${Date.now()}`;

    // Try LangChain first if enabled and requested
    if (useCrewAI && enhancedAgentService.isEnabled()) {
      try {
        const chatResponse = await enhancedAgentService.handleChatMessage(
          message,
          conversationId,
          { ...context, language: 'Vietnamese' }
        );
        
        response = chatResponse.response;
        service = 'LangChain';
        
        return res.json({
          success: true,
          response: response,
          conversation_id: conversationId,
          service: service,
          metadata: chatResponse.context
        });
      } catch (crewError) {
        logger.logError(crewError, { context: 'LangChain chat fallback' });
        // Fall through to legacy service
      }
    }

    // Try legacy AI service
    if (aiService.isEnabled()) {
      try {
        response = await aiService.generateCompletion(`
Bạn là FormAgent AI, một trợ lý thông minh chuyên tạo form và trò chuyện thân thiện.

Nhiệm vụ của bạn:
1. Trả lời các câu hỏi thông thường một cách tự nhiên và thân thiện
2. Tư vấn về thiết kế form khi được hỏi
3. Giải thích các tính năng của FormAgent
4. Nếu người dùng muốn tạo form, hướng dẫn họ sử dụng từ khóa như "tạo form", "tạo biểu mẫu"

Tin nhắn của người dùng: "${message}"

Hãy trả lời một cách tự nhiên, thân thiện và hữu ích:`);

        service = 'legacy';
        
        return res.json({
          success: true,
          response: response,
          conversation_id: conversationId,
          service: service
        });
      } catch (aiError) {
        logger.logError(aiError, { context: 'Legacy AI chat fallback' });
        // Fall through to default response
      }
    }

    // Default responses for common questions
    const lowerMessage = message.toLowerCase();
    let fallbackResponse = '';

    if (lowerMessage.includes('xin chào') || lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      fallbackResponse = `Xin chào! Tôi là FormAgent AI 🤖

Tôi có thể giúp bạn:
📝 Tạo form đăng ký, khảo sát, phản hồi
💬 Trò chuyện và tư vấn
🔧 Thiết kế form chuyên nghiệp

Bạn muốn làm gì hôm nay?`;
    } else if (lowerMessage.includes('làm gì') || lowerMessage.includes('giúp gì')) {
      fallbackResponse = `Tôi có thể giúp bạn:

🚀 **Tạo form nhanh chóng:**
- "Tạo form đăng ký sự kiện"
- "Tạo khảo sát khách hàng"
- "Tạo form phản hồi"

💡 **Tư vấn thiết kế:**
- Cách thiết kế form hiệu quả
- Loại trường nào phù hợp
- Cấu hình email và API

🔧 **Hỗ trợ kỹ thuật:**
- Cách sử dụng FormAgent
- Troubleshooting

Bạn muốn thử tạo form không?`;
    } else if (lowerMessage.includes('cảm ơn') || lowerMessage.includes('thank')) {
      fallbackResponse = 'Rất vui được giúp bạn! 😊 Nếu cần hỗ trợ thêm, hãy nói với tôi nhé!';
    } else if (lowerMessage.includes('bye') || lowerMessage.includes('tạm biệt')) {
      fallbackResponse = 'Tạm biệt! Hẹn gặp lại bạn soon! 👋';
    } else {
      fallbackResponse = `Tôi hiểu bạn đang hỏi về: "${message}"

Tôi là FormAgent AI, chuyên gia về tạo form! 🎯

Một số gợi ý:
• Hỏi "làm thế nào để tạo form hiệu quả?"
• Thử nói "tạo form đăng ký workshop"
• Hoặc hỏi bất cứ điều gì về form và thiết kế!

Bạn muốn tôi giúp gì khác?`;
    }

    res.json({
      success: true,
      response: fallbackResponse,
      conversation_id: conversationId,
      service: 'fallback'
    });

  } catch (error) {
    logger.logError(error, { context: 'Chat endpoint' });
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      message: error.message
    });
  }
});

// LangChain specific endpoints

// Form optimization with LangChain
router.post('/optimize-form/:formId', async (req, res) => {
  try {
    if (!enhancedAgentService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'LangChain service is not enabled'
      });
    }

    const { formId } = req.params;
    const { goals = ['improve-ux', 'increase-conversion'] } = req.body;

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }

    const optimization = await enhancedAgentService.optimizeForm(form.toObject(), goals);

    res.json({
      success: true,
      optimization,
      originalForm: form,
      metadata: {
        optimizedAt: new Date().toISOString(),
        service: 'LangChain',
        goals
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'LangChain form optimization' });
    res.status(500).json({
      success: false,
      error: 'Failed to optimize form',
      message: error.message
    });
  }
});

// Form validation with LangChain
router.post('/validate-form', async (req, res) => {
  try {
    if (!enhancedAgentService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'LangChain service is not enabled'
      });
    }

    const { formData } = req.body;

    if (!formData) {
      return res.status(400).json({
        success: false,
        error: 'Form data is required for validation'
      });
    }

    const validation = await enhancedAgentService.validateForm(formData);

    res.json({
      success: true,
      validation,
      metadata: {
        validatedAt: new Date().toISOString(),
        service: 'LangChain'
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'LangChain form validation' });
    res.status(500).json({
      success: false,
      error: 'Failed to validate form',
      message: error.message
    });
  }
});

// Conversation analysis
router.get('/chat/analyze/:conversationId', async (req, res) => {
  try {
    if (!enhancedAgentService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'LangChain service is not enabled'
      });
    }

    const { conversationId } = req.params;
    const analysis = await enhancedAgentService.analyzeConversation(conversationId);

    res.json({
      success: true,
      analysis,
      metadata: {
        analyzedAt: new Date().toISOString(),
        service: 'LangChain'
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'LangChain conversation analysis' });
    res.status(500).json({
      success: false,
      error: 'Failed to analyze conversation',
      message: error.message
    });
  }
});

// Service statistics
router.get('/stats', (req, res) => {
  try {
    const langChainStats = enhancedAgentService.isEnabled() ? enhancedAgentService.getStatistics() : null;
    const legacyInfo = aiService.getProviderInfo();

    res.json({
      success: true,
      statistics: {
        langChain: langChainStats,
        legacy: legacyInfo,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'AI service statistics' });
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error.message
    });
  }
});

// Health check for AI services
router.get('/health', async (req, res) => {
  try {
    const langChainHealth = enhancedAgentService.isEnabled() ? 
      await enhancedAgentService.healthCheck() : 
      { status: 'disabled', reason: 'Service not enabled' };
    
    const legacyHealth = {
      status: aiService.isEnabled() ? 'healthy' : 'disabled',
      provider: aiService.aiProvider
    };

    res.json({
      success: true,
      health: {
        langChain: langChainHealth,
        legacy: legacyHealth,
        overall: langChainHealth.status === 'healthy' || legacyHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'AI service health check' });
    res.status(500).json({
      success: false,
      error: 'Failed to check health',
      message: error.message
    });
  }
});

export default router;