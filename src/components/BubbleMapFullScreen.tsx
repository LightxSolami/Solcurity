"use client";

import { useEffect, useRef, useState } from "react";
import { TokenInfo } from "@/lib/types";
import { PublicKey } from "@solana/web3.js";

// Client-side RPC endpoints for fallback
const CLIENT_RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-mainnet.g.alchemy.com/v2/demo",
  "https://rpc.ankr.com/solana",
  "https://solana.drpc.org",
];

async function fetchWithRetry<T>(
  operation: (connection: { getParsedTokenAccountsByOwner: any; getParsedAccountInfo: any }) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const endpoint = CLIENT_RPC_ENDPOINTS[attempt % CLIENT_RPC_ENDPOINTS.length];
    const connection = { 
      getParsedTokenAccountsByOwner: async (pubkey: PublicKey, config: any) => {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getTokenAccountsByOwner",
            params: [
              pubkey.toBase58(),
              { programId: config.programId.toBase58() },
              { encoding: "jsonParsed" }
            ]
          }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return { value: data.result.value };
      },
      getParsedAccountInfo: async (pubkey: PublicKey) => {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getAccountInfo",
            params: [
              pubkey.toBase58(),
              { encoding: "jsonParsed" }
            ]
          }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return { value: data.result.value };
      }
    };

    try {
      return await operation(connection);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      // Check if it's a rate limit or 403 error
      const isRateLimited = lastError.message.includes("429") || 
                           lastError.message.includes("403") || 
                           lastError.message.includes("rate limit") ||
                           lastError.message.includes("Too Many Requests") ||
                           lastError.message.includes("Access forbidden");
      
      if (isRateLimited && attempt < maxRetries) {
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }
      
      if (attempt === maxRetries) break;
    }
  }

  throw lastError || new Error("RPC operation failed after retries");
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
  mintAddress?: string;
  balance?: number;
  isToken2022?: boolean;
  suspicious?: boolean;
}

interface Link {
  source: string;
  target: string;
  value: number;
}

interface BubbleMapFullScreenProps {
  address: string;
}

