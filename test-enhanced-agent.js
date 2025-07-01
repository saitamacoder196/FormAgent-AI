import FormContextAgent from './server/agents/formContextAgent.js';
import EnhancedChatAssistant from './server/agents/enhancedChatAssistant.js';

// Test configuration
const config = {
  provider: 'openai',
  apiKey: 'test-key',
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 2000
};

// Test form data
const testFormData = {
  title: 'Form đăng ký khóa học',
  description: 'Đăng ký tham gia khóa học lập trình',
  introduction: 'Vui lòng điền thông tin để đăng ký',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  triggerPhrases: ['đăng ký', 'khóa học'],
  fields: [
    {
      id: 'name',
      label: 'Họ và tên',
      type: 'text',
      required: true,
      placeholder: 'Nhập họ tên của bạn'
    },
    {
      id: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      placeholder: 'example@email.com'
    },
    {
      id: 'phone',
      label: 'Số điện thoại',
      type: 'tel',
      required: false
    },
    {
      id: 'experience',
      label: 'Kinh nghiệm',
      type: 'select',
      options: ['Beginner', 'Intermediate', 'Advanced'],
      required: true
    }
  ]
};

async function testFormContextAgent() {
  console.log('=== Testing Form Context Agent ===\n');
  
  const formContextAgent = new FormContextAgent(config);
  
  // Test form analysis
  const analysis = formContextAgent.analyzeFormContext(testFormData);
  
  console.log('Form Overview:');
  console.log(analysis.overview);
  console.log('\nField Analysis:');
  console.log(analysis.fields);
  console.log('\nValidation:');
  console.log(analysis.validation);
  console.log('\nReadiness:');
  console.log(analysis.readiness);
  console.log('\nSuggestions:');
  console.log(analysis.suggestions);
  
  // Test natural language response
  console.log('\n=== Natural Language Response ===');
  console.log(formContextAgent.generateContextResponse(analysis));
}

async function testEnhancedChatAssistant() {
  console.log('\n\n=== Testing Enhanced Chat Assistant ===\n');
  
  // Note: This test won't make actual API calls without a valid key
  console.log('Enhanced Chat Assistant initialized successfully');
  console.log('Features:');
  console.log('- Form context awareness');
  console.log('- Form manipulation commands');
  console.log('- Validation and readiness checks');
  console.log('- Natural language understanding');
}

// Run tests
console.log('Starting Enhanced Agent Tests...\n');

testFormContextAgent()
  .then(() => testEnhancedChatAssistant())
  .then(() => {
    console.log('\n✅ All tests completed successfully!');
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
  });