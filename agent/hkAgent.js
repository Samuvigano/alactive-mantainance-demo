import { Agent, run, setDefaultOpenAIKey } from '@openai/agents';
import getPersonTool from './tools/get_person.js';
import getOpenTicketsTool from './tools/get_open_tickets.js';
import createTicketTool from './tools/create_ticket.js';
import updateTicketTool from './tools/update_ticket.js';
import { hkPrompt as agentInstructions } from '../prompts/prompt.js';
import sendMessageToSpecialistTool from './tools/send_message_specialist.js';

if (process.env.OPENAI_API_KEY) {
  setDefaultOpenAIKey(process.env.OPENAI_API_KEY);
}

export const hkAgent = new Agent({
  name: 'Assistant',
  instructions: agentInstructions,
  tools: [getPersonTool, getOpenTicketsTool, createTicketTool, updateTicketTool, sendMessageToSpecialistTool],
});
