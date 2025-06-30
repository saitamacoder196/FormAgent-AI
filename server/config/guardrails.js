// Guardrails System for FormAgent AI
// Ensures safe, appropriate, and helpful AI responses

export const guardrailsConfig = {
  // Content Safety Rules
  contentSafety: {
    // Prohibited content categories
    prohibited: [
      "harmful instructions",
      "malicious code",
      "personal information collection abuse",
      "discriminatory content",
      "misleading information",
      "inappropriate personal questions",
      "financial scam patterns",
      "medical advice beyond form design"
    ],

    // Sensitive topics to handle carefully
    sensitive: [
      "personal data collection",
      "payment information",
      "medical information", 
      "children's data",
      "legal advice",
      "financial advice"
    ],

    // Warning patterns in user input
    warningPatterns: [
      /password|mật khẩu|pass word/i,
      /social security|ssn|cmnd|cccd/i,
      /credit card|thẻ tín dụng|visa|mastercard/i,
      /medical record|bệnh án|y tế/i,
      /illegal|bất hợp pháp|vi phạm/i,
      /hack|crack|exploit/i
    ]
  },

  // Form Design Safety
  formSafety: {
    // Maximum field limits
    limits: {
      maxFields: 50,
      maxOptionsPerField: 20,
      maxTextLength: 1000,
      maxFileSize: "10MB"
    },

    // Required disclaimers for sensitive data
    requiredDisclaimers: {
      personalData: "Thông tin cá nhân sẽ được bảo mật theo quy định",
      medicalData: "Đây không phải tư vấn y tế chuyên nghiệp",
      financialData: "Không nhập thông tin tài chính nhạy cảm",
      childrenData: "Cần sự đồng ý của phụ huynh cho trẻ dưới 16 tuổi"
    },

    // Forbidden field types for sensitive data
    forbiddenFields: [
      { pattern: /password|mật khẩu/i, reason: "Không thu thập mật khẩu qua form" },
      { pattern: /ssn|social security|cmnd số/i, reason: "Không thu thập số CMND/CCCD" },
      { pattern: /credit card|số thẻ/i, reason: "Không thu thập thông tin thẻ tín dụng" },
      { pattern: /bank account|tài khoản ngân hàng/i, reason: "Không thu thập thông tin ngân hàng" }
    ]
  },

  // Response Quality Control
  responseQuality: {
    // Minimum response requirements
    requirements: {
      minLength: 20,
      maxLength: 2000,
      mustBeHelpful: true,
      mustBeRelevant: true,
      mustBeAccurate: true
    },

    // Response improvement patterns
    improvements: [
      {
        pattern: /không biết|không rõ|ko biết/i,
        action: "provide alternative suggestions"
      },
      {
        pattern: /^yes$|^no$|^có$|^không$/i,
        action: "expand with explanation"
      }
    ],

    // Quality scoring criteria
    scoringCriteria: {
      helpfulness: 0.3,
      accuracy: 0.3,
      safety: 0.2,
      relevance: 0.2
    }
  },

  // Context Awareness
  contextAwareness: {
    // Track conversation patterns that might indicate issues
    riskPatterns: [
      {
        pattern: "repeated_same_question",
        threshold: 3,
        action: "suggest alternative approach"
      },
      {
        pattern: "confusion_about_basic_concepts",
        threshold: 2,
        action: "provide simplified explanation"
      },
      {
        pattern: "requesting_inappropriate_data",
        threshold: 1,
        action: "explain privacy guidelines"
      }
    ],

    // User intent detection
    intentClassification: [
      "form_creation",
      "form_optimization", 
      "technical_help",
      "general_conversation",
      "inappropriate_request"
    ]
  },

  // Compliance Rules
  compliance: {
    // Data protection compliance
    dataProtection: {
      gdprCompliant: true,
      requireConsent: true,
      allowDataDeletion: true,
      dataMinimization: true
    },

    // Industry standards
    standards: [
      "WCAG 2.1 AA accessibility",
      "GDPR data protection",
      "Vietnamese data protection law",
      "Form security best practices"
    ],

    // Required warnings
    warnings: {
      sensitiveData: "⚠️ Cảnh báo: Form này thu thập dữ liệu nhạy cảm",
      dataRetention: "📋 Dữ liệu sẽ được lưu trữ theo chính sách bảo mật",
      thirdParty: "🔗 Tích hợp bên thứ ba cần được kiểm tra bảo mật"
    }
  }
};

// Guardrail enforcement functions
export class GuardrailsEngine {
  constructor() {
    this.violationLog = [];
    this.warningCount = 0;
  }

