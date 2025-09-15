import { tool } from '@openai/agents';
import { z } from 'zod';
import { createTicket } from '../../utils/database.js';

export const createTicketTool = tool({
  name: 'create_ticket',
  description: 'Create a new maintenance ticket in the database. Use this after contacting specialists to track the maintenance request. The description should be comprehensive and include all relevant details.',
  parameters: z.object({
    description: z.string().describe('Extensive description of the maintenance issue including: room number, specific problem details, what needs to be fixed/delivered, and any relevant context. Be thorough and specific.'),
    opened_by_phone_number: z.string().describe('Phone number of the housekeeper who reported the issue'),
    latest: z.string().describe('Latest action taken or current status. This should describe what has been done so far, such as "Contacted [Specialist Name] via WhatsApp, specialist notified and will address the issue shortly" or "Specialist dispatched to handle the request"')
  }),
  execute: async ({ description, opened_by_phone_number, latest }) => {
    console.log('[Tool:create_ticket] executing', { 
      description: description.substring(0, 100) + '...', 
      phone: opened_by_phone_number,
      latest: latest.substring(0, 50) + '...'
    });
    
    const result = await createTicket(description, opened_by_phone_number, latest);
    
    if (result.success) {
      console.log('[Tool:create_ticket] success', { ticketId: result.data.id });
      return {
        success: true,
        ticket: result.data,
        message: `Ticket created successfully with ID: ${result.data.id}`
      };
    } else {
      console.error('[Tool:create_ticket] error', result.error);
      return {
        success: false,
        error: result.error,
        message: `Failed to create ticket: ${result.error}`
      };
    }
  },
});

export default createTicketTool;
