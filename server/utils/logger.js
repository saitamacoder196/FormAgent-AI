import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston about the colors
winston.addColors(colors);

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (error) {
  console.warn('Warning: Could not create logs directory, file logging disabled:', error.message);
}

// Define format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

// Define which transports the logger must use
const transports = [
  // Console transport (always available)
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
      )
    ),
  }),
];

// Add file transports only if logs directory exists and is writable
if (fs.existsSync(logsDir)) {
  try {
    // Test write permission
    fs.accessSync(logsDir, fs.constants.W_OK);
    
    // Add file transports
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format,
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        format,
      })
    );
  } catch (error) {
    console.warn('Warning: Logs directory not writable, file logging disabled:', error.message);
  }
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels,
  format,
  transports,
  defaultMeta: { 
    service: 'backend',
    environment: process.env.NODE_ENV || 'development'
  },
});

// Create a stream object for Morgan
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

// Helper functions for structured logging
logger.logRequest = (req, additionalInfo = {}) => {
  logger.info('API Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    ...additionalInfo
  });
};

logger.logResponse = (req, res, additionalInfo = {}) => {
  logger.info('API Response', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: res.get('X-Response-Time'),
    ...additionalInfo
  });
};

logger.logError = (error, context = {}) => {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    code: error.code,
    ...context
  });
};

logger.logDatabaseOperation = (operation, collection, details = {}) => {
  logger.debug('Database operation', {
    operation,
    collection,
    ...details
  });
};

logger.logWebSocketEvent = (event, socketId, data = {}) => {
  logger.info('WebSocket event', {
    event,
    socketId,
    ...data
  });
};

export default logger;