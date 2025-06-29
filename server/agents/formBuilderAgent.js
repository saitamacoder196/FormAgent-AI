import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import logger from '../utils/logger.js';

class FormBuilderAgent {
  constructor(llmConfig) {
    this.llm = new ChatOpenAI({
      model: llmConfig.model || 'gpt-3.5-turbo',
      temperature: llmConfig.temperature || 0.7,
      maxTokens: llmConfig.maxTokens || 2000,
      openAIApiKey: llmConfig.apiKey,
      azureOpenAIApiKey: llmConfig.azureApiKey,
      azureOpenAIApiVersion: llmConfig.azureApiVersion,
      azureOpenAIApiInstanceName: llmConfig.azureInstanceName,
      azureOpenAIApiDeploymentName: llmConfig.azureDeploymentName
    });
    
    this.outputParser = new StringOutputParser();
    this.role = 'Form Design Specialist';
    
    logger.info('FormBuilder Agent initialized', { 
      agent: 'FormBuilderAgent',
      model: llmConfig.model 
    });
  }

  /**
   * Generate a form using LangChain
   */
  async generateForm(description, requirements = {}) {
    try {
      logger.info('Starting form generation', { 
        description: description.substring(0, 100),
        requirements 
      });

      const prompt = ChatPromptTemplate.fromTemplate(`
You are an expert form designer with deep knowledge of UX/UI principles, form validation, and user experience optimization.

Create a comprehensive form based on the following requirements:

User Description: {description}

Requirements:
- Field Count: {fieldCount}
- Form Type: {formType}
- Target Audience: {targetAudience}
- Include Validation: {includeValidation}
- Language: {language}

Generate a JSON structure with the following format:
{{
  "title": "Form Title",
  "description": "Brief form description",
  "fields": [
    {{
      "id": "field_id",
      "type": "text|email|password|textarea|select|radio|checkbox|number|date|file",
      "name": "field_name",
      "label": "Field Label", 
      "placeholder": "Placeholder text",
      "required": boolean,
      "validation": {{
        "pattern": "regex_pattern",
        "message": "validation_message"
      }},
      "options": ["option1", "option2"] // only for select, radio, checkbox
    }}
  ],
  "styling": {{
    "theme": "modern|classic|minimal",
    "primaryColor": "#color",
    "layout": "single-column|two-column"
  }},
  "settings": {{
    "allowMultipleSubmissions": boolean,
    "showProgressBar": boolean,
    "redirectAfterSubmit": "url"
  }}
}}

Make the form practical, accessible, and user-friendly. Focus on creating meaningful field IDs, proper validation, and good UX.
Return only the JSON structure, no additional text.`);

      const chain = prompt.pipe(this.llm).pipe(this.outputParser);
      
      const result = await chain.invoke({
        description,
        fieldCount: requirements.fieldCount || 5,
        formType: requirements.formType || 'contact',
        targetAudience: requirements.targetAudience || 'general',
        includeValidation: requirements.includeValidation !== false,
        language: requirements.language || 'English'
      });
      
      logger.info('Form generation completed', { 
        hasResult: !!result,
        resultLength: result?.length 
      });

      return this.parseFormResult(result);
    } catch (error) {
      logger.logError(error, { context: 'FormBuilderAgent.generateForm' });
      throw new Error(`Form generation failed: ${error.message}`);
    }
  }

  /**
   * Optimize an existing form
   */
  async optimizeForm(existingForm, goals = ['improve-ux', 'increase-conversion']) {
    try {
      logger.info('Starting form optimization', { 
        formTitle: existingForm.title,
        goals 
      });

      const prompt = ChatPromptTemplate.fromTemplate(`
You are a form optimization expert. Analyze the following form and provide optimization recommendations.

Existing Form: {existingForm}

Optimization Goals: {goals}

Analyze the current form and provide:
1. **Issues Found**: List specific problems with the current form
2. **Optimization Recommendations**: Detailed suggestions for improvements
3. **Optimized Form Structure**: Complete improved JSON structure
4. **Expected Impact**: How these changes will improve user experience

Focus on:
- User experience improvements
- Conversion rate optimization
- Accessibility enhancements
- Validation improvements
- Field ordering and grouping

Format your response as:
## Issues Found
[List of issues]

## Optimization Recommendations  
[Detailed recommendations]

## Optimized Form Structure
[JSON structure]

## Expected Impact
[Expected improvements]`);

      const chain = prompt.pipe(this.llm).pipe(this.outputParser);
      
      const result = await chain.invoke({
        existingForm: JSON.stringify(existingForm, null, 2),
        goals: goals.join(', ')
      });
      
      logger.info('Form optimization completed');

      return this.parseOptimizationResult(result);
    } catch (error) {
      logger.logError(error, { context: 'FormBuilderAgent.optimizeForm' });
      throw new Error(`Form optimization failed: ${error.message}`);
    }
  }

