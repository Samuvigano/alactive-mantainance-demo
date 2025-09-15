import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);






// ============================================================================
// SECTION: TICKET MANAGEMENT FUNCTIONS
// ============================================================================

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





// ============================================================================
// SECTION: CHAT & MESSAGE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Get the last 10 messages of a chat
 * @param {string} businessId - Business ID to identify the chat
 * @param {string} userId - User ID to identify the chat
 * @returns {Promise<Object>} Array of last 10 messages or error
 */
export async function getLastMessages(businessId, userId, messages_number = 10) {
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
      .limit(messages_number);

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
 * @param {string} text - Optional message text
 * @param {boolean} isUser - Whether the message is from the user (default: true)
 * @param {string} image_path - Optional local image file path
 * @param {string} image_description - Optional image description
 * @returns {Promise<Object>} The created message or error
 */
export async function addMessage(businessId, userId, text = null, isUser = true, image_path = null, image_description = null) {
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

    // Handle image upload if image_path is provided
    let image_url = null;
    if (image_path) {
      try {
        // Check if file exists
        if (!fs.existsSync(image_path)) {
          console.error('Image file does not exist:', image_path);
          return { success: false, error: 'Image file does not exist' };
        }

        // Read the image file
        const imageBuffer = fs.readFileSync(image_path);
        
        // Extract file extension and create a unique filename
        const fileExtension = path.extname(image_path);
        const fileName = `chat_image_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExtension}`;
        
        // Determine content type based on file extension
        const contentTypeMap = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        };
        const contentType = contentTypeMap[fileExtension.toLowerCase()] || 'image/jpeg';

        // Upload image to bucket
        const uploadResult = await uploadImageToBucket(imageBuffer, fileName, contentType);
        
        if (!uploadResult.success) {
          console.error('Failed to upload image to bucket:', uploadResult.error);
          return { success: false, error: uploadResult.error };
        }

        image_url = uploadResult.data.publicUrl;
        console.log('Image uploaded successfully, URL:', image_url);

        // Clean up the local file after successful upload
        try {
          fs.unlinkSync(image_path);
          console.log('Local image file deleted:', image_path);
        } catch (deleteError) {
          console.warn('Failed to delete local image file:', deleteError.message);
        }

      } catch (imageError) {
        console.error('Error processing image:', imageError);
        return { success: false, error: `Error processing image: ${imageError.message}` };
      }
    }

    // Add the message to the chat
    const messageData = {
      chat_id: chatData.id,
      is_user: isUser,
      created_at: new Date().toISOString()
    };

    // Add text if provided
    if (text) {
      messageData.text = text;
    }

    // Add image fields if image was uploaded
    if (image_url) {
      messageData.image_url = image_url;
    }
    if (image_description) {
      messageData.image_description = image_description;
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([messageData])
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








// ============================================================================
// SECTION: FILE/IMAGE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Upload an image received from WhatsApp to the images bucket
 * @param {Buffer|File} imageBuffer - Image buffer or file data
 * @param {string} fileName - Name for the uploaded file
 * @param {string} contentType - MIME type of the image (e.g., 'image/jpeg', 'image/png')
 * @returns {Promise<Object>} Upload result with public URL or error
 */
export async function uploadImageToBucket(imageBuffer, fileName, contentType = 'image/jpeg') {
  try {
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, imageBuffer, {
        contentType,
        upsert: false
      });

    if (error) {
      console.error('Error uploading image:', error);
      return { success: false, error: error.message };
    }

    // Get the public URL for the uploaded image
    const { data: publicUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);

    console.log('Image uploaded successfully:', data);
    return { 
      success: true, 
      data: {
        ...data,
        publicUrl: publicUrlData.publicUrl
      }
    };
  } catch (err) {
    console.error('Exception uploading image:', err);
    return { success: false, error: err.message };
  }
}

export default supabase; 