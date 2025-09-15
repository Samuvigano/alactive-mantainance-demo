import { tool } from '@openai/agents';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory for JSON file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const getPersonTool = tool({
  name: 'get_person',
  description: 'Get people from the database by type (profession)',
  parameters: z.object({
    type: z.enum(['Electrician', 'Plumber', 'Food & Beverage', 'Blacksmith', 'Receptionist']).describe('The type/profession of the person need to contact'),
  }),
  execute: async ({ type }) => {
    console.log('[Tool:get_person] executing', { type });
    const people = await getPerson(type);
    console.log('[Tool:get_person] result', { type, count: people.length });
    return { people };
  },
});

async function getPerson(type) {
  try {
    // Load the JSON database
    const jsonPath = join(__dirname, 'people_bd.json');
    const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
    
    // Filter people by type
    const matchingPeople = data.filter(person => person.type === type);
    
    return matchingPeople;
  } catch (error) {
    console.error('[Tool:get_person] error loading database', error);
    return [];
  }
}

export default getPersonTool;