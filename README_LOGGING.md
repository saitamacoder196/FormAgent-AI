# FormAgent AI - Logging System

## Overview
FormAgent AI now includes a comprehensive logging system with centralized log management, structured logging, and easy-to-use log viewing tools.

## Features

### 1. **Structured Logging**
- JSON formatted logs with consistent structure
- Service identification in every log entry
- Timestamp, log level, and contextual information
- Separate log files for errors and combined logs

### 2. **Log Viewer Script**
A powerful command-line tool to view logs from all services.

## Using the Log Viewer

### Basic Usage

```bash
# View logs from all services
./logs-viewer.sh

# Follow logs in real-time (like tail -f)
./logs-viewer.sh -f

# View logs from specific service
./logs-viewer.sh -s backend
./logs-viewer.sh -s frontend
./logs-viewer.sh -s mongodb
./logs-viewer.sh -s mongo-express
```

### Advanced Options

```bash
# Show last 50 lines
./logs-viewer.sh -n 50

# Show logs from last 10 minutes
./logs-viewer.sh --since 10m

# Show logs from last hour
./logs-viewer.sh --since 1h

# Show backend logs in JSON format
./logs-viewer.sh -s backend --format json

# Follow frontend logs with pretty formatting
./logs-viewer.sh -s frontend -f --format pretty
```

### Output Formats

1. **Pretty Format** (default)
   - Color-coded service names
   - Formatted timestamps
   - Color-coded log levels
   - Human-readable output

2. **JSON Format**
   - Structured JSON output
   - Suitable for parsing and analysis
   - Includes all metadata

3. **Raw Format**
   - Original Docker Compose output
   - No processing or formatting

## Log Structure

### Backend Logs
```json
{
  "timestamp": "2024-01-01T10:30:45.123Z",
  "level": "info",
  "service": "backend",
  "environment": "development",
  "message": "Server started",
  "port": 5000
}
```

### Frontend Logs
```json
{
  "timestamp": "2024-01-01T10:30:46.456Z",
  "level": "info",
  "service": "frontend",
  "message": "Application mounted",
  "version": "1.0.0"
}
```

## Docker Compose Logging

### Using the Logging Configuration
```bash
# Start with enhanced logging
docker-compose -f docker-compose-logging.yml up -d

# View logs with Docker Compose
docker-compose logs -f           # All services
docker-compose logs -f backend   # Specific service
docker-compose logs --tail=100   # Last 100 lines
```

## Log Levels

- **ERROR**: Critical errors that need immediate attention
- **WARN**: Warning messages for potential issues
- **INFO**: General information about application state
- **DEBUG**: Detailed debugging information
- **HTTP**: HTTP request/response logs (backend only)

## Log Files Location

```
FormAgent-AI/
├── logs/
│   ├── backend/
│   │   ├── error.log      # Backend errors only
│   │   └── combined.log   # All backend logs
│   └── frontend/
│       └── app.log        # Frontend logs
```

## Integration with Backend

### Using the Logger in Code

```javascript
import logger from './utils/logger.js';

// Basic logging
logger.info('User logged in', { userId: user.id });
logger.error('Database connection failed', { error: err });

// Structured logging helpers
logger.logRequest(req, { userId: req.user?.id });
logger.logResponse(req, res, { processingTime: 150 });
logger.logError(error, { context: 'UserController.create' });
logger.logDatabaseOperation('insert', 'users', { userId: newUser.id });
logger.logWebSocketEvent('form:created', socket.id, { formId: form.id });
```

## Monitoring and Debugging

### Real-time Monitoring
```bash
# Monitor all services
./logs-viewer.sh -f

# Monitor errors only
docker-compose logs -f | grep -i error

# Monitor specific service with context
./logs-viewer.sh -s backend -f | grep -C 3 error
```

### Debugging Issues
```bash
# Check last 200 lines for errors
./logs-viewer.sh -n 200 | grep -i error

# View logs from specific time period
./logs-viewer.sh --since "2024-01-01 10:00" --until "2024-01-01 11:00"

# Export logs for analysis
./logs-viewer.sh --format json > logs-analysis.json
```

## Best Practices

1. **Use Structured Logging**: Always include contextual information
2. **Log at Appropriate Levels**: Use DEBUG for development, INFO for production
3. **Include Request IDs**: For tracing requests across services
4. **Avoid Logging Sensitive Data**: Never log passwords, tokens, or PII
5. **Regular Log Rotation**: Implement log rotation to manage disk space

## Troubleshooting

### No Logs Appearing
```bash
# Check if services are running
docker-compose ps

# Check Docker logs directly
docker logs formagent-backend
docker logs formagent-frontend
```

### Permission Issues
```bash
# Make sure log directories exist
mkdir -p logs/backend logs/frontend

# Fix permissions
chmod +x logs-viewer.sh
```

### Performance Impact
- Logs are written asynchronously
- File rotation prevents large files
- JSON format allows efficient parsing

## Environment Variables

Control logging behavior with environment variables:

```bash
# Set log level
LOG_LEVEL=debug     # debug, info, warn, error
LOG_FORMAT=json     # json, pretty, raw

# In .env file
LOG_LEVEL=info
LOG_FORMAT=json
```

## Future Enhancements

- [ ] ELK Stack integration for advanced log analysis
- [ ] Metrics and monitoring with Prometheus
- [ ] Alert system for critical errors
- [ ] Log aggregation with Fluentd
- [ ] Dashboard for log visualization