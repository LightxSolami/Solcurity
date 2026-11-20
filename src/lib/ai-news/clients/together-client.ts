export async function togetherComplete(
  messages: { role: string; content: string }[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<string | null> {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model || "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 800,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Together.ai API error:", response.status, error);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (error) {
    console.error("Together.ai completion failed:", error);
    return null;
  }
}