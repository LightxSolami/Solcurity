import { Groq } from "groq-sdk";

export const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY, dangerouslyAllowBrowser: false })
  : null;

export async function groqComplete(
  messages: { role: string; content: string }[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<string | null> {
  if (!groqClient) return null;
  try {
    const completion = await groqClient.chat.completions.create({
      model: options.model || "qwen/qwen3.8-27b",
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 800,
      messages: messages as any,
    });
    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch (error) {
    console.error("Groq completion failed:", error);
    return null;
  }
}