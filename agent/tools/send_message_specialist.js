import { tool } from '@openai/agents';
import { z } from 'zod';
// import { sendWhatsAppText } from '../../wapp/send_message.js';

export const sendMessageToSpecialistTool = tool({
  name: 'send_message',
  description: 'Send a message to a person',
  parameters: z.object({
    message: z.string().describe('The message to send'),
    phone_number: z.string().describe('The phone number of the recipient'),
  }),
  execute: async ({ message, phone_number }) => {
    console.log('[Tool:send_message] placeholder send', { to: phone_number, text: message });

    // Real send (disabled in placeholder mode)
    // const to = phone_number;
    // const text = message;
    // const data = await sendWhatsAppText({ to, text });
    // console.log('[Tool:send_message] real send result', { data });
    // return { success: true, data };

    return {
      success: true,
      placeholder: true,
      message: 'Message sent (placeholder)',
      to: phone_number,
      text: message,
    };
  },
});

export default sendMessageToSpecialistTool;

