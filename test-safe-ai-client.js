#!/usr/bin/env node

import SafeAIClient from './server/agents/safeAIClient.js';

// Test SafeAIClient with intentionally incorrect configuration to verify error handling
const testConfig = {
  provider: 'azure',
  apiKey: 'test-fake-key',
  endpoint: 'https://invalid-test-endpoint.openai.azure.com/',
  deployment: 'non-existent-deployment',
  apiVersion: '2024-02-15-preview',
  maxTokens: 100,
  temperature: 0.7
};

console.log('🧪 Testing SafeAIClient with intentionally invalid configuration...\n');

async function testSafeAIClient() {
  const client = new SafeAIClient(testConfig);

  console.log('📋 Test 1: Simple chat message');
  console.log('═'.repeat(50));
  
  try {
    const result = await client.createChatCompletion([
      { role: 'user', content: 'Hello, how are you?' }
    ]);

    console.log('✅ Result received:');
    console.log('- Success:', result.success);
    console.log('- Service:', result.service);
    console.log('- Fallback:', result.fallback || false);
    console.log('- Response preview:', result.response.substring(0, 100) + '...');
    console.log('- Original error:', result.originalError || 'None');
  } catch (error) {
    console.log('❌ UNEXPECTED ERROR (should not happen):', error.message);
  }

  console.log('\n📋 Test 2: Form context chat');
  console.log('═'.repeat(50));
  
  try {
    const result = await client.createChatCompletion([
      { 
        role: 'system', 
        content: 'Current Form Context:\nForm "Test Form" hiện có 3 trường thông tin:\n1. Họ tên (text) *\n2. Email (email) *\n3. Ghi chú (textarea)\n\nForm chưa có tiêu đề phù hợp và thiếu mô tả. Cần xem xét thêm trường số điện thoại.'
      },
      { role: 'user', content: 'Trạng thái form như thế nào?' }
    ]);

    console.log('✅ Result received:');
    console.log('- Success:', result.success);
    console.log('- Service:', result.service);
    console.log('- Fallback:', result.fallback || false);
    console.log('- Response preview:', result.response.substring(0, 150) + '...');
  } catch (error) {
    console.log('❌ UNEXPECTED ERROR (should not happen):', error.message);
  }

  console.log('\n📋 Test 3: Health check');
  console.log('═'.repeat(50));
  
  try {
    const healthResult = await client.healthCheck();
    console.log('✅ Health check result:');
    console.log('- Healthy:', healthResult.healthy);
    console.log('- Reason:', healthResult.reason);
  } catch (error) {
    console.log('❌ Health check error:', error.message);
  }

  console.log('\n🏁 Test completed! All responses should be successful with fallback content.');
  console.log('✅ No 404 errors should propagate to the user level.');
}

testSafeAIClient().catch(console.error);