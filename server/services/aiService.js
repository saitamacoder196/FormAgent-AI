// AI service can be disabled via environment variable
const AI_DISABLED = process.env.AI_SERVICE_DISABLED === 'true';

// Import SafeAIClient instead of direct OpenAI clients
import SafeAIClient from '../agents/safeAIClient.js';

class AIService {
  constructor() {
    this.aiProvider = process.env.AI_PROVIDER || 'azure';
    this.initializeClient();
  }

  initializeClient() {
    if (AI_DISABLED) {
      console.log('AI Service disabled via environment variable');
      return;
    }
    
    // Create configuration object for SafeAIClient
    const config = {
      provider: this.aiProvider,
      apiKey: this.aiProvider === 'azure' 
        ? (process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY)
        : process.env.OPENAI_API_KEY,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || process.env.AZURE_OPENAI_DEPLOYMENT,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      maxTokens: parseInt(process.env.AZURE_OPENAI_MAX_TOKENS || process.env.OPENAI_MAX_TOKENS) || 2000,
      temperature: parseFloat(process.env.AZURE_OPENAI_TEMPERATURE || process.env.OPENAI_TEMPERATURE) || 0.7
    };

    // Use SafeAIClient instead of direct OpenAI clients
    this.safeAIClient = new SafeAIClient(config);
    this.maxTokens = config.maxTokens;
    this.temperature = config.temperature;
    
    // For backward compatibility
    this.deploymentName = config.deployment;
    this.model = config.model;
  }

  async generateFormFields(description, requirements = {}) {
    try {
      const {
        fieldCount = 5,
        includeValidation = true,
        formType = 'contact',
        targetAudience = 'general'
      } = requirements;

      const prompt = this.buildFormGenerationPrompt(description, {
        fieldCount,
        includeValidation,
        formType,
        targetAudience
      });

      const response = await this.generateCompletion(prompt);
      
      // Parse and validate the generated form structure
      const generatedForm = this.parseFormResponse(response);
      return generatedForm;
    } catch (error) {
      console.error('Error generating form fields:', error);
      throw new Error(`AI form generation failed: ${error.message}`);
    }
  }

