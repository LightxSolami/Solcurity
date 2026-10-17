import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Solana Tools | Solcurity",
  description: "Useful Solana utilities - address validator, lamports converter, token account finder, and more",
};

const tools = [
  {
    name: "Address Validator",
    description: "Validate and decode Solana public keys",
    href: "/tools/address-validator",
    icon: <ShieldCheckIcon />,
    category: "Validation",
  },
  {
    name: "Lamports Converter",
    description: "Convert between SOL and lamports",
    href: "/tools/lamports-converter",
    icon: <CurrencyIcon />,
    category: "Conversion",
  },
  {
    name: "Token Account Finder",
    description: "Find all token accounts for a wallet",
    href: "/tools/token-accounts",
    icon: <SearchIcon />,
    category: "Discovery",
  },
  {
    name: "Transaction Decoder",
    description: "Decode and analyze transaction data",
    href: "/tools/tx-decoder",
    icon: <CodeIcon />,
    category: "Analysis",
  },
  {
    name: "Program ID Registry",
    description: "Browse known Solana program IDs",
    href: "/tools/program-registry",
    icon: <DatabaseIcon />,
    category: "Reference",
  },
  {
    name: "RPC Endpoint Tester",
    description: "Test and compare Solana RPC endpoints",
    href: "/tools/rpc-tester",
    icon: <ServerIcon />,
    category: "Infrastructure",
  },
];

const categories = Array.from(new Set(tools.map((t) => t.category)));

export default function ToolsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Solana Tools</h1>
        <p className="text-white/60 max-w-2xl">Useful utilities for Solana developers, researchers, and power users.</p>
      </div>

      <div className="space-y-10">
        {categories.map((category) => (
          <section key={category}>
            <h2 className="text-lg font-semibold text-white/50 uppercase tracking-wider mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-solana-purple/20 flex items-center justify-center text-solana-blue text-sm font-bold">
                {category.charAt(0)}
              </span>
              {category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.filter((t) => t.category === category).map((tool) => (
                <Link
                  key={tool.name}
                  href={tool.href}
                  className="group bg-solana-card border border-white/10 rounded-2xl p-6 hover:border-solana-purple/30 hover:bg-solana-purple/5 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-solana-purple/20 flex items-center justify-center group-hover:bg-solana-purple/30 transition-colors">
                      {tool.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white group-hover:text-solana-blue transition-colors">{tool.name}</h3>
                      <p className="text-white/60 text-sm mt-1">{tool.description}</p>
                    </div>
                    <svg className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-semibold text-white/50 uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-solana-blue/20 flex items-center justify-center text-solana-blue text-sm font-bold">Q</span>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Scan Wallet", href: "/", icon: <SearchIcon /> },
              { label: "Bubble Map", href: "/bubble-map", icon: <ChartIcon /> },
              { label: "Security Guide", href: "/security", icon: <ShieldIcon /> },
              { label: "How It Works", href: "/how-it-works", icon: <BookIcon /> },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 px-4 py-3 bg-solana-card border border-white/10 rounded-xl hover:border-solana-purple/30 hover:bg-solana-purple/5 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-solana-purple/20 flex items-center justify-center">{action.icon}</div>
                <span className="font-medium text-white">{action.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// Icons
function ShieldCheckIcon() {
  return <svg className="w-6 h-6 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function CurrencyIcon() {
  return <svg className="w-6 h-6 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function SearchIcon() {
  return <svg className="w-6 h-6 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}
function CodeIcon() {
  return <svg className="w-6 h-6 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>;
}
function DatabaseIcon() {
  return <svg className="w-6 h-6 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>;
}
function ServerIcon() {
  return <svg className="w-6 h-6 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>;
}
function ShieldIcon() {
  return <svg className="w-5 h-5 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
}
function BookIcon() {
  return <svg className="w-5 h-5 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
}
function ChartIcon() {
  return <svg className="w-5 h-5 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}