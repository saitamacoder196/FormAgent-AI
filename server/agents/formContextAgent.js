import logger from '../utils/logger.js';

class FormContextAgent {
  constructor(config) {
    this.config = config;
    this.role = 'Form Context Assistant';
    
    logger.info('FormContext Agent initialized', { 
      agent: 'FormContextAgent'
    });
  }

  /**
   * Analyze the current form state and provide context
   */
  analyzeFormContext(formData) {
    try {
      const analysis = {
        overview: this.getFormOverview(formData),
        fields: this.analyzeFields(formData.fields),
        settings: this.analyzeSettings(formData),
        validation: this.validateForm(formData),
        suggestions: this.generateSuggestions(formData),
        readiness: this.checkFormReadiness(formData)
      };

      return analysis;
    } catch (error) {
      logger.logError(error, { context: 'FormContextAgent.analyzeFormContext' });
      throw error;
    }
  }

  /**
   * Get form overview
   */
  getFormOverview(formData) {
    return {
      title: formData.title || 'Chưa có tiêu đề',
      description: formData.description || 'Chưa có mô tả',
      fieldCount: formData.fields?.length || 0,
      requiredFieldCount: formData.fields?.filter(f => f.required).length || 0,
      hasSettings: !!(formData.startDate || formData.endDate || formData.triggerPhrases?.length),
      isComplete: this.isFormComplete(formData)
    };
  }

  /**
   * Analyze form fields
   */
  analyzeFields(fields = []) {
    const fieldAnalysis = fields.map((field, index) => ({
      index,
      id: field.id,
      label: field.label,
      type: field.type,
      required: field.required,
      hasOptions: !!(field.options && field.options.length > 0),
      issues: this.findFieldIssues(field),
      suggestions: this.getFieldSuggestions(field)
    }));

    const typeDistribution = fields.reduce((acc, field) => {
      acc[field.type] = (acc[field.type] || 0) + 1;
      return acc;
    }, {});

    return {
      fields: fieldAnalysis,
      typeDistribution,
      totalFields: fields.length,
      requiredFields: fields.filter(f => f.required).length,
      optionalFields: fields.filter(f => !f.required).length
    };
  }

  /**
   * Analyze form settings
   */
  analyzeSettings(formData) {
    const settings = {
      formTitle: {
        value: formData.title,
        isSet: !!formData.title,
        suggestion: !formData.title ? 'Thêm tiêu đề cho form để dễ nhận biết' : null
      },
      formDescription: {
        value: formData.description,
        isSet: !!formData.description,
        suggestion: !formData.description ? 'Thêm mô tả để người dùng hiểu rõ mục đích form' : null
      },
      introduction: {
        value: formData.introduction,
        isSet: !!formData.introduction,
        suggestion: !formData.introduction ? 'Thêm lời giới thiệu để tạo ấn tượng tốt' : null
      },
      startDate: {
        value: formData.startDate,
        isSet: !!formData.startDate,
        isValid: this.isValidDate(formData.startDate)
      },
      endDate: {
        value: formData.endDate,
        isSet: !!formData.endDate,
        isValid: this.isValidDate(formData.endDate),
        isAfterStart: this.isDateAfter(formData.endDate, formData.startDate)
      },
      triggerPhrases: {
        value: formData.triggerPhrases || [],
        count: formData.triggerPhrases?.length || 0,
        isSet: formData.triggerPhrases?.length > 0
      }
    };

    // Check for issues
    const issues = [];
    if (settings.startDate.isSet && settings.endDate.isSet && !settings.endDate.isAfterStart) {
      issues.push('Ngày kết thúc phải sau ngày bắt đầu');
    }

    return { ...settings, issues };
  }

