"use client";

import { useState, useEffect, useCallback } from "react";
import type { DiscussionSession, DiscussionMessage, DiscussionRound } from "@/lib/ai-news/orchestrator";
import type { NewsItem } from "@/lib/ai-news/news-aggregator";

interface StoredDiscussion {
  id: string;
  session: DiscussionSession;
  createdAt: string;
  updatedAt: string;
}

export function AINewsDashboard() {
  const [latestDiscussion, setLatestDiscussion] = useState<StoredDiscussion | null>(null);
  const [discussions, setDiscussions] = useState<StoredDiscussion[]>([]);
  const [topNews, setTopNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discussionError, setDiscussionError] = useState<string | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"live" | "history" | "news">("live");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setRefreshing(true);
      const [latestRes, historyRes, newsRes] = await Promise.all([
        fetch("/api/ai-news/discussions?action=latest", { cache: "no-store" }),
        fetch("/api/ai-news/discussions?limit=10", { cache: "no-store" }),
        fetch("/api/ai-news/news?action=top&limit=10"),
      ]);

      if (latestRes.ok && historyRes.ok) {
        const [latestData, historyData] = await Promise.all([
          latestRes.json() as Promise<{ discussion: StoredDiscussion | null }>,
          historyRes.json() as Promise<{ discussions: StoredDiscussion[] }>,
        ]);
        setLatestDiscussion(latestData.discussion);
        setDiscussions(historyData.discussions || []);
        setDiscussionError(null);
      } else {
        setDiscussionError(
          latestRes.status === 503 || historyRes.status === 503
            ? "Discussion history needs its Supabase storage configured and migrated."
            : "Could not load discussion history."
        );
      }

      if (newsRes.ok) {
        const data = await newsRes.json() as { news: NewsItem[] };
        setTopNews(data.news || []);
        setNewsError(null);
      } else {
        setNewsError("Could not load the news feed. Please try again.");
      }
    } catch (err) {
      setError("Could not reach the AI Debate services. Check your connection and retry.");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    if (!autoRefresh) return;
    const interval = setInterval(() => void fetchData(), 60000);
    return () => {
      clearInterval(interval);
    };
  }, [autoRefresh, fetchData]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getCategoryColor = (category: NewsItem["category"]) => {
    const colors: Record<string, string> = {
      solana: "bg-solana-blue/20 text-solana-blue",
      defi: "bg-green-500/20 text-green-400",
      nft: "bg-purple-500/20 text-purple-400",
      infrastructure: "bg-blue-500/20 text-blue-400",
      regulation: "bg-orange-500/20 text-orange-400",
      security: "bg-red-500/20 text-red-400",
      market: "bg-gray-500/20 text-gray-400",
      general: "bg-gray-500/20 text-gray-400",
    };
    return colors[category] || colors.general;
  };

  return (
    <div className="space-y-7">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-[#62c99b]/20 bg-[radial-gradient(ellipse_at_82%_15%,rgba(98,201,155,0.16),transparent_35%),radial-gradient(ellipse_at_12%_100%,rgba(68,122,255,0.12),transparent_42%),linear-gradient(125deg,#0b1717,#0b0f18_58%,#101021)] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:p-9">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:linear-gradient(to_bottom_right,black,transparent_75%)]" />
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#62c99b]/25 bg-[#62c99b]/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a6e8c4]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#62c99b]" />
                Solana intelligence / AI debate
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                Updates daily
              </span>
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Four perspectives.<br />
              <span className="bg-gradient-to-r from-[#62c99b] via-[#b8ecd1] to-[#9cb7ff] bg-clip-text text-transparent">
                One sharper signal.
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">
              An analyst, protocol engineer, ecosystem strategist, and risk researcher debate the latest Solana developments.
              AI-generated insights are starting points, not financial or security advice.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                { label: "ON-CHAIN", color: "#62c99b" },
                { label: "ENGINEERING", color: "#7bb9ff" },
                { label: "ECOSYSTEM", color: "#ff81d0" },
                { label: "RISK", color: "#ff7878" },
              ].map((item) => (
                <span
                  key={item.label}
                  className="rounded-lg border bg-black/20 px-2.5 py-1.5 font-mono text-[9px] font-semibold tracking-[0.15em]"
                  style={{ borderColor: `${item.color}35`, color: item.color }}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
            <label className="flex items-center gap-2 text-xs text-white/55">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-white/20 bg-solana-navy text-solana-blue focus:ring-solana-blue"
            />
              Auto-refresh every minute
            </label>
            <button
              onClick={() => void fetchData()}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#62c99b]/30 bg-[#62c99b]/[0.09] px-4 py-2.5 text-sm font-semibold text-[#b8ecd1] transition hover:bg-[#62c99b]/[0.16] disabled:cursor-wait disabled:opacity-60"
            >
              <span aria-hidden="true">{refreshing ? "◌" : "↻"}</span>
              {refreshing ? "Syncing…" : "Refresh signal"}
            </button>
          </div>
        </div>
      </section>

      {(error || discussionError || newsError) && (
        <div role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-100/80">
          {[error, discussionError, newsError].filter(Boolean).join(" ")}
          <button onClick={() => void fetchData()} className="ml-2 font-semibold text-amber-100 underline underline-offset-2">
            Retry
          </button>
        </div>
      )}

      <div className="border-b border-white/10">
        <nav className="flex gap-1" role="tablist">
          {([
            { id: "live", label: "Latest Briefing", icon: "◈" },
            { id: "history", label: "History", icon: "📜" },
            { id: "news", label: "News Feed", icon: "📰" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-solana-blue/20 text-solana-blue border-b-2 border-solana-blue"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "live" && (
        <div className="space-y-6">
          {latestDiscussion ? (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-solana-navy/50 border border-white/10 rounded-xl p-4">
                  <div className="text-white/50 text-sm">Session ID</div>
                  <div className="font-mono text-xs text-white/80 break-all">{latestDiscussion.id}</div>
                </div>
                <div className="bg-solana-navy/50 border border-white/10 rounded-xl p-4">
                  <div className="text-white/50 text-sm">Started</div>
                  <div className="text-white">{formatDate(latestDiscussion.createdAt)}</div>
                </div>
                <div className="bg-solana-navy/50 border border-white/10 rounded-xl p-4">
                  <div className="text-white/50 text-sm">News Analyzed</div>
                  <div className="text-white">{latestDiscussion.session.newsItems.length} items</div>
                </div>
              </div>

              {latestDiscussion.session.summary && (
                <div className="bg-solana-navy/50 border border-solana-blue/30 rounded-xl p-5">
                  <h3 className="text-solana-blue font-semibold mb-3">◇ Executive Summary</h3>
                  <div className="text-white/90 whitespace-pre-line">{latestDiscussion.session.summary}</div>
                </div>
              )}

              <div className="space-y-4">
                {latestDiscussion.session.rounds.map((round: DiscussionRound) => (
                  <div key={round.round} className="bg-solana-navy/50 border border-white/10 rounded-xl overflow-hidden">
                    <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                      <h3 className="font-semibold text-white">Round {round.round}</h3>
                      <span className="text-white/50 text-sm">{round.messages.length} experts</span>
                    </div>
                    <div className="p-4 space-y-3">
                      {round.messages.map((msg: DiscussionMessage, idx: number) => (
                        <div
                          key={`${round.round}-${idx}`}
                          className="flex gap-3 p-3 rounded-lg bg-white/5 border-l-4"
                          style={{ borderLeftColor: msg.color }}
                        >
                          <div className="text-2xl">{msg.avatar}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-white">{msg.personaName}</span>
                              <span className="text-xs text-white/50 px-2 py-0.5 rounded bg-white/10">{msg.role}</span>
                              {msg.provider && (
                                <span className="font-mono text-[9px] uppercase tracking-wider text-[#9cb7ff]/70">
                                  {msg.provider}
                                </span>
                              )}
                            </div>
                            <div className="text-white/90 text-sm leading-relaxed">{msg.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-solana-navy/50 border border-white/10 rounded-xl p-4">
                <h3 className="text-white/50 text-sm mb-3">Source Articles</h3>
                <div className="space-y-2">
                  {latestDiscussion.session.newsItems.slice(0, 5).map((item: NewsItem) => {
                    const categoryColors: Record<string, string> = {
                      solana: "#00ff99", defi: "#22c55e", nft: "#a855f7",
                      infrastructure: "#3b82f6", regulation: "#f97316", security: "#ef4444",
                      market: "#9ca3af", general: "#9ca3af",
                    };
                    return (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="w-2 h-2 mt-2 rounded-full" style={{ backgroundColor: categoryColors[item.category] }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{item.title}</p>
                          <p className="text-white/50 text-xs mt-1">
                            {item.source} • {formatDate(item.publishedAt)} • {item.tags.slice(0, 3).join(", ")}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 text-xs rounded ${getCategoryColor(item.category)}`}>
                          {item.category}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </>
          ) : loading ? (
            <div role="status" className="rounded-2xl border border-white/10 bg-white/[0.025] px-6 py-12 text-center text-sm text-white/50">
              <span className="mx-auto mb-4 block h-8 w-8 animate-spin rounded-full border-2 border-[#62c99b]/25 border-t-[#62c99b]" />
              Checking for the latest briefing…
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(98,201,155,0.09),transparent_60%),rgba(14,20,25,0.72)] px-6 py-14 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#62c99b]/20 bg-[#62c99b]/[0.07] text-2xl text-[#a6e8c4]">⌁</div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#62c99b]/75">No briefing published</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">The panel is waiting for its first session</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/50">
                Scheduled debates run once per day on the free hosting plan. Explore the latest Solana headlines in the meantime.
              </p>
              <button
                onClick={() => setActiveTab("news")}
                className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/80 transition hover:border-[#62c99b]/25 hover:text-white"
              >
                Explore the news feed <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          {discussions.length > 0 ? (
            discussions.map((discussion) => (
              <button
                key={discussion.id}
                type="button"
                className="w-full bg-solana-navy/50 border border-white/10 rounded-xl p-5 text-left hover:border-solana-blue/30 transition-colors"
                onClick={() => {
                  setLatestDiscussion(discussion);
                  setActiveTab("live");
                }}
              >
                <span className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <span>
                    <span className="block font-mono text-xs text-white/60">{discussion.id}</span>
                    <span className="mt-1 block text-white font-medium">
                      {discussion.session.newsItems.length} articles • {discussion.session.rounds.length} rounds
                    </span>
                  </span>
                  <span className="block text-right">
                    <span className="block text-white/50 text-sm">{formatDate(discussion.createdAt)}</span>
                    {discussion.session.summary && (
                      <span className="mt-1 block line-clamp-2 text-sm text-white/70">{discussion.session.summary}</span>
                    )}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <div className="text-center py-12 text-white/50">
              <p>{loading ? "Loading discussion history…" : "No discussion history yet"}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "news" && (
        <div className="space-y-4">
          {topNews.length > 0 ? (
            topNews.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 bg-solana-navy/50 border border-white/10 rounded-xl hover:border-solana-blue/30 hover:bg-white/5 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs rounded ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </span>
                      <span className="text-white/40 text-xs">{item.source}</span>
                      <span className="text-white/40 text-xs">{formatDate(item.publishedAt)}</span>
                    </div>
                    <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                    <p className="text-white/60 text-sm line-clamp-2">{item.summary}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.slice(0, 5).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 text-xs bg-white/10 text-white/60 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-solana-blue/20 flex items-center justify-center text-solana-blue text-xl flex-shrink-0">
                    →
                  </div>
                </div>
              </a>
            ))
          ) : (
            <div className="text-center py-12 text-white/50">
              <p>{loading ? "Gathering the latest news…" : "No news available"}</p>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-white/10 pt-8 text-center text-white/50 text-sm">
        <p>Multi-provider AI panel · Requires at least one server-side AI provider key</p>
        <p className="mt-1">Automated analysis — not financial advice. Verify independently.</p>
      </div>
    </div>
  );
}