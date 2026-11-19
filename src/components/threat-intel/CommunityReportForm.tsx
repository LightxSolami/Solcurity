"use client";

import { FormEvent, useMemo, useState } from "react";

const categoriesByEntity = {
  wallet: ["malicious_wallet", "drainer", "phishing", "other"],
  token_mint: ["scam_token", "phishing", "other"],
  program: ["malicious_program", "drainer", "phishing", "other"],
  transaction_signature: ["suspicious_funding", "phishing", "other"],
} as const;

const fieldClassName =
  "w-full rounded-xl border border-white/10 bg-[#0b1115] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-solana-blue/50 focus:outline-none focus:ring-2 focus:ring-solana-blue/20";

function isEntityType(value: string): value is keyof typeof categoriesByEntity {
  return Object.prototype.hasOwnProperty.call(categoriesByEntity, value);
}

export function CommunityReportForm() {
  const [entityType, setEntityType] =
    useState<keyof typeof categoriesByEntity>("wallet");
  const [evidenceKind, setEvidenceKind] = useState<"url" | "transaction_signature">("url");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const categories = useMemo(() => categoriesByEntity[entityType], [entityType]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage("");
    setError("");
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      network: formData.get("network"),
      entityType,
      identifier: formData.get("identifier"),
      category: formData.get("category"),
      evidenceKind,
      evidenceValue: formData.get("evidenceValue"),
      explanation: formData.get("explanation"),
    };

    try {
      const response = await fetch("/api/threat-intel/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Report could not be submitted.");
      form.reset();
      setMessage(result.message);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Report could not be submitted. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-white/65">
          Network
          <select name="network" className={fieldClassName} defaultValue="solana-mainnet">
            <option value="solana-mainnet">Solana Mainnet</option>
            <option value="solana-devnet">Solana Devnet</option>
            <option value="solana-testnet">Solana Testnet</option>
          </select>
        </label>
        <label className="space-y-2 text-sm text-white/65">
          Entity type
          <select
            name="entityType"
            className={fieldClassName}
            value={entityType}
            onChange={(event) => {
              if (isEntityType(event.target.value)) setEntityType(event.target.value);
            }}
          >
            <option value="wallet">Wallet address</option>
            <option value="token_mint">Token mint</option>
            <option value="program">Program ID</option>
            <option value="transaction_signature">Transaction signature</option>
          </select>
        </label>
      </div>

      <label className="block space-y-2 text-sm text-white/65">
        Address or transaction signature
        <input
          name="identifier"
          required
          maxLength={128}
          autoComplete="off"
          className={fieldClassName}
          placeholder="Public Solana identifier"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-white/65">
          Report category
          <select name="category" className={fieldClassName} key={entityType}>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-white/65">
          Evidence type
          <select
            className={fieldClassName}
            value={evidenceKind}
            onChange={(event) => {
              if (
                event.target.value === "url" ||
                event.target.value === "transaction_signature"
              ) {
                setEvidenceKind(event.target.value);
              }
            }}
          >
            <option value="url">HTTPS evidence URL</option>
            <option value="transaction_signature">Solana transaction signature</option>
          </select>
        </label>
      </div>

      <label className="block space-y-2 text-sm text-white/65">
        Evidence
        <input
          name="evidenceValue"
          required
          maxLength={2048}
          className={fieldClassName}
          placeholder={evidenceKind === "url" ? "https://..." : "Base58 transaction signature"}
        />
      </label>

      <label className="block space-y-2 text-sm text-white/65">
        What happened? Include enough detail for a reviewer to verify the evidence.
        <textarea
          name="explanation"
          required
          minLength={20}
          maxLength={4000}
          rows={4}
          className={fieldClassName}
          placeholder="Describe the observed behavior and how the evidence supports this report."
        />
      </label>

      {message && <p className="text-sm text-solana-blue" role="status">{message}</p>}
      {error && <p className="text-sm text-risk-critical" role="alert">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl border border-solana-blue/25 bg-solana-blue/10 px-5 py-3 text-sm font-semibold text-[#b8ecd1] transition hover:bg-solana-blue/15 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit for review"}
      </button>
      <p className="text-xs leading-5 text-white/40">
        Reports remain pending and do not affect scan findings until manually reviewed and approved.
      </p>
    </form>
  );
}
