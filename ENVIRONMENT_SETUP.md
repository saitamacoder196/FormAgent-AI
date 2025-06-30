# Environment Configuration Guide

This guide explains the environment configuration structure for FormAgent AI.

## File Structure

```
FormAgent-AI/
├── .env.example                    # Docker Compose configuration
├── .env                           # Your actual environment variables (ignored by git)
├── server/
│   ├── .env.example              # Server-specific configuration
│   └── .env                      # Server environment (if running standalone)
└── ENVIRONMENT_SETUP.md          # This guide
```

## Configuration Types

### 1. Docker Compose Mode (Recommended)

**File: `.env`** (copy from `.env.example`)

Use this configuration when running the entire stack with Docker Compose.

```bash
# Copy the example file
cp .env.example .env

# Edit with your actual values
nano .env
```

**Contains:**
- Docker Compose orchestration settings
- Infrastructure service configurations (MongoDB, Mongo Express)
- Application service configurations (Backend, Frontend)
- AI service configurations
- Logging and development settings

### 2. Standalone Server Mode

**File: `server/.env`** (copy from `server/.env.example`)

Use this when running the server directly with Node.js (without Docker).

```bash
# Copy the server example file
cp server/.env.example server/.env

# Edit with your actual values
nano server/.env
```

**Contains:**
- Server-specific configurations
- Direct database connection settings
- Enhanced features (JWT, file upload, email)
- Development and debugging options

## Quick Setup

### Option A: Docker Compose (Recommended)

1. **Copy and configure main environment:**
```bash
cp .env.example .env
```

2. **Edit `.env` with your AI provider:**

For Azure OpenAI:
```env
AI_PROVIDER=azure
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-actual-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini
AI_FORM_GENERATION_ENABLED=true
```

For OpenAI:
```env
AI_PROVIDER=openai
OPENAI_API_KEY=your-actual-api-key
AI_FORM_GENERATION_ENABLED=true
```

3. **Start the application:**
```bash
docker-compose up -d --build
```

### Option B: Standalone Server

1. **Copy server configuration:**
```bash
cp server/.env.example server/.env
```

2. **Configure database and AI services in `server/.env`**

3. **Start MongoDB separately and run server:**
```bash
# Start MongoDB
mongod

# Install dependencies and start server
cd server
npm install
npm start
```

## Configuration Sections

### Infrastructure Services

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_ROOT_USERNAME` | MongoDB admin username | Yes |
| `MONGO_ROOT_PASSWORD` | MongoDB admin password | Yes |
| `MONGO_DATABASE` | Database name | Yes |
| `MONGO_EXPRESS_PORT` | Database admin UI port | No |

### Application Services

| Variable | Description | Default |
|----------|-------------|---------|
| `BACKEND_PORT` | Backend server port | 5000 |
| `FRONTEND_PORT` | Frontend server port | 3000 |
| `NODE_ENV` | Environment mode | development |

### AI Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `AI_PROVIDER` | `azure` or `openai` | Yes |
| `AI_FORM_GENERATION_ENABLED` | Enable AI form generation | Yes |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | If using Azure |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | If using Azure |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Model deployment name | If using Azure |
| `OPENAI_API_KEY` | OpenAI API key | If using OpenAI |

### Enhanced Features (Server Only)

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret | Required for auth |
| `MAX_FILE_SIZE` | File upload limit | 10MB |
| `RATE_LIMIT_MAX_REQUESTS` | API rate limit | 100/15min |
| `MAX_CONVERSATIONS` | Chat memory limit | 100 |

## Environment Validation

The application will validate environment variables on startup:

```bash
# Check configuration
docker-compose config

# View effective environment
docker-compose exec backend env | grep -E "(AI_|MONGO_|AZURE_|OPENAI_)"
```

## Security Best Practices

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use strong passwords** for MongoDB
3. **Rotate API keys** regularly
4. **Use environment-specific secrets** in production
5. **Enable rate limiting** in production

## Troubleshooting

### Common Issues

**"No AI service is enabled"**
- Check `AI_FORM_GENERATION_ENABLED=true`
- Verify `AI_PROVIDER` is set correctly
- Ensure API keys are valid

**Database connection failed**
- Verify MongoDB credentials
- Check if MongoDB container is running
- Validate `MONGODB_URI` format

**Frontend can't connect to backend**
- Check `VITE_API_URL` points to correct backend
- Verify backend is running on expected port
- Check CORS configuration

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=debug
DEBUG_MODE=true
VERBOSE_LOGGING=true
```

### Health Checks

Check service health:
```bash
# Backend health
curl http://localhost:5000/api/health

# AI service health  
curl http://localhost:5000/api/ai/health

# Database connection
docker-compose exec backend node -e "console.log(process.env.MONGODB_URI)"
```

## Production Deployment

For production, override these settings:

```env
NODE_ENV=production
LOG_LEVEL=warn
RATE_LIMIT_MAX_REQUESTS=50
AI_SERVICE_DISABLED=false
DEBUG_MODE=false
```

Additional production considerations:
- Use Docker secrets for sensitive data
- Set up log aggregation
- Configure monitoring and alerts
- Use a reverse proxy (nginx)
- Enable SSL/TLS certificates

## Need Help?

1. Check `AI_SETUP.md` for AI-specific configuration
2. Review Docker Compose logs: `docker-compose logs -f`
3. Validate your configuration against the examples
4. Test individual services separately