import { tool } from '@openai/agents';
import { z } from 'zod';
import supabase from '../../utils/database.js';

export const updateTicketTool = tool({
  name: 'update_ticket',
  description: 'Update an existing ticket in the database. Can update description, opened_by_phone_number, latest status, or is_open status. Use this when receiving updates about ongoing maintenance requests or when closing completed tickets.',
  parameters: z.object({
    ticket_id: z.string().describe('The UUID of the ticket to update. Use get_open_tickets first to find the correct ticket ID.'),
    description: z.string().nullable().describe('Updated description of the maintenance issue (optional - only if description needs to be modified)'),
    opened_by_phone_number: z.string().nullable().describe('Updated phone number of the person who opened the ticket (optional - rarely needed)'),
    latest: z.string().nullable().describe('Comprehensive summary of all actions and relevant information that have happened on this ticket. Should include chronological history of contacts, progress updates, completion status, and any important details. This is a cumulative field that summarizes the entire ticket lifecycle.'),
    is_open: z.boolean().nullable().describe('Whether the ticket should remain open (true) or be closed (false). Set to false when the issue is resolved.')
  }),
  execute: async ({ ticket_id, description, opened_by_phone_number, latest, is_open }) => {
    console.log('[Tool:update_ticket] executing', { 
      ticket_id,
      hasDescription: !!description,
      hasPhone: !!opened_by_phone_number,
      hasLatest: !!latest,
      is_open
    });
    
    try {
      // Build the update object with only provided fields
      const updateData = {};
      if (description !== null && description !== undefined) updateData.description = description;
      if (opened_by_phone_number !== null && opened_by_phone_number !== undefined) updateData.opened_by_phone_number = opened_by_phone_number;
      if (latest !== null && latest !== undefined) updateData.latest = latest;
      if (is_open !== null && is_open !== undefined) updateData.is_open = is_open;
      
      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error: 'No fields provided to update',
          message: 'At least one field must be provided to update the ticket'
        };
      }
      
      const { data, error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticket_id)
        .select();
      
      if (error) {
        console.error('[Tool:update_ticket] error', error);
        return {
          success: false,
          error: error.message,
          message: `Failed to update ticket: ${error.message}`
        };
      }
      
      if (!data || data.length === 0) {
        console.error('[Tool:update_ticket] ticket not found', { ticket_id });
        return {
          success: false,
          error: 'Ticket not found',
          message: `No ticket found with ID: ${ticket_id}`
        };
      }
      
      console.log('[Tool:update_ticket] success', { 
        ticket_id,
        updatedFields: Object.keys(updateData)
      });
      
      return {
        success: true,
        ticket: data[0],
        updatedFields: Object.keys(updateData),
        message: `Ticket ${ticket_id} updated successfully. Updated fields: ${Object.keys(updateData).join(', ')}`
      };
      
    } catch (err) {
      console.error('[Tool:update_ticket] exception', err);
      return {
        success: false,
        error: err.message,
        message: `Exception updating ticket: ${err.message}`
      };
    }
  },
});

export default updateTicketTool;
