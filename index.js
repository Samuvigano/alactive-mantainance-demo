import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { runAgent } from './agent/agent.js';
import { sendWhatsAppText } from './wapp/send_message.js';
import { processWhatsAppMessage } from './webhook/process_message.js';

// Load environment variables
dotenv.config();

// ======================= Express App Initialization ==========================
const app = express();
const port = process.env.PORT || 3000;

// ============================= Middleware ====================================
app.use(express.json());



// ======================= Webhook Verification ============================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  
  console.log('Webhook verification attempt:', req.query);

  if (mode && token === VERIFY_TOKEN) {
    console.log("Webhook verified successfully.");
    res.status(200).send(challenge);
  } else {
    console.log("Webhook verification failed - token mismatch");
    res.sendStatus(403);
  }
});

// ======================= Webhook Endpoint ====================================
app.post("/webhook", async (req, res) => {
  try {
    // Log the incoming webhook for debugging
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));
    
    // Validate webhook structure
    const { object, entry } = req.body ?? {};
    
    if (object !== 'whatsapp_business_account') {
      console.log('Invalid webhook object type:', object);
      return res.status(400).json({ error: 'Invalid webhook object type' });
    }
    
    if (!entry || !Array.isArray(entry)) {
      console.log('Invalid or missing entry array');
      return res.status(400).json({ error: 'Invalid or missing entry array' });
    }

    // Always acknowledge the webhook immediately to avoid retries
    res.status(200).json({ status: 'received' });

    // Continue processing asynchronously after responding
    setImmediate(() => processWhatsAppMessage(entry));

  } catch (error) {
    // ----------- Error Handling -----------
    console.error('Webhook error:', error);
    // Send error response if we haven't responded yet
    if (!res.headersSent) {
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
});


// ======================= Api Agent, DEBUGGING ==========================
app.post('/agent', async (req, res) => {
  try {
    const { input, messages = [] } = req.body ?? {};
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'input (string) is required' });
    }
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array if provided' });
    }
    const result = await runAgent(input, messages);
    return res.json({ output: result.finalOutput, usage: result.usage });
  } catch (err) {
    console.error('Agent run failed:', err);
    return res.status(500).json({ error: 'Agent run failed' });
  }
});

app.post('/send_message', async (req, res) => {
  const { phone_number, message } = req.body;
  const result = await sendWhatsAppText({ to: phone_number, text: message });
  return res.json({ output: result.finalOutput, usage: result.usage });
});

// ======================= Health Check Route ==================================
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});




// ======================= Start Server ========================================
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Test the API at: http://localhost:${port}/api/test`);
  console.log('Make sure to set your OPENAI_API_KEY in the .env file');
}); 