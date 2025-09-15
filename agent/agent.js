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

export async function runAgent(input, options = {}) {
  const startMs = Date.now();
  console.log('[Agent] Run start', { input });
  try {
    const result = await run(agent, input, options);
    const durationMs = Date.now() - startMs;
    console.log('[Agent] Run success', {
      input,
      finalOutput: result?.finalOutput,
      usage: result?.usage,
      durationMs,
    });
    return result;
  } catch (error) {
    const durationMs = Date.now() - startMs;
    console.error('[Agent] Run error', { input, durationMs, error: error?.message });
    throw error;
  }
}

export default agent; 