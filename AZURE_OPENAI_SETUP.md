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

### 3. Common Mistakes

❌ **Wrong Endpoint Format:**
```
AZURE_OPENAI_ENDPOINT=YOUR-RESOURCE-NAME.openai.azure.com  # Missing https://
AZURE_OPENAI_ENDPOINT=https://openai.azure.com/  # Generic endpoint
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com  # Missing trailing /
```

✅ **Correct Endpoint Format:**
```
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
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