// Simple test to debug Azure OpenAI configuration
console.log('=== Azure OpenAI Configuration Debug ===\n');

console.log('Environment Variables:');
console.log('AI_PROVIDER:', process.env.AI_PROVIDER || 'not set');
console.log('AZURE_OPENAI_ENDPOINT:', process.env.AZURE_OPENAI_ENDPOINT || 'not set');
console.log('AZURE_OPENAI_API_KEY:', process.env.AZURE_OPENAI_API_KEY ? '***set***' : 'not set');
console.log('AZURE_OPENAI_API_VERSION:', process.env.AZURE_OPENAI_API_VERSION || 'not set');
console.log('AZURE_OPENAI_DEPLOYMENT_NAME:', process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'not set');
console.log('AZURE_OPENAI_MODEL_NAME:', process.env.AZURE_OPENAI_MODEL_NAME || 'not set');

console.log('\n=== Configuration Analysis ===');

const config = {
  provider: process.env.AI_PROVIDER,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION,
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  model: process.env.AZURE_OPENAI_MODEL_NAME
};

console.log('Config object:', config);

console.log('\n=== Potential Issues ===');

if (!config.endpoint) {
  console.log('❌ AZURE_OPENAI_ENDPOINT is not set');
} else if (!config.endpoint.includes('cognitive.microsoft.com') && !config.endpoint.includes('openai.azure.com')) {
  console.log('⚠️  Endpoint format may be incorrect:', config.endpoint);
} else {
  console.log('✅ Endpoint looks correct');
}

if (!config.apiKey) {
  console.log('❌ AZURE_OPENAI_API_KEY is not set');
} else {
  console.log('✅ API Key is set');
}

if (!config.deployment) {
  console.log('❌ AZURE_OPENAI_DEPLOYMENT_NAME is not set');
} else {
  console.log('✅ Deployment name is set:', config.deployment);
}

if (!config.apiVersion) {
  console.log('❌ AZURE_OPENAI_API_VERSION is not set');
} else {
  console.log('✅ API Version is set:', config.apiVersion);
}

console.log('\n=== Expected URL Format ===');
if (config.endpoint && config.deployment && config.apiVersion) {
  const expectedUrl = `${config.endpoint}openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`;
  console.log('Request URL would be:');
  console.log(expectedUrl);
}