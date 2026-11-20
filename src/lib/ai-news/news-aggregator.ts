import { z } from "zod";

const NewsItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  url: z.string().url(),
  source: z.string(),
  publishedAt: z.string().datetime({ offset: true }),
  category: z.enum(["solana", "defi", "nft", "infrastructure", "regulation", "market", "security", "general"]),
  tags: z.array(z.string()).default([]),
  relevanceScore: z.number().min(0).max(1).default(0.5),
});

export type NewsItem = z.infer<typeof NewsItemSchema>;

const RSS_FEEDS = [
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", category: "market" as const },
  { name: "The Block", url: "https://www.theblock.co/rss.xml", category: "market" as const },
  { name: "CoinTelegraph", url: "https://cointelegraph.com/rss", category: "market" as const },
  { name: "Decrypt", url: "https://decrypt.co/feed", category: "market" as const },
  { name: "Bankless", url: "https://bankless.substack.com/feed", category: "defi" as const },
  { name: "Solana Foundation Blog", url: "https://solana.com/news/rss.xml", category: "solana" as const },
  { name: "Solana Dev Blog", url: "https://solana.com/developers/rss.xml", category: "infrastructure" as const },
];

const SOLANA_ECOSYSTEM_KEYWORDS = [
  "solana", "sol", "jupiter", "raydium", "orca", "marinade", "jito", "drift",
  "kamino", "marginfi", "solend", "bonk", "wif", "pyth", "switchboard",
  "wormhole", "layerzero", "celo", "neon", "eclipse", "monad", "anvill",
  "token-2022", "token22", "compressed nft", "cNFT", "metaplex", "candy machine",
  "anchor", "sealevel", "gulfstream", "turbine", "cloudbreak", "archivers",
  "fire dancer", "firedancer", "jito-sol", "stake", "validator", "rpc",
  "helius", "quicknode", "alchemy", "triton", "genesysgo", "shyft",
];

function calculateRelevance(title: string, summary: string): number {
  const text = (title + " " + summary).toLowerCase();
  let score = 0;
  for (const keyword of SOLANA_ECOSYSTEM_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      score += 0.15;
    }
  }
  return Math.min(score, 1.0);
}

function categorizeItem(title: string, summary: string, feedCategory: string): NewsItem["category"] {
  const text = (title + " " + summary).toLowerCase();
  if (text.includes("solana") || text.includes("sol ")) return "solana";
  if (text.includes("defi") || text.includes("dex") || text.includes("amm") || text.includes("lending")) return "defi";
  if (text.includes("nft") || text.includes("non-fungible") || text.includes("cNFT") || text.includes("metaplex")) return "nft";
  if (text.includes("validator") || text.includes("rpc") || text.includes("infrastructure") || text.includes("client")) return "infrastructure";
  if (text.includes("regulation") || text.includes("sec") || text.includes("legal") || text.includes("compliance")) return "regulation";
  if (text.includes("hack") || text.includes("exploit") || text.includes("vulnerab") || text.includes("security")) return "security";
  return "market";
}

