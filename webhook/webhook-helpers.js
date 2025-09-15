import { sendWhatsAppText } from '../wapp/send_message.js';
import { getLastMessages, addMessage } from '../utils/database.js';
import fs from 'fs';
import path from 'path';

/**
 * Validate the webhook entry structure
 * @param {Object} entry - WhatsApp webhook entry data
 * @returns {Object|null} - Validated webhook data or null if invalid
 */
export function validateWebhookEntry(entry) {
  if (!entry || !Array.isArray(entry) || !entry[0] || !entry[0].changes) {
    console.log('Invalid webhook entry structure');
    return null;
  }

  const changes = entry[0].changes[0];
  if (!changes || !changes.value || !changes.value.messages || !Array.isArray(changes.value.messages)) {
    console.log('No messages found in webhook data');
    return null;
  }

  return {
    messages: changes.value.messages,
    contacts: changes.value.contacts || [],
    metadata: changes.value.metadata
  };
}

/**
 * Extract sender information from message and contacts
 * @param {Object} message - WhatsApp message object
 * @param {Array} contacts - WhatsApp contacts array
 * @returns {Object} - Sender information
 */
export function extractSenderInfo(message, contacts) {
  const senderPhone = message.from;
  const senderContact = contacts[0]; // Usually one contact per message
  const senderWaId = senderContact?.wa_id || senderPhone;
  const senderName = senderContact?.profile?.name || 'Unknown';

  return {
    phone: senderPhone,
    waId: senderWaId,
    name: senderName
  };
}



/**
 * Get and format conversation history for the agent
 * @param {string} businessId - Business phone number ID
 * @param {string} userId - User's WhatsApp ID
 * @returns {Promise<Array>} - Formatted conversation history
 */
export async function getConversationHistory(businessId, userId, messages_number = 10) {
  const messagesResult = await getLastMessages(businessId, userId, messages_number);
  let conversationHistory = [];
  
  if (messagesResult.success && messagesResult.data) {
    conversationHistory = messagesResult.data.map(msg => {
      // Build the text content with image placeholders
      let textContent = msg.text || '';
      
      // Add image placeholder if there's an image_url
      if (msg.image_url) {
        const imagePlaceholder = msg.image_description 
          ? `[Image attached with ${msg.image_description}. Image URL: ${msg.image_url}]`
          : `[Image attached. Image URL: ${msg.image_url}]`;
        
        // Add placeholder to text, with appropriate spacing
        textContent = textContent 
          ? `${textContent} ${imagePlaceholder}`
          : imagePlaceholder;
      }
      
      return {
        role: msg.is_user ? 'user' : 'assistant',
        content: [
          {
            type: msg.is_user ? 'input_text' : 'output_text',
            text: textContent
          }
        ],
        timestamp: msg.created_at
      };
    });
  }

  console.log(`Retrieved ${conversationHistory.length} previous messages for context`);
  return conversationHistory;
}

/**
 * Send response back to user and store in database
 * @param {string} senderPhone - Sender's phone number
 * @param {string} senderWaId - Sender's WhatsApp ID
 * @param {string} businessId - Business phone number ID
 * @param {string} responseText - Response text to send
 * @returns {Promise<boolean>} - Success status
 */
export async function sendAndStoreResponse(senderPhone, senderWaId, businessId, responseText) {
  try {
    await sendWhatsAppText({ 
      to: senderPhone, 
      text: responseText,
      phone_number_id: process.env.WHATSAPP_HK_PHONE_NUMBER_ID
    });
    
    // Store the assistant's response  
    const addResponseResult = await addMessage(businessId, senderWaId, responseText, false);
    if (!addResponseResult.success) {
      console.error('Failed to store assistant response:', addResponseResult.error);
    }
    
    console.log(`Sent response to ${senderPhone}: ${responseText}`);
    return true;
  } catch (sendError) {
    console.error('Failed to send response back to sender:', sendError?.message || sendError);
    return false;
  }
}

/**
 * Handle agent processing error by sending error message to user
 * @param {string} senderPhone - Sender's phone number
 * @param {string} senderWaId - Sender's WhatsApp ID
 * @param {string} businessId - Business phone number ID
 * @param {Error} error - The error that occurred
 */
export async function handleAgentError(senderPhone, senderWaId, businessId, error) {
  console.error('Agent run failed from webhook:', error?.message || error);
  
  const errorMessage = 'Sorry, I encountered an error processing your request. Please try again.';
  await sendAndStoreResponse(senderPhone, senderWaId, businessId, errorMessage);
} 

/**
 * Download WhatsApp image and extract caption
 * @param {Object} imageMessage - WhatsApp image message object
 * @param {string} accessToken - WhatsApp access token
 * @returns {Promise<Object>} - Object containing caption and download info
 */
export async function downloadWhatsAppImage(imageMessage, accessToken) {
  try {
    const { id: mediaId, caption = '', mime_type } = imageMessage;
    
    // Step 1: Get media URL from WhatsApp API
    const mediaUrlResponse = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!mediaUrlResponse.ok) {
      throw new Error(`Failed to get media URL: ${mediaUrlResponse.statusText}`);
    }
    
    const mediaData = await mediaUrlResponse.json();
    const mediaUrl = mediaData.url;
    
    // Step 2: Download the actual image
    const imageResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }
    
    // Create downloads directory if it doesn't exist
    const downloadDir = './image-downloads';
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    
    // Generate filename with timestamp
    const timestamp = Date.now();
    const extension = mime_type.split('/')[1] || 'jpg';
    const filename = `image_${mediaId}_${timestamp}.${extension}`;
    const filepath = path.join(downloadDir, filename);
    
    // Save image to file
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    fs.writeFileSync(filepath, buffer);
    
    console.log(`Image downloaded successfully: ${filepath}`);
    
    return {
      caption: caption.trim(),
      filepath,
      filename,
      mediaId,
      mimeType: mime_type
    };
    
  } catch (error) {
    console.error('Failed to download WhatsApp image:', error.message);
    throw error;
  }
} 