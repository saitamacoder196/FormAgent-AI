import ChatAssistantAgent from './chatAssistantAgent.js';
import FormContextAgent from './formContextAgent.js';
import SafeAIClient from './safeAIClient.js';
import logger from '../utils/logger.js';

class EnhancedChatAssistant extends ChatAssistantAgent {
  constructor(config) {
    super(config);
    this.formContextAgent = new FormContextAgent(config);
    this.safeAIClient = new SafeAIClient(config);
    
    logger.info('EnhancedChatAssistant initialized with form context support and safe AI client');
  }

  /**
   * Handle chat message with form context awareness
   */
  async handleChatMessage(message, conversationId, context = {}) {
    // Extract form context if provided (moved outside try-catch for fallback access)
    const { formData } = context;
    let enhancedSystemPrompt = '';
    let formContextInfo = null;

    if (formData) {
      try {
        // Analyze current form state
        formContextInfo = this.formContextAgent.analyzeFormContext(formData);
        
        // Create enhanced system prompt with form context
        enhancedSystemPrompt = `

Current Form Context:
${this.formContextAgent.generateContextResponse(formContextInfo)}

You have access to the current form state and can:
1. Answer questions about the current form fields and settings
2. Suggest values or improvements for specific fields
3. Guide the user on how to complete or optimize their form
4. Perform actions like updating fields, deleting fields, or saving the form
5. Check if the form is ready to save and what's missing

When the user asks about form manipulation:
- To update a field: Provide clear instructions and format like "UPDATE_FIELD:{fieldId}:{property}:{value}"
- To delete a field: Format like "DELETE_FIELD:{fieldId}"
- To add a field: Format like "ADD_FIELD:{type}:{label}:{required}"
- To save form: First check readiness, then format like "SAVE_FORM:confirm"
- To update settings: Format like "UPDATE_SETTING:{setting}:{value}"`;
      } catch (contextError) {
        logger.logError(contextError, { context: 'EnhancedChatAssistant.analyzeFormContext' });
        // Continue without form context if analysis fails
      }
    }

    try {

      // Build messages with enhanced context
      const memory = this.getConversationMemory(conversationId);
      
      // Add user message to memory
      this.addToConversationMemory(conversationId, 'user', message);
      
      // Build conversation context with form awareness
      const messages = [
        {
          role: 'system',
          content: `You are FormAgent AI, a friendly and knowledgeable AI assistant specialized in helping users with form creation and general conversation.

Your capabilities include:
1. Answering general questions in a natural and helpful way
2. Providing advice on form design and user experience
3. Explaining FormAgent features and capabilities
4. Having engaging conversations while being informative

Context Information:
- User ID: ${context.userId || 'anonymous'}
- Language: ${context.language || 'Vietnamese'}
- Timestamp: ${new Date().toISOString()}

Guidelines:
- Be friendly, helpful, and conversational
- Provide accurate and relevant information
- Ask clarifying questions when needed
- Maintain context from previous messages
- Be concise but thorough
- Use appropriate tone for the conversation
- If you don't know something, say so honestly
- For form creation requests, guide users to use specific keywords like "tạo form", "tạo biểu mẫu"

${enhancedSystemPrompt}

Respond naturally and helpfully in ${context.language || 'Vietnamese'}.`
        }
      ];

      // Add conversation history (last 10 messages)
      const recentHistory = memory.slice(-10);
      messages.push(...recentHistory);

      // Use SafeAIClient - this will NEVER throw errors
      const aiResult = await this.safeAIClient.createChatCompletion(messages, {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });

      let response = aiResult.response;
      let service = aiResult.service;

      // If we got a fallback response and have form context, try to enhance it
      if (aiResult.fallback && formData && formContextInfo) {
        response = this.enhanceWithFormContext(response, message, formContextInfo);
        service = 'enhanced-fallback';
      }

      logger.info('Chat message processed with safe AI client', { 
        conversationId,
        responseLength: response?.length,
        hasFormData: !!formData,
        service: service,
        wasFallback: aiResult.fallback
      });
      
      // Add assistant response to memory
      this.addToConversationMemory(conversationId, 'assistant', response);

      const baseResponse = {
        response: response,
        conversationId,
        timestamp: new Date().toISOString(),
        service: service,
        context: {
          messageCount: memory.length,
          lastActivity: new Date().toISOString()
        }
      };

      // Process form-related commands in the response
      if (formData && baseResponse.response) {
        const { processedResponse, actions } = this.processFormCommands(baseResponse.response, formContextInfo);
        
        return {
          ...baseResponse,
          response: processedResponse,
          formActions: actions,
          formContext: formContextInfo
        };
      }

      return baseResponse;
    } catch (error) {
      logger.logError(error, { context: 'EnhancedChatAssistant.handleChatMessage - Main Handler' });
      
      // Return comprehensive fallback response
      let fallbackResponse;
      if (formData && formContextInfo) {
        fallbackResponse = this.generateFormContextFallbackResponse(message, formContextInfo);
      } else {
        fallbackResponse = this.generateGeneralFallbackResponse(message, context);
      }
      
      // Add to conversation memory
      this.addToConversationMemory(conversationId, 'user', message);
      this.addToConversationMemory(conversationId, 'assistant', fallbackResponse);
      
      return {
        response: fallbackResponse,
        conversationId,
        timestamp: new Date().toISOString(),
        service: 'main-error-fallback',
        formActions: [],
        formContext: formData ? this.formContextAgent.analyzeFormContext(formData) : null,
        context: {
          messageCount: this.getConversationMemory(conversationId).length,
          lastActivity: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Process form-related commands in the response
   */
  processFormCommands(response, formContext) {
    const actions = [];
    let processedResponse = response;

    // Check for form manipulation commands
    const commands = {
      UPDATE_FIELD: /UPDATE_FIELD:([^:]+):([^:]+):(.+)/g,
      DELETE_FIELD: /DELETE_FIELD:([^:]+)/g,
      ADD_FIELD: /ADD_FIELD:([^:]+):([^:]+):([^:]+)/g,
      SAVE_FORM: /SAVE_FORM:confirm/g,
      UPDATE_SETTING: /UPDATE_SETTING:([^:]+):(.+)/g
    };

    // Process UPDATE_FIELD commands
    let match;
    while ((match = commands.UPDATE_FIELD.exec(response)) !== null) {
      actions.push({
        type: 'updateField',
        fieldId: match[1],
        property: match[2],
        value: match[3]
      });
      processedResponse = processedResponse.replace(match[0], '');
    }

    // Process DELETE_FIELD commands
    commands.DELETE_FIELD.lastIndex = 0;
    while ((match = commands.DELETE_FIELD.exec(response)) !== null) {
      actions.push({
        type: 'deleteField',
        fieldId: match[1]
      });
      processedResponse = processedResponse.replace(match[0], '');
    }

    // Process ADD_FIELD commands
    commands.ADD_FIELD.lastIndex = 0;
    while ((match = commands.ADD_FIELD.exec(response)) !== null) {
      actions.push({
        type: 'addField',
        fieldType: match[1],
        label: match[2],
        required: match[3] === 'true'
      });
      processedResponse = processedResponse.replace(match[0], '');
    }

    // Process SAVE_FORM commands
    if (commands.SAVE_FORM.test(response)) {
      if (formContext?.readiness?.canSave) {
        actions.push({
          type: 'saveForm',
          confirm: true
        });
        processedResponse = processedResponse.replace(/SAVE_FORM:confirm/g, '');
      } else {
        // Add warning about why form can't be saved
        const issues = formContext?.readiness?.missingRequirements || [];
        processedResponse += `\n\n⚠️ Form chưa sẵn sàng để lưu. Còn thiếu: ${issues.join(', ')}`;
      }
    }

    // Process UPDATE_SETTING commands
    commands.UPDATE_SETTING.lastIndex = 0;
    while ((match = commands.UPDATE_SETTING.exec(response)) !== null) {
      actions.push({
        type: 'updateSetting',
        setting: match[1],
        value: match[2]
      });
      processedResponse = processedResponse.replace(match[0], '');
    }

    // Clean up extra whitespace
    processedResponse = processedResponse.trim();

    return { processedResponse, actions };
  }

  /**
   * Handle form-specific queries
   */
  async handleFormQuery(query, formData) {
    try {
      const formContext = this.formContextAgent.analyzeFormContext(formData);
      
      // Determine query type
      const queryType = this.classifyFormQuery(query);
      
      switch (queryType) {
        case 'status':
          return {
            response: this.formContextAgent.generateContextResponse(formContext),
            formContext
          };
          
        case 'validation':
          return {
            response: this.generateValidationResponse(formContext.validation),
            formContext
          };
          
        case 'suggestions':
          return {
            response: this.generateSuggestionsResponse(formContext.suggestions),
            formContext
          };
          
        case 'readiness':
          return {
            response: this.generateReadinessResponse(formContext.readiness),
            formContext
          };
          
        case 'field_help':
          return {
            response: await this.generateFieldHelpResponse(query, formContext),
            formContext
          };
          
        default:
          // Use general chat with form context
          return await this.handleChatMessage(query, 'form_query', { formData });
      }
    } catch (error) {
      logger.logError(error, { context: 'EnhancedChatAssistant.handleFormQuery' });
      throw error;
    }
  }

  /**
   * Classify form-related queries
   */
  classifyFormQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('trạng thái') || lowerQuery.includes('status') || 
        lowerQuery.includes('hiện tại')) {
      return 'status';
    }
    
    if (lowerQuery.includes('validation') || lowerQuery.includes('lỗi') || 
        lowerQuery.includes('kiểm tra')) {
      return 'validation';
    }
    
    if (lowerQuery.includes('gợi ý') || lowerQuery.includes('suggest') || 
        lowerQuery.includes('cải thiện')) {
      return 'suggestions';
    }
    
    if (lowerQuery.includes('lưu') || lowerQuery.includes('save') || 
        lowerQuery.includes('sẵn sàng')) {
      return 'readiness';
    }
    
    if (lowerQuery.includes('field') || lowerQuery.includes('trường') || 
        lowerQuery.includes('điền')) {
      return 'field_help';
    }
    
    return 'general';
  }

  /**
   * Generate validation-specific response
   */
  generateValidationResponse(validation) {
    let response = '🔍 **Kết quả kiểm tra form:**\n\n';
    
    if (validation.isValid) {
      response += '✅ Form hiện tại không có lỗi!\n';
    } else {
      response += '❌ Form có một số vấn đề cần khắc phục:\n\n';
      response += '**Lỗi:**\n';
      validation.errors.forEach(error => {
        response += `• ${error}\n`;
      });
    }
    
    if (validation.warnings.length > 0) {
      response += '\n**Cảnh báo:**\n';
      validation.warnings.forEach(warning => {
        response += `• ${warning}\n`;
      });
    }
    
    response += `\n**Có thể lưu form:** ${validation.canSave ? 'Có ✅' : 'Chưa ❌'}`;
    
    return response;
  }

  /**
   * Generate suggestions response
   */
  generateSuggestionsResponse(suggestions) {
    if (suggestions.length === 0) {
      return '✨ Form của bạn đã khá hoàn thiện! Không có gợi ý cải thiện nào.';
    }
    
    let response = '💡 **Gợi ý cải thiện form:**\n\n';
    
    const priorityGroups = {
      high: suggestions.filter(s => s.priority === 'high'),
      medium: suggestions.filter(s => s.priority === 'medium'),
      low: suggestions.filter(s => s.priority === 'low')
    };
    
    if (priorityGroups.high.length > 0) {
      response += '**🔴 Quan trọng:**\n';
      priorityGroups.high.forEach(s => {
        response += `• ${s.message}\n`;
      });
      response += '\n';
    }
    
    if (priorityGroups.medium.length > 0) {
      response += '**🟡 Nên làm:**\n';
      priorityGroups.medium.forEach(s => {
        response += `• ${s.message}\n`;
      });
      response += '\n';
    }
    
    if (priorityGroups.low.length > 0) {
      response += '**🟢 Tùy chọn:**\n';
      priorityGroups.low.forEach(s => {
        response += `• ${s.message}\n`;
      });
    }
    
    return response;
  }

  /**
   * Generate readiness response
   */
  generateReadinessResponse(readiness) {
    let response = '💾 **Kiểm tra sẵn sàng lưu form:**\n\n';
    
    response += `**Điểm hoàn thiện:** ${readiness.readinessScore}/100\n`;
    response += `**Có thể lưu:** ${readiness.canSave ? '✅ Có' : '❌ Chưa'}\n\n`;
    
    if (!readiness.canSave) {
      response += '**Cần hoàn thành:**\n';
      readiness.missingRequirements.forEach(req => {
        response += `• ${req}\n`;
      });
      response += '\n';
    }
    
    if (readiness.warnings.length > 0) {
      response += '**Lưu ý:**\n';
      readiness.warnings.forEach(warning => {
        response += `• ${warning}\n`;
      });
    }
    
    if (readiness.canSave) {
      response += '\n✅ Form đã sẵn sàng để lưu! Bạn có muốn lưu form ngay bây giờ không?';
    }
    
    return response;
  }

  /**
   * Generate field-specific help
   */
  async generateFieldHelpResponse(query, formContext) {
    const { fields } = formContext;
    
    // Try to identify which field the user is asking about
    const fieldMentioned = this.identifyFieldFromQuery(query, fields.fields);
    
    if (fieldMentioned) {
      let response = `📝 **Hướng dẫn cho trường "${fieldMentioned.label}":**\n\n`;
      response += `• **Loại:** ${fieldMentioned.type}\n`;
      response += `• **Bắt buộc:** ${fieldMentioned.required ? 'Có' : 'Không'}\n`;
      
      if (fieldMentioned.issues.length > 0) {
        response += `• **Vấn đề:** ${fieldMentioned.issues.join(', ')}\n`;
      }
      
      if (fieldMentioned.suggestions.length > 0) {
        response += `• **Gợi ý:** ${fieldMentioned.suggestions.join(', ')}\n`;
      }
      
      // Add type-specific guidance
      response += '\n' + this.getFieldTypeGuidance(fieldMentioned.type);
      
      return response;
    }
    
    // General field help
    return this.generateGeneralFieldHelp(fields);
  }

  /**
   * Identify field from query
   */
  identifyFieldFromQuery(query, fields) {
    const lowerQuery = query.toLowerCase();
    
    return fields.find(field => {
      const fieldLabel = field.label?.toLowerCase() || '';
      const fieldId = field.id?.toLowerCase() || '';
      
      return lowerQuery.includes(fieldLabel) || lowerQuery.includes(fieldId);
    });
  }

  /**
   * Get field type specific guidance
   */
  getFieldTypeGuidance(type) {
    const guidance = {
      text: 'Nhập văn bản ngắn, thường dưới 100 ký tự.',
      email: 'Nhập địa chỉ email hợp lệ, ví dụ: user@example.com',
      number: 'Nhập số, có thể là số nguyên hoặc số thập phân.',
      tel: 'Nhập số điện thoại, ví dụ: 0912345678',
      date: 'Chọn ngày từ lịch hoặc nhập theo định dạng ngày/tháng/năm.',
      textarea: 'Nhập văn bản dài, có thể nhiều dòng.',
      select: 'Chọn một tùy chọn từ danh sách.',
      radio: 'Chọn một trong các tùy chọn được cung cấp.',
      checkbox: 'Đánh dấu vào ô vuông để chọn.'
    };
    
    return guidance[type] || 'Nhập thông tin phù hợp với loại trường.';
  }

  /**
   * Generate general field help
   */
  generateGeneralFieldHelp(fields) {
    let response = '📋 **Hướng dẫn điền form:**\n\n';
    
    response += `Form hiện có ${fields.totalFields} trường:\n`;
    response += `• ${fields.requiredFields} trường bắt buộc (có dấu *)\n`;
    response += `• ${fields.optionalFields} trường tùy chọn\n\n`;
    
    response += '**Các loại trường trong form:**\n';
    Object.entries(fields.typeDistribution).forEach(([type, count]) => {
      response += `• ${type}: ${count} trường\n`;
    });
    
    response += '\n**Mẹo điền form:**\n';
    response += '• Điền đầy đủ các trường bắt buộc trước\n';
    response += '• Kiểm tra định dạng email và số điện thoại\n';
    response += '• Đọc kỹ nhãn và placeholder của mỗi trường\n';
    response += '• Sử dụng nút Preview để xem form như người dùng\n';
    
    return response;
  }

  /**
   * Generate fallback response when AI is unavailable but we have form context
   */
  generateFormContextFallbackResponse(message, formContext) {
    const lowerMessage = message.toLowerCase();
    
    // Status queries
    if (lowerMessage.includes('trạng thái') || lowerMessage.includes('status') || 
        lowerMessage.includes('thế nào') || lowerMessage.includes('như nào')) {
      return this.formContextAgent.generateContextResponse(formContext);
    }
    
    // Validation queries
    if (lowerMessage.includes('lỗi') || lowerMessage.includes('kiểm tra') || 
        lowerMessage.includes('validation')) {
      return this.generateValidationResponse(formContext.validation);
    }
    
    // Save queries
    if (lowerMessage.includes('lưu') || lowerMessage.includes('save')) {
      return this.generateReadinessResponse(formContext.readiness);
    }
    
    // Field count or general info
    if (lowerMessage.includes('field') || lowerMessage.includes('trường') || 
        lowerMessage.includes('bao nhiêu')) {
      const { overview, fields } = formContext;
      return `📋 Form "${overview.title}" hiện có ${overview.fieldCount} trường thông tin:\n\n` +
             fields.fields.map((f, i) => `${i + 1}. ${f.label} (${f.type})${f.required ? ' *' : ''}`).join('\n') +
             `\n\n${overview.requiredFieldCount} trường bắt buộc, ${fields.optionalFields} trường tùy chọn.`;
    }
    
    // General help
    return `🤖 Tôi đang gặp vấn đề với AI service, nhưng vẫn có thể giúp bạn với form hiện tại!\n\n` +
           `📋 **Form của bạn:**\n` +
           `• Tiêu đề: ${formContext.overview.title}\n` +
           `• Số trường: ${formContext.overview.fieldCount}\n` +
           `• Trạng thái: ${formContext.validation.isValid ? 'Hợp lệ ✅' : 'Có lỗi ❌'}\n` +
           `• Sẵn sàng lưu: ${formContext.readiness.canSave ? 'Có ✅' : 'Chưa ❌'}\n\n` +
           `Bạn có thể hỏi tôi về:\n` +
           `• Trạng thái form\n` +
           `• Thông tin các trường\n` +
           `• Kiểm tra lỗi\n` +
           `• Tính sẵn sàng để lưu`;
  }

  /**
   * Generate general fallback response when AI is unavailable
   */
  generateGeneralFallbackResponse(message, context) {
    const lowerMessage = message.toLowerCase();
    
    // Greeting
    if (lowerMessage.includes('xin chào') || lowerMessage.includes('hello') || 
        lowerMessage.includes('hi') || lowerMessage.includes('chào')) {
      return `Xin chào! 👋 Tôi là FormAgent AI.\n\n` +
             `Hiện tại tôi đang gặp vấn đề kết nối với AI service, nhưng vẫn có thể giúp bạn:\n\n` +
             `📝 **Tạo form:** Mô tả form bạn muốn tạo\n` +
             `💬 **Trò chuyện:** Hỏi về tính năng FormAgent\n` +
             `🔧 **Hỗ trợ:** Giải đáp thắc mắc cơ bản\n\n` +
             `Bạn muốn làm gì?`;
    }
    
    // Form creation
    if (lowerMessage.includes('tạo form') || lowerMessage.includes('tạo biểu mẫu') ||
        lowerMessage.includes('form mới')) {
      return `📝 Để tạo form mới, hãy mô tả chi tiết form bạn muốn tạo.\n\n` +
             `**Ví dụ:**\n` +
             `• "Tạo form đăng ký khóa học gồm họ tên, email, số điện thoại"\n` +
             `• "Tạo form khảo sát khách hàng"\n` +
             `• "Tạo form liên hệ đơn giản"\n\n` +
             `Hiện tại AI service gặp vấn đề, nhưng bạn vẫn có thể tạo form với template có sẵn.`;
    }
    
    // Help
    if (lowerMessage.includes('giúp') || lowerMessage.includes('help') ||
        lowerMessage.includes('hướng dẫn')) {
      return `🤖 **FormAgent AI - Trợ lý tạo form thông minh**\n\n` +
             `**Tính năng chính:**\n` +
             `📝 Tạo form tự động từ mô tả\n` +
             `🎯 Tối ưu hóa form cho UX tốt nhất\n` +
             `✅ Validation thông minh\n` +
             `💾 Lưu và chia sẻ form\n\n` +
             `**Cách sử dụng:**\n` +
             `1. Mô tả form bạn muốn tạo\n` +
             `2. AI sẽ tạo form phù hợp\n` +
             `3. Chỉnh sửa nếu cần\n` +
             `4. Lưu và sử dụng\n\n` +
             `*Lưu ý: AI service hiện đang gặp vấn đề, một số tính năng có thể bị hạn chế.*`;
    }
    
    // Default response
    return `🤖 Xin chào! Tôi là FormAgent AI.\n\n` +
           `Hiện tại tôi gặp vấn đề kết nối với AI service, nhưng vẫn có thể hỗ trợ bạn với các tính năng cơ bản.\n\n` +
           `Bạn có thể:\n` +
           `• Mô tả form muốn tạo\n` +
           `• Hỏi về tính năng FormAgent\n` +
           `• Tìm hiểu cách sử dụng\n\n` +
           `Tôi sẽ cố gắng hỗ trợ bạn tốt nhất có thể! 😊`;
  }

  /**
   * Enhance fallback response with form context information
   */
  enhanceWithFormContext(fallbackResponse, userMessage, formContext) {
    const { overview, validation, readiness } = formContext;
    
    // Add current form status to the response
    const formStatus = `\n\n📋 **Form hiện tại:**\n` +
                      `• ${overview.title} (${overview.fieldCount} trường)\n` +
                      `• Trạng thái: ${validation.isValid ? 'Hợp lệ ✅' : 'Có lỗi ❌'}\n` +
                      `• Sẵn sàng lưu: ${readiness.canSave ? 'Có ✅' : 'Chưa ❌'}`;
    
    return fallbackResponse + formStatus;
  }
}

export default EnhancedChatAssistant;