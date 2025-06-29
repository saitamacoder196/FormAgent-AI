import express from 'express';
import aiService from '../services/aiService.js';
import crewAIService from '../services/crewAIService.js';
import Form from '../models/Form.js';
import Submission from '../models/Submission.js';
import logger from '../utils/logger.js';

const router = express.Router();

// AI Configuration Info
router.get('/config', (req, res) => {
  try {
    const legacyConfig = aiService.getProviderInfo();
    const crewAIConfig = crewAIService.getServiceInfo();
    
    res.json({
      success: true,
      config: {
        legacy: legacyConfig,
        crewAI: crewAIConfig,
        activeService: crewAIService.isEnabled() ? 'CrewAI' : 'Legacy'
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

// Generate Form with AI (CrewAI Enhanced)
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

    // Try CrewAI first if enabled and requested
    if (useCrewAI && crewAIService.isEnabled()) {
      try {
        generatedForm = await crewAIService.generateForm(description, requirements);
        service = 'CrewAI';
        logger.info('Form generated using CrewAI', { description: description.substring(0, 50) });
      } catch (crewError) {
        logger.logError(crewError, { context: 'CrewAI form generation fallback' });
        // Fall back to legacy service
        if (aiService.isEnabled()) {
          generatedForm = await aiService.generateFormFields(description, requirements);
          service = 'legacy-fallback';
        } else {
          throw new Error('No AI service available');
        }
      }
    } else if (aiService.isEnabled()) {
      // Use legacy AI service
      generatedForm = await aiService.generateFormFields(description, requirements);
      service = 'legacy';
    } else {
      return res.status(503).json({
        success: false,
        error: 'No AI service is enabled or configured'
      });
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
        provider: service === 'CrewAI' ? crewAIService.getServiceInfo().provider : aiService.aiProvider,
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

// Chat endpoint for general conversation (CrewAI Enhanced)
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

    // Try CrewAI first if enabled and requested
    if (useCrewAI && crewAIService.isEnabled()) {
      try {
        const chatResponse = await crewAIService.handleChatMessage(
          message,
          conversationId,
          { ...context, language: 'Vietnamese' }
        );
        
        response = chatResponse.response;
        service = 'CrewAI';
        
        return res.json({
          success: true,
          response: response,
          conversation_id: conversationId,
          service: service,
          metadata: chatResponse.context
        });
      } catch (crewError) {
        logger.logError(crewError, { context: 'CrewAI chat fallback' });
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
    let response = '';

    if (lowerMessage.includes('xin chào') || lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      response = `Xin chào! Tôi là FormAgent AI 🤖

Tôi có thể giúp bạn:
📝 Tạo form đăng ký, khảo sát, phản hồi
💬 Trò chuyện và tư vấn
🔧 Thiết kế form chuyên nghiệp

Bạn muốn làm gì hôm nay?`;
    } else if (lowerMessage.includes('làm gì') || lowerMessage.includes('giúp gì')) {
      response = `Tôi có thể giúp bạn:

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
      response = 'Rất vui được giúp bạn! 😊 Nếu cần hỗ trợ thêm, hãy nói với tôi nhé!';
    } else if (lowerMessage.includes('bye') || lowerMessage.includes('tạm biệt')) {
      response = 'Tạm biệt! Hẹn gặp lại bạn soon! 👋';
    } else {
      response = `Tôi hiểu bạn đang hỏi về: "${message}"

Tôi là FormAgent AI, chuyên gia về tạo form! 🎯

Một số gợi ý:
• Hỏi "làm thế nào để tạo form hiệu quả?"
• Thử nói "tạo form đăng ký workshop"
• Hoặc hỏi bất cứ điều gì về form và thiết kế!

Bạn muốn tôi giúp gì khác?`;
    }

    res.json({
      success: true,
      response: response,
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

// CrewAI specific endpoints

// Form optimization with CrewAI
router.post('/optimize-form/:formId', async (req, res) => {
  try {
    if (!crewAIService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'CrewAI service is not enabled'
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

    const optimization = await crewAIService.optimizeForm(form.toObject(), goals);

    res.json({
      success: true,
      optimization,
      originalForm: form,
      metadata: {
        optimizedAt: new Date().toISOString(),
        service: 'CrewAI',
        goals
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'CrewAI form optimization' });
    res.status(500).json({
      success: false,
      error: 'Failed to optimize form',
      message: error.message
    });
  }
});

// Form validation with CrewAI
router.post('/validate-form', async (req, res) => {
  try {
    if (!crewAIService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'CrewAI service is not enabled'
      });
    }

    const { formData } = req.body;

    if (!formData) {
      return res.status(400).json({
        success: false,
        error: 'Form data is required for validation'
      });
    }

    const validation = await crewAIService.validateForm(formData);

    res.json({
      success: true,
      validation,
      metadata: {
        validatedAt: new Date().toISOString(),
        service: 'CrewAI'
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'CrewAI form validation' });
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
    if (!crewAIService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'CrewAI service is not enabled'
      });
    }

    const { conversationId } = req.params;
    const analysis = await crewAIService.analyzeConversation(conversationId);

    res.json({
      success: true,
      analysis,
      metadata: {
        analyzedAt: new Date().toISOString(),
        service: 'CrewAI'
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'CrewAI conversation analysis' });
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
    const crewAIStats = crewAIService.isEnabled() ? crewAIService.getStatistics() : null;
    const legacyInfo = aiService.getProviderInfo();

    res.json({
      success: true,
      statistics: {
        crewAI: crewAIStats,
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
    const crewAIHealth = crewAIService.isEnabled() ? 
      await crewAIService.healthCheck() : 
      { status: 'disabled', reason: 'Service not enabled' };
    
    const legacyHealth = {
      status: aiService.isEnabled() ? 'healthy' : 'disabled',
      provider: aiService.aiProvider
    };

    res.json({
      success: true,
      health: {
        crewAI: crewAIHealth,
        legacy: legacyHealth,
        overall: crewAIHealth.status === 'healthy' || legacyHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
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