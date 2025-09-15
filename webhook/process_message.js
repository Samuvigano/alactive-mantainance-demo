import { processWhatsAppAudioMessage } from '../utils/transcribe.js';
import { runAgent } from '../agent/agent.js';
import { sendWhatsAppText } from '../wapp/send_message.js';

/**
 * Process incoming WhatsApp messages from webhook
 * @param {Object} entry - WhatsApp webhook entry data
 */
export async function processWhatsAppMessage(entry) {
  try {
    if (!entry || !entry[0] || !entry[0].changes) {
      return;
    }

    const changes = entry[0].changes[0];
    if (!changes.value || !changes.value.messages) {
      return;
    }

    const messages = changes.value.messages;

    // ----------- Message Processing Loop -----------
    for (const message of messages) {
      let messageText = '';
      const senderPhone = message.from;

      console.log(`Processing message from ${senderPhone}, type: ${message.type}`);

      // ----------- Text Message Handling -----------
      if (message.type === 'text') {
        messageText = message.text.body;
        console.log('Text message:', messageText);

      // ----------- Audio Message Handling -----------
      } else if (message.type === 'audio') {
        console.log('Audio message received, transcribing...');

        const config = {
          accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
          phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
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
        console.log(`Message type received: ${message.type}`);
        continue;
      }

      // ----------- Final Message Logging -----------
      console.log(`Final message text from ${senderPhone}:`, messageText);

      // TODO: check if ticket is already open

      // Call the agent with context including the sender's phone number for confirmations
      const agentInput = `Housekeeper phone number: ${senderPhone}. Task: ${messageText}. Follow the workflow: determine the right specialist, use get_person, send_message to the specialist, then send a confirmation message to the housekeeper using the provided phone number.`;
      try {
        const result = await runAgent(agentInput);
        
        // Send the agent's response back to the sender
        if (result?.finalOutput) {
          try {
            await sendWhatsAppText({ 
              to: senderPhone, 
              text: result.finalOutput 
            });
            console.log(`Sent response to ${senderPhone}: ${result.finalOutput}`);
          } catch (sendError) {
            console.error('Failed to send response back to sender:', sendError?.message || sendError);
          }
        }
      } catch (agentError) {
        console.error('Agent run failed from webhook:', agentError?.message || agentError);
        
        // Send error message back to sender
        try {
          await sendWhatsAppText({ 
            to: senderPhone, 
            text: 'Sorry, I encountered an error processing your request. Please try again.' 
          });
        } catch (sendError) {
          console.error('Failed to send error message back to sender:', sendError?.message || sendError);
        }
      }

    }
  } catch (processingError) {
    console.error('Webhook async processing error:', processingError);
  }
} 