async function fetchRSSFeed(feed: { name: string; url: string; category: string }): Promise<NewsItem[]> {
  try {
    const response = await fetch(feed.url, {
      headers: { "User-Agent": "Solcurity-AI-News/1.0" },
      next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const xml = await response.text();
    const items = parseRSS(xml, feed.name, feed.category);
    return items;
  } catch (error) {
    console.error(`Failed to fetch ${feed.name}:`, error);
    return [];
  }
}

function parseRSS(xml: string, source: string, feedCategory: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const description = extractTag(itemXml, "description") || extractTag(itemXml, "content:encoded") || "";
    const pubDate = extractTag(itemXml, "pubDate") || extractTag(itemXml, "dc:date") || new Date().toISOString();

    if (!title || !link) continue;

    const cleanSummary = description
      .replace(/<[^>]+>/g, "")
      .replace(/&[a-z]+;/g, " ")
      .trim()
      .slice(0, 500);

    const publishedAt = new Date(pubDate).toISOString();
    const relevanceScore = calculateRelevance(title, cleanSummary);
    const category = categorizeItem(title, cleanSummary, feedCategory);

    if (relevanceScore < 0.1 && category !== "solana") continue;

    items.push({
      id: `${source}-${Buffer.from(link).toString("base64").slice(0, 16)}`,
      title: title.replace(/&[a-z]+;/g, " ").trim(),
      summary: cleanSummary,
      url: link,
      source,
      publishedAt,
      category,
      tags: extractTags(title, cleanSummary),
      relevanceScore,
    });
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function extractTags(title: string, summary: string): string[] {
  const text = (title + " " + summary).toLowerCase();
  const tags: string[] = [];
  const knownTags = [
    "defi", "nft", "dao", "web3", "gaming", "memecoin", "stablecoin",
    "staking", "validator", "rpc", "mev", "airdrop", "tokenomics",
    "governance", "bridge", "cross-chain", "l2", "rollup", "zk",
    "ai", "depin", "rwa", "tokenization", "etf", "institutional"
  ];
  for (const tag of knownTags) {
    if (text.includes(tag)) tags.push(tag);
  }
  return tags.slice(0, 5);
}

async function fetchGitHubTrending(): Promise<NewsItem[]> {
  try {
    const response = await fetch("https://api.github.com/search/repositories?q=solana+language:rust&sort=stars&order=desc&per_page=10", {
      headers: { Accept: "application/vnd.github.v3+json" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];

    const data = await response.json();
    return data.items?.slice(0, 5).map((repo: any) => ({
      id: `github-${repo.id}`,
      title: `GitHub: ${repo.full_name}`,
      summary: repo.description || "No description",
      url: repo.html_url,
      source: "GitHub Trending",
      publishedAt: repo.updated_at,
      category: "infrastructure" as const,
      tags: repo.topics?.slice(0, 5) || [],
      relevanceScore: 0.8,
    })) || [];
  } catch {
    return [];
  }
}

async function fetchSolanaFoundationUpdates(): Promise<NewsItem[]> {
  try {
    const response = await fetch("https://solana.com/api/news", {
      headers: { Accept: "application/json" },
      next: { revalidate: 600 },
    });
    if (!response.ok) return [];

    const data = await response.json();
    return data.items?.slice(0, 10).map((item: any) => ({
      id: `solana-foundation-${item.id || item.slug}`,
      title: item.title,
      summary: item.excerpt || item.content?.slice(0, 500) || "",
      url: `https://solana.com${item.url || "/news/" + item.slug}`,
      source: "Solana Foundation",
      publishedAt: item.date || item.publishedAt,
      category: "solana" as const,
      tags: item.tags || [],
      relevanceScore: 1.0,
    })) || [];
  } catch {
    return [];
  }
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const [rssResults, githubResults, solanaResults] = await Promise.all([
    Promise.all(RSS_FEEDS.map(fetchRSSFeed)),
    fetchGitHubTrending(),
    fetchSolanaFoundationUpdates(),
  ]);

  const allItems = [...rssResults.flat(), ...githubResults, ...solanaResults];

  const uniqueItems = new Map<string, NewsItem>();
  for (const item of allItems) {
    const existing = uniqueItems.get(item.url);
    if (!existing || item.relevanceScore > existing.relevanceScore) {
      uniqueItems.set(item.url, item);
    }
  }

  return Array.from(uniqueItems.values())
    .sort((a, b) => b.relevanceScore - a.relevanceScore || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 50);
}

export async function getTopNews(limit = 10): Promise<NewsItem[]> {
  const allNews = await fetchAllNews();
  return allNews.slice(0, limit);
}

export async function getNewsByCategory(category: NewsItem["category"], limit = 10): Promise<NewsItem[]> {
  const allNews = await fetchAllNews();
  return allNews.filter(n => n.category === category).slice(0, limit);
}