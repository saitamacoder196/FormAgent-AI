# FormAgent AI API Documentation

## Overview

The FormAgent AI API provides powerful artificial intelligence capabilities for form generation, analysis, and enhancement using Azure OpenAI or OpenAI services.

## Base URL
```
http://localhost:5000/api/ai
```

## Authentication
Currently, the API uses the same authentication as the main application. API keys are configured via environment variables.

## Configuration

### Environment Variables

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-35-turbo
AZURE_OPENAI_MODEL_NAME=gpt-3.5-turbo
AZURE_OPENAI_MAX_TOKENS=2000
AZURE_OPENAI_TEMPERATURE=0.7

# Alternative OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-3.5-turbo

# AI Features
AI_PROVIDER=azure  # Options: azure, openai
AI_FORM_GENERATION_ENABLED=true
```

## Endpoints

### 1. Get AI Configuration

**GET** `/config`

Returns the current AI service configuration and status.

**Response:**
```json
{
  "success": true,
  "config": {
    "provider": "azure",
    "enabled": true,
    "model": "gpt-35-turbo",
    "maxTokens": 2000,
    "temperature": 0.7
  }
}
```

### 2. Generate Form with AI

**POST** `/generate-form`

Generates a complete form structure using AI based on a description.

**Request Body:**
```json
{
  "description": "Create a customer feedback form for a restaurant",
  "requirements": {
    "fieldCount": 5,
    "includeValidation": true,
    "formType": "feedback",
    "targetAudience": "customers"
  },
  "autoSave": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Form generated successfully",
  "generatedForm": {
    "title": "Restaurant Customer Feedback",
    "description": "Help us improve by sharing your dining experience",
    "fields": [
      {
        "type": "text",
        "name": "customer_name",
        "label": "Your Name",
        "placeholder": "Enter your full name",
        "required": true
      },
      {
        "type": "email",
        "name": "email",
        "label": "Email Address",
        "placeholder": "your.email@example.com",
        "required": true
      },
      {
        "type": "select",
        "name": "rating",
        "label": "Overall Rating",
        "required": true,
        "options": ["1 - Poor", "2 - Fair", "3 - Good", "4 - Very Good", "5 - Excellent"]
      },
      {
        "type": "textarea",
        "name": "feedback",
        "label": "Additional Comments",
        "placeholder": "Tell us about your experience...",
        "required": false
      },
      {
        "type": "checkbox",
        "name": "recommend",
        "label": "Would you recommend us to others?",
        "required": false
      }
    ]
  },
  "savedForm": {
    "_id": "form_id_here",
    "title": "Restaurant Customer Feedback",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "metadata": {
    "generatedAt": "2024-01-01T00:00:00.000Z",
    "provider": "azure",
    "autoSaved": true
  }
}
```

### 3. Generate Form Title

**POST** `/generate-title`

Generates a catchy title for a form based on its description.

**Request Body:**
```json
{
  "description": "A form to collect employee satisfaction data",
  "tone": "professional"
}
```

**Response:**
```json
{
  "success": true,
  "title": "Employee Satisfaction Survey",
  "metadata": {
    "generatedAt": "2024-01-01T00:00:00.000Z",
    "tone": "professional",
    "provider": "azure"
  }
}
```

### 4. Generate Form Description

**POST** `/generate-description`

Creates a user-friendly description for a form.

**Request Body:**
```json
{
  "title": "Product Feedback Survey",
  "purpose": "collecting user feedback on new product features"
}
```

**Response:**
```json
{
  "success": true,
  "description": "Share your thoughts on our latest product features. Your feedback helps us create better experiences and improve our offerings. This survey takes just 2-3 minutes to complete.",
  "metadata": {
    "generatedAt": "2024-01-01T00:00:00.000Z",
    "provider": "azure"
  }
}
```

### 5. Analyze Form Submissions

**POST** `/analyze-submissions/:formId`

Analyzes form submissions using AI to extract insights and patterns.

**Request Body:**
```json
{
  "analysisType": "summary",
  "limit": 100
}
```

**Analysis Types:**
- `summary` - General overview and trends
- `sentiment` - Sentiment analysis of text responses
- `insights` - Actionable business insights

**Response:**
```json
{
  "success": true,
  "analysis": {
    "type": "summary",
    "analysis": "Based on 45 submissions, customers show high satisfaction with an average rating of 4.2/5. Key positive themes include excellent food quality and friendly service. Main areas for improvement include wait times and table availability.",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "metadata": {
    "formId": "form_id_here",
    "submissionCount": 45,
    "analysisType": "summary",
    "analyzedAt": "2024-01-01T00:00:00.000Z",
    "provider": "azure"
  }
}
```

### 6. Content Moderation

**POST** `/moderate-content`

Analyzes content for inappropriate material, spam, or harmful content.

**Request Body:**
```json
{
  "content": "This is the text content to moderate"
}
```

**Response:**
```json
{
  "success": true,
  "moderation": {
    "isAppropriate": true,
    "confidence": 0.95,
    "reasons": [],
    "recommendation": "approve"
  },
  "metadata": {
    "moderatedAt": "2024-01-01T00:00:00.000Z",
    "provider": "azure"
  }
}
```

### 7. Enhance Existing Form

**POST** `/enhance-form/:formId`

Provides AI-powered suggestions to improve an existing form.

**Request Body:**
```json
{
  "enhancementType": "improve",
  "suggestions": true
}
```

**Enhancement Types:**
- `improve` - General improvements
- `accessibility` - Accessibility enhancements
- `validation` - Better validation rules

**Response:**
```json
{
  "success": true,
  "originalForm": {
    "_id": "form_id_here",
    "title": "Contact Form",
    "fields": [...]
  },
  "enhancement": "Suggestions for improvement:\n1. Add phone number field with validation\n2. Include a preferred contact method field\n3. Add character limits to message field\n4. Include a urgency level selector",
  "enhancementType": "improve",
  "metadata": {
    "enhancedAt": "2024-01-01T00:00:00.000Z",
    "provider": "azure"
  }
}
```

### 8. Bulk Generate Forms

**POST** `/bulk-generate`

Generates multiple forms in a single request.

**Request Body:**
```json
{
  "requests": [
    {
      "description": "Employee onboarding form",
      "requirements": { "fieldCount": 8 }
    },
    {
      "description": "Event registration form",
      "requirements": { "fieldCount": 6 }
    }
  ],
  "autoSave": false
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "index": 0,
      "generatedForm": {...},
      "savedForm": null
    },
    {
      "index": 1,
      "generatedForm": {...},
      "savedForm": null
    }
  ],
  "errors": [],
  "metadata": {
    "totalRequests": 2,
    "successCount": 2,
    "errorCount": 0,
    "generatedAt": "2024-01-01T00:00:00.000Z",
    "provider": "azure"
  }
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message"
}
```

**Common Error Codes:**
- `400` - Bad Request (missing or invalid parameters)
- `404` - Not Found (form not found)
- `500` - Internal Server Error (AI service error)
- `503` - Service Unavailable (AI service not configured or disabled)

## Rate Limiting

The AI endpoints are subject to the same rate limiting as other API endpoints:
- 100 requests per 15 minutes per IP address
- Rate limits may be adjusted based on AI provider quotas

## Usage Tips

1. **Form Generation**: Provide detailed descriptions for better results
2. **Analysis**: Include enough submissions (minimum 10) for meaningful insights
3. **Bulk Operations**: Limited to 10 forms per request to prevent timeouts
4. **Error Handling**: Always check the `success` field in responses
5. **Caching**: Consider caching AI responses to reduce costs and latency

## Cost Considerations

- Each AI request consumes tokens based on input and output length
- Azure OpenAI and OpenAI have different pricing models
- Monitor usage through the AI interaction logs
- Consider implementing user quotas for production use

## Future Enhancements

- Multi-language form generation
- Custom field type suggestions
- Advanced analytics and reporting
- Integration with form templates
- Real-time form optimization