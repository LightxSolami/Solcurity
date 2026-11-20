"use client";

import { useEffect, useState } from "react";

export function ClaudeMcpSetup() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [endpoint, setEndpoint] = useState("");

  useEffect(() => {
    setEndpoint(`${window.location.origin}/api/mcp`);
  }, []);

  async function copyEndpoint() {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/45">Remote MCP endpoint</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <code className="min-w-0 flex-1 break-all rounded-lg bg-white/5 px-3 py-2 text-sm text-solana-blue">
          {endpoint || "https://your-solcurity-domain/api/mcp"}
        </code>
        <button
          type="button"
          onClick={copyEndpoint}
          disabled={!endpoint}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/75 hover:bg-white/5"
        >
          {copied ? "Copied" : "Copy endpoint"}
        </button>
      </div>
      {copyError && (
        <p className="mt-2 text-xs text-risk-critical" role="alert">
          Could not access the clipboard. Copy the endpoint above manually.
        </p>
      )}
    </div>
  );
}
