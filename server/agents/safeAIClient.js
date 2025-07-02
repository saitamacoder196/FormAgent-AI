import logger from '../utils/logger.js';

/**
 * Safe AI Client wrapper that never throws errors to the user
 * Always returns a valid response, even if AI service fails
 */
class SafeAIClient {
  constructor(config) {
    this.config = config;
    this.isEnabled = false;
    this.client = null;
    this.initializationPromise = null;
    
    // Start initialization but don't wait for it
    this.initializationPromise = this.initializeClient().catch(error => {
      logger.logError(error, { context: 'SafeAIClient.constructor' });
      this.isEnabled = false;
    });
  }

  async initializeClient() {
    try {
      if (this.config.provider === 'azure') {
        const { AzureOpenAI } = await import('openai');
        this.client = new AzureOpenAI({
          apiKey: this.config.apiKey,
          endpoint: this.config.endpoint,
          apiVersion: this.config.apiVersion
        });
      } else {
        const { default: OpenAI } = await import('openai');
        this.client = new OpenAI({
          apiKey: this.config.apiKey
        });
      }
      this.isEnabled = true;
      logger.info('SafeAIClient initialized successfully', { provider: this.config.provider });
    } catch (error) {
      this.isEnabled = false;
      logger.logError(error, { context: 'SafeAIClient.initializeClient' });
      throw error;
    }
  }

  /**
   * Safe chat completion that never throws errors
   */
  async createChatCompletion(messages, options = {}) {
    // Wait for initialization to complete
    if (this.initializationPromise) {
      try {
        await this.initializationPromise;
      } catch (error) {
        // Initialization failed, use fallback
        logger.warn('AI client initialization failed, using fallback', { error: error.message });
        return this.createFallbackResponse(messages, error);
      }
    }

    // If client is still not enabled, return fallback immediately
    if (!this.isEnabled || !this.client) {
      logger.warn('AI client not enabled after initialization, returning fallback response');
      return this.createFallbackResponse(messages);
    }

    try {
      logger.info('SafeAIClient: Attempting AI request', {
        provider: this.config.provider,
        endpoint: this.config.endpoint,
        deployment: this.config.deployment,
        model: this.config.model,
        apiVersion: this.config.apiVersion,
        hasApiKey: !!this.config.apiKey,
        messageCount: messages.length
      });

      // Log the exact request being made
      const requestModel = this.config.provider === 'azure' ? this.config.deployment : this.config.model;
      logger.info('SafeAIClient: Making OpenAI request', {
        requestModel: requestModel,
        requestParams: {
          model: requestModel,
          temperature: options.temperature || this.config.temperature || 0.7,
          max_tokens: options.maxTokens || this.config.maxTokens || 2000
        }
      });

      const completion = await this.client.chat.completions.create({
        model: requestModel,
        messages: messages,
        temperature: options.temperature || this.config.temperature || 0.7,
        max_tokens: options.maxTokens || this.config.maxTokens || 2000,
        ...options
      });

      const response = completion.choices[0].message.content;
      
      logger.info('SafeAIClient: AI request successful', {
        responseLength: response?.length,
        usage: completion.usage
      });

      return {
        success: true,
        response: response,
        usage: completion.usage,
        service: this.config.provider === 'azure' ? 'azure-openai' : 'openai'
      };

    } catch (error) {
      // COMPREHENSIVE ERROR LOGGING
      logger.error('SafeAIClient: AI request failed - DETAILED ERROR INFO', {
        context: 'SafeAIClient.createChatCompletion',
        errorType: error.constructor.name,
        errorMessage: error.message,
        status: error.status,
        code: error.code,
        type: error.type,
        param: error.param,
        configUsed: {
          provider: this.config.provider,
          endpoint: this.config.endpoint,
          deployment: this.config.deployment,
          model: this.config.model,
          apiVersion: this.config.apiVersion,
          hasApiKey: !!this.config.apiKey,
          apiKeyPreview: this.config.apiKey ? this.config.apiKey.substring(0, 10) + '...' : 'MISSING'
        },
        requestDetails: {
          modelUsed: this.config.provider === 'azure' ? this.config.deployment : this.config.model,
          messageCount: messages.length,
          options: options
        },
        fullErrorStack: error.stack
      });

      // Log specific guidance for common errors
      if (error.status === 404) {
        logger.error('SafeAIClient: 404 Error Analysis', {
          possibleCauses: [
            'Deployment name incorrect or not found',
            'Model not deployed in Azure',
            'Endpoint URL incorrect',
            'API version not supported',
            'Resource not found in specified region'
          ],
          checkList: [
            `Endpoint: ${this.config.endpoint}`,
            `Deployment: ${this.config.deployment}`,
            `API Version: ${this.config.apiVersion}`,
            `Full URL would be: ${this.config.endpoint}openai/deployments/${this.config.deployment}/chat/completions?api-version=${this.config.apiVersion}`
          ]
        });
      }

      // Always return a fallback response, never throw
      logger.info('SafeAIClient: Returning fallback response');
      return this.createFallbackResponse(messages, error);
    }
  }

