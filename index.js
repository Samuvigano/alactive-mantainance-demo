import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { runAgent } from './agent/agent.js';
import { hkAgent } from './agent/hkAgent.js';
import { specialistAgent } from './agent/specialistAgent.js';
import { sendWhatsAppText } from './wapp/send_message.js';
import { processWhatsAppMessage } from './webhook/process_message.js';

// Load environment variables
dotenv.config();

// ======================= Express App Initialization ==========================
const app = express();
const port = process.env.PORT || 3000;

// ============================= Middleware ====================================
app.use(express.json());





// SECTION: Webhook
// ======================= Webhook Verification ============================
const verifyWebhook = (req, res) => {
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
};

app.get("/webhook", (req, res) => {
  verifyWebhook(req, res);
});

app.get("/webhook_specialist", (req, res) => {
  verifyWebhook(req, res);
});

// ======================= Webhook Endpoint ====================================
const processWebhook = async (req, res, isSpecialist = false) => {
  try {
    const logPrefix = isSpecialist ? 'Specialist webhook' : 'Webhook';
    console.log(`${logPrefix} received:`, JSON.stringify(req.body, null, 2));
    
    const { object, entry } = req.body ?? {};
    
    if (object !== 'whatsapp_business_account') {
      const errorMsg = `Invalid webhook object type${isSpecialist ? ' (specialist)' : ''}:`;
      console.log(errorMsg, object);
      return res.status(400).json({ error: 'Invalid webhook object type' });
    }
    
    if (!entry || !Array.isArray(entry)) {
      const errorMsg = `Invalid or missing entry array${isSpecialist ? ' (specialist)' : ''}`;
      console.log(errorMsg);
      return res.status(400).json({ error: 'Invalid or missing entry array' });
    }

    // Always acknowledge the webhook immediately to avoid retries
    res.status(200).json({ status: 'received' });

    // Continue processing asynchronously after responding
    setImmediate(() => processWhatsAppMessage(entry, isSpecialist));

  } catch (error) {
    const errorPrefix = isSpecialist ? 'Specialist webhook error:' : 'Webhook error:';
    console.error(errorPrefix, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
};

app.post("/webhook", async (req, res) => {
  await processWebhook(req, res, false);
});

app.post("/webhook_specialist", async (req, res) => {
  await processWebhook(req, res, true);
});






// SECTION: Debugging
// ======================= DEBUGGING: Agent ==========================
app.post('/agent', async (req, res) => {
  try {
    const { input, messages = [] } = req.body ?? {};
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'input (string) is required' });
    }
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array if provided' });
    }
    const result = await runAgent(input, messages, {}, hkAgent);
    return res.json({ output: result.finalOutput, usage: result.usage });
  } catch (err) {
    console.error('Agent run failed:', err);
    return res.status(500).json({ error: 'Agent run failed' });
  }
});

// ======================= DEBUGGING: Send Message ==========================
app.post('/send_message', async (req, res) => {
  const { phone_number, message } = req.body;
  const result = await sendWhatsAppText({ to: phone_number, text: message });
  return res.json({ output: result.finalOutput, usage: result.usage });
});




// SECTION: Server & co
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