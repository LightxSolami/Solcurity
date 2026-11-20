export { groqClient, groqComplete } from "./groq-client";
export { geminiClient, geminiComplete } from "./gemini-client";
export { huggingFaceComplete } from "./huggingface-client";
export { togetherComplete } from "./together-client";

export interface AIClient {
  name: string;
  complete: (messages: { role: string; content: string }[], options?: { model?: string; temperature?: number; maxTokens?: number }) => Promise<string | null>;
  available: boolean;
}

export function getAvailableClients(): AIClient[] {
  return [
    { name: "Groq", complete: groqComplete, available: !!process.env.GROQ_API_KEY },
    { name: "Gemini", complete: geminiComplete, available: !!process.env.GEMINI_API_KEY },
    { name: "HuggingFace", complete: huggingFaceComplete, available: !!process.env.HUGGINGFACE_API_KEY },
    { name: "Together.ai", complete: togetherComplete, available: !!process.env.TOGETHER_API_KEY },
  ].filter(c => c.available);
}

export async function completeWithAllClients(
  messages: { role: string; content: string }[],
  options?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<Map<string, string>> {
  const clients = getAvailableClients();
  const results = new Map<string, string>();

  await Promise.all(
    clients.map(async (client) => {
      const response = await client.complete(messages, options);
      if (response) results.set(client.name, response);
    })
  );

  return results;
}