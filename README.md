# OpenAI Server

A simple Express.js server that integrates with the OpenAI API.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables:
   - Copy `.env` file and add your OpenAI API key
   - Replace `your_openai_api_key_here` with your actual OpenAI API key

3. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### GET /health
Health check endpoint
```bash
curl http://localhost:3000/health
```

### GET /api/test
Test the OpenAI integration with a simple "Hello!" message
```bash
curl http://localhost:3000/api/test
```

### POST /api/chat
Send custom messages to OpenAI
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "input": "What is the weather like?",
    "instructions": "You are a helpful weather assistant."
  }'
```

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `PORT`: Server port (default: 3000)

## Notes

- The code uses GPT-4 model instead of GPT-5 (which doesn't exist yet)
- Uses the chat completions API instead of the deprecated responses API
- Includes error handling and logging 