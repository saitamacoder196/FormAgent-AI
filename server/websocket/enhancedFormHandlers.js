import EnhancedChatAssistant from '../agents/enhancedChatAssistant.js';
import FormContextAgent from '../agents/formContextAgent.js';
import logger from '../utils/logger.js';

class EnhancedFormHandlers {
  constructor(aiConfig) {
    this.enhancedChatAssistant = new EnhancedChatAssistant(aiConfig);
    this.formContextAgent = new FormContextAgent(aiConfig);
  }

  /**
   * Handle chat messages with form context awareness
   */
  async handleChatWithFormContext(socket, data) {
    try {
      const { 
        message, 
        conversation_id, 
        context = {}, 
        formData = null,
        userId = 'anonymous' 
      } = data;

      logger.info('Processing chat with form context', {
        hasFormData: !!formData,
        conversationId: conversation_id
      });

      // Enhanced context with form data
      const enhancedContext = {
        ...context,
        formData
      };

      // Process chat message with form awareness
      const response = await this.enhancedChatAssistant.handleChatMessage(
        message,
        conversation_id,
        enhancedContext
      );

      // Handle form actions if any
      if (response.formActions && response.formActions.length > 0) {
        socket.emit('form-actions', {
          actions: response.formActions,
          timestamp: new Date().toISOString()
        });
      }

      // Send chat response
      socket.emit('chat-response', {
        success: true,
        response: response.response,
        conversation_id,
        service: 'enhanced-assistant',
        formContext: response.formContext,
        metadata: {
          hasFormActions: response.formActions?.length > 0,
          formReadiness: response.formContext?.readiness
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.logError(error, { context: 'EnhancedFormHandlers.handleChatWithFormContext' });
      socket.emit('chat-error', {
        success: false,
        error: 'Failed to process chat message',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle form status queries
   */
  async handleFormStatusQuery(socket, data) {
    try {
      const { formData, query = 'status' } = data;

      if (!formData) {
        socket.emit('form-status-error', {
          success: false,
          error: 'No form data provided',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Analyze form context
      const formContext = this.formContextAgent.analyzeFormContext(formData);
      
      // Generate appropriate response based on query type
      let response;
      switch (query) {
        case 'full':
          response = this.formContextAgent.generateContextResponse(formContext);
          break;
        case 'validation':
          response = this.generateValidationSummary(formContext.validation);
          break;
        case 'readiness':
          response = this.generateReadinessSummary(formContext.readiness);
          break;
        default:
          response = this.generateQuickStatus(formContext);
      }

      socket.emit('form-status-response', {
        success: true,
        response,
        formContext,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.logError(error, { context: 'EnhancedFormHandlers.handleFormStatusQuery' });
      socket.emit('form-status-error', {
        success: false,
        error: 'Failed to analyze form status',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle form manipulation requests
   */
  async handleFormManipulation(socket, data) {
    try {
      const { action, params, formData } = data;

      if (!formData) {
        socket.emit('form-manipulation-error', {
          success: false,
          error: 'No form data provided',
          timestamp: new Date().toISOString()
        });
        return;
      }

      let updatedFormData = { ...formData };
      let response = '';

      switch (action) {
        case 'updateField':
          updatedFormData = this.updateField(updatedFormData, params);
          response = `Đã cập nhật trường "${params.fieldId}"`;
          break;

        case 'deleteField':
          updatedFormData = this.deleteField(updatedFormData, params);
          response = `Đã xóa trường "${params.fieldId}"`;
          break;

        case 'addField':
          updatedFormData = this.addField(updatedFormData, params);
          response = `Đã thêm trường mới "${params.label}"`;
          break;

        case 'updateSetting':
          updatedFormData = this.updateSetting(updatedFormData, params);
          response = `Đã cập nhật ${params.setting}`;
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Analyze updated form
      const formContext = this.formContextAgent.analyzeFormContext(updatedFormData);

      socket.emit('form-manipulation-response', {
        success: true,
        response,
        updatedFormData,
        formContext,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.logError(error, { context: 'EnhancedFormHandlers.handleFormManipulation' });
      socket.emit('form-manipulation-error', {
        success: false,
        error: 'Failed to manipulate form',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle form save request with validation
   */
  async handleFormSave(socket, data) {
    try {
      const { formData, confirmSave = false } = data;

      if (!formData) {
        socket.emit('form-save-error', {
          success: false,
          error: 'No form data provided',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Analyze form readiness
      const formContext = this.formContextAgent.analyzeFormContext(formData);
      const { readiness } = formContext;

      // Check if form is ready to save
      if (!readiness.canSave) {
        socket.emit('form-save-confirmation', {
          success: false,
          canSave: false,
          issues: readiness.missingRequirements,
          warnings: readiness.warnings,
          message: `Form chưa sẵn sàng để lưu. Còn thiếu: ${readiness.missingRequirements.join(', ')}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // If not confirmed, ask for confirmation
      if (!confirmSave) {
        socket.emit('form-save-confirmation', {
          success: true,
          canSave: true,
          formSummary: {
            title: formData.title,
            description: formData.description,
            fieldCount: formData.fields?.length || 0,
            requiredFieldCount: formData.fields?.filter(f => f.required).length || 0
          },
          warnings: readiness.warnings,
          message: 'Form đã sẵn sàng để lưu. Bạn có chắc chắn muốn lưu form này?',
          requiresConfirmation: true,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Emit save event for the main application to handle
      socket.emit('form-save-ready', {
        success: true,
        formData,
        validation: formContext.validation,
        message: 'Form đã được xác nhận và sẵn sàng lưu',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.logError(error, { context: 'EnhancedFormHandlers.handleFormSave' });
      socket.emit('form-save-error', {
        success: false,
        error: 'Failed to process form save',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Helper: Update field in form data
   */
  updateField(formData, params) {
    const { fieldId, property, value } = params;
    const updatedFields = formData.fields.map(field => {
      if (field.id === fieldId) {
        return { ...field, [property]: value };
      }
      return field;
    });

    return { ...formData, fields: updatedFields };
  }

  /**
   * Helper: Delete field from form data
   */
  deleteField(formData, params) {
    const { fieldId } = params;
    const updatedFields = formData.fields.filter(field => field.id !== fieldId);
    return { ...formData, fields: updatedFields };
  }

  /**
   * Helper: Add new field to form data
   */
  addField(formData, params) {
    const { fieldType, label, required } = params;
    const newField = {
      id: `field_${Date.now()}`,
      type: fieldType,
      label,
      required,
      placeholder: ''
    };

    return {
      ...formData,
      fields: [...(formData.fields || []), newField]
    };
  }

  /**
   * Helper: Update form setting
   */
  updateSetting(formData, params) {
    const { setting, value } = params;
    return { ...formData, [setting]: value };
  }

  /**
   * Generate validation summary
   */
  generateValidationSummary(validation) {
    if (validation.isValid) {
      return '✅ Form không có lỗi';
    }
    return `❌ Form có ${validation.errors.length} lỗi và ${validation.warnings.length} cảnh báo`;
  }

  /**
   * Generate readiness summary
   */
  generateReadinessSummary(readiness) {
    return `Form ${readiness.canSave ? 'sẵn sàng' : 'chưa sẵn sàng'} để lưu (${readiness.readinessScore}/100 điểm)`;
  }

  /**
   * Generate quick status
   */
  generateQuickStatus(formContext) {
    const { overview, validation, readiness } = formContext;
    return `📋 ${overview.title} - ${overview.fieldCount} trường - ${validation.isValid ? '✅' : '❌'} - ${readiness.readinessScore}/100 điểm`;
  }
}

export default EnhancedFormHandlers;