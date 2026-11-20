import { GoogleGenAI } from "@google/genai";

export const geminiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

export async function geminiComplete(
  messages: { role: string; content: string }[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<string | null> {
  if (!geminiClient) return null;
  try {
    const systemInstruction = messages
      .filter(message => message.role === "system")
      .map(message => message.content)
      .join("\n\n");
    const input = messages
      .filter(message => message.role !== "system")
      .map(message => `${message.role}: ${message.content}`)
      .join("\n\n");
    const response = await geminiClient.interactions.create({
      model: options.model || "gemini-3.1-flash-lite-preview",
      input,
      system_instruction: systemInstruction || undefined,
      generation_config: { max_output_tokens: options.maxTokens ?? 800 },
      store: false,
    });
    return response.output_text?.trim() || null;
  } catch (error) {
    console.error("Gemini completion failed:", error);
    return null;
  }
}