  async generateFormTitle(description, tone = 'professional') {
    try {
      const prompt = `Generate a concise, ${tone} title for a form based on this description: "${description}". 
      Return only the title, maximum 8 words, no quotes or extra text.`;

      const response = await this.generateCompletion(prompt, 50);
      return response.trim().replace(/['"]/g, '');
    } catch (error) {
      console.error('Error generating form title:', error);
      throw new Error(`AI title generation failed: ${error.message}`);
    }
  }

  async generateFormDescription(title, purpose) {
    try {
      const prompt = `Create a brief, user-friendly description (2-3 sentences) for a form titled "${title}" 
      with the purpose: ${purpose}. Make it welcoming and explain what users can expect.`;

      const response = await this.generateCompletion(prompt, 200);
      return response.trim();
    } catch (error) {
      console.error('Error generating form description:', error);
      throw new Error(`AI description generation failed: ${error.message}`);
    }
  }

  async analyzeFormSubmissions(submissions, analysisType = 'summary') {
    try {
      if (!submissions || submissions.length === 0) {
        return { message: 'No submissions to analyze' };
      }

      const dataForAnalysis = submissions.map(sub => sub.data);
      
      let prompt;
      switch (analysisType) {
        case 'sentiment':
          prompt = this.buildSentimentAnalysisPrompt(dataForAnalysis);
          break;
        case 'insights':
          prompt = this.buildInsightsPrompt(dataForAnalysis);
          break;
        case 'summary':
        default:
          prompt = this.buildSummaryPrompt(dataForAnalysis);
      }

      const response = await this.generateCompletion(prompt);
      return this.parseAnalysisResponse(response, analysisType);
    } catch (error) {
      console.error('Error analyzing submissions:', error);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  async moderateContent(content) {
    try {
      const prompt = `Analyze this content for inappropriate material, spam, or harmful content. 
      Content: "${content}"
      
      Respond with a JSON object containing:
      {
        "isAppropriate": boolean,
        "confidence": number (0-1),
        "reasons": ["reason1", "reason2"],
        "recommendation": "approve|flag|reject"
      }`;

      const response = await this.generateCompletion(prompt, 300);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error moderating content:', error);
      return {
        isAppropriate: true,
        confidence: 0.5,
        reasons: ['Unable to analyze'],
        recommendation: 'flag'
      };
    }
  }

  async generateCompletion(prompt, maxTokens = null) {
    if (!this.safeAIClient) {
      throw new Error('AI client not initialized');
    }

    const tokens = maxTokens || this.maxTokens;

    const aiResult = await this.safeAIClient.createChatCompletion([
      { role: 'user', content: prompt }
    ], {
      maxTokens: tokens,
      temperature: this.temperature
    });

    return aiResult.response || '';
  }

  buildFormGenerationPrompt(description, requirements) {
    return `Generate a JSON structure for a form based on this description: "${description}"

Requirements:
- Generate ${requirements.fieldCount} form fields
- Form type: ${requirements.formType}
- Target audience: ${requirements.targetAudience}
- Include validation: ${requirements.includeValidation}

Return a JSON object with this exact structure:
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
      "options": ["option1", "option2"] // only for select, radio, checkbox
    }
  ]
}

Make the form practical and user-friendly. Ensure field names are lowercase with underscores.`;
  }

  buildSummaryPrompt(submissions) {
    return `Analyze these form submissions and provide a comprehensive summary:

Submissions: ${JSON.stringify(submissions, null, 2)}

Provide analysis including:
1. Total responses
2. Most common responses
3. Key trends or patterns
4. Notable insights
5. Response quality assessment

Format as a structured summary with clear sections.`;
  }

  buildSentimentAnalysisPrompt(submissions) {
    return `Analyze the sentiment of these form submissions:

Submissions: ${JSON.stringify(submissions, null, 2)}

Provide:
1. Overall sentiment (positive, negative, neutral)
2. Sentiment distribution percentages
3. Key positive themes
4. Key concerns or negative feedback
5. Emotional tone analysis

Format as JSON with clear metrics.`;
  }

  buildInsightsPrompt(submissions) {
    return `Extract actionable insights from these form submissions:

Submissions: ${JSON.stringify(submissions, null, 2)}

Provide:
1. Key patterns and trends
2. User behavior insights
3. Improvement recommendations
4. Data quality observations
5. Business implications

Format as structured insights with priorities.`;
  }

  parseFormResponse(response) {
    try {
      // Clean the response to extract JSON
      const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanedResponse);
      
      // Validate the structure
      if (!parsed.fields || !Array.isArray(parsed.fields)) {
        throw new Error('Invalid form structure');
      }

      // Ensure all fields have required properties
      parsed.fields = parsed.fields.map(field => ({
        type: field.type || 'text',
        name: field.name || `field_${Date.now()}`,
        label: field.label || 'Untitled Field',
        placeholder: field.placeholder || '',
        required: field.required || false,
        ...(field.options && { options: field.options })
      }));

      return parsed;
    } catch (error) {
      console.error('Error parsing form response:', error);
      // Return a default form structure
      return {
        title: 'Generated Form',
        description: 'AI-generated form',
        fields: [
          {
            type: 'text',
            name: 'name',
            label: 'Full Name',
            required: true
          },
          {
            type: 'email',
            name: 'email',
            label: 'Email Address',
            required: true
          }
        ]
      };
    }
  }

  parseAnalysisResponse(response, type) {
    try {
      // Try to parse as JSON first
      if (response.includes('{') && response.includes('}')) {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      // Return structured text response
      return {
        type,
        analysis: response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        type,
        analysis: response,
        error: 'Failed to parse structured response',
        timestamp: new Date().toISOString()
      };
    }
  }

  isEnabled() {
    return process.env.AI_FORM_GENERATION_ENABLED === 'true' && !!this.client;
  }

  getProviderInfo() {
    return {
      provider: this.aiProvider,
      enabled: this.isEnabled(),
      model: this.aiProvider === 'azure' ? this.deploymentName : this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature
    };
  }
}

// Export singleton instance with lazy initialization
let instance = null;

const getAIService = () => {
  if (!instance) {
    instance = new AIService();
  }
  return instance;
};

export default {
  isEnabled: () => getAIService().isEnabled(),
  generateFormFields: (description, requirements) => getAIService().generateFormFields(description, requirements),
  generateFormTitle: (description, tone) => getAIService().generateFormTitle(description, tone),
  generateFormDescription: (title, purpose) => getAIService().generateFormDescription(title, purpose),
  analyzeFormSubmissions: (submissions, analysisType) => getAIService().analyzeFormSubmissions(submissions, analysisType),
  moderateContent: (content) => getAIService().moderateContent(content),
  generateCompletion: (prompt, maxTokens) => getAIService().generateCompletion(prompt, maxTokens),
  getProviderInfo: () => getAIService().getProviderInfo(),
  get aiProvider() { return getAIService().aiProvider; }
};