# Maintenance Agent System

A WhatsApp-based maintenance request system that uses AI agents to process housekeeping requests and route them to appropriate specialists.

## Features

- WhatsApp webhook integration for receiving messages
- Audio message transcription
- AI agent for processing requests and routing to specialists
- Ticket management system
- Conversation context preservation
- Database integration with Supabase

## Conversation Context

The agent now supports conversation context, allowing it to maintain memory of previous interactions. This enables more natural, contextual conversations.

### Message Structure

Messages should follow this structure for conversation context:

```javascript
{
  "role": "user" | "assistant" | "system",
  "content": [
    {
      "type": "text",
      "text": "message text"
    }
  ],
  "timestamp": "2024-01-01T12:00:00Z", // optional but recommended
  "name": "sender_identifier" // optional
}
```

### API Usage with Context

#### POST `/agent` endpoint

```javascript
{
  "input": "Current user message",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Previous user message"
        }
      ],
      "timestamp": "2024-01-01T12:00:00Z"
    },
    {
      "role": "assistant", 
      "content": [
        {
          "type": "text",
          "text": "Previous agent response"
        }
      ],
      "timestamp": "2024-01-01T12:01:00Z"
    }
    // ... more previous messages
  ]
}
```

#### Direct Agent Usage

```javascript
import { runAgent } from './agent/agent.js';

const conversationHistory = [
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Hi, I need help with maintenance'
      }
    ],
    timestamp: '2024-01-01T12:00:00Z'
  },
  {
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Hello! I can help you with maintenance requests. What do you need?'
      }
    ],
    timestamp: '2024-01-01T12:01:00Z'
  }
];

const result = await runAgent(
  'The bathroom sink is leaking', 
  conversationHistory
);
```

### Database Integration

The system automatically:
- Retrieves the last 10 messages from the database for context
- Stores incoming user messages
- Stores agent responses
- Maintains conversation history per user/business combination

**ID Mapping:**
- `business_id` = `WHATSAPP_HK_PHONE_NUMBER_ID` (from environment variable)
- `user_id` = sender's WhatsApp user ID (`wa_id` from webhook contacts array)

### WhatsApp Integration

When processing WhatsApp messages, the system:
1. Retrieves conversation history from the database
2. Converts database messages to OpenAI format
3. Passes context to the agent
4. Stores both user messages and agent responses

## Environment Variables

Make sure to set these environment variables:

```
OPENAI_API_KEY=your_openai_api_key
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_HK_PHONE_NUMBER_ID=your_hk_phone_number_id
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables

3. Run the application:
```bash
npm start
```

## Database Schema

The system expects these Supabase tables:

### `chats`
- `id` (uuid, primary key)
- `business_id` (text)
- `user_id` (text)
- `created_at` (timestamp)

### `messages`
- `id` (uuid, primary key)
- `chat_id` (uuid, foreign key to chats.id)
- `text` (text)
- `is_user` (boolean)
- `created_at` (timestamp)

### `tickets`
- `id` (uuid, primary key)
- `description` (text)
- `opened_by_phone_number` (text)
- `latest` (text)
- `is_open` (boolean)
- `created_at` (timestamp) 