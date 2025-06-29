# FormAgent AI - CrewAI Integration

## Overview
FormAgent AI now leverages CrewAI, a powerful multi-agent framework, to provide intelligent form generation and conversational AI capabilities. This integration enhances the system with specialized agents that collaborate to deliver superior user experiences.

## Architecture

### Multi-Agent System
```
┌─────────────────┐    ┌─────────────────┐
│  FormBuilder    │    │  ChatAssistant  │
│     Agent       │    │     Agent       │
│                 │    │                 │
│ • Form Design   │    │ • Conversation  │
│ • Validation    │    │ • Knowledge Q&A │
│ • Optimization  │    │ • Context Mgmt  │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
            ┌─────────────────┐
            │   CrewAI        │
            │   Service       │
            │                 │
            │ • Agent Mgmt    │
            │ • Task Routing  │
            │ • LLM Interface │
            └─────────────────┘
```

## Agents

### 1. FormBuilder Agent
**Role:** Form Design Specialist
**Capabilities:**
- Intelligent form generation based on natural language descriptions
- Form optimization for better UX and conversion rates
- Form validation and accessibility compliance checking
- Field type recommendations and validation rules

**Tasks:**
- `generateForm(description, requirements)` - Create forms from descriptions
- `optimizeForm(existingForm, goals)` - Improve existing forms
- `validateForm(formData)` - Check form quality and compliance

### 2. ChatAssistant Agent
**Role:** Conversational AI Assistant
**Capabilities:**
- Natural conversation handling
- Context-aware responses
- Knowledge query processing
- Conversation analysis and insights

**Tasks:**
- `handleChatMessage(message, conversationId, context)` - Process chat messages
- `handleKnowledgeQuery(query, domain)` - Answer knowledge questions
- `analyzeConversation(conversationId)` - Provide conversation insights

## Features

### Enhanced Form Generation
```javascript
// CrewAI-powered form generation
const form = await crewAIService.generateForm("Create a user registration form", {
  fieldCount: 6,
  includeValidation: true,
  formType: 'registration',
  targetAudience: 'general',
  language: 'Vietnamese'
});
```

### Intelligent Chat
```javascript
// Multi-agent conversation handling
const response = await crewAIService.handleChatMessage(
  "How do I create an effective survey form?",
  conversationId,
  { userId: 'user123', language: 'Vietnamese' }
);
```

### Form Optimization
```javascript
// AI-powered form optimization
const optimization = await crewAIService.optimizeForm(existingForm, [
  'improve-ux',
  'increase-conversion',
  'enhance-accessibility'
]);
```

## API Endpoints

### Enhanced Endpoints

#### Form Generation (CrewAI)
```
POST /api/ai/generate-form
{
  "description": "Create a workshop registration form",
  "requirements": {
    "fieldCount": 5,
    "includeValidation": true,
    "formType": "registration",
    "targetAudience": "professionals"
  },
  "useCrewAI": true,
  "autoSave": false
}
```

#### Chat (CrewAI)
```
POST /api/ai/chat
{
  "message": "What makes a good survey form?",
  "conversation_id": "chat_123",
  "useCrewAI": true,
  "context": {
    "userId": "user123",
    "language": "Vietnamese"
  }
}
```

### New CrewAI-Specific Endpoints

#### Form Optimization
```
POST /api/ai/optimize-form/:formId
{
  "goals": ["improve-ux", "increase-conversion"]
}
```

#### Form Validation
```
POST /api/ai/validate-form
{
  "formData": { /* form structure */ }
}
```

#### Conversation Analysis
```
GET /api/ai/chat/analyze/:conversationId
```

#### Service Statistics
```
GET /api/ai/stats
```

#### Health Check
```
GET /api/ai/health
```

## Configuration

### Environment Variables
```bash
# CrewAI Configuration
CREWAI_ENABLED=true
CREWAI_VERBOSE=false

# AI Provider (for CrewAI LLM)
AI_PROVIDER=azure  # or openai

# Azure OpenAI (recommended)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-35-turbo

# OpenAI (alternative)
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-3.5-turbo
```

### Service Initialization
The CrewAI service automatically initializes with the configured LLM provider and creates the specialized agents.

## Frontend Integration

