import { run, setDefaultOpenAIKey } from '@openai/agents';

if (process.env.OPENAI_API_KEY) {
  setDefaultOpenAIKey(process.env.OPENAI_API_KEY);
}


/**
 * Run the agent with input and optional conversation context
 * @param {string} input - The current user input
 * @param {Array} messages - Array of previous conversation messages in OpenAI format
 * @param {Object} options - Additional options for the run
 * @returns {Promise<Object>} The agent result
 */
export async function runAgent(input, messages = [], options = {}, agent) {
  const startMs = Date.now();
  console.log('[Agent] Run start', { input, messageCount: messages.length });
  
  try {
    // Prepare the full conversation context
    const conversationMessages = [
      // Add previous messages from conversation history
      ...messages,
      // Add the current user input as the latest message
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: input
          }
        ],
        timestamp: new Date().toISOString()
      }
    ];

    // Run the agent with conversation context
    const result = await run(agent, conversationMessages, options);
    
    const durationMs = Date.now() - startMs;
    console.log('[Agent] Run success', {
      input,
      messageCount: messages.length,
      finalOutput: result?.finalOutput,
      usage: result?.usage,
      durationMs,
    });
    
    return result;
  } catch (error) {
    const durationMs = Date.now() - startMs;
    console.error('[Agent] Run error', { input, messageCount: messages.length, durationMs, error: error?.message });
    throw error;
  }
}

export default {
  runAgent,
}; 