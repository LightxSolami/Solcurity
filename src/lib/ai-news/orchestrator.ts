import "server-only";
import type { NewsItem } from "./news-aggregator";
import { getAvailableClients, type AIClient } from "./clients";

export interface AIPersona {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  color: string;
  avatar: string;
}

export const PERSONAS: AIPersona[] = [
  {
    id: "analyst",
    name: "Dr. Marina Chen",
    role: "On-Chain Analyst",
    systemPrompt: `You are Dr. Marina Chen, a veteran on-chain analyst with 8 years tracking Solana ecosystem.
Your expertise: DEX volumes, TVL flows, validator economics, MEV, tokenomics.
Style: Data-driven, cites specific metrics, skeptical of narratives without numbers.
Always reference on-chain data when possible. Challenge vague claims with "Show me the data."`,
    color: "#00ff99",
    avatar: "📊",
  },
  {
    id: "builder",
    name: "Alex Rivera",
    role: "Protocol Engineer",
    systemPrompt: `You are Alex Rivera, a core protocol engineer who's built on Solana since 2020.
Your expertise: Runtime internals, SVM, Token-2022, compression, client diversity (Firedancer, Jito-Sol).
Style: Technical depth, explains WHY things work, highlights tradeoffs.
Focus on engineering implications, not price action. Call out technical debt.`,
    color: "#00aaff",
    avatar: "⚙️",
  },
  {
    id: "strategist",
    name: "Priya Sharma",
    role: "Ecosystem Strategist",
    systemPrompt: `You are Priya Sharma, ecosystem lead at a major Solana venture fund.
Your expertise: Go-to-market, developer adoption, grants, partnerships, regulatory landscape.
Style: Big-picture, connects dots across projects, thinks in narratives & cycles.
Identify second-order effects. Ask "What does this enable 6 months from now?"`,
    color: "#ff66cc",
    avatar: "🎯",
  },
  {
    id: "critic",
    name: "Marcus Webb",
    role: "Risk Researcher",
    systemPrompt: `You are Marcus Webb, independent security & risk researcher.
Your expertise: Smart contract audits, economic attacks, centralization risks, regulatory threats.
Style: Adversarial, finds blind spots, assumes good faith but verifies.
Always ask: "What breaks? Who loses? What's the exit liquidity?"`,
    color: "#ff4444",
    avatar: "🔍",
  },
];

export interface DiscussionMessage {
  personaId: string;
  personaName: string;
  role: string;
  content: string;
  provider?: string;
  timestamp: string;
  color: string;
  avatar: string;
}

export interface DiscussionRound {
  round: number;
  topic: string;
  messages: DiscussionMessage[];
}

export interface DiscussionSession {
  id: string;
  newsItems: NewsItem[];
  rounds: DiscussionRound[];
  startedAt: string;
  completedAt?: string;
  summary?: string;
}

function buildDiscussionPrompt(newsItems: NewsItem[], round: number, previousMessages: DiscussionMessage[]): string {
  const newsContext = newsItems.map((n, i) =>
    `${i + 1}. [${n.source}] ${n.title}\n   ${n.summary.slice(0, 300)}\n   Tags: ${n.tags.join(", ")}`
  ).join("\n\n");

  const history = previousMessages.length > 0
    ? `\nPrevious discussion:\n${previousMessages.map(m => `${m.avatar} ${m.personaName} (${m.role}): ${m.content}`).join("\n")}`
    : "";

  return `You are participating in a 4-person expert panel discussing Solana/crypto news.

NEWS TO DISCUSS:
${newsContext}

${history}

ROUND ${round} INSTRUCTIONS:
- Round 1: Initial reactions & key takeaways (2-3 sentences each)
- Round 2: Debate & cross-examination - challenge each other's views
- Round 3: Synthesis - identify agreements, disagreements, open questions
- Round 4: Actionable insights - what should builders/users/investors DO?

Speak as YOUR persona. Reference specific news items. Disagree constructively. Keep responses to 3-4 sentences max.`;
}

async function completeWithFallback(
  clients: AIClient[],
  messages: { role: string; content: string }[],
  options: { temperature: number; maxTokens: number },
  firstClientIndex: number
): Promise<{ content: string; provider: string }> {
  for (let attempt = 0; attempt < clients.length; attempt++) {
    const client = clients[(firstClientIndex + attempt) % clients.length];
    const content = await client.complete(messages, options);
    if (content?.trim()) {
      return { content: content.trim(), provider: client.name };
    }
  }

  throw new Error("All configured AI providers failed to generate a response.");
}

export async function runDiscussionSession(newsItems: NewsItem[], maxRounds = 4): Promise<DiscussionSession> {
  if (newsItems.length === 0) {
    throw new Error("At least one news item is required to start a discussion.");
  }
  if (!Number.isInteger(maxRounds) || maxRounds < 1 || maxRounds > 4) {
    throw new RangeError("Discussion rounds must be an integer between 1 and 4.");
  }

  const clients = getAvailableClients();
  if (clients.length === 0) {
    throw new Error("Configure at least one AI provider to generate discussions.");
  }

  const sessionId = `discussion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = new Date().toISOString();
  const rounds: DiscussionRound[] = [];
  const allMessages: DiscussionMessage[] = [];

  for (let round = 1; round <= maxRounds; round++) {
    const messagesByPersona: DiscussionMessage[] = new Array(PERSONAS.length);
    const providerGroups = new Map<number, number[]>();

    PERSONAS.forEach((_, personaIndex) => {
      const providerIndex = (round - 1 + personaIndex) % clients.length;
      const group = providerGroups.get(providerIndex) || [];
      group.push(personaIndex);
      providerGroups.set(providerIndex, group);
    });

    await Promise.all(Array.from(providerGroups.entries(), async ([providerIndex, personaIndexes]) => {
      for (const personaIndex of personaIndexes) {
        const persona = PERSONAS[personaIndex];
        const prompt = buildDiscussionPrompt(newsItems, round, allMessages);
        const response = await completeWithFallback(
          clients,
          [
            { role: "system", content: persona.systemPrompt },
            { role: "user", content: prompt },
          ],
          { temperature: 0.4, maxTokens: 300 },
          providerIndex
        );

        messagesByPersona[personaIndex] = {
          personaId: persona.id,
          personaName: persona.name,
          role: persona.role,
          content: response.content,
          provider: response.provider,
          timestamp: new Date().toISOString(),
          color: persona.color,
          avatar: persona.avatar,
        };
      }
    }));

    const roundMessages = messagesByPersona;

    allMessages.push(...roundMessages);
    rounds.push({ round, topic: `Round ${round}`, messages: roundMessages });
  }

  const summaryPrompt = `Summarize this 4-expert discussion in 4 bullet points:
1. Key consensus
2. Main disagreement  
3. Biggest risk identified
4. Top actionable insight

Discussion:
${allMessages.map(m => `${m.avatar} ${m.personaName}: ${m.content}`).join("\n")}`;

  const summary = await completeWithFallback(clients, [
    { role: "system", content: "You synthesize expert discussions into concise actionable summaries." },
    { role: "user", content: summaryPrompt },
  ], { temperature: 0.2, maxTokens: 200 }, 0);

  return {
    id: sessionId,
    newsItems,
    rounds,
    startedAt,
    completedAt: new Date().toISOString(),
    summary: summary.content,
  };
}

export async function runQuickDiscussion(newsItems: NewsItem[]): Promise<DiscussionSession> {
  return runDiscussionSession(newsItems, 3);
}