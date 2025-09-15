import { runAgent } from '../agent/agent.js';
import { addMessage } from '../utils/database.js';
import { processWhatsAppAudioMessage } from '../utils/transcribe.js';
import {
  validateWebhookEntry,
  extractSenderInfo,
  getConversationHistory,
  sendAndStoreResponse,
  handleAgentError,
  downloadWhatsAppImage
} from './webhook-helpers.js';


 /* Extract message content based on message type
 * @param {Object} message - WhatsApp message object
 * @param {string} businessId - Business ID for storing images
 * @param {Object} sender - Sender information
 * @returns {Promise<Object|null>} Object with messageText, imageData, and description, or null if message should be skipped
 */
async function extractMessageContent(message, businessId, sender) {
  let messageText = "";
  let imageData = null;
  let imageDescription = null;

  if (message.type === 'text') {
    messageText = message.text?.body || '';
    console.log('Text message:', messageText);
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
  } else if (message.type === 'image') {
    console.log('Image message received, downloading and extracting caption...');
    
    try {
      imageData = await downloadWhatsAppImage(message.image, process.env.WHATSAPP_ACCESS_TOKEN);
      const caption = imageData.caption;
      console.log('Image downloaded:', imageData.filepath);
      console.log('Image caption:', caption);
      
      if (!caption) {
        console.log('No caption found for image, skipping processing');
        // store the image only if there's no caption
        const addImageResult = await addMessage(businessId, sender.waId, null, true, imageData.filepath, null);
       
        if (!addImageResult.success) {
          console.error('Failed to store image message:', addImageResult.error);
        } else {  
          console.log('Image message stored successfully');
        }

        return null;
      }
      
      messageText = caption;
      imageDescription = null;
    } catch (imageError) {
      console.error('Failed to download image:', imageError.message);
      return null; 
    }
  } else {
    console.log(`Unsupported message type received: ${message.type}`);
    return null; // Signal to skip this message
  }

  return {
    messageText,
    imageData,
    imageDescription
  };
}

/**
 * Process a single WhatsApp message
 * @param {Object} message - WhatsApp message object
 * @param {Array} contacts - WhatsApp contacts array
 * @param {string} businessId - Business phone number ID
 */
async function processSingleMessage(message, contacts, businessId) {
  // Extract sender information
  const sender = extractSenderInfo(message, contacts);
  console.log(`Processing message from ${sender.phone} (wa_id: ${sender.waId}, name: ${sender.name}), type: ${message.type}`);

  // Extract message content based on type
  const messageContent = await extractMessageContent(message, businessId, sender);
  
  if (!messageContent) {
    console.log('Message processing skipped (no content or unsupported type)');
    return;
  }

  const { messageText, imageData, imageDescription } = messageContent;

  console.log(`Final message text from ${sender.phone} (wa_id: ${sender.waId}):`, messageText);

  try {
    // Get conversation history
    const conversationHistory = await getConversationHistory(businessId, sender.waId);

    // Store the incoming user message
    const addMessageResult = await addMessage(businessId, sender.waId, messageText, true, imageData?.filepath, imageDescription);
    if (!addMessageResult.success) {
      console.error('Failed to store incoming message:', addMessageResult.error);
    }

    // Prepare agent input with context
    const agentInput = `Housekeeper phone number: ${sender.phone}. Task: ${messageText}. Follow the workflow: determine the right specialist, use get_person, send_message to the specialist, then send a confirmation message to the housekeeper using the provided phone number.`;
    
    // Call the agent with conversation context
    const result = await runAgent(agentInput, conversationHistory);
    
    // Send the agent's response back to the sender
    if (result?.finalOutput) {
      await sendAndStoreResponse(sender.phone, sender.waId, businessId, result.finalOutput);
    } else {
      console.log('No final output from agent to send back');
    }
  } catch (agentError) {
    await handleAgentError(sender.phone, sender.waId, businessId, agentError);
  }
}

/**
 * Process incoming WhatsApp messages from webhook
 * @param {Object} entry - WhatsApp webhook entry data
 */
export async function processWhatsAppMessage(entry) {
  try {
    // Validate webhook structure
    const webhookData = validateWebhookEntry(entry);
    if (!webhookData) {
      return;
    }

    const { messages, contacts, metadata } = webhookData;
    const businessId = process.env.WHATSAPP_HK_PHONE_NUMBER_ID;

    console.log(`Processing ${messages.length} message(s) from WhatsApp webhook`);
    console.log('Business phone number ID:', metadata?.phone_number_id);

    // Process each message
    for (const message of messages) {
      await processSingleMessage(message, contacts, businessId);
    }
  } catch (processingError) {
    console.error('Webhook async processing error:', processingError);
  }
} 