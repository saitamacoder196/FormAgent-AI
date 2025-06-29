import { Agent, Task, Crew } from 'crewai';
import logger from '../utils/logger.js';

class FormBuilderAgent {
  constructor(aiService) {
    this.aiService = aiService;
    this.agent = new Agent({
      role: 'Form Design Specialist',
      goal: 'Create intelligent, user-friendly forms based on user requirements',
      backstory: `You are an expert form designer with deep knowledge of UX/UI principles, 
                  form validation, and user experience optimization. You understand different 
                  form types and can create forms that are both functional and intuitive.`,
      verbose: true,
      allow_delegation: false,
      llm: this.aiService // Will be configured with CrewAI's LLM interface
    });
    
    logger.info('FormBuilder Agent initialized', { agent: 'FormBuilderAgent' });
  }

  /**
   * Create a form generation task
   */
  createFormGenerationTask(description, requirements = {}) {
    return new Task({
      description: `Create a comprehensive form based on the following requirements:
        
        User Description: ${description}
        
        Requirements:
        - Field Count: ${requirements.fieldCount || 5}
        - Form Type: ${requirements.formType || 'contact'}
        - Target Audience: ${requirements.targetAudience || 'general'}
        - Include Validation: ${requirements.includeValidation !== false}
        - Language: ${requirements.language || 'English'}
        
        Generate a JSON structure with the following format:
        {
          "title": "Form Title",
          "description": "Brief form description",
          "fields": [
            {
              "type": "text|email|password|textarea|select|radio|checkbox|number|date|file",
              "name": "field_name",
              "label": "Field Label", 
              "placeholder": "Placeholder text",
              "required": boolean,
              "validation": {
                "pattern": "regex_pattern",
                "message": "validation_message"
              },
              "options": ["option1", "option2"] // only for select, radio, checkbox
            }
          ],
          "styling": {
            "theme": "modern|classic|minimal",
            "primaryColor": "#color",
            "layout": "single-column|two-column"
          },
          "settings": {
            "allowMultipleSubmissions": boolean,
            "showProgressBar": boolean,
            "redirectAfterSubmit": "url"
          }
        }
        
        Make the form practical, accessible, and user-friendly.`,
      agent: this.agent,
      expected_output: 'A complete JSON form structure with all necessary fields, validation, and styling'
    });
  }

  /**
   * Create a form optimization task
   */
  createOptimizationTask(existingForm, optimizationGoals) {
    return new Task({
      description: `Optimize the following form based on the specified goals:
        
        Existing Form: ${JSON.stringify(existingForm, null, 2)}
        
        Optimization Goals: ${optimizationGoals.join(', ')}
        
        Analyze the current form and provide:
        1. Identified issues and improvement opportunities
        2. Optimized form structure
        3. Explanation of changes made
        4. Expected impact on user experience
        
        Focus on:
        - User experience improvements
        - Conversion rate optimization
        - Accessibility enhancements
        - Validation improvements
        - Field ordering and grouping`,
      agent: this.agent,
      expected_output: 'Optimized form structure with detailed explanation of improvements'
    });
  }

  /**
   * Create a form validation task
   */
  createValidationTask(formData) {
    return new Task({
      description: `Validate and improve the following form structure:
        
        Form Data: ${JSON.stringify(formData, null, 2)}
        
        Check for:
        1. Field type consistency
        2. Validation rule completeness
        3. Accessibility compliance
        4. User experience best practices
        5. Required field appropriateness
        6. Field naming conventions
        7. Label clarity and completeness
        
        Provide:
        - Validation results
        - Issues found with severity levels
        - Recommended fixes
        - Improved form structure`,
      agent: this.agent,
      expected_output: 'Validation report with corrected form structure'
    });
  }

  /**
   * Generate a form using CrewAI
   */
  async generateForm(description, requirements = {}) {
    try {
      logger.info('Starting form generation', { 
        description: description.substring(0, 100),
        requirements 
      });

      const task = this.createFormGenerationTask(description, requirements);
      
      const crew = new Crew({
        agents: [this.agent],
        tasks: [task],
        verbose: true
      });

      const result = await crew.kickoff();
      
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

      const task = this.createOptimizationTask(existingForm, goals);
      
      const crew = new Crew({
        agents: [this.agent],
        tasks: [task],
        verbose: true
      });

      const result = await crew.kickoff();
      
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

      const task = this.createValidationTask(formData);
      
      const crew = new Crew({
        agents: [this.agent],
        tasks: [task],
        verbose: true
      });

      const result = await crew.kickoff();
      
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
        generator: 'CrewAI-FormBuilder',
        version: '1.0.0'
      };

      return parsed;
    } catch (error) {
      logger.logError(error, { context: 'FormBuilderAgent.parseFormResult' });
      
      // Return default form structure on parse error
      return {
        title: 'Generated Form',
        description: 'AI-generated form using CrewAI',
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
          generator: 'CrewAI-FormBuilder-Fallback',
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
      const analysis = this.extractAnalysisFromResult(result);
      const optimizedForm = this.extractFormFromResult(result);
      
      return {
        analysis,
        optimizedForm,
        improvements: this.extractImprovementsFromResult(result),
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
      return {
        isValid: this.extractValidationStatus(result),
        issues: this.extractIssuesFromResult(result),
        suggestions: this.extractSuggestionsFromResult(result),
        correctedForm: this.extractFormFromResult(result),
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
   * Helper methods for parsing results
   */
  extractAnalysisFromResult(result) {
    const analysisMatch = result.match(/Analysis:([\s\S]*?)(?=Optimized Form:|$)/i);
    return analysisMatch ? analysisMatch[1].trim() : 'No analysis available';
  }

  extractFormFromResult(result) {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  }

  extractImprovementsFromResult(result) {
    const improvementsMatch = result.match(/Improvements:([\s\S]*?)(?=Expected Impact:|$)/i);
    return improvementsMatch ? improvementsMatch[1].trim().split('\n') : [];
  }

  extractValidationStatus(result) {
    return result.toLowerCase().includes('valid') && !result.toLowerCase().includes('invalid');
  }

  extractIssuesFromResult(result) {
    const issuesMatch = result.match(/Issues:([\s\S]*?)(?=Suggestions:|$)/i);
    return issuesMatch ? issuesMatch[1].trim().split('\n').filter(line => line.trim()) : [];
  }

  extractSuggestionsFromResult(result) {
    const suggestionsMatch = result.match(/Suggestions:([\s\S]*?)(?=Corrected Form:|$)/i);
    return suggestionsMatch ? suggestionsMatch[1].trim().split('\n').filter(line => line.trim()) : [];
  }
}

export default FormBuilderAgent;