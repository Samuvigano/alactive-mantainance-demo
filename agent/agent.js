import { Agent, run, setDefaultOpenAIKey } from '@openai/agents';
import getPersonTool from './tools/get_person.js';
import getOpenTicketsTool from './tools/get_open_tickets.js';
import createTicketTool from './tools/create_ticket.js';
import updateTicketTool from './tools/update_ticket.js';
import { prompt as agentInstructions } from '../utils/prompt.js';
import sendMessageToSpecialistTool from './tools/send_message_specialist.js';

if (process.env.OPENAI_API_KEY) {
  setDefaultOpenAIKey(process.env.OPENAI_API_KEY);
}

export const agent = new Agent({
  name: 'Assistant',
  instructions: agentInstructions,
  tools: [getPersonTool, getOpenTicketsTool, createTicketTool, updateTicketTool, sendMessageToSpecialistTool],
});

// Basic initialization log
console.log('[Agent] Initialized', { name: agent.name, tools: agent.tools?.map((t) => t.name) });

/**
 * Run the agent with input and optional conversation context
 * @param {string} input - The current user input
 * @param {Array} messages - Array of previous conversation messages in OpenAI format
 * @param {Object} options - Additional options for the run
 * @returns {Promise<Object>} The agent result
 */
export async function runAgent(input, messages = [], options = {}) {
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

export default agent; 