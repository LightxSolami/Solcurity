'use client';

import { MessageSquare, Shield, Zap, Bot, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

interface TelegramBotCardProps {
  className?: string;
}

export function TelegramBotCard({ className = '' }: TelegramBotCardProps) {
  const [copied, setCopied] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  const copyUsername = () => {
    navigator.clipboard.writeText('@SolcurityBot');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const features = [
    { icon: Shield, title: 'Security Scans', desc: 'Full wallet risk analysis with 0-100 score' },
    { icon: Zap, title: 'Instant Results', desc: 'Get findings in seconds via inline buttons' },
    { icon: Bot, title: 'Interactive UI', desc: 'Rich menus, callbacks, no typing needed' },
    { icon: MessageSquare, title: 'Scheduled Alerts', desc: 'Periodic activity checks, typically every five minutes' },
  ];

  const commands = [
    { cmd: '/scan <address>', desc: 'Full security scan' },
    { cmd: '/wallet <address>', desc: 'Quick balance & token summary' },
    { cmd: '/token <mint>', desc: 'Token analysis & extensions' },
    { cmd: '/tx <signature>', desc: 'Decode transaction details' },
    { cmd: '/alert <address>', desc: 'Set activity notifications' },
    { cmd: '/alerts', desc: 'Manage your alerts' },
    { cmd: '/settings', desc: 'Bot preferences' },
    { cmd: '/help', desc: 'Show all commands' },
  ];

  return (
    <section className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-white/2 to-transparent p-6 md:p-8 ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.15),transparent_60%)] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <Bot className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Solcurity Bot</h2>
              <p className="text-sm text-white/60">@SolcurityBot</p>
            </div>
          </div>
          <button
            onClick={copyUsername}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white/70 hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 012-2h10a2 2 0 012 2v1M8 5a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v1z" />
                </svg>
                Copy @SolcurityBot
              </>
            )}
          </button>
        </div>

        <p className="text-white/70 mb-8 max-w-xl">
          Your Solana security assistant on Telegram. Scan wallets, check tokens, decode transactions, and set opt-in alerts — all without leaving the chat.
        </p>

        <div className="flex flex-wrap gap-3 mb-8">
          <a
            href="https://t.me/SolcurityBot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
          >
            <MessageSquare className="h-5 w-5" />
            Open in Telegram
            <ArrowRight className="h-5 w-5" />
          </a>
          <button
            onClick={() => setShowFeatures(!showFeatures)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 bg-white/5 text-white/80 font-medium hover:bg-white/10 hover:border-white/20 transition-all"
          >
            {showFeatures ? <XCircle className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
            {showFeatures ? 'Hide' : 'Show'} Features
          </button>
        </div>

        {showFeatures && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8 animate-slide-down">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:border-white/20 hover:bg-white/8">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 mb-3">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-white mb-1">{title}</h3>
                <p className="text-sm text-white/60">{desc}</p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-6">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-400" />
            Available Commands
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {commands.map(({ cmd, desc }) => (
              <div key={cmd} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 text-sm">
                <code className="font-mono text-indigo-300 bg-white/5 px-2 py-0.5 rounded">{cmd}</code>
                <span className="text-white/70">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-400" />
            Privacy First
          </h3>
          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" /> No private keys or seed phrases ever</li>
            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" /> Public blockchain data only</li>
            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" /> No wallet connection required</li>
            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" /> Alert addresses and Telegram IDs are stored until you remove an alert</li>
            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" /> Open source & auditable</li>
          </ul>
        </div>

        <div className="mt-8 text-center">
          <p className="text-white/50 text-sm mb-4">
            Built with the same engine as <a href="/" className="text-indigo-400 hover:text-indigo-300 underline">Solcurity Web</a>
          </p>
          <a
            href="https://t.me/SolcurityBot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
          >
            <MessageSquare className="h-5 w-5" />
            Start Using Solcurity Bot
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </div>
    </section>
  );
}