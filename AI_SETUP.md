# AI Service Setup Guide

FormAgent AI supports multiple AI providers for intelligent form generation. Follow this guide to configure AI services.

## Quick Setup

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Choose your AI provider and update `.env`:**

### Option 1: OpenAI (Recommended)
```env
AI_PROVIDER=openai
OPENAI_API_KEY=your-actual-openai-api-key
AI_FORM_GENERATION_ENABLED=true
```

### Option 2: Azure OpenAI
```env
AI_PROVIDER=azure
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-35-turbo
AI_FORM_GENERATION_ENABLED=true
```

## Get API Keys

### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Create a new API key
4. Copy the key to your `.env` file

### Azure OpenAI
1. Create an Azure OpenAI resource in Azure Portal
2. Deploy a model (e.g., GPT-3.5-turbo)
3. Get your endpoint and API key from Azure Portal
4. Update your `.env` file with the credentials

## Testing AI Services

After configuring your API keys, test the AI services:

```bash
# Restart your Docker containers
docker-compose down
docker-compose up -d --build

# Test the API endpoint
curl -X POST http://localhost:5000/api/ai/generate-form \
  -H "Content-Type: application/json" \
  -d '{"description":"Create a registration form","useCrewAI":true}'
```

## AI Service Architecture

FormAgent AI uses a multi-agent architecture:

1. **EnhancedAgentService** - Main AI orchestrator
   - FormBuilderAgent - Specializes in form generation
   - ChatAssistantAgent - Handles conversational AI

2. **Legacy AIService** - Fallback service for basic AI operations

3. **Automatic Fallback** - If Enhanced agents fail, system falls back to legacy service

## Troubleshooting

### "No AI service is enabled or configured"
- Check your `.env` file has the correct API keys
- Ensure `AI_FORM_GENERATION_ENABLED=true`
- Verify your API key is valid and has credits

### Enhanced Agent Service not working
- Check Docker logs: `docker-compose logs backend`
- Verify OpenAI/Azure credentials are correct
- System will automatically fallback to legacy service

### API Key Issues
- Ensure no spaces or quotes around API keys in `.env`
- Check API key permissions and billing
- Test API key with a simple curl request

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `AI_PROVIDER` | `openai` or `azure` | Yes |
| `AI_FORM_GENERATION_ENABLED` | Enable AI form generation | Yes |
| `OPENAI_API_KEY` | OpenAI API key | If using OpenAI |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | If using Azure |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | If using Azure |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Azure model deployment | If using Azure |

## Cost Considerations

- OpenAI charges per token usage
- Start with GPT-3.5-turbo for cost-effectiveness
- Monitor usage in OpenAI/Azure dashboards
- Set usage limits to control costs