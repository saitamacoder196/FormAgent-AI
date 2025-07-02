#!/usr/bin/env node

// Simple script to check AI configuration without starting the server
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

console.log('🔍 AI Configuration Check\n');
console.log('='.repeat(50));

// Check environment variables
const envVars = {
  'AI_PROVIDER': process.env.AI_PROVIDER,
  'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
  'AZURE_OPENAI_API_KEY': process.env.AZURE_OPENAI_API_KEY,
  'AZURE_OPENAI_KEY': process.env.AZURE_OPENAI_KEY,
  'AZURE_OPENAI_ENDPOINT': process.env.AZURE_OPENAI_ENDPOINT,
  'AZURE_OPENAI_DEPLOYMENT_NAME': process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  'AZURE_OPENAI_DEPLOYMENT': process.env.AZURE_OPENAI_DEPLOYMENT,
  'AZURE_OPENAI_API_VERSION': process.env.AZURE_OPENAI_API_VERSION,
  'OPENAI_MODEL': process.env.OPENAI_MODEL
};

console.log('Environment Variables:');
Object.entries(envVars).forEach(([key, value]) => {
  if (key.includes('KEY')) {
    console.log(`${key}: ${value ? '***SET***' : 'NOT SET'}`);
  } else {
    console.log(`${key}: ${value || 'NOT SET'}`);
  }
});

console.log('\n' + '='.repeat(50));
console.log('Resolved Configuration:\n');

const provider = process.env.AI_PROVIDER || 'openai';
console.log(`Provider: ${provider}`);

if (provider === 'azure') {
  const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
  
  console.log(`API Key: ${apiKey ? '***SET***' : 'NOT SET'}`);
  console.log(`Endpoint: ${endpoint || 'NOT SET'}`);
  console.log(`Deployment: ${deployment || 'NOT SET'}`);
  console.log(`API Version: ${apiVersion}`);
  
  console.log('\n' + '='.repeat(50));
  console.log('Potential Issues:\n');
  
  if (!apiKey) {
    console.log('❌ API Key is missing. Set either AZURE_OPENAI_API_KEY or AZURE_OPENAI_KEY');
  }
  if (!endpoint) {
    console.log('❌ Endpoint is missing. Set AZURE_OPENAI_ENDPOINT');
  }
  if (!deployment) {
    console.log('❌ Deployment name is missing. Set either AZURE_OPENAI_DEPLOYMENT_NAME or AZURE_OPENAI_DEPLOYMENT');
  }
  
  if (endpoint && !endpoint.includes('openai.azure.com') && !endpoint.includes('api.cognitive.microsoft.com')) {
    console.log('⚠️  Endpoint doesn\'t look like Azure OpenAI format');
    console.log('    Expected: .openai.azure.com or .api.cognitive.microsoft.com');
  }
  if (endpoint && !endpoint.endsWith('/')) {
    console.log('⚠️  Endpoint should end with a slash (/)');
  }
  if (endpoint && endpoint.includes('api.cognitive.microsoft.com') && !endpoint.includes('/openai')) {
    console.log('💡 Cognitive Services endpoint detected - system will auto-add /openai path');
  }
} else if (provider === 'openai') {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  
  console.log(`API Key: ${apiKey ? '***SET***' : 'NOT SET'}`);
  console.log(`Model: ${model}`);
  
  if (!apiKey) {
    console.log('\n❌ API Key is missing. Set OPENAI_API_KEY');
  }
}

console.log('\n' + '='.repeat(50));
console.log('\nTo fix configuration issues:');
console.log('1. Copy env.example to .env');
console.log('2. Fill in the required values');
console.log('3. Restart the server');
console.log('\nFor detailed testing, run: node debug-config.js');