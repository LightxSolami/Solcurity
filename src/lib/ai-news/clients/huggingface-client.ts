export async function huggingFaceComplete(
  messages: { role: string; content: string }[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<string | null> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join("\n\n");
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${options.model || "mistralai/Mistral-7B-Instruct-v0.3"}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            temperature: options.temperature ?? 0.3,
            max_new_tokens: options.maxTokens ?? 800,
            return_full_text: false,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("HuggingFace API error:", response.status, error);
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data) && data[0]?.generated_text) {
      return data[0].generated_text.trim();
    }
    return null;
  } catch (error) {
    console.error("HuggingFace completion failed:", error);
    return null;
  }
}