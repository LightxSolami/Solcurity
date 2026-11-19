"use client";

import { FormEvent, useState } from "react";

interface QueueSubmission {
  id: string;
  network: string;
  entity_type: string;
  identifier: string;
  category: string;
  evidence_kind: string;
  evidence_value: string;
  explanation: string;
  created_at: string;
}

interface ModerationSource {
  id: string;
  name: string;
  url: string;
  licenseBasis: string;
}

interface ModerationQueue {
  submissions: QueueSubmission[];
  sources: ModerationSource[];
}

function isConfidence(value: string): value is "LOW" | "MEDIUM" | "HIGH" {
  return value === "LOW" || value === "MEDIUM" || value === "HIGH";
}

export function ModerationConsole() {
  const [token, setToken] = useState("");
  const [queue, setQueue] = useState<ModerationQueue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadQueue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/threat-intel/moderation", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Queue could not be loaded.");
      setQueue(result);
    } catch (loadError) {
      setQueue(null);
      setError(loadError instanceof Error ? loadError.message : "Queue could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function decide(
    submissionId: string,
    decision: {
      action: "approved" | "rejected" | "marked_duplicate";
      notes: string;
      sourceId?: string;
      status?: "confirmed" | "suspected";
      confidence?: "LOW" | "MEDIUM" | "HIGH";
      expiresAt?: string;
    }
  ) {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/threat-intel/moderation", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ submissionId, ...decision }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Moderation action failed.");
      setMessage(result.message);
      setQueue((current) => current && {
        ...current,
        submissions: current.submissions.filter((submission) => submission.id !== submissionId),
      });
      try {
        await refreshQueue();
      } catch {
        setError("Decision recorded, but the queue could not refresh. Reload the queue to continue.");
      }
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : "Moderation action failed."
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshQueue() {
    const response = await fetch("/api/threat-intel/moderation", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Queue could not be refreshed.");
    setQueue(result);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-solana-blue">
          Moderator access
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">Review pending reports</h2>
        <p className="mt-2 text-sm leading-6 text-white/50">
          The token is sent only to the server for this session and is not saved in browser storage.
        </p>
      </div>
      <form onSubmit={loadQueue} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          autoComplete="current-password"
          required
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0b1115] px-4 py-3 text-sm text-white focus:border-solana-blue/50 focus:outline-none"
          placeholder="Moderator token"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl border border-solana-blue/25 bg-solana-blue/10 px-5 py-3 text-sm font-semibold text-[#b8ecd1] disabled:opacity-50"
        >
          {loading ? "Loading…" : queue ? "Refresh queue" : "Open queue"}
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-solana-blue" role="status">{message}</p>}
      {error && <p className="mt-4 text-sm text-risk-critical" role="alert">{error}</p>}

      {queue && (
        <div className="mt-6 space-y-4">
          <p className="text-xs text-white/45">
            {queue.submissions.length} pending report{queue.submissions.length === 1 ? "" : "s"} ·
            {" "}{queue.sources.length} approved source{queue.sources.length === 1 ? "" : "s"}
          </p>
          {queue.submissions.length === 0 && (
            <p className="rounded-xl border border-white/10 p-4 text-sm text-white/50">
              No pending reports.
            </p>
          )}
          {queue.submissions.map((submission) => (
            <ModerationItem
              key={submission.id}
              submission={submission}
              sources={queue.sources}
              loading={loading}
              onDecision={decide}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ModerationItem({
  submission,
  sources,
  loading,
  onDecision,
}: {
  submission: QueueSubmission;
  sources: ModerationSource[];
  loading: boolean;
  onDecision: (
    submissionId: string,
    decision: {
      action: "approved" | "rejected" | "marked_duplicate";
      notes: string;
      sourceId?: string;
      status?: "confirmed" | "suspected";
      confidence?: "LOW" | "MEDIUM" | "HIGH";
      expiresAt?: string;
    }
  ) => Promise<void>;
}) {
  const [notes, setNotes] = useState("");
  const [sourceId, setSourceId] = useState(sources[0]?.id || "");
  const [status, setStatus] = useState<"confirmed" | "suspected">("suspected");
  const [confidence, setConfidence] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const [expiryDate, setExpiryDate] = useState(defaultExpiry);

  function approve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sourceId) return;
    const expiresAt = new Date(`${expiryDate}T23:59:59.000Z`).toISOString();
    void onDecision(submission.id, {
      action: "approved",
      notes,
      sourceId,
      status,
      confidence,
      expiresAt,
    });
  }

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-[#0b1115] px-3 py-2 text-sm text-white focus:border-solana-blue/50 focus:outline-none";

  return (
    <article className="rounded-xl border border-white/10 bg-[#0b1115]/70 p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
        <span>{submission.network}</span>
        <span>·</span>
        <span>{submission.entity_type}</span>
        <span>·</span>
        <span>{submission.category.replaceAll("_", " ")}</span>
        <span>·</span>
        <time dateTime={submission.created_at}>{new Date(submission.created_at).toLocaleString()}</time>
      </div>
      <p className="mt-3 break-all font-mono text-sm text-white/85">{submission.identifier}</p>
      <p className="mt-2 break-all text-xs text-white/55">
        Evidence ({submission.evidence_kind}): {submission.evidence_value}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/65">{submission.explanation}</p>

      <form onSubmit={approve} className="mt-4 space-y-3">
        <label className="block space-y-1 text-xs text-white/50">
          Review notes (required)
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            minLength={10}
            maxLength={4000}
            required
            rows={2}
            className={inputClass}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-xs text-white/50">
            Approved source
            <select
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
              className={inputClass}
              required
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-white/50">
            Decision status
            <select
              value={status}
              onChange={(event) => {
                if (event.target.value === "confirmed" || event.target.value === "suspected") {
                  setStatus(event.target.value);
                }
              }}
              className={inputClass}
            >
              <option value="suspected">Suspected</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-white/50">
            Confidence
            <select
              value={confidence}
              onChange={(event) => {
                if (isConfidence(event.target.value)) setConfidence(event.target.value);
              }}
              className={inputClass}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-white/50">
            Re-verify by
            <input
              type="date"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
              required
              className={inputClass}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={loading || sources.length === 0}
            className="rounded-lg border border-solana-blue/25 bg-solana-blue/10 px-3 py-2 text-xs font-semibold text-[#b8ecd1] disabled:opacity-40"
          >
            Approve as {status}
          </button>
          <button
            type="button"
            disabled={loading || notes.trim().length < 10}
            onClick={() => void onDecision(submission.id, { action: "rejected", notes })}
            className="rounded-lg border border-risk-critical/25 bg-risk-critical/10 px-3 py-2 text-xs font-semibold text-risk-critical disabled:opacity-40"
          >
            Reject
          </button>
          <button
            type="button"
            disabled={loading || notes.trim().length < 10}
            onClick={() => void onDecision(submission.id, { action: "marked_duplicate", notes })}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/55 disabled:opacity-40"
          >
            Mark duplicate
          </button>
        </div>
        {sources.length === 0 && (
          <p className="text-xs text-risk-moderate">
            No approved source is configured. The report cannot be approved yet.
          </p>
        )}
      </form>
    </article>
  );
}
