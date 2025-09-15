import { readFileSync } from 'fs';

// Read the prompt.txt file synchronously
const prompt = readFileSync('prompts/prompt.txt', 'utf8');

// Export the prompt variable
export { prompt };

