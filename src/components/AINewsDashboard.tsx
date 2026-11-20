"use client";

import { useState, useEffect, useRef } from "react";
import { DiscussionSession, DiscussionMessage, DiscussionRound } from "@/lib/ai-news/orchestrator";
import { NewsItem } from "@/lib/ai-news/news-aggregator";

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
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"live" | "history" | "news">("live");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const [discussionsRes, newsRes] = await Promise.all([
        fetch("/api/ai-news/discussions?action=latest"),
        fetch("/api/ai-news/news?action=top&limit=10"),
      ]);

      if (discussionsRes.ok) {
        const data = await discussionsRes.json();
        if (data.discussion) {
          setLatestDiscussion(data.discussion);
        }
      }

      const historyRes = await fetch("/api/ai-news/discussions?limit=10");
      if (historyRes.ok) {
        const data = await historyRes.json();
        setDiscussions(data.discussions || []);
      }

      if (newsRes.ok) {
        const data = await newsRes.json();
        setTopNews(data.news || []);
      }
    } catch (err) {
      setError("Failed to fetch data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(fetchData, 60000);
    }
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [autoRefresh]);

  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(fetchData, 60000);
    } else if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [autoRefresh]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-solana-blue border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-400">
        <p>{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-solana-blue text-white rounded hover:bg-solana-blue/80">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">AI News Intelligence</h1>
          <p className="text-white/60 mt-1">
            24/7 multi-AI expert panel discussing Solana & crypto developments
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-white/80">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-white/20 bg-solana-navy text-solana-blue focus:ring-solana-blue"
            />
            Auto-refresh (1m)
          </label>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-solana-blue text-white rounded hover:bg-solana-blue/80 disabled:opacity-50"
          >
            Refresh Now
          </button>
        </div>
      </div>

      <div className="border-b border-white/10">
        <nav className="flex gap-1" role="tablist">
          {[
            { id: "live", label: "Live Discussion", icon: "💬" },
            { id: "history", label: "History", icon: "📜" },
            { id: "news", label: "News Feed", icon: "📰" },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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
                  <h3 className="text-solana-blue font-semibold mb-3">📋 Executive Summary</h3>
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
          ) : (
            <div className="text-center py-16 text-white/50">
              <p className="text-xl mb-2">No discussion yet</p>
              <p>The AI panel will start analyzing news on the next cron run (every 6 hours).</p>
              <button
                onClick={fetchData}
                className="mt-4 px-6 py-3 bg-solana-blue text-white rounded-lg hover:bg-solana-blue/80"
              >
                Trigger Discussion Now
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          {discussions.length > 0 ? (
            discussions.map((discussion) => (
              <div
                key={discussion.id}
                className="bg-solana-navy/50 border border-white/10 rounded-xl p-5 hover:border-solana-blue/30 transition-colors cursor-pointer"
                onClick={() => window.open(`/api/ai-news/discussions?id=${discussion.id}`, "_blank")}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs text-white/60">{discussion.id}</p>
                    <p className="text-white font-medium mt-1">
                      {discussion.session.newsItems.length} articles • {discussion.session.rounds.length} rounds
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/50 text-sm">{formatDate(discussion.createdAt)}</p>
                    {discussion.session.summary && (
                      <p className="text-white/70 text-sm mt-1 line-clamp-2">{discussion.session.summary}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-white/50">
              <p>No discussion history yet</p>
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
              <p>No news available</p>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-white/10 pt-8 text-center text-white/50 text-sm">
        <p>Powered by Groq • Gemini • HuggingFace • Together.ai</p>
        <p className="mt-1">Automated analysis — not financial advice. Verify independently.</p>
      </div>
    </div>
  );
}