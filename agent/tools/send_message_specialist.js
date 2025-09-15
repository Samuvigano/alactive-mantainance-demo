import { tool } from '@openai/agents';
import { z } from 'zod';
import { sendWhatsAppText } from '../../wapp/send_message.js';
import { getConversationHistory } from '../../webhook/webhook-helpers.js';
import OpenAI from 'openai';

export const sendMessageToSpecialistTool = tool({
  name: 'send_message_to_specialist',
  description: 'Send a message to a person',
  parameters: z.object({
    message: z.string().describe('The message to send'),
    phone_number: z.string().describe('The phone number of the recipient'),
    scan_for_images: z.boolean().describe('Whether to scan the current chat conversation for images sent by the user that should be attached to the message sent to the specialist'),
    sender_wa_id: z.string().optional().describe('Housekeeper phone number in WhatsApp format (no spaces, no +, with area code if there, e.g. "393450890959" for "+39 345 089 09 59") - required when scan_for_images is true'),
  }),
  execute: async ({ message, phone_number, scan_for_images, sender_wa_id }) => {
    console.log('[Tool:send_message] placeholder send', { to: phone_number, text: message });
    const phone_number_id = process.env.WHATSAPP_SPECIALIST_PHONE_NUMBER_ID;

    // Real send (disabled in placeholder mode)
    const to = phone_number;  
    const text = message;
    const data = await sendWhatsAppText({ to, text, phone_number_id });

    let imageUrls = [];
    if (scan_for_images) {
      const business_id = process.env.WHATSAPP_HK_PHONE_NUMBER_ID;
      
      if (!business_id || !sender_wa_id) {
        console.error('[Tool:send_message] scan_for_images requested but sender_wa_id not provided or WHATSAPP_HK_PHONE_NUMBER_ID not set');
        return { success: false, error: 'sender_wa_id required and WHATSAPP_HK_PHONE_NUMBER_ID must be set when scan_for_images is true' };
      }
      
      console.log('[Tool:send_message] Scanning for images in chat history...');
      imageUrls = await scanForImages(business_id, sender_wa_id);
      console.log('[Tool:send_message] Found images to attach:', imageUrls);
      
      // TODO: Implement image attachment to WhatsApp message
      // For now, we'll just log the URLs that would be attached
      if (imageUrls.length > 0) {
        console.log('[Tool:send_message] Images that would be attached:', imageUrls);
      }
    }

    console.log('[Tool:send_message] real send result', { data });
    return { 
      success: true, 
      data,
      scanned_images: scan_for_images ? imageUrls : undefined,
      images_found: scan_for_images ? imageUrls.length : undefined
    };

    // return {
    //   success: true,
    //   placeholder: true,
    //   message: 'Message sent (placeholder)',
    //   to: phone_number,
    //   text: message,
    // };
  },
});


async function scanForImages(businessId, senderWaId) {
  const history = await getConversationHistory(businessId, senderWaId, 20);
  
  // Convert conversation history to a formatted string
  const conversationString = history.map(msg => {
    const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
    const timestamp = new Date(msg.timestamp).toISOString();
    const text = msg.content[0]?.text || '';
    return `[${timestamp}] ${role}: ${text}`;
  }).join('\n');

  // Initialize OpenAI client
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = `You are an AI assistant that analyzes chat conversations to identify images that should be attached to messages sent to specialists.

TASK: Analyze the conversation history and extract URLs of images that should be attached to the current message being sent to a specialist.

RULES:
1. Only extract image URLs from messages sent by the USER (not assistant responses)
2. Look for images that are relevant to the current maintenance/support issue
3. Images should be recent and related to the same problem being discussed
4. If the user explicitly mentions attaching specific images, include those
5. Do NOT include images that have already been sent to specialists (look for assistant confirmations of sent messages)
6. Image URLs are found in the format: "Image URL: [URL]" within the conversation

IMPORTANT: You MUST respond with a valid JSON array containing only the image URLs as strings. If no relevant images are found, return an empty array [].

Example response format:
["https://example.com/image1.jpg", "https://example.com/image2.jpg"]

Conversation History:
${conversationString}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: 'Extract the relevant image URLs that should be attached to the specialist message.'
        }
      ],
      temperature: 0.1,
      max_tokens: 500
    });

    const responseText = response.choices[0]?.message?.content?.trim();
    
    // Parse the JSON response
    let imageUrls = [];
    try {
      imageUrls = JSON.parse(responseText);
      if (!Array.isArray(imageUrls)) {
        console.error('[scanForImages] Response is not an array:', responseText);
        imageUrls = [];
      }
    } catch (parseError) {
      console.error('[scanForImages] Failed to parse JSON response:', responseText, parseError);
      imageUrls = [];
    }

    console.log('[scanForImages] Found image URLs:', imageUrls);
    return imageUrls;
    
  } catch (error) {
    console.error('[scanForImages] OpenAI API error:', error);
    return [];
  }
}



export default sendMessageToSpecialistTool;

