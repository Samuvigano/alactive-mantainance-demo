import { readFileSync } from 'fs';

// Read the prompt.txt file synchronously
const hkPrompt = readFileSync('hkPrompt.txt', 'utf8');
const specialistPrompt = readFileSync('specialistPrompt.txt', 'utf8');
// Export the prompt variable
export { hkPrompt };

