import { Groq } from "groq-sdk";

if (!process.env.GROQ_API_KEY) {
  console.warn("GROQ_API_KEY not set - AI features will be limited");
}

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
  dangerouslyAllowBrowser: false,
});

export async function generateRandomAmount(): Promise<number> {
  return Math.random() * 5 + 0.1;
}
