# Azure OpenAI Setup Guide for FormAgent AI

## Quick Fix for 404 Errors

If you're getting 404 errors, it's likely due to incorrect Azure OpenAI configuration. Here's how to fix it:

### 1. Check Your Azure OpenAI Resource

Log into Azure Portal and verify:
- Your resource name
- Your deployment name
- Your API key

### 2. Set Environment Variables

Create or update your `.env` file with the EXACT values from Azure:

```bash
# For Azure OpenAI
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your-actual-key-here
AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE-NAME.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=YOUR-DEPLOYMENT-NAME
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

### 3. Endpoint Formats

Azure OpenAI supports **two endpoint formats**:

#### Format 1: New Azure OpenAI Format
```
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
```

#### Format 2: Azure Cognitive Services Format
```
AZURE_OPENAI_ENDPOINT=https://eastus.api.cognitive.microsoft.com/
# or
AZURE_OPENAI_ENDPOINT=https://westus.api.cognitive.microsoft.com/
# or other regions...
```

✅ **Correct Examples:**
```
# New format
AZURE_OPENAI_ENDPOINT=https://my-openai.openai.azure.com/

# Cognitive Services format (any region)
AZURE_OPENAI_ENDPOINT=https://eastus.api.cognitive.microsoft.com/
AZURE_OPENAI_ENDPOINT=https://westeurope.api.cognitive.microsoft.com/
AZURE_OPENAI_ENDPOINT=https://japaneast.api.cognitive.microsoft.com/
```

❌ **Wrong Examples:**
```
AZURE_OPENAI_ENDPOINT=eastus.api.cognitive.microsoft.com  # Missing https://
AZURE_OPENAI_ENDPOINT=https://api.cognitive.microsoft.com/  # Missing region
AZURE_OPENAI_ENDPOINT=https://eastus.api.cognitive.microsoft.com  # Missing trailing /
```

❌ **Wrong Deployment Name:**
```
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-35-turbo  # Model name, not deployment name
AZURE_OPENAI_DEPLOYMENT_NAME=my deployment  # Spaces not allowed
```

✅ **Correct Deployment Name:**
```
AZURE_OPENAI_DEPLOYMENT_NAME=my-deployment-name  # As shown in Azure Portal
```

### 4. Test Your Configuration

Run this command to check your configuration:
```bash
node check-ai-config.js
```

### 5. Alternative: Use OpenAI Instead

If you can't get Azure OpenAI working, switch to regular OpenAI:

```bash
# For OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
```

### 6. Fallback Mode

Even if AI is not configured correctly, FormAgent will still work with:
- Form context analysis
- Field validation
- Basic chat responses
- All form manipulation features

The system is designed to be resilient and will provide helpful responses even without AI!

### Need Help?

1. Check logs for specific error messages
2. Run `curl http://localhost:5000/api/health/detailed` to see configuration status
3. The fallback system ensures the app continues working even with configuration issues