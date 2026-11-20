import { GoogleGenerativeAI } from "@google/generative-ai";

export const geminiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export async function geminiComplete(
  messages: { role: string; content: string }[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<string | null> {
  if (!geminiClient) return null;
  try {
    const model = geminiClient.getGenerativeModel({
      model: options.model || "gemini-1.5-flash",
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.maxTokens ?? 800,
      },
    });

    const prompt = messages.map(m => `${m.role}: ${m.content}`).join("\n\n");
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text().trim() ?? null;
  } catch (error) {
    console.error("Gemini completion failed:", error);
    return null;
  }
}