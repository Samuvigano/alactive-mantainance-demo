import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Send a WhatsApp message (text, image, or image with caption) using the Cloud API
 * @param {Object} params
 * @param {string} params.to - Recipient phone number in international format
 * @param {string|null} params.text - Message body to send (can be null if image_url is provided)
 * @param {string} params.phone_number_id - WhatsApp phone number ID
 * @param {string|null} params.image_url - Image URL to send (optional)
 * @returns {Promise<Object>} - WhatsApp API response payload
 */
export async function sendWhatsAppText({ to, text, phone_number_id, image_url = null }) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('WHATSAPP_ACCESS_TOKEN is not set');
  }
  if (!phone_number_id) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID is not set');
  }
  if (!to) {
    throw new Error('Recipient "to" is required');
  }
  if (!text && !image_url) {
    throw new Error('Either "text" or "image_url" is required');
  }

  const url = `https://graph.facebook.com/v18.0/${phone_number_id}/messages`;

  let messageBody;

  // If image_url is provided, send as image (with or without caption)
  if (image_url) {
    messageBody = {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: {
        link: image_url,
        ...(text && { caption: text }) // Add caption only if text is provided and not null/empty
      },
    };
  } else {
    // Send as text message
    messageBody = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    };
  }

  try {
    const response = await axios.post(
      url,
      messageBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    const apiError = error?.response?.data || error;
    const message = typeof apiError === 'string' ? apiError : JSON.stringify(apiError);
    throw new Error(`Failed to send WhatsApp message: ${message}`);
  }
}

