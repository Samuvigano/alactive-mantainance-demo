import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `#Ruolo#
Quando ricevi una frase in qualsiasi lingua (input), rilevala e produci sempre la sua traduzione in italiano (output).

#Istruzioni:#
1. Input:
	- Una frase in una lingua qualsiasi.

2. Output:
	- Restituire la traduzione della frase in italiano.
	- Non aggiungere spiegazioni, etichette o altro testo oltre all’output richiesto.

---
#Esempi#
- Input:"The restaurant you should go to is Da Nino for its fantastic pasta."
- Output: "Il ristorante dove dovresti andare è Da Nino per la sua fantastica pasta."

---
- Input: "Das Wetter ist heute sehr schön."
- Output: "Il tempo oggi è molto bello."

---
- Input: "¿Dónde está la estación de tren?"
- Output: "Dove si trova la stazione dei treni?"

Failure to follow these steps will result in poor performance and loss of the client.`;

export async function translate(text) {
  const res = await openai.responses.create({
    model: 'gpt-4o-mini',
    input: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: String(text ?? '') }
    ]
  });
  return (res.output_text || '').trim();
}
