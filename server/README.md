# FormAgent Backend Server

Express.js backend server for the FormAgent application.

## Features

- RESTful API for form management
- CORS enabled for frontend communication
- Rate limiting for API protection
- Security headers with Helmet
- Request logging with Morgan
- Environment configuration with dotenv

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Forms Management
- `GET /api/forms` - Get all forms
- `POST /api/forms` - Create new form
- `GET /api/forms/:id` - Get specific form
- `PUT /api/forms/:id` - Update form
- `DELETE /api/forms/:id` - Delete form

### Form Submissions
- `POST /api/forms/:id/submit` - Submit form data
- `GET /api/forms/:id/submissions` - Get form submissions

## Installation

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Update environment variables in `.env` file as needed

## Development

Start the development server:
```bash
npm run dev
```

Start the production server:
```bash
npm start
```

The server will run on `http://localhost:5000` by default.

## Environment Variables

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:3000)

## Dependencies

- **express** - Web framework
- **cors** - Cross-origin resource sharing
- **helmet** - Security headers
- **morgan** - HTTP request logger
- **dotenv** - Environment variables
- **express-rate-limit** - Rate limiting
- **multer** - File upload handling

## Security Features

- Rate limiting (100 requests per 15 minutes per IP)
- CORS configuration
- Security headers via Helmet
- Request size limits (10MB)
- Input validation