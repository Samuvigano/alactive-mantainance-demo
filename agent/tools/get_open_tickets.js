import { tool } from '@openai/agents';
import { z } from 'zod';
import { getOpenTickets } from '../../utils/database.js';

export const getOpenTicketsTool = tool({
  name: 'get_open_tickets',
  description: 'Get all open tickets from the database. Returns tickets that need attention or follow-up.',
  parameters: z.object({}), // No parameters needed - gets all open tickets
  execute: async () => {
    console.log('[Tool:get_open_tickets] executing');
    const result = await getOpenTickets();
    
    if (result.success) {
      console.log('[Tool:get_open_tickets] result', { count: result.data.length });
      return {
        success: true,
        tickets: result.data,
        count: result.data.length
      };
    } else {
      console.error('[Tool:get_open_tickets] error', result.error);
      return {
        success: false,
        error: result.error,
        tickets: [],
        count: 0
      };
    }
  },
});

export default getOpenTicketsTool;
