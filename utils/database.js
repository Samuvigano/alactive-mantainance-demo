import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Create a new ticket in the database
 * @param {string} description - Description of the ticket
 * @param {string} opened_by_phone_number - Phone number of the person who opened the ticket
 * @param {string} latest - Latest update/status of the ticket
 * @returns {Promise<Object>} The created ticket or error
 */
export async function createTicket(description, opened_by_phone_number, latest = '') {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .insert([
        {
          description,
          opened_by_phone_number,
          latest,
          is_open: true,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Error creating ticket:', error);
      return { success: false, error: error.message };
    }

    console.log('Ticket created successfully:', data[0]);
    return { success: true, data: data[0] };
  } catch (err) {
    console.error('Exception creating ticket:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get all open tickets from the database
 * @returns {Promise<Object>} Array of open tickets or error
 */
export async function getOpenTickets() {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('is_open', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching open tickets:', error);
      return { success: false, error: error.message };
    }

    console.log(`Found ${data.length} open tickets`);
    return { success: true, data };
  } catch (err) {
    console.error('Exception fetching open tickets:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Close a ticket by setting is_open to false
 * @param {string} ticketId - UUID of the ticket to close
 * @returns {Promise<Object>} Updated ticket or error
 */
export async function closeTicket(ticketId) {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .update({ is_open: false })
      .eq('id', ticketId)
      .select();

    if (error) {
      console.error('Error closing ticket:', error);
      return { success: false, error: error.message };
    }

    console.log('Ticket closed successfully:', data[0]);
    return { success: true, data: data[0] };
  } catch (err) {
    console.error('Exception closing ticket:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Update the latest status/comment for a ticket
 * @param {string} ticketId - UUID of the ticket to update
 * @param {string} latest - New latest update/status
 * @returns {Promise<Object>} Updated ticket or error
 */
export async function updateTicketLatest(ticketId, latest) {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .update({ latest })
      .eq('id', ticketId)
      .select();

    if (error) {
      console.error('Error updating ticket:', error);
      return { success: false, error: error.message };
    }

    console.log('Ticket updated successfully:', data[0]);
    return { success: true, data: data[0] };
  } catch (err) {
    console.error('Exception updating ticket:', err);
    return { success: false, error: err.message };
  }
}








/**
 * Get the last 10 messages of a chat
 * @param {string} businessId - Business ID to identify the chat
 * @param {string} userId - User ID to identify the chat
 * @returns {Promise<Object>} Array of last 10 messages or error
 */
export async function getLastMessages(businessId, userId) {
  try {
    // First, find or get the chat_id based on business_id and user_id
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .single();

    if (chatError && chatError.code === 'PGRST116') {
      // Chat doesn't exist, return empty messages array
      console.log('No chat found for business_id and user_id');
      return { success: true, data: [] };
    } else if (chatError) {
      console.error('Error finding chat:', chatError);
      return { success: false, error: chatError.message };
    }

    if (!chatData) {
      console.log('No chat found for business_id and user_id');
      return { success: true, data: [] };
    }

    // Get the last 10 messages for this chat
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatData.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching messages:', error);
      return { success: false, error: error.message };
    }

    console.log(`Found ${data.length} messages for chat`);
    return { success: true, data: data.reverse() }; // Reverse to get chronological order
  } catch (err) {
    console.error('Exception fetching messages:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Add a message to a chat
 * @param {string} businessId - Business ID to identify the chat
 * @param {string} userId - User ID to identify the chat
 * @param {string} text - Message text
 * @param {boolean} isUser - Whether the message is from the user (default: true)
 * @returns {Promise<Object>} The created message or error
 */
export async function addMessage(businessId, userId, text, isUser = true) {
  try {
    // First, find or create the chat based on business_id and user_id
    let { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .single();

    if (chatError && chatError.code === 'PGRST116') {
      // Chat doesn't exist, create it
      const { data: newChatData, error: createChatError } = await supabase
        .from('chats')
        .insert([
          {
            business_id: businessId,
            user_id: userId
          }
        ])
        .select()
        .single();

      if (createChatError) {
        console.error('Error creating chat:', createChatError);
        return { success: false, error: createChatError.message };
      }

      chatData = newChatData;
    } else if (chatError) {
      console.error('Error finding chat:', chatError);
      return { success: false, error: chatError.message };
    }

    // Add the message to the chat
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          chat_id: chatData.id,
          text,
          is_user: isUser,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Error adding message:', error);
      return { success: false, error: error.message };
    }

    console.log('Message added successfully:', data[0]);
    return { success: true, data: data[0] };
  } catch (err) {
    console.error('Exception adding message:', err);
    return { success: false, error: err.message };
  }
}

export default supabase; 