### Form Generation
```javascript
// Enhanced form generation request
const response = await fetch('/api/ai/generate-form', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: userInput,
    requirements: {
      fieldCount: 5,
      includeValidation: true,
      formType: 'dynamic',
      targetAudience: 'general',
      language: 'Vietnamese'
    },
    useCrewAI: true
  })
});
```

### Chat Integration
```javascript
// Enhanced chat with CrewAI
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userMessage,
    conversation_id: conversationId,
    useCrewAI: true,
    context: {
      userId: userId,
      timestamp: new Date().toISOString(),
      language: 'Vietnamese'
    }
  })
});
```

## Benefits

### 1. **Specialized Intelligence**
- Each agent is optimized for specific tasks
- Better performance than general-purpose AI
- Domain expertise in form design and conversation

### 2. **Improved Reliability**
- Fallback mechanisms between agents
- Legacy AI service as backup
- Graceful error handling

### 3. **Enhanced User Experience**
- More natural conversations
- Better form generation quality
- Context-aware responses

### 4. **Scalability**
- Modular agent architecture
- Easy to add new agents
- Independent agent scaling

## Monitoring and Debugging

### Service Health
```bash
# Check CrewAI service health
curl http://localhost:5000/api/ai/health
```

### Statistics
```bash
# Get service statistics
curl http://localhost:5000/api/ai/stats
```

### Logs
CrewAI operations are logged with structured logging:
```json
{
  "timestamp": "2024-01-01T10:30:45.123Z",
  "level": "info",
  "service": "backend",
  "message": "Form generated using CrewAI",
  "agent": "FormBuilderAgent",
  "description": "Create workshop registration form"
}
```

## Error Handling

### Graceful Fallbacks
1. **CrewAI → Legacy AI → Static Response**
2. **Agent Error → Service Error → Default Response**
3. **LLM Timeout → Cached Response → Fallback Data**

### Error Types
- `CrewAI Service not initialized`
- `Agent task execution failed`
- `LLM provider unavailable`
- `Invalid agent configuration`

## Performance Considerations

### Memory Management
- Conversation history limited to 50 messages per session
- Automatic cleanup of old conversations
- Agent task result caching

### Response Times
- CrewAI agents: ~2-5 seconds
- Legacy fallback: ~1-3 seconds
- Static fallback: Immediate

### Concurrency
- Multiple agents can run simultaneously
- Independent conversation handling
- Parallel form processing capabilities

## Future Enhancements

### Planned Features
- [ ] **FormValidator Agent** - Specialized validation and compliance
- [ ] **AnalyticsAgent** - Form performance insights
- [ ] **IntegrationAgent** - Third-party service connections
- [ ] **MultilingualAgent** - Advanced language support

### Advanced Capabilities
- [ ] **Agent Collaboration** - Multi-agent workflows
- [ ] **Learning System** - Agents learn from user feedback
- [ ] **Custom Agents** - User-defined specialized agents
- [ ] **Agent Marketplace** - Community-contributed agents

## Troubleshooting

### Common Issues

#### CrewAI Not Initializing
```bash
# Check environment variables
echo $AZURE_OPENAI_ENDPOINT
echo $AZURE_OPENAI_API_KEY

# Check logs
docker logs formagent-backend | grep CrewAI
```

#### Agent Task Failures
```bash
# Enable verbose logging
CREWAI_VERBOSE=true

# Check agent-specific logs
./logs-viewer.sh -s backend | grep FormBuilderAgent
```

#### LLM Provider Issues
```bash
# Test direct API access
curl -H "Authorization: Bearer $AZURE_OPENAI_API_KEY" \
     "$AZURE_OPENAI_ENDPOINT/openai/deployments/$AZURE_OPENAI_DEPLOYMENT_NAME/chat/completions?api-version=2024-02-15-preview"
```

### Support
For issues related to CrewAI integration:
1. Check the logs using `./logs-viewer.sh`
2. Verify environment configuration
3. Test the health endpoint: `/api/ai/health`
4. Review agent statistics: `/api/ai/stats`

## Migration Guide

### From Legacy AI to CrewAI
The system maintains backward compatibility:
- Existing API endpoints work unchanged
- Legacy AI service remains as fallback
- Gradual migration path available

### Configuration Updates
Update your `.env` file with CrewAI settings:
```bash
# Add to existing configuration
CREWAI_ENABLED=true
CREWAI_VERBOSE=false
```

No code changes required for basic migration - the system automatically uses CrewAI when available and falls back to legacy AI when needed.