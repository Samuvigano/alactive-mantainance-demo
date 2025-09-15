import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Send a plain text WhatsApp message using the Cloud API
 * @param {Object} params
 * @param {string} params.to - Recipient phone number in international format
 * @param {string} params.text - Message body to send
 * @returns {Promise<Object>} - WhatsApp API response payload
 */
export async function sendWhatsAppText({ to, text }) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken) {
    throw new Error('WHATSAPP_ACCESS_TOKEN is not set');
  }
  if (!phoneNumberId) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID is not set');
  }
  if (!to) {
    throw new Error('Recipient "to" is required');
  }
  if (!text) {
    throw new Error('Message "text" is required');
  }

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  try {
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      },
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

