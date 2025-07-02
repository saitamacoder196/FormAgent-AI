// Quick debug script to check AI configuration
import dotenv from 'dotenv';
import configValidator from './server/utils/configValidator.js';

dotenv.config();

console.log('🔍 FormAgent AI Configuration Debug\n');

const aiConfig = {
  provider: process.env.AI_PROVIDER || 'openai',
  apiKey: process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION,
  model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
};

console.log('Environment Variables:');
console.log('AI_PROVIDER:', process.env.AI_PROVIDER || 'not set');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '***set***' : 'not set');
console.log('AZURE_OPENAI_API_KEY:', process.env.AZURE_OPENAI_API_KEY ? '***set***' : 'not set');
console.log('AZURE_OPENAI_ENDPOINT:', process.env.AZURE_OPENAI_ENDPOINT || 'not set');
console.log('AZURE_OPENAI_DEPLOYMENT_NAME:', process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'not set');
console.log('AZURE_OPENAI_API_VERSION:', process.env.AZURE_OPENAI_API_VERSION || 'not set');
console.log('OPENAI_MODEL:', process.env.OPENAI_MODEL || 'not set');

console.log('\nConfiguration Validation:');
const validation = configValidator.validateAIConfig(aiConfig);
console.log('Valid:', validation.isValid);
console.log('Errors:', validation.errors);
console.log('Warnings:', validation.warnings);
console.log('Info:', validation.info);

console.log('\nTesting AI Configuration...');
configValidator.testAIConfig(aiConfig)
  .then(result => {
    console.log('\nTest Result:');
    console.log('Success:', result.success);
    if (result.success) {
      console.log('Response:', result.response);
      console.log('Usage:', result.usage);
    } else {
      console.log('Error:', result.error);
      console.log('Status:', result.status);
      console.log('Suggestions:', result.suggestions);
    }
  })
  .catch(error => {
    console.error('\nTest Failed:', error.message);
  });