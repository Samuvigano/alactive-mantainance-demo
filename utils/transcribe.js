import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Downloads and transcribes audio messages from WhatsApp Business API
 * @param {Object} params - Configuration parameters
 * @param {string} params.mediaId - WhatsApp media ID from the webhook
 * @param {string} params.accessToken - WhatsApp Business API access token
 * @param {string} params.phoneNumberId - WhatsApp Business phone number ID
 * @param {string} [params.downloadDir='./downloads'] - Directory to save audio files
 * @param {string} [params.language] - Language code for transcription (e.g., 'en', 'es', 'it')
 * @returns {Promise<string>} The transcribed text
 */
export async function downloadAndTranscribeWhatsAppAudio({
  mediaId,
  accessToken,
  phoneNumberId,
  downloadDir = './downloads',
  language = null
}) {
  try {
    // Validate required parameters
    if (!mediaId) throw new Error('mediaId is required');
    if (!accessToken) throw new Error('accessToken is required');
    if (!phoneNumberId) throw new Error('phoneNumberId is required');
    
    // Get OpenAI API key from environment
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) throw new Error('OPENAI_API_KEY environment variable is required');

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Step 1: Get media URL from WhatsApp API
    console.log(`Getting media URL for mediaId: ${mediaId}`);
    const mediaResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const mediaUrl = mediaResponse.data.url;
    const mimeType = mediaResponse.data.mime_type;
    const fileSize = mediaResponse.data.file_size;

    console.log(`Media URL obtained: ${mediaUrl}`);
    console.log(`MIME type: ${mimeType}, File size: ${fileSize} bytes`);

    // Step 2: Download the audio file
    console.log('Downloading audio file...');
    const audioResponse = await axios.get(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'WhatsApp-Business-API-Client/1.0'
      },
      responseType: 'stream'
    });

    // Create downloads directory if it doesn't exist
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // Determine file extension based on MIME type
    let fileExtension = '.ogg'; // Default for WhatsApp audio
    if (mimeType.includes('mpeg')) fileExtension = '.mp3';
    else if (mimeType.includes('wav')) fileExtension = '.wav';
    else if (mimeType.includes('m4a')) fileExtension = '.m4a';

    const fileName = `whatsapp_audio_${mediaId}_${Date.now()}${fileExtension}`;
    const filePath = path.join(downloadDir, fileName);

    // Save audio file to disk
    const writer = fs.createWriteStream(filePath);
    audioResponse.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(`Audio file saved to: ${filePath}`);

    // Step 3: Transcribe the audio using OpenAI Whisper
    console.log('Starting transcription...');
    
    const transcriptionParams = {
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      response_format: 'verbose_json'
    };

    // Add language parameter if specified
    if (language) {
      transcriptionParams.language = language;
    }

    const transcription = await openai.audio.transcriptions.create(transcriptionParams);

    console.log('Transcription completed successfully');

    // Step 4: Clean up - delete audio file
    try {
      fs.unlinkSync(filePath);
      console.log(`Audio file deleted: ${filePath}`);
    } catch (deleteError) {
      console.warn(`Failed to delete audio file: ${deleteError.message}`);
    }

    // Return transcription text
    return transcription.text;

  } catch (error) {
    console.error('Error in downloadAndTranscribeWhatsAppAudio:', error);
    throw error;
  }
}

/**
 * Helper function to extract media info from WhatsApp webhook message
 * @param {Object} message - WhatsApp webhook message object
 * @returns {Object|null} Media information or null if not an audio message
 */
export function extractAudioMediaInfo(message) {
  if (message.type !== 'audio' || !message.audio) {
    return null;
  }

  return {
    mediaId: message.audio.id,
    mimeType: message.audio.mime_type,
    sha256: message.audio.sha256,
    fileSize: message.audio.file_size,
    voice: message.audio.voice || false
  };
}

/**
 * Complete function to handle WhatsApp webhook and transcribe audio
 * @param {Object} webhookMessage - Complete webhook message from WhatsApp
 * @param {Object} config - Configuration object
 * @returns {Promise<string>} The transcribed text
 */
export async function processWhatsAppAudioMessage(webhookMessage, config) {
  // Extract audio media info
  const audioInfo = extractAudioMediaInfo(webhookMessage);
  if (!audioInfo) {
    throw new Error('Message is not an audio message');
  }

  // Download and transcribe
  return await downloadAndTranscribeWhatsAppAudio({
    mediaId: audioInfo.mediaId,
    accessToken: config.accessToken,
    phoneNumberId: config.phoneNumberId,
    downloadDir: config.downloadDir,
    language: config.language
  });
}
