import { processWhatsAppAudioMessage } from '../utils/transcribe.js';
import { runAgent } from '../agent/agent.js';
import { sendWhatsAppText } from '../wapp/send_message.js';
import { getLastMessages, addMessage } from '../utils/database.js';

/**
 * Process incoming WhatsApp messages from webhook
 * @param {Object} entry - WhatsApp webhook entry data
 */
export async function processWhatsAppMessage(entry) {
  try {
    // Validate webhook structure
    if (!entry || !Array.isArray(entry) || !entry[0] || !entry[0].changes) {
      console.log('Invalid webhook entry structure');
      return;
    }

    const changes = entry[0].changes[0];
    if (!changes || !changes.value || !changes.value.messages || !Array.isArray(changes.value.messages)) {
      console.log('No messages found in webhook data');
      return;
    }

    const { messages, contacts = [], metadata } = changes.value;
    const businessId = process.env.WHATSAPP_HK_PHONE_NUMBER_ID;

    console.log(`Processing ${messages.length} message(s) from WhatsApp webhook`);
    console.log('Business phone number ID:', metadata?.phone_number_id);

    // ----------- Message Processing Loop -----------
    for (const message of messages) {
      let messageText = '';
      const senderPhone = message.from;
      
      // Extract WhatsApp user ID from contacts array
      // Note: message.from is the phone number, contact.wa_id is the WhatsApp user ID
      // They may not always match according to WhatsApp docs
      const senderContact = contacts[0]; // Usually one contact per message
      const senderWaId = senderContact?.wa_id || senderPhone;
      const senderName = senderContact?.profile?.name || 'Unknown';

      console.log(`Processing message from ${senderPhone} (wa_id: ${senderWaId}, name: ${senderName}), type: ${message.type}`);

      // ----------- Text Message Handling -----------
      if (message.type === 'text') {
        messageText = message.text?.body || '';
        console.log('Text message:', messageText);

      // ----------- Audio Message Handling -----------
      } else if (message.type === 'audio') {
        console.log('Audio message received, transcribing...');

        const config = {
          accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
          phoneNumberId: process.env.WHATSAPP_HK_PHONE_NUMBER_ID,
          downloadDir: './audio-downloads',
          language: null // Auto-detect language
        };

        try {
          messageText = await processWhatsAppAudioMessage(message, config);
          console.log('Audio transcribed:', messageText);
        } catch (transcriptionError) {
          console.error('Failed to transcribe audio:', transcriptionError.message);
          messageText = '[Audio transcription failed]';
        }

      // ----------- Other Message Types -----------
      } else {
        console.log(`Unsupported message type received: ${message.type}`);
        continue;
      }

      // Skip empty messages
      if (!messageText.trim()) {
        console.log('Empty message text, skipping processing');
        continue;
      }

      // ----------- Final Message Logging -----------
      console.log(`Final message text from ${senderPhone} (wa_id: ${senderWaId}):`, messageText);

      try {
        // Get conversation history from database
        // businessId = WHATSAPP_HK_PHONE_NUMBER_ID, userId = sender's WhatsApp user ID
        const messagesResult = await getLastMessages(businessId, senderWaId);
        let conversationHistory = [];
        
        if (messagesResult.success && messagesResult.data) {
          // Convert database messages to OpenAI format
          conversationHistory = messagesResult.data.map(msg => ({
            role: msg.is_user ? 'user' : 'assistant',
            content: [
              {
                type: msg.is_user ? 'input_text' : 'output_text',
                text: msg.text
              }
            ],
            timestamp: msg.created_at
          }));
        }

        console.log(`Retrieved ${conversationHistory.length} previous messages for context`);

        // Store the incoming user message
        // businessId = WHATSAPP_HK_PHONE_NUMBER_ID, userId = sender's WhatsApp user ID  
        const addMessageResult = await addMessage(businessId, senderWaId, messageText, true);
        if (!addMessageResult.success) {
          console.error('Failed to store incoming message:', addMessageResult.error);
        }

        // Prepare agent input with context
        const agentInput = `Housekeeper phone number: ${senderPhone}. Task: ${messageText}. Follow the workflow: determine the right specialist, use get_person, send_message to the specialist, then send a confirmation message to the housekeeper using the provided phone number.`;
        
        // Call the agent with conversation context
        const result = await runAgent(agentInput, conversationHistory);
        
        // Send the agent's response back to the sender
        if (result?.finalOutput) {
          try {
            await sendWhatsAppText({ 
              to: senderPhone, 
              text: result.finalOutput,
              phone_number_id: process.env.WHATSAPP_HK_PHONE_NUMBER_ID
            });
            
            // Store the assistant's response  
            // businessId = WHATSAPP_HK_PHONE_NUMBER_ID, userId = sender's WhatsApp user ID
            const addResponseResult = await addMessage(businessId, senderWaId, result.finalOutput, false);
            if (!addResponseResult.success) {
              console.error('Failed to store assistant response:', addResponseResult.error);
            }
            
            console.log(`Sent response to ${senderPhone}: ${result.finalOutput}`);
          } catch (sendError) {
            console.error('Failed to send response back to sender:', sendError?.message || sendError);
          }
        } else {
          console.log('No final output from agent to send back');
        }
      } catch (agentError) {
        console.error('Agent run failed from webhook:', agentError?.message || agentError);
        
        // Send error message back to sender
        const errorMessage = 'Sorry, I encountered an error processing your request. Please try again.';
        try {
          await sendWhatsAppText({ 
            to: senderPhone, 
            text: errorMessage,
            phone_number_id: process.env.WHATSAPP_HK_PHONE_NUMBER_ID
          });
          
          // Store the error response
          // businessId = WHATSAPP_HK_PHONE_NUMBER_ID, userId = sender's WhatsApp user ID
          const addErrorResult = await addMessage(businessId, senderWaId, errorMessage, false);
          if (!addErrorResult.success) {
            console.error('Failed to store error message:', addErrorResult.error);
          }
        } catch (sendError) {
          console.error('Failed to send error message back to sender:', sendError?.message || sendError);
        }
      }
    }
  } catch (processingError) {
    console.error('Webhook async processing error:', processingError);
  }
} 