export function BubbleMapFullScreen({ address }: BubbleMapFullScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch real token data
  useEffect(() => {
    async function fetchTokens() {
      try {
        const { PublicKey } = await import("@solana/web3.js");
        const pubkey = new PublicKey(address);

        const allTokens = await fetchWithRetry(async (connection) => {
          const [splResponse, t2022Response] = await Promise.all([
            connection.getParsedTokenAccountsByOwner(pubkey, {
              programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
            }),
            connection.getParsedTokenAccountsByOwner(pubkey, {
              programId: new PublicKey("TokenzQdBNbLqP5VEh89ASGF8P25BN8cGxqZ"),
            }),
          ]);

          const allTokens: TokenInfo[] = [];

          const processAccounts = async (accounts: { value: any[] }, is2022: boolean) => {
            for (const account of accounts.value) {
              const parsed = account.account.data.parsed?.info;
              if (!parsed) continue;

              const mintAddress = parsed.mint;
              const uiAmount = parsed.tokenAmount?.uiAmount ?? 0;

              if (uiAmount === 0) continue;

              let mintAuthorityActive: boolean | undefined;
              let freezeAuthorityActive: boolean | undefined;
              const riskIndicators: string[] = [];

              try {
                const mintInfo = await connection.getParsedAccountInfo(new PublicKey(mintAddress));
                if (mintInfo.value?.data && "parsed" in mintInfo.value.data) {
                  const mintData = mintInfo.value.data.parsed?.info;
                  if (mintData) {
                    mintAuthorityActive = !!mintData.mintAuthority;
                    freezeAuthorityActive = !!mintData.freezeAuthority;
                  }
                }
              } catch {}

              if (mintAuthorityActive) riskIndicators.push("Active mint authority");
              if (freezeAuthorityActive) riskIndicators.push("Active freeze authority");

              allTokens.push({
                symbol: "UNKNOWN",
                name: "Unknown Token",
                mintAddress,
                balance: parsed.tokenAmount?.amount?.toString() || "0",
                decimals: parsed.tokenAmount?.decimals || 0,
                uiAmount,
                mintAuthorityActive,
                freezeAuthorityActive,
                isToken2022: is2022,
                suspicious: riskIndicators.length > 0,
                riskIndicators,
              });
            }
          };

          await processAccounts(splResponse, false);
          await processAccounts(t2022Response, true);

          return allTokens;
        });

        setTokens(allTokens);
      } catch (err) {
        setError("Failed to load token data. The public RPC endpoint may be rate limited.");
      } finally {
        setLoading(false);
      }
    }

    fetchTokens();
  }, [address]);

  // Initialize simulation when tokens load
  useEffect(() => {
    if (!mounted || loading || tokens.length === 0) return;

    const significantTokens = tokens.filter((t) => t.uiAmount > 0);
    if (significantTokens.length === 0) return;

    const newNodes: Node[] = [];
    const newLinks: Link[] = [];

    // Main wallet
    newNodes.push({
      id: address,
      label: "You",
      size: 45,
      color: "#9945FF",
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      isMainWallet: true,
    });

    significantTokens.slice(0, 12).forEach((token, i) => {
      const angle = (i / Math.max(1, significantTokens.length)) * Math.PI * 2;
      const radius = 200 + Math.random() * 80;

      const tokenNode: Node = {
        id: token.mintAddress,
        label: token.symbol,
        size: Math.max(25, Math.min(60, 18 + Math.log10(token.uiAmount + 1) * 10)),
        color: token.suspicious ? "#ef4444" : token.isToken2022 ? "#14F195" : "#3b82f6",
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        isMainWallet: false,
        tokenSymbol: token.symbol,
        mintAddress: token.mintAddress,
        balance: token.uiAmount,
        isToken2022: token.isToken2022,
        suspicious: token.suspicious,
      };
      newNodes.push(tokenNode);

      newLinks.push({
        source: address,
        target: token.mintAddress,
        value: token.uiAmount,
      });

      // Simulated holders
      const holderCount = Math.min(8, Math.floor(token.uiAmount / 500) + 2);
      for (let h = 0; h < holderCount; h++) {
        const holderAngle = angle + (Math.random() - 0.5) * 1;
        const holderRadius = radius + 70 + Math.random() * 60;
        const holderId = `${token.mintAddress}_holder_${h}`;

        newNodes.push({
          id: holderId,
          label: "",
          size: Math.max(10, Math.min(22, 8 + Math.random() * 12)),
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
  }, [tokens, loading, address, mounted]);

  // Force-directed simulation with mouse interaction
  useEffect(() => {
    if (!mounted || !simulationRunning || nodes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let mouseX = 0;
    let mouseY = 0;
    let hoveredNode: Node | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left - rect.width / 2;
      mouseY = e.clientY - rect.top - rect.height / 2;
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left - rect.width / 2;
      const clickY = e.clientY - rect.top - rect.height / 2;

      // Find clicked node
      for (const node of nodes) {
        const dx = (node.x - clickX);
        const dy = (node.y - clickY);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < node.size && node.mintAddress) {
          // Open token on Solscan
          window.open(`https://solscan.io/token/${node.mintAddress}`, "_blank");
          break;
        }
      }
    };

    canvas.addEventListener("click", handleClick);
    canvas.style.cursor = "crosshair";

    const tick = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      hoveredNode = null;

      // Apply forces
      nodes.forEach((node) => {
        if (node.isMainWallet) {
          // Strong attraction to center
          node.vx += (centerX - (node.x + centerX)) * 0.06;
          node.vy += (centerY - (node.y + centerY)) * 0.06;
        } else {
          // Weak attraction to center
          node.vx += (centerX - (node.x + centerX)) * 0.008;
          node.vy += (centerY - (node.y + centerY)) * 0.008;
        }

        // Mouse attraction/repulsion
        const dxMouse = node.x - mouseX;
        const dyMouse = node.y - mouseY;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse) || 1;
        if (distMouse < 150) {
          const force = (150 - distMouse) * 0.02;
          node.vx += (dxMouse / distMouse) * force;
          node.vy += (dyMouse / distMouse) * force;
        }

        // Repulsion between nodes
        nodes.forEach((other) => {
          if (node.id === other.id) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (node.size + other.size) * 300 / (dist * dist);
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
            node.vx += (dx / dist) * 0.04;
            node.vy += (dy / dist) * 0.04;
          } else if (node.id === link.target) {
            const dx = source.x - target.x;
            const dy = source.y - target.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            node.vx += (dx / dist) * 0.04;
            node.vy += (dy / dist) * 0.04;
          }
        });

        // Damping
        node.vx *= 0.88;
        node.vy *= 0.88;

        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Check hover
        const dxHover = node.x - mouseX;
        const dyHover = node.y - mouseY;
        const distHover = Math.sqrt(dxHover * dxHover + dyHover * dyHover);
        if (distHover < node.size + 5) {
          hoveredNode = node;
        }
      });

      // Render
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
        const isMainLink = source.isMainWallet || target.isMainWallet;
        ctx.strokeStyle = isMainLink ? "rgba(153, 69, 255, 0.3)" : "rgba(100, 116, 139, 0.2)";
        ctx.lineWidth = isMainLink ? 1.5 : 1;
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach((node) => {
        const x = node.x + centerX;
        const y = node.y + centerY;
        const radius = node.size;
        const isHovered = hoveredNode?.id === node.id;

        // Glow for main wallet
        if (node.isMainWallet) {
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.5);
          gradient.addColorStop(0, "rgba(153, 69, 255, 0.4)");
          gradient.addColorStop(1, "rgba(153, 69, 255, 0)");
          ctx.beginPath();
          ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Pulse for hovered
        const drawRadius = isHovered ? radius * 1.15 : radius;

        // Node circle
        ctx.beginPath();
        ctx.arc(x, y, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Border
        ctx.beginPath();
        ctx.arc(x, y, drawRadius, 0, Math.PI * 2);
        ctx.strokeStyle = node.isMainWallet ? "#fff" : isHovered ? "#14F195" : "rgba(255,255,255,0.15)";
        ctx.lineWidth = node.isMainWallet ? 3 : isHovered ? 3 : 1;
        ctx.stroke();

        // Label for main wallet and tokens
        if (node.label && (node.isMainWallet || node.tokenSymbol)) {
          ctx.font = `${node.isMainWallet ? "16px" : "12px"} system-ui, sans-serif`;
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.fillText(node.label, x, y - drawRadius - 8);
        }

        // Token info on hover
        if (isHovered && node.mintAddress && node.balance !== undefined) {
          const infoY = y + drawRadius + 20;
          ctx.font = "11px system-ui, sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.textAlign = "center";
          ctx.fillText(`${node.tokenSymbol}: ${node.balance.toLocaleString()}`, x, infoY);
          if (node.isToken2022) {
            ctx.fillText("Token-2022", x, infoY + 14);
          }
          if (node.suspicious) {
            ctx.fillStyle = "#ef4444";
            ctx.fillText("⚠ Suspicious", x, infoY + 28);
          }
        }
      });

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
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
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-solana-dark">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-solana-purple/30 border-t-solana-blue rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-lg">Loading visualization...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-solana-dark">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-solana-purple/30 border-t-solana-blue rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-lg">Loading token data...</p>
          <p className="text-white/40 text-sm mt-2">Fetching on-chain token accounts</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-solana-dark">
        <div className="text-center p-8">
          <svg className="w-16 h-16 mx-auto text-risk-critical mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-risk-critical text-lg">{error}</p>
          <p className="text-white/50 mt-2">The public RPC endpoint may be rate limited.</p>
        </div>
      </div>
    );
  }

  const significantTokens = tokens.filter((t) => t.uiAmount > 0);

  if (significantTokens.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-solana-dark">
        <div className="text-center p-8">
          <svg className="w-24 h-24 mx-auto text-white/20 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12a5 5 0 0110 0 5 5 0 01-10 0zM12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
          </svg>
          <h2 className="text-2xl font-bold text-white mb-3">No Tokens to Visualize</h2>
          <p className="text-white/50 mb-6">This wallet holds no SPL or Token-2022 tokens.</p>
          <a href={`/scan?address=${address}`} target="_top" className="text-solana-blue hover:underline">View Full Report</a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 bg-solana-dark">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block", touchAction: "none" }}
      />

      {/* Legend */}
      <div className="absolute bottom-6 left-6 right-6 md:left-6 md:right-auto md:w-64">
        <div className="bg-solana-card/95 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Legend
          </h3>
          <div className="space-y-2 text-sm">
            <LegendItem color="#9945FF" label="Your Wallet" />
            <LegendItem color="#3b82f6" label="SPL Token" />
            <LegendItem color="#14F195" label="Token-2022" />
            <LegendItem color="#ef4444" label="Suspicious Token" />
            <LegendItem color="#64748b" label="Other Holders" />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-6 right-6 md:left-auto md:right-6 md:w-80">
        <div className="bg-solana-card/95 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">Controls</h3>
          <div className="space-y-1 text-xs text-white/60">
            <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-white/10 rounded">Drag</kbd><span>Pan view</span></div>
            <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-white/10 rounded">Scroll</kbd><span>Zoom</span></div>
            <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-white/10 rounded">Click</kbd><span>Open token on Solscan</span></div>
            <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-white/10 rounded">Hover</kbd><span>Token details</span></div>
          </div>
        </div>
      </div>

      {/* Token count badge */}
      <div className="absolute top-6 left-6">
        <div className="bg-solana-card/95 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-solana-purple/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12a5 5 0 0110 0 5 5 0 01-10 0zM12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold">{significantTokens.length} Tokens</p>
              <p className="text-white/50 text-xs">Holders visualized</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-white/70">{label}</span>
    </div>
  );
}