  /**
   * Validate entire form
   */
  validateForm(formData) {
    const errors = [];
    const warnings = [];

    // Validate title
    if (!formData.title?.trim()) {
      errors.push('Form cần có tiêu đề');
    }

    // Validate fields
    if (!formData.fields || formData.fields.length === 0) {
      errors.push('Form cần có ít nhất một trường thông tin');
    } else {
      // Check for duplicate field IDs
      const fieldIds = formData.fields.map(f => f.id);
      const duplicates = fieldIds.filter((id, index) => fieldIds.indexOf(id) !== index);
      if (duplicates.length > 0) {
        errors.push(`Có field ID trùng lặp: ${duplicates.join(', ')}`);
      }

      // Check each field
      formData.fields.forEach((field, index) => {
        if (!field.label?.trim()) {
          warnings.push(`Field ${index + 1} cần có nhãn`);
        }
        if (!field.id?.trim()) {
          errors.push(`Field ${index + 1} cần có ID`);
        }
        if ((field.type === 'select' || field.type === 'radio') && (!field.options || field.options.length === 0)) {
          warnings.push(`Field "${field.label}" cần có ít nhất một lựa chọn`);
        }
      });
    }

    // Date validation
    if (formData.startDate && formData.endDate) {
      if (!this.isDateAfter(formData.endDate, formData.startDate)) {
        errors.push('Ngày kết thúc phải sau ngày bắt đầu');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canSave: errors.length === 0
    };
  }

  /**
   * Generate suggestions for form improvement
   */
  generateSuggestions(formData) {
    const suggestions = [];

    // Form-level suggestions
    if (!formData.description) {
      suggestions.push({
        type: 'form',
        priority: 'medium',
        message: 'Thêm mô tả cho form để người dùng hiểu rõ mục đích'
      });
    }

    if (!formData.introduction) {
      suggestions.push({
        type: 'form',
        priority: 'low',
        message: 'Thêm lời giới thiệu để tạo ấn tượng ban đầu tốt hơn'
      });
    }

    // Field suggestions
    const hasEmailField = formData.fields?.some(f => f.type === 'email');
    const hasPhoneField = formData.fields?.some(f => f.type === 'tel');
    
    if (!hasEmailField && !hasPhoneField) {
      suggestions.push({
        type: 'field',
        priority: 'high',
        message: 'Nên thêm ít nhất một phương thức liên hệ (email hoặc số điện thoại)'
      });
    }

    // Check field order
    const fieldTypes = formData.fields?.map(f => f.type) || [];
    if (fieldTypes.indexOf('textarea') < fieldTypes.lastIndexOf('text')) {
      suggestions.push({
        type: 'field',
        priority: 'low',
        message: 'Nên đặt các trường văn bản dài (textarea) ở cuối form'
      });
    }

    return suggestions;
  }

  /**
   * Check if form is ready to save
   */
  checkFormReadiness(formData) {
    const validation = this.validateForm(formData);
    const hasMinimumFields = formData.fields?.length >= 2;
    const hasRequiredInfo = !!formData.title?.trim();

    return {
      canSave: validation.canSave && hasMinimumFields && hasRequiredInfo,
      missingRequirements: [
        ...(!hasRequiredInfo ? ['Tiêu đề form'] : []),
        ...(!hasMinimumFields ? ['Cần ít nhất 2 trường thông tin'] : []),
        ...validation.errors
      ],
      warnings: validation.warnings,
      readinessScore: this.calculateReadinessScore(formData, validation)
    };
  }

  /**
   * Helper: Find issues with a field
   */
  findFieldIssues(field) {
    const issues = [];
    
    if (!field.label?.trim()) {
      issues.push('Thiếu nhãn');
    }
    
    if (!field.id?.trim()) {
      issues.push('Thiếu ID');
    }
    
    if ((field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && 
        (!field.options || field.options.length === 0)) {
      issues.push('Thiếu lựa chọn');
    }
    
    return issues;
  }

  /**
   * Helper: Get suggestions for a field
   */
  getFieldSuggestions(field) {
    const suggestions = [];
    
    if (field.type === 'email' && !field.placeholder) {
      suggestions.push('Thêm placeholder ví dụ: "email@example.com"');
    }
    
    if (field.type === 'tel' && !field.placeholder) {
      suggestions.push('Thêm placeholder ví dụ: "0912345678"');
    }
    
    if ((field.type === 'select' || field.type === 'radio') && field.options?.length === 1) {
      suggestions.push('Nên có ít nhất 2 lựa chọn');
    }
    
    return suggestions;
  }

  /**
   * Helper: Check if form is complete
   */
  isFormComplete(formData) {
    return !!(
      formData.title?.trim() &&
      formData.fields?.length > 0 &&
      formData.fields.every(f => f.id && f.label)
    );
  }

  /**
   * Helper: Validate date
   */
  isValidDate(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Helper: Check if date1 is after date2
   */
  isDateAfter(date1String, date2String) {
    if (!date1String || !date2String) return true;
    const date1 = new Date(date1String);
    const date2 = new Date(date2String);
    return date1 > date2;
  }

  /**
   * Helper: Calculate form readiness score
   */
  calculateReadinessScore(formData, validation) {
    let score = 0;
    const weights = {
      hasTitle: 20,
      hasDescription: 10,
      hasFields: 20,
      fieldsComplete: 20,
      noErrors: 20,
      hasSettings: 10
    };

    if (formData.title?.trim()) score += weights.hasTitle;
    if (formData.description?.trim()) score += weights.hasDescription;
    if (formData.fields?.length > 0) score += weights.hasFields;
    if (formData.fields?.every(f => f.id && f.label)) score += weights.fieldsComplete;
    if (validation.errors.length === 0) score += weights.noErrors;
    if (formData.startDate || formData.endDate || formData.triggerPhrases?.length) score += weights.hasSettings;

    return score;
  }

  /**
   * Generate natural language response about form state
   */
  generateContextResponse(analysis) {
    const { overview, fields, settings, validation, suggestions, readiness } = analysis;
    
    let response = `📋 **Trạng thái form hiện tại:**\n\n`;
    
    // Overview
    response += `**Tổng quan:**\n`;
    response += `• Tiêu đề: ${overview.title}\n`;
    response += `• Mô tả: ${overview.description}\n`;
    response += `• Số lượng trường: ${overview.fieldCount} (${overview.requiredFieldCount} bắt buộc)\n\n`;
    
    // Fields detail
    if (fields.totalFields > 0) {
      response += `**Chi tiết các trường:**\n`;
      fields.fields.forEach((field, index) => {
        response += `${index + 1}. **${field.label}** (${field.type})${field.required ? ' *' : ''}\n`;
        if (field.issues.length > 0) {
          response += `   ⚠️ Vấn đề: ${field.issues.join(', ')}\n`;
        }
        if (field.suggestions.length > 0) {
          response += `   💡 Gợi ý: ${field.suggestions.join(', ')}\n`;
        }
      });
      response += '\n';
    }
    
    // Validation status
    response += `**Trạng thái validation:**\n`;
    response += `• ${validation.isValid ? '✅ Form hợp lệ' : '❌ Form có lỗi'}\n`;
    if (validation.errors.length > 0) {
      response += `• Lỗi: ${validation.errors.join(', ')}\n`;
    }
    if (validation.warnings.length > 0) {
      response += `• Cảnh báo: ${validation.warnings.join(', ')}\n`;
    }
    response += '\n';
    
    // Readiness
    response += `**Sẵn sàng lưu:** ${readiness.canSave ? '✅ Có' : '❌ Chưa'}\n`;
    if (!readiness.canSave && readiness.missingRequirements.length > 0) {
      response += `• Còn thiếu: ${readiness.missingRequirements.join(', ')}\n`;
    }
    response += `• Điểm hoàn thiện: ${readiness.readinessScore}/100\n\n`;
    
    // Suggestions
    if (suggestions.length > 0) {
      response += `**💡 Gợi ý cải thiện:**\n`;
      suggestions.forEach(suggestion => {
        response += `• ${suggestion.message}\n`;
      });
    }
    
    return response;
  }
}

export default FormContextAgent;