  /**
   * Validate form structure
   */
  async validateForm(formData) {
    try {
      logger.info('Starting form validation', { 
        formTitle: formData.title,
        fieldCount: formData.fields?.length 
      });

      const prompt = ChatPromptTemplate.fromTemplate(`
You are a form validation expert. Review the following form for issues and improvements.

Form Data: {formData}

Check for:
1. Field type consistency
2. Validation rule completeness  
3. Accessibility compliance
4. User experience best practices
5. Required field appropriateness
6. Field naming conventions
7. Label clarity and completeness

Provide:
- **Validation Status**: VALID or INVALID
- **Issues Found**: List of problems with severity levels (LOW, MEDIUM, HIGH, CRITICAL)
- **Suggestions**: Recommended fixes for each issue
- **Corrected Form**: Improved form structure (if needed)

Format as:
## Validation Status
[VALID/INVALID]

## Issues Found
- [SEVERITY] Issue description

## Suggestions  
- Fix for each issue

## Corrected Form
[JSON structure if corrections needed]`);

      const chain = prompt.pipe(this.llm).pipe(this.outputParser);
      
      const result = await chain.invoke({
        formData: JSON.stringify(formData, null, 2)
      });
      
      logger.info('Form validation completed');

      return this.parseValidationResult(result);
    } catch (error) {
      logger.logError(error, { context: 'FormBuilderAgent.validateForm' });
      throw new Error(`Form validation failed: ${error.message}`);
    }
  }

  /**
   * Parse form generation result
   */
  parseFormResult(result) {
    try {
      // Extract JSON from the result
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON structure found in result');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required structure
      if (!parsed.fields || !Array.isArray(parsed.fields)) {
        throw new Error('Invalid form structure: missing fields array');
      }

      // Ensure all fields have required properties
      parsed.fields = parsed.fields.map((field, index) => ({
        id: field.id || `field_${index}`,
        type: field.type || 'text',
        name: field.name || `field_${index}`,
        label: field.label || 'Untitled Field',
        placeholder: field.placeholder || '',
        required: field.required || false,
        validation: field.validation || {},
        ...(field.options && { options: field.options })
      }));

      // Add metadata
      parsed.metadata = {
        generatedAt: new Date().toISOString(),
        generator: 'LangChain-FormBuilder',
        version: '1.0.0'
      };

      return parsed;
    } catch (error) {
      logger.logError(error, { context: 'FormBuilderAgent.parseFormResult' });
      
      // Return default form structure on parse error
      return {
        title: 'Generated Form',
        description: 'AI-generated form using LangChain',
        fields: [
          {
            id: 'field_0',
            type: 'text',
            name: 'name',
            label: 'Full Name',
            required: true,
            validation: {}
          },
          {
            id: 'field_1', 
            type: 'email',
            name: 'email',
            label: 'Email Address',
            required: true,
            validation: {
              pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
              message: 'Please enter a valid email address'
            }
          }
        ],
        styling: {
          theme: 'modern',
          primaryColor: '#3b82f6',
          layout: 'single-column'
        },
        settings: {
          allowMultipleSubmissions: false,
          showProgressBar: false
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          generator: 'LangChain-FormBuilder-Fallback',
          version: '1.0.0'
        }
      };
    }
  }

  /**
   * Parse optimization result
   */
  parseOptimizationResult(result) {
    try {
      const analysis = this.extractSection(result, 'Issues Found', 'Optimization Recommendations');
      const recommendations = this.extractSection(result, 'Optimization Recommendations', 'Optimized Form Structure');
      const optimizedFormText = this.extractSection(result, 'Optimized Form Structure', 'Expected Impact');
      const impact = this.extractSection(result, 'Expected Impact', null);
      
      let optimizedForm = null;
      if (optimizedFormText) {
        const jsonMatch = optimizedFormText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          optimizedForm = JSON.parse(jsonMatch[0]);
        }
      }
      
      return {
        analysis,
        recommendations: recommendations?.split('\n').filter(line => line.trim()),
        optimizedForm,
        expectedImpact: impact,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.logError(error, { context: 'FormBuilderAgent.parseOptimizationResult' });
      return {
        analysis: result,
        error: 'Failed to parse optimization result',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Parse validation result
   */
  parseValidationResult(result) {
    try {
      const status = this.extractSection(result, 'Validation Status', 'Issues Found');
      const issues = this.extractSection(result, 'Issues Found', 'Suggestions');
      const suggestions = this.extractSection(result, 'Suggestions', 'Corrected Form');
      const correctedFormText = this.extractSection(result, 'Corrected Form', null);
      
      let correctedForm = null;
      if (correctedFormText) {
        const jsonMatch = correctedFormText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          correctedForm = JSON.parse(jsonMatch[0]);
        }
      }
      
      return {
        isValid: status?.trim().toUpperCase() === 'VALID',
        issues: issues?.split('\n').filter(line => line.trim()) || [],
        suggestions: suggestions?.split('\n').filter(line => line.trim()) || [],
        correctedForm,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.logError(error, { context: 'FormBuilderAgent.parseValidationResult' });
      return {
        isValid: false,
        issues: ['Failed to parse validation result'],
        suggestions: [],
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Helper method to extract sections from markdown-like text
   */
  extractSection(text, startMarker, endMarker) {
    const startPattern = new RegExp(`##\\s*${startMarker}\\s*`, 'i');
    const startMatch = text.search(startPattern);
    
    if (startMatch === -1) return null;
    
    let endMatch = text.length;
    if (endMarker) {
      const endPattern = new RegExp(`##\\s*${endMarker}\\s*`, 'i');
      const endIndex = text.search(endPattern);
      if (endIndex > startMatch) {
        endMatch = endIndex;
      }
    }
    
    return text.substring(startMatch, endMatch)
      .replace(startPattern, '')
      .trim();
  }
}

export default FormBuilderAgent;