  /**
   * Create intelligent fallback response based on the conversation
   */
  createFallbackResponse(messages, error = null) {
    const lastUserMessage = messages.findLast(msg => msg.role === 'user')?.content || '';
    const systemMessage = messages.find(msg => msg.role === 'system')?.content || '';
    
    let fallbackResponse;

    // Check if this is a form-related conversation
    const isFormContext = systemMessage.includes('Current Form Context') || 
                         systemMessage.includes('form state');

    if (isFormContext) {
      fallbackResponse = this.generateFormContextFallback(lastUserMessage, systemMessage);
    } else {
      fallbackResponse = this.generateGeneralFallback(lastUserMessage);
    }

    // Add error-specific guidance if available
    if (error?.status === 404) {
      fallbackResponse += '\n\n💡 *Lưu ý: Hệ thống AI đang gặp vấn đề cấu hình. Vui lòng kiểm tra Azure OpenAI deployment và endpoint.*';
    } else if (error?.status === 401) {
      fallbackResponse += '\n\n💡 *Lưu ý: Vấn đề xác thực AI service. Vui lòng kiểm tra API key.*';
    } else if (error) {
      fallbackResponse += '\n\n💡 *Lưu ý: AI service tạm thời không khả dụng, nhưng tôi vẫn có thể hỗ trợ bạn.*';
    }

    return {
      success: true, // Always return success to prevent further error handling
      response: fallbackResponse,
      service: 'safe-fallback',
      fallback: true,
      originalError: error?.message || null
    };
  }

  /**
   * Generate fallback for form-related conversations
   */
  generateFormContextFallback(userMessage, systemMessage) {
    const lowerMessage = userMessage.toLowerCase();

    // Extract form info from system message if available
    let formInfo = '';
    if (systemMessage.includes('Form "')) {
      const titleMatch = systemMessage.match(/Form "([^"]+)"/);
      const fieldMatch = systemMessage.match(/(\d+) trường thông tin/);
      if (titleMatch || fieldMatch) {
        formInfo = `📋 Form hiện tại: ${titleMatch?.[1] || 'Không có tiêu đề'} (${fieldMatch?.[1] || '0'} trường)`;
      }
    }

    // Status queries
    if (lowerMessage.includes('trạng thái') || lowerMessage.includes('status') || 
        lowerMessage.includes('thế nào') || lowerMessage.includes('như nào')) {
      return `🤖 Tôi đang tạm thời không thể kết nối với AI service, nhưng vẫn có thể giúp bạn!\n\n${formInfo}\n\nBạn có thể:\n• Xem và chỉnh sửa form bằng giao diện\n• Hỏi tôi về các trường cụ thể\n• Thử lưu form nếu đã hoàn thành`;
    }

    // Save queries
    if (lowerMessage.includes('lưu') || lowerMessage.includes('save')) {
      return `💾 Để lưu form, bạn có thể:\n\n1. Kiểm tra form đã có đủ thông tin cần thiết\n2. Click nút "Lưu form" trong giao diện\n3. Hoặc sử dụng chức năng Export\n\n${formInfo || '📋 Hãy đảm bảo form có ít nhất tiêu đề và 2 trường thông tin.'}`;
    }

    // Field questions
    if (lowerMessage.includes('field') || lowerMessage.includes('trường')) {
      return `📝 Về các trường trong form:\n\n${formInfo}\n\nBạn có thể:\n• Thêm trường mới bằng nút "+" trong giao diện\n• Chỉnh sửa trường bằng cách click vào nó\n• Xóa trường không cần thiết\n• Đặt trường bắt buộc/tùy chọn`;
    }

    // General form help
    return `🤖 Xin chào! AI service tạm thời gặp vấn đề, nhưng tôi vẫn có thể hỗ trợ bạn.\n\n${formInfo}\n\n💡 Bạn có thể:\n• Sử dụng giao diện để chỉnh sửa form\n• Xem preview form\n• Thêm/xóa/sửa các trường\n• Lưu form khi hoàn thành\n\nHãy cho tôi biết bạn cần hỗ trợ gì cụ thể!`;
  }

  /**
   * Generate general fallback response
   */
  generateGeneralFallback(userMessage) {
    const lowerMessage = userMessage.toLowerCase();

    // Greeting
    if (lowerMessage.includes('xin chào') || lowerMessage.includes('hello') || 
        lowerMessage.includes('hi') || lowerMessage.includes('chào')) {
      return `Xin chào! 👋 Tôi là FormAgent AI.\n\nHiện AI service đang gặp vấn đề kỹ thuật, nhưng tôi vẫn có thể hỗ trợ bạn:\n\n📝 **Tạo form:** Sử dụng giao diện để tạo form\n💬 **Hướng dẫn:** Giải đáp các câu hỏi về form\n🔧 **Chỉnh sửa:** Hỗ trợ tùy chỉnh form\n\nBạn muốn làm gì hôm nay?`;
    }

    // Form creation
    if (lowerMessage.includes('tạo form') || lowerMessage.includes('tạo biểu mẫu') ||
        lowerMessage.includes('form mới')) {
      return `📝 Để tạo form mới:\n\n1. **Sử dụng giao diện:** Click "Thêm trường" để tạo form thủ công\n2. **Template có sẵn:** Chọn từ các mẫu form phổ biến\n3. **Import:** Nhập từ file CSV/JSON\n\n💡 Mặc dù AI tạm thời không khả dụng, bạn vẫn có thể tạo form hiệu quả với các công cụ có sẵn!`;
    }

    // Help
    if (lowerMessage.includes('giúp') || lowerMessage.includes('help') ||
        lowerMessage.includes('hướng dẫn')) {
      return `🤖 **FormAgent AI - Hỗ trợ thủ công**\n\n**Tính năng hiện có:**\n📝 Tạo form bằng giao diện\n✏️ Chỉnh sửa trường form\n👁️ Preview form\n💾 Lưu và chia sẻ form\n📊 Xem submissions\n\n**Cách sử dụng:**\n1. Thêm các trường cần thiết\n2. Cấu hình thuộc tính trường\n3. Preview và kiểm tra\n4. Lưu form\n\n*AI service sẽ sớm hoạt động trở lại!*`;
    }

    // Default response
    return `🤖 Xin chào! Tôi là FormAgent AI.\n\nHiện tại AI service gặp vấn đề kỹ thuật, nhưng FormAgent vẫn hoạt động bình thường với:\n\n✅ Tạo form thủ công\n✅ Chỉnh sửa form\n✅ Preview form\n✅ Lưu và chia sẻ\n\nBạn có thể tiếp tục sử dụng giao diện để tạo form. Tôi sẽ hỗ trợ hướng dẫn khi cần! 😊`;
  }

  /**
   * Check if AI service is working
   */
  async healthCheck() {
    if (!this.isEnabled || !this.client) {
      return { healthy: false, reason: 'Client not initialized' };
    }

    try {
      const testResult = await this.createChatCompletion([
        { role: 'user', content: 'Test message' }
      ], { max_tokens: 10 });

      return { 
        healthy: testResult.success && !testResult.fallback,
        reason: testResult.fallback ? 'Fallback response' : 'Working normally'
      };
    } catch (error) {
      return { healthy: false, reason: error.message };
    }
  }
}

export default SafeAIClient;