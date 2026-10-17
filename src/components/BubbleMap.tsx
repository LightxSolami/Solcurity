"use client";

import { useEffect, useRef, useState } from "react";
import { TokenInfo } from "@/lib/types";

interface BubbleMapProps {
  tokens: TokenInfo[];
  walletAddress: string;
}

interface Node {
  id: string;
  label: string;
  size: number;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isMainWallet: boolean;
  tokenSymbol?: string;
}

interface Link {
  source: string;
  target: string;
  value: number;
}

export function BubbleMap({ tokens, walletAddress }: BubbleMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [mounted, setMounted] = useState(false);
  const animationFrameRef = useRef<number>();

  // Filter tokens with meaningful balances
  const significantTokens = tokens.filter((t) => t.uiAmount > 0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !canvasRef.current || significantTokens.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize nodes for top tokens - all random generation happens client-side
    const newNodes: Node[] = [];
    const newLinks: Link[] = [];

    // Add main wallet as center node
    newNodes.push({
      id: walletAddress,
      label: "You",
      size: 40,
      color: "#9945FF",
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      isMainWallet: true,
    });

    // Add token nodes around the center
    significantTokens.slice(0, 8).forEach((token, i) => {
      const angle = (i / Math.max(1, significantTokens.length)) * Math.PI * 2;
      const radius = 180 + Math.random() * 60;

      const tokenNode: Node = {
        id: token.mintAddress,
        label: token.symbol,
        size: Math.max(20, Math.min(50, 15 + Math.log10(token.uiAmount + 1) * 8)),
        color: token.suspicious ? "#ef4444" : token.isToken2022 ? "#14F195" : "#3b82f6",
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        isMainWallet: false,
        tokenSymbol: token.symbol,
      };
      newNodes.push(tokenNode);

      // Link from main wallet to token
      newLinks.push({
        source: walletAddress,
        target: token.mintAddress,
        value: token.uiAmount,
      });

      // Add some "holder" nodes for visualization (simulated)
      const holderCount = Math.min(5, Math.floor(token.uiAmount / 1000) + 1);
      for (let h = 0; h < holderCount; h++) {
        const holderAngle = angle + (Math.random() - 0.5) * 0.8;
        const holderRadius = radius + 60 + Math.random() * 40;
        const holderId = `${token.mintAddress}_holder_${h}`;

        newNodes.push({
          id: holderId,
          label: "",
          size: Math.max(8, Math.min(18, 6 + Math.random() * 10)),
          color: "#64748b",
          x: Math.cos(holderAngle) * holderRadius,
          y: Math.sin(holderAngle) * holderRadius,
          vx: 0,
          vy: 0,
          isMainWallet: false,
        });

        newLinks.push({
          source: token.mintAddress,
          target: holderId,
          value: 1,
        });
      }
    });

    setNodes(newNodes);
    setLinks(newLinks);
    setSimulationRunning(true);
  }, [significantTokens, walletAddress, mounted]);

  // Force-directed simulation
  useEffect(() => {
    if (!mounted || !simulationRunning || nodes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const tick = () => {
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      // Apply forces
      nodes.forEach((node) => {
        if (node.isMainWallet) {
          // Strong attraction to center
          node.vx += (centerX - (node.x + centerX)) * 0.08;
          node.vy += (centerY - (node.y + centerY)) * 0.08;
        } else {
          // Weak attraction to center
          node.vx += (centerX - (node.x + centerX)) * 0.01;
          node.vy += (centerY - (node.y + centerY)) * 0.01;
        }

        // Repulsion between nodes
        nodes.forEach((other) => {
          if (node.id === other.id) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (node.size + other.size) * 200 / (dist * dist);
          node.vx += (dx / dist) * force * 0.01;
          node.vy += (dy / dist) * force * 0.01;
        });

        // Link attraction
        links.forEach((link) => {
          const source = nodeMap.get(link.source);
          const target = nodeMap.get(link.target);
          if (!source || !target) return;

          if (node.id === link.source) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            node.vx += (dx / dist) * 0.05;
            node.vy += (dy / dist) * 0.05;
          } else if (node.id === link.target) {
            const dx = source.x - target.x;
            const dy = source.y - target.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            node.vx += (dx / dist) * 0.05;
            node.vy += (dy / dist) * 0.05;
          }
        });

        // Damping
        node.vx *= 0.85;
        node.vy *= 0.85;

        // Update position
        node.x += node.vx;
        node.y += node.vy;
      });

      // Render
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      // Draw links
      links.forEach((link) => {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);
        if (!source || !target) return;

        const sx = source.x + centerX;
        const sy = source.y + centerY;
        const tx = target.x + centerX;
        const ty = target.y + centerY;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = "rgba(100, 116, 139, 0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach((node) => {
        const x = node.x + centerX;
        const y = node.y + centerY;
        const radius = node.size;

        // Glow for main wallet
        if (node.isMainWallet) {
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
          gradient.addColorStop(0, "rgba(153, 69, 255, 0.4)");
          gradient.addColorStop(1, "rgba(153, 69, 255, 0)");
          ctx.beginPath();
          ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Border
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = node.isMainWallet ? "#fff" : "rgba(255,255,255,0.2)";
        ctx.lineWidth = node.isMainWallet ? 2 : 1;
        ctx.stroke();

        // Label for main wallet and tokens
        if (node.label && (node.isMainWallet || node.tokenSymbol)) {
          ctx.font = `${node.isMainWallet ? "14px" : "11px"} system-ui, sans-serif`;
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.fillText(node.label, x, y - radius - 6);
        }
      });

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [nodes, links, simulationRunning, mounted]);

  // Handle canvas resize
  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = Math.max(400, rect.width * 0.6);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [mounted]);

  if (!mounted) {
    // Return skeleton/placeholder during SSR to avoid hydration mismatch
    return (
      <div className="bg-solana-card rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-semibold text-white">Token Holder Map</h3>
          <div className="flex items-center gap-3 text-xs text-white/50">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-solana-purple"></span> Your Wallet</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-solana-blue"></span> SPL Token</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-solana-green"></span> Token-2022</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-risk-critical"></span> Suspicious</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500"></span> Other Holders</span>
          </div>
        </div>
        <div className="relative" style={{ height: "450px" }}>
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <div className="text-center">
              <div className="w-12 h-12 border-3 border-solana-purple/30 border-t-solana-blue rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white/50 text-sm">Initializing visualization...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (significantTokens.length === 0) {
    return (
      <div className="bg-solana-card rounded-xl border border-white/10 p-8 text-center">
        <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12a5 5 0 0110 0 5 5 0 01-10 0zM12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
        </svg>
        <h3 className="text-lg font-medium text-white mb-2">No Token Data for Visualization</h3>
        <p className="text-white/50">This wallet holds no SPL or Token-2022 tokens to display.</p>
      </div>
    );
  }

  return (
    <div className="bg-solana-card rounded-xl border border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-semibold text-white">Token Holder Map</h3>
        <div className="flex items-center gap-3 text-xs text-white/50">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-solana-purple"></span> Your Wallet</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-solana-blue"></span> SPL Token</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-solana-green"></span> Token-2022</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-risk-critical"></span> Suspicious</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500"></span> Other Holders</span>
        </div>
      </div>
      <div className="relative" style={{ height: "450px" }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: "block" }}
        />
      </div>
      <div className="p-4 border-t border-white/10 text-sm text-white/60">
        <p>Force-directed graph showing your wallet (center) connected to token holdings and simulated holder clusters. Bubble size reflects relative balance. This is a visualization aid — not real-time holder data.</p>
      </div>
    </div>
  );
}