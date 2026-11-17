const fs = require('fs');

const content = `"use client";

import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Solana Snake Game | Solcurity Tools",
  description: "Play Snake built on Solana with Rust/Anchor - a fun demonstration of Solana blockchain gaming",
};

export default function SolanaSnakeGamePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <Link href="/tools" className="text-white/60 hover:text-white text-sm mb-4 inline-block flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tools
        </Link>
        <h1 className="text-4xl font-bold text-white mb-4 flex items-center gap-3">
          <svg className="w-10 h-10 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Solana Snake Game
        </h1>
        <p className="text-white/60 max-w-2xl">Play the classic Snake game built on Solana with Rust/Anchor - a demonstration of Solana blockchain gaming capabilities.
      </div>

      <div className="mb-8 p-6 bg-solana-card border border-white/10 rounded-2xl">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white mb-4">Play Solana Snake</h2>
            <p className="text-white/60 mb-6">
              Experience the classic Snake game built entirely on Solana using Rust and Anchor framework.
              This demonstrates how traditional games can be implemented on the Solana blockchain
              with real-time gameplay and on-chain state management.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-solana-green/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <p className="text-white font-semibold">Built with Rust & Anchor</p>
                  <p className="text-white/50 text-sm">Smart contract written in Rust using Anchor framework</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-solana-purple/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <p className="text-white font-semibold">On-Chain State</p>
                  <p className="text-white/50 text-sm">Game state stored on Solana blockchain</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-solana-blue/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2v-6a2 2 0 00-2-2z" /></svg>
                </div>
                <div>
                  <p className="text-white font-semibold">Real-time Gameplay</p>
                  <p className="text-white/50 text-sm">Smooth 60fps gameplay with on-chain state</p>
                </div>
              </div>
            </div>
          </div>
          <div className="md:w-1/2">
            <div className="relative aspect-square max-w-md mx-auto">
              <iframe
                src="/solsnake/client/online.html"
                className="w-full h-full rounded-xl border border-white/10 bg-[#050515]"
                title="Solana Snake Game"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16">
        <h2 className="text-2xl font-bold text-white mb-6">About Solana Snake</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-solana-card border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <svg className="w-6 h-6 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              Technology Stack
            </h3>
            <ul className="space-y-2 text-white/60">
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-solana-green"></span> Rust + Anchor Framework</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-solana-green"></span> Solana Web3.js</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-solana-green"></span> HTML5 Canvas</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-solana-green"></span> TypeScript</li>
            </ul>
          </div>
          <div className="bg-solana-card border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <svg className="w-6 h-6 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Smart Contract
            </h3>
            <ul className="space-y-2 text-white/60">
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-solana-purple"></span> On-chain game state</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-solana-purple"></span> Score tracking</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-solana-purple"></span> Leaderboard (planned)</li>
            </ul>
          </div>
          <div className="bg-solana-card border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <svg className="w-6 h-6 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2a3 3 0 00-5.356-1.857M17 20V13M17 20H7" /></svg>
              How to Play
            </h3>
            <ul className="space-y-2 text-white/60">
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-solana-blue"></span> Use arrow keys or WASD to control the snake</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-solana-blue"></span> Eat food to grow and increase score</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-solana-blue"></span> Avoid walls and self-collision</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-solana-blue"></span> Game state saved on Solana blockchain</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function SnakeIcon() {
  return <svg className="w-6 h-6 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}

function ShieldCheckIcon() {
  return <svg className="w-6 h-6 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
}
`;

const fs = require('fs');
fs.writeFileSync('src/app/tools/solsnake/page.tsx', content);
console.log('File written successfully');