import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ | Solcurity",
  description: "Frequently asked questions about Solcurity - Solana wallet security scanner, SVM Explorer, and local validator setup.",
};

export default function FAQPage() {
  const faqs = [
    {
      category: "Getting Started",
      questions: [
        {
          q: "What is Solcurity?",
          a: "Solcurity is a read-only Solana wallet scanner. It reads public account, token, and recent transaction data and reports check statuses and evidence-backed findings. Risk score and scan confidence are separate; the score is withheld when a check is unavailable."
        },
        {
          q: "Is Solcurity free?",
          a: "Solcurity is open source and can use public Solana Mainnet RPC endpoints. Operators can configure multiple server-side endpoints with SOLANARPCURLS (or the legacy SOLANARPCURL). The scanner does not accept arbitrary client-supplied RPC URLs."
        },
        {
          q: "Do I need to connect my wallet?",
          a: "No. Solcurity only requires a public Solana address (44-character base58 string). We never ask for private keys, seed phrases, or wallet connections for scanning. Connecting a wallet in Snake Arena is optional and only reads your public address; the free practice game does not stake SOL."
        },
        {
          q: "What wallets are supported?",
          a: "Any Solana address works — Phantom, Solflare, Ledger, Backpack, Glow, Trust Wallet, or any other Solana wallet. Just paste the public address (starts with 1-9, A-H, J-N, P-Z, a-k, m-z, 32-44 characters)."
        }
      ]
    },
    {
      category: "Local Validator Setup",
      questions: [
        {
          q: "What is a local validator and why do I need it?",
          a: "A local validator (solana-test-validator) runs a complete Solana blockchain on your machine. It's required for the SVM Explorer's airdrop feature, program deployment, and testing without using real SOL. It runs on http://127.0.0.1:8899 by default."
        },
        {
          q: "How do I install the Solana CLI?",
          a: "Run this command in your terminal:\n\n```bash\nsh -c \"$(curl -sSfL https://release.solana.com/stable/install)\"\n```\n\nThen restart your terminal and verify with:\n\n```bash\nsolana --version\n```\n\nOn Windows, use the installer from https://solana.com/docs/intro/getting-started"
        },
        {
          q: "How do I start the local validator?",
          a: "Open a terminal and run:\n\n```bash\nsolana-test-validator\n```\n\nThis starts a validator on http://127.0.0.1:8899 with a fresh ledger. Keep this terminal open while using the SVM Explorer.\n\nUseful flags:\n- `--reset` — Clear ledger and start fresh\n- `--rpc-port 8899` — Explicit port (default)\n- `--limit-ledger-size` — Limit disk usage"
        },
        {
          q: "How do I get SOL on the local validator?",
          a: "Once the validator is running, you have two options:\n\n1. **SVM Explorer Airdrop** — Enter your address in the SVM Explorer, select 'Local Validator' in the RPC dropdown, and click 'Airdrop 1 SOL' or 'Random Airdrop'.\n\n2. **CLI Airdrop** — Run:\n```bash\nsolana airdrop 10 <YOUR_ADDRESS> --url http://127.0.0.1:8899\n```\n\nThe local validator has unlimited SOL for testing."
        },
        {
          q: "How do I deploy a program to local validator?",
          a: "Build your program with `cargo build-sbf`, then deploy:\n\n```bash\nsolana program deploy <PATH_TO_SO_FILE> --url http://127.0.0.1:8899\n```\n\nThe SVM Explorer's 'Program Accounts' and 'AI Analyze Program' features work with locally deployed programs."
        },
        {
          q: "The validator won't start / port 8899 in use",
          a: "Check what's using port 8899:\n\n```bash\nlsof -i :8899\n# or on Windows:\nnetstat -ano | findstr :8899\n```\n\nKill the process or use a different port:\n\n```bash\nsolana-test-validator --rpc-port 8899 --faucet-port 9900\n```\n\nOr stop any existing validator with Ctrl+C in its terminal."
        },
        {
          q: "How do I reset the local validator ledger?",
          a: "Use the `--reset` flag to start completely fresh:\n\n```bash\nsolana-test-validator --reset\n```\n\nThis clears all accounts, programs, and transaction history. Useful when testing program upgrades or when state gets corrupted."
        }
      ]
    },
    {
      category: "Scanner & Results",
      questions: [
        {
          q: "What does the risk score mean?",
          a: "The score starts at 100 and subtracts severity- and confidence-weighted finding deductions. Higher scores indicate fewer detected risks: 90-100 LOW, 70-89 MODERATE, 40-69 HIGH, 0-39 CRITICAL. If any applicable check is UNKNOWN, the numeric score is withheld; critical unavailable checks are labeled INCOMPLETE SCAN. Scan confidence is a separate percentage of checks completed."
        },
        {
          q: "What are 'threat intelligence' findings?",
          a: "When Supabase is configured, the scanner checks addresses and observed counterparties against active, unexpired records from approved sources. The database is partial and has no authoritative negative-screening provider, so a no-match remains UNKNOWN. Community reports stay pending until a moderator reviews them."
        },
        {
          q: "Why does my wallet show 'active mint/freeze authority'?",
          a: "The RPC reports that the token mint or freeze authority is still set. That authority can change supply or freeze token accounts. Solcurity reports this as a risk indicator, not proof of malicious activity."
        },
        {
          q: "Can I scan multiple wallets at once?",
          a: "Currently, one address per scan. For batch scanning, use the API directly:\n\n```bash\ncurl -X POST http://localhost:3000/api/scan \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"address\": \"YOUR_ADDRESS\"}'\n```"
        }
      ]
    },
    {
      category: "SVM Explorer",
      questions: [
        {
          q: "What's the difference between Local, Devnet, and Testnet?",
          a: "<strong>Local Validator</strong> — Runs on your machine, unlimited free SOL, instant blocks, full control.\n\n<strong>Devnet</strong> — Public Solana testnet, free SOL from faucet, real network conditions, shared with other developers.\n\n<strong>Testnet</strong> — Pre-release testing network for validator operators, may have different features/behavior.\n\nFor development, use Local. For integration testing with other services, use Devnet."
        },
        {
          q: "How do I use the AI Program Analysis?",
          a: "The SVM Explorer can send retrieved execution logs or account data to its configured AI provider for a summary. Log analysis is not source-code inspection, a smart-contract audit, or vulnerability detection. Provider failures are reported rather than replaced with a low-risk result."
        },
        {
          q: "Why does AI analysis fail sometimes?",
          a: "Common reasons:\n- No transactions to analyze (need to click 'Fetch Transactions' first)\n- Groq API rate limit or model unavailable\n- Network connectivity to Groq API\n\nCheck the error message displayed. If persistent, try again in a few minutes."
        }
      ]
    },
    {
      category: "Privacy & Security",
      questions: [
        {
          q: "Is my data private?",
          a: "Yes. Solcurity only analyzes publicly available on-chain data. We never collect private keys, seed phrases, IP addresses (beyond standard rate limiting), or personal information. No analytics, tracking cookies, or user fingerprinting. All code is open source."
        },
        {
          q: "Can I self-host Solcurity?",
          a: "Yes. Clone the repository, install dependencies, and run the Next.js app. Configure SOLANARPCURLS with server-side Mainnet endpoints for scanner failover, and GROQ_API_KEY only if using AI summaries. Never expose provider credentials through NEXT_PUBLIC variables."
        }
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <header className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Frequently Asked Questions</h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto">
          Everything you need to know about using Solcurity, setting up a local validator, and understanding scan results.
        </p>
      </header>

      <nav className="mb-12 p-4 bg-solana-card/50 border border-white/10 rounded-xl">
        <h2 className="text-lg font-semibold text-white mb-3">Quick Links</h2>
        <div className="flex flex-wrap gap-2">
          {faqs.map((cat) => (
            <Link
              key={cat.category}
              href={`#${cat.category.toLowerCase().replace(/ /g, '-')}`}
              className="px-3 py-1 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-lg text-sm hover:bg-solana-purple/30 transition-colors"
            >
              {cat.category}
            </Link>
          ))}
        </div>
      </nav>

      <div className="space-y-12">
        {faqs.map((category, catIndex) => (
          <section key={category.category} id={category.category.toLowerCase().replace(/ /g, '-')} className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-solana-purple/20 flex items-center justify-center text-solana-blue font-bold">
                {faqs.indexOf(category) + 1}
              </span>
              {category.category}
            </h2>
            <div className="space-y-4">
              {category.questions.map((faq, i) => (
                <details key={i} className="group bg-solana-card border border-white/10 rounded-xl overflow-hidden">
                  <summary className="p-5 cursor-pointer list-none flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-solana-purple/20 flex items-center justify-center text-solana-blue text-sm font-bold">
                      {i + 1}
                    </span>
                    <span className="text-white font-medium flex-1">{faq.q}</span>
                    <svg className="w-5 h-5 text-white/40 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-5 text-white/70 leading-relaxed">
                    <div dangerouslySetInnerHTML={{ __html: faq.a.replace(/\n/g, '<br/>') }} />
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        <section className="border-t border-white/10 pt-8">
          <h2 className="text-2xl font-bold text-white mb-4">Still Have Questions?</h2>
          <div className="bg-solana-card border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-white/70 mb-6 max-w-xl mx-auto">
              Can&apos;t find your answer? Check the documentation, open an issue, or contribute to the project.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="https://github.com/LightxSolami/Solcurity/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors"
              >
                Open GitHub Issue
              </Link>
              <Link
                href="https://github.com/LightxSolami/Solcurity/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-white/5 border border-white/10 text-white/70 rounded-xl font-medium hover:bg-white/10 transition-colors"
              >
                Discussions
              </Link>
              <Link
                href="https://github.com/LightxSolami/Solcurity"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-white/5 border border-white/10 text-white/70 rounded-xl font-medium hover:bg-white/10 transition-colors"
              >
                View Source
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}