  // Check content safety
  checkContentSafety(content) {
    const violations = [];
    const warnings = [];

    // Check for prohibited content
    guardrailsConfig.contentSafety.prohibited.forEach(category => {
      if (this.detectCategory(content, category)) {
        violations.push({
          type: 'prohibited_content',
          category,
          severity: 'high'
        });
      }
    });

    // Check for warning patterns
    guardrailsConfig.contentSafety.warningPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        warnings.push({
          type: 'sensitive_content',
          pattern: pattern.source,
          severity: 'medium'
        });
      }
    });

    return { violations, warnings, safe: violations.length === 0 };
  }

  // Validate form design
  validateFormDesign(formData) {
    const issues = [];
    const { fields = [], title = '', description = '' } = formData;

    // Check field limits
    if (fields.length > guardrailsConfig.formSafety.limits.maxFields) {
      issues.push({
        type: 'too_many_fields',
        message: `Form có quá nhiều trường (${fields.length}/${guardrailsConfig.formSafety.limits.maxFields})`
      });
    }

    // Check for forbidden fields
    fields.forEach((field, index) => {
      guardrailsConfig.formSafety.forbiddenFields.forEach(forbidden => {
        if (forbidden.pattern.test(field.label || field.name || '')) {
          issues.push({
            type: 'forbidden_field',
            field: index,
            message: forbidden.reason
          });
        }
      });
    });

    // Check for sensitive data collection
    const sensitiveFields = this.detectSensitiveFields(fields);
    if (sensitiveFields.length > 0) {
      issues.push({
        type: 'sensitive_data',
        fields: sensitiveFields,
        message: 'Form thu thập dữ liệu nhạy cảm, cần disclaimer'
      });
    }

    return { issues, safe: issues.length === 0 };
  }

  // Improve response quality
  improveResponse(response, context = {}) {
    let improvedResponse = response;

    // Apply improvement patterns
    guardrailsConfig.responseQuality.improvements.forEach(improvement => {
      if (improvement.pattern.test(response)) {
        switch (improvement.action) {
          case 'provide alternative suggestions':
            improvedResponse += '\n\nTôi có thể giúp bạn:\n• Tạo form mẫu để bắt đầu\n• Đề xuất cấu trúc form phù hợp\n• Giải thích các loại trường dữ liệu';
            break;
          case 'expand with explanation':
            improvedResponse += '\n\nLý do: ' + this.generateExplanation(response, context);
            break;
        }
      }
    });

    // Ensure minimum quality standards
    if (improvedResponse.length < guardrailsConfig.responseQuality.requirements.minLength) {
      improvedResponse += this.expandResponse(improvedResponse, context);
    }

    return improvedResponse;
  }

  // Generate compliance warnings
  generateComplianceWarnings(formData) {
    const warnings = [];
    const { fields = [] } = formData;

    // Check for sensitive data
    const sensitiveFields = this.detectSensitiveFields(fields);
    if (sensitiveFields.length > 0) {
      warnings.push(guardrailsConfig.compliance.warnings.sensitiveData);
    }

    // Check for third-party integrations
    if (formData.integrations?.length > 0) {
      warnings.push(guardrailsConfig.compliance.warnings.thirdParty);
    }

    return warnings;
  }

  // Helper methods
  detectCategory(content, category) {
    // Simple keyword-based detection (would be enhanced with ML in production)
    const keywords = {
      'harmful instructions': ['hack', 'crack', 'exploit', 'bypass'],
      'malicious code': ['<script>', 'javascript:', 'eval(', 'exec('],
      'discriminatory content': ['racist', 'sexist', 'discriminat'],
      'financial scam patterns': ['get rich quick', 'guaranteed profit', 'no risk']
    };

    const categoryKeywords = keywords[category] || [];
    return categoryKeywords.some(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  detectSensitiveFields(fields) {
    const sensitivePatterns = [
      /medical|y tế|bệnh|sức khỏe/i,
      /financial|tài chính|thu nhập|lương/i,
      /personal.*id|cmnd|cccd|passport/i,
      /children|trẻ em|dưới.*18/i
    ];

    return fields.filter(field => {
      const fieldText = (field.label || field.name || '').toLowerCase();
      return sensitivePatterns.some(pattern => pattern.test(fieldText));
    });
  }

  generateExplanation(response, context) {
    // Generate contextual explanation
    if (context.topic === 'form_creation') {
      return 'Tôi sẽ tạo form phù hợp với mục đích bạn mô tả';
    }
    return 'Điều này giúp đảm bảo form hiệu quả và an toàn';
  }

  expandResponse(response, context) {
    const expansions = [
      '\n\n💡 Mẹo: Hãy mô tả chi tiết hơn để tôi hỗ trợ tốt nhất',
      '\n\n🎯 Gợi ý: Bạn có thể nói về mục đích, đối tượng sử dụng form',
      '\n\n📋 Lưu ý: Tôi có thể tạo form đăng ký, khảo sát, liên hệ, ứng tuyển'
    ];
    
    return expansions[Math.floor(Math.random() * expansions.length)];
  }

  // Log violations for monitoring
  logViolation(violation) {
    this.violationLog.push({
      ...violation,
      timestamp: new Date().toISOString(),
      id: `violation_${Date.now()}`
    });
    
    // Keep only last 1000 violations
    if (this.violationLog.length > 1000) {
      this.violationLog = this.violationLog.slice(-1000);
    }
  }

  // Get violation statistics
  getViolationStats() {
    const stats = {};
    this.violationLog.forEach(violation => {
      stats[violation.type] = (stats[violation.type] || 0) + 1;
    });
    return stats;
  }
}

// Export singleton instance
export const guardrailsEngine = new GuardrailsEngine();

export default guardrailsConfig;