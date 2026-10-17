"use client";

import { useEffect, useRef, useState } from "react";
import { PublicKey } from "@solana/web3.js";

// Client-side RPC endpoints for fallback
const CLIENT_RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-mainnet.g.alchemy.com/v2/demo",
  "https://rpc.ankr.com/solana",
  "https://solana.drpc.org",
];

interface RocketMapFullScreenProps {
  address: string;
}

interface RocketNode {
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

interface RocketLink {
  source: string;
  target: string;
  value: number;
}

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
      
      const isRateLimited = lastError.message.includes("429") || 
                           lastError.message.includes("403") || 
                           lastError.message.includes("rate limit") ||
                           lastError.message.includes("Too Many Requests") ||
                           lastError.message.includes("Access forbidden");
      
      if (isRateLimited && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }
      
      if (attempt === maxRetries) break;
    }
  }

  throw lastError || new Error("RPC operation failed after retries");
}

interface RocketMapFullScreenProps {
  address: string;
}

export function RocketMapFullScreen({ address }: RocketMapFullScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rockets, setRockets] = useState<RocketNode[]>([]);
  const [links, setLinks] = useState<RocketLink[]>([]);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Google Maps-like viewport state
  const [viewport, setViewport] = useState({
    x: 0,
    y: 0,
    zoom: 1,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredRocket, setHoveredRocket] = useState<RocketNode | null>(null);
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

          const allTokens: any[] = [];

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

    const significantTokens = tokens.filter((t: any) => t.uiAmount > 0);
    if (significantTokens.length === 0) return;

    const newRockets: RocketNode[] = [];
    const newLinks: RocketLink[] = [];

    // Main wallet = Mission Control
    newRockets.push({
      id: address,
      label: "Mission Control",
      size: 50,
      color: "#9945FF",
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      isMainWallet: true,
    });

    // Token rockets orbiting mission control
    significantTokens.slice(0, 12).forEach((token: any, i: number) => {
      const angle = (i / Math.max(1, significantTokens.length)) * Math.PI * 2;
      const radius = 250 + Math.random() * 100;

      const rocketNode: RocketNode = {
        id: token.mintAddress,
        label: token.symbol,
        size: Math.max(30, Math.min(70, 20 + Math.log10(token.uiAmount + 1) * 12)),
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
      newRockets.push(rocketNode);

      newLinks.push({
        source: address,
        target: token.mintAddress,
        value: token.uiAmount,
      });

      // Simulated holder rockets
      const holderCount = Math.min(6, Math.floor(token.uiAmount / 500) + 2);
      for (let h = 0; h < holderCount; h++) {
        const holderAngle = angle + (Math.random() - 0.5) * 1.2;
        const holderRadius = radius + 80 + Math.random() * 80;
        const holderId = `${token.mintAddress}_holder_${h}`;

        newRockets.push({
          id: holderId,
          label: "",
          size: Math.max(12, Math.min(25, 10 + Math.random() * 15)),
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

    setRockets(newRockets);
    setLinks(newLinks);
    setSimulationRunning(true);
  }, [tokens, loading, address, mounted]);

  // Google Maps-like viewport controls
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0 || e.button === 1) { // Left or middle click
      setIsDragging(true);
      setDragStart({
        x: e.clientX - viewport.x,
        y: e.clientY - viewport.y,
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    if (isDragging) {
      setViewport(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    } else {
      // Check hover
      const worldX = (canvasX - viewport.x) / viewport.zoom;
      const worldY = (canvasY - viewport.y) / viewport.zoom;
      
      let found: RocketNode | null = null;
      for (const rocket of rockets) {
        const dx = rocket.x - worldX;
        const dy = rocket.y - worldY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < (rocket.size / viewport.zoom) + 10) {
          found = rocket;
          break;
        }
      }
      setHoveredRocket(found);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(3, viewport.zoom * zoomFactor));

    // Zoom towards mouse position
    setViewport(prev => ({
      x: canvasX - (canvasX - prev.x) * (newZoom / prev.zoom),
      y: canvasY - (canvasY - prev.y) * (newZoom / prev.zoom),
      zoom: newZoom,
    }));
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    // Quick zoom in on double-click
    setViewport(prev => ({
      x: canvasX - (canvasX - prev.x) * 1.5,
      y: canvasY - (canvasY - prev.y) * 1.5,
      zoom: Math.min(2.5, prev.zoom * 1.5),
    }));
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const worldX = (canvasX - viewport.x) / viewport.zoom;
    const worldY = (canvasY - viewport.y) / viewport.zoom;

    // Find clicked rocket
    for (const rocket of rockets) {
      const dx = rocket.x - worldX;
      const dy = rocket.y - worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < (rocket.size / viewport.zoom) + 5 && rocket.mintAddress) {
        window.open(`https://solscan.io/token/${rocket.mintAddress}`, "_blank");
        break;
      }
    }
  };

  // Touch support for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - viewport.x,
        y: touch.clientY - viewport.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDragging) {
      e.preventDefault();
      const touch = e.touches[0];
      setViewport(prev => ({
        ...prev,
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      }));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Force-directed simulation
  useEffect(() => {
    if (!mounted || !simulationRunning || rockets.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tick = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      const nodeMap = new Map(rockets.map((n) => [n.id, n]));

      // Apply forces
      rockets.forEach((rocket) => {
        if (rocket.isMainWallet) {
          // Strong attraction to center
          rocket.vx += (centerX - (rocket.x + centerX)) * 0.05;
          rocket.vy += (centerY - (rocket.y + centerY)) * 0.05;
        } else {
          // Weak attraction to center
          rocket.vx += (centerX - (rocket.x + centerX)) * 0.005;
          rocket.vy += (centerY - (rocket.y + centerY)) * 0.005;
        }

        // Orbital velocity for token rockets (creates rotation)
        if (!rocket.isMainWallet && rocket.tokenSymbol && !rocket.id.includes("_holder_")) {
          const dx = rocket.x;
          const dy = rocket.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          // Perpendicular force for orbit
          const orbitalForce = 0.3 / Math.max(1, dist / 100);
          rocket.vx += (-dy / dist) * orbitalForce;
          rocket.vy += (dx / dist) * orbitalForce;
        }

        // Repulsion between rockets
        rockets.forEach((other) => {
          if (rocket.id === other.id) return;
          const dx = rocket.x - other.x;
          const dy = rocket.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (rocket.size + other.size) * 400 / (dist * dist);
          rocket.vx += (dx / dist) * force * 0.01;
          rocket.vy += (dy / dist) * force * 0.01;
        });

        // Link attraction
        links.forEach((link) => {
          const source = nodeMap.get(link.source);
          const target = nodeMap.get(link.target);
          if (!source || !target) return;

          if (rocket.id === link.source) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            rocket.vx += (dx / dist) * 0.03;
            rocket.vy += (dy / dist) * 0.03;
          } else if (rocket.id === link.target) {
            const dx = source.x - target.x;
            const dy = source.y - target.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            rocket.vx += (dx / dist) * 0.03;
            rocket.vy += (dy / dist) * 0.03;
          }
        });

        // Damping
        rocket.vx *= 0.92;
        rocket.vy *= 0.92;

        // Update position
        rocket.x += rocket.vx;
        rocket.y += rocket.vy;
      });

      // Render
      ctx.clearRect(0, 0, width, height);

      // Draw orbital paths for token rockets (visual guide)
      ctx.strokeStyle = "rgba(153, 69, 255, 0.05)";
      ctx.lineWidth = 1;
      rockets.forEach((rocket) => {
        if (!rocket.isMainWallet && rocket.tokenSymbol && !rocket.id.includes("_holder_")) {
          const dist = Math.sqrt(rocket.x * rocket.x + rocket.y * rocket.y);
          ctx.beginPath();
          ctx.arc(centerX, centerY, dist, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Draw links (supply lines)
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
        ctx.strokeStyle = isMainLink ? "rgba(153, 69, 255, 0.3)" : "rgba(100, 116, 139, 0.15)";
        ctx.lineWidth = isMainLink ? 2 : 1;
        ctx.setLineDash(isMainLink ? [10, 5] : [5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw mission control glow
      const mainRocket = rockets.find(r => r.isMainWallet);
      if (mainRocket) {
        const mx = mainRocket.x + centerX;
        const my = mainRocket.y + centerY;
        const mRadius = mainRocket.size;
        
        // Pulsing glow
        const pulse = (Math.sin(Date.now() / 500) + 1) / 2;
        const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, mRadius * 3);
        gradient.addColorStop(0, `rgba(153, 69, 255, ${0.3 + pulse * 0.2})`);
        gradient.addColorStop(0.5, `rgba(20, 241, 149, ${0.1 + pulse * 0.1})`);
        gradient.addColorStop(1, "rgba(153, 69, 255, 0)");
        ctx.beginPath();
        ctx.arc(mx, my, mRadius * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Rotating ring
        const ringAngle = (Date.now() / 2000) % (Math.PI * 2);
        ctx.beginPath();
        ctx.arc(mx, my, mRadius * 1.8, ringAngle, ringAngle + Math.PI * 1.5);
        ctx.strokeStyle = `rgba(20, 241, 149, ${0.4 + pulse * 0.3})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Inner ring opposite direction
        ctx.beginPath();
        ctx.arc(mx, my, mRadius * 2.3, -ringAngle, -ringAngle + Math.PI * 1.2);
        ctx.strokeStyle = `rgba(153, 69, 255, ${0.3 + pulse * 0.2})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw rockets
      rockets.forEach((rocket) => {
        const x = rocket.x + centerX;
        const y = rocket.y + centerY;
        const baseSize = rocket.size;
        const drawSize = baseSize / viewport.zoom;
        const isHovered = hoveredRocket?.id === rocket.id;

        // Skip if off-screen (with margin)
        if (x < -drawSize - 50 || x > width + drawSize + 50 || y < -drawSize - 50 || y > height + drawSize + 50) {
          return;
        }

        // Thruster particles for non-main rockets
        if (!rocket.isMainWallet && (rocket.vx !== 0 || rocket.vy !== 0)) {
          const speed = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
          const particleCount = Math.min(3, Math.max(1, Math.floor(speed * 2)));
          
          for (let p = 0; p < particleCount; p++) {
            const angle = Math.atan2(rocket.vy, rocket.vx) + Math.PI + (Math.random() - 0.5) * 0.5;
            const px = x - Math.cos(angle) * (drawSize + Math.random() * 20);
            const py = y - Math.sin(angle) * (drawSize + Math.random() * 20);
            const psize = Math.max(1, drawSize * 0.15 * Math.random());
            
            ctx.beginPath();
            ctx.arc(px, py, psize, 0, Math.PI * 2);
            ctx.fillStyle = rocket.suspicious ? `rgba(239, 68, 68, ${0.5 - p * 0.1})` : 
                           rocket.isToken2022 ? `rgba(20, 241, 149, ${0.5 - p * 0.1})` :
                           `rgba(59, 130, 246, ${0.5 - p * 0.1})`;
            ctx.fill();
          }
        }

        // Rocket body
        const rocketAngle = Math.atan2(rocket.vy, rocket.vx) || 0;
        const cos = Math.cos(rocketAngle);
        const sin = Math.sin(rocketAngle);
        
        // Main body
        const bodyLength = drawSize * (rocket.isMainWallet ? 0.8 : 1.2);
        const bodyWidth = drawSize * 0.6;
        
        // Rocket shape (triangle)
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rocketAngle - Math.PI / 2); // Point in direction of velocity
        
        // Rocket glow
        if (rocket.isMainWallet) {
          const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, drawSize * 2);
          glowGrad.addColorStop(0, "rgba(153, 69, 255, 0.4)");
          glowGrad.addColorStop(1, "rgba(153, 69, 255, 0)");
          ctx.beginPath();
          ctx.arc(0, 0, drawSize * 2, 0, Math.PI * 2);
          ctx.fillStyle = glowGrad;
          ctx.fill();
        }

        // Rocket body
        ctx.beginPath();
        ctx.moveTo(0, -bodyLength / 2); // Nose
        ctx.lineTo(-bodyWidth / 2, bodyLength / 2); // Left fin
        ctx.lineTo(-bodyWidth / 4, bodyLength / 3); // Left body
        ctx.lineTo(-bodyWidth / 4, bodyLength / 2); // Left engine
        ctx.lineTo(bodyWidth / 4, bodyLength / 2); // Right engine
        ctx.lineTo(bodyWidth / 4, bodyLength / 3); // Right body
        ctx.lineTo(bodyWidth / 2, bodyLength / 2); // Right fin
        ctx.closePath();
        
        ctx.fillStyle = rocket.color;
        ctx.fill();
        
        // Rocket outline
        ctx.strokeStyle = isHovered ? "#14F195" : (rocket.isMainWallet ? "#fff" : "rgba(255,255,255,0.2)");
        ctx.lineWidth = rocket.isMainWallet ? 2 : (isHovered ? 3 : 1);
        ctx.stroke();

        // Cockpit/window
        ctx.beginPath();
        ctx.ellipse(0, -bodyLength / 6, bodyWidth / 5, bodyLength / 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(100, 200, 255, 0.6)";
        ctx.fill();

        // Engine glow
        if (!rocket.isMainWallet && (rocket.vx !== 0 || rocket.vy !== 0)) {
          const engineGlow = ctx.createRadialGradient(0, bodyLength / 2, 0, 0, bodyLength / 2, bodyWidth / 2);
          engineGlow.addColorStop(0, rocket.suspicious ? "rgba(239, 68, 68, 1)" : 
                                   rocket.isToken2022 ? "rgba(20, 241, 149, 1)" : "rgba(59, 130, 246, 1)");
          engineGlow.addColorStop(1, "rgba(255,255,255,0)");
          ctx.beginPath();
          ctx.ellipse(0, bodyLength * 0.7, bodyWidth / 3, bodyLength / 4, 0, 0, Math.PI * 2);
          ctx.fillStyle = engineGlow;
          ctx.fill();
        }

        // Label
        if (rocket.label && (rocket.isMainWallet || rocket.tokenSymbol)) {
          ctx.font = `${rocket.isMainWallet ? "14px" : "11px"} system-ui, sans-serif`;
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.fillText(rocket.label, 0, bodyLength / 2 + 18 / viewport.zoom);
        }

        ctx.restore();
      });

      // Draw hovered rocket info panel
      if (hoveredRocket && hoveredRocket.mintAddress && hoveredRocket.balance !== undefined) {
        const hx = hoveredRocket.x + centerX;
        const hy = hoveredRocket.y + centerY;
        const hSize = (hoveredRocket.size / viewport.zoom);
        
        const panelX = hx + hSize + 15;
        const panelY = hy - hSize - 10;
        
        ctx.font = "11px system-ui, sans-serif";
        ctx.textAlign = "left";
        
        const lines = [
          `${hoveredRocket.tokenSymbol}: ${hoveredRocket.balance.toLocaleString()}`,
          hoveredRocket.isToken2022 ? "Token-2022" : "SPL Token",
        ];
        if (hoveredRocket.suspicious) {
          lines.push("⚠ Suspicious - Review recommended");
        }
        
        const lineHeight = 16;
        const panelWidth = 200;
        const panelHeight = lines.length * lineHeight + 12;
        
        // Panel background
        ctx.fillStyle = "rgba(17, 17, 51, 0.95)";
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
        ctx.fill();
        ctx.strokeStyle = hoveredRocket.suspicious ? "#ef4444" : "#3b82f6";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        lines.forEach((line, i) => {
          ctx.fillStyle = hoveredRocket.suspicious && i === lines.length - 1 ? "#ef4444" : "#fff";
          ctx.fillText(line, panelX + 10, panelY + 10 + i * lineHeight);
        });
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [rockets, links, simulationRunning, mounted, viewport]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canvasRef.current) return;
      // Only handle shortcuts when canvas is focused or hovered
      // (we skip the rect check for KeyboardEvent which doesn't have clientX/clientY)

      const zoomStep = 0.2;
      const panStep = 100 / viewport.zoom;

      switch (e.key) {
        case "+":
        case "=":
          e.preventDefault();
          setViewport(prev => ({ ...prev, zoom: Math.min(3, prev.zoom + zoomStep) }));
          break;
        case "-":
        case "_":
          e.preventDefault();
          setViewport(prev => ({ ...prev, zoom: Math.max(0.3, prev.zoom - zoomStep) }));
          break;
        case "0":
          e.preventDefault();
          setViewport({ x: 0, y: 0, zoom: 1 });
          break;
        case "ArrowUp":
          e.preventDefault();
          setViewport(prev => ({ ...prev, y: prev.y + panStep }));
          break;
        case "ArrowDown":
          e.preventDefault();
          setViewport(prev => ({ ...prev, y: prev.y - panStep }));
          break;
        case "ArrowLeft":
          e.preventDefault();
          setViewport(prev => ({ ...prev, x: prev.x + panStep }));
          break;
        case "ArrowRight":
          e.preventDefault();
          setViewport(prev => ({ ...prev, x: prev.x - panStep }));
          break;
        case "r":
        case "R":
          e.preventDefault();
          setViewport({ x: 0, y: 0, zoom: 1 });
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewport]);

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-solana-dark">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-solana-purple/30 border-t-solana-blue rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-lg">Initializing Rocket Map...</p>
          <p className="text-white/40 text-sm mt-2">Preparing mission control</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-solana-dark">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="w-20 h-20 border-4 border-solana-purple/30 border-t-solana-blue rounded-full animate-spin" />
            <div className="absolute inset-4 border-4 border-solana-blue/30 border-t-solana-purple rounded-full animate-spin-reverse" />
          </div>
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
          <div className="w-20 h-20 mx-auto mb-4 relative">
            <svg className="w-full h-full text-risk-critical" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-risk-critical text-lg mb-2">Mission Control Offline</p>
          <p className="text-white/50 mb-4">{error}</p>
          <p className="text-white/40 text-sm">Public RPC endpoints are rate limited. Try again in a moment.</p>
        </div>
      </div>
    );
  }

  const significantTokens = tokens.filter((t: any) => t.uiAmount > 0);

  if (significantTokens.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-solana-dark">
        <div className="text-center p-8">
          <svg className="w-24 h-24 mx-auto text-white/20 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-2xl font-bold text-white mb-3">No Payload to Launch</h2>
          <p className="text-white/50 mb-6">This wallet holds no SPL or Token-2022 tokens.</p>
          <a href={`/scan?address=${address}`} target="_top" className="inline-flex items-center gap-2 px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl hover:bg-solana-purple/30 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            View Full Report
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 bg-solana-dark">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block", touchAction: "none", cursor: isDragging ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Mission Control Header */}
      <div className="absolute top-4 left-4 right-4 md:left-4 md:right-auto md:w-72">
        <div className="bg-solana-card/95 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-solana-purple to-solana-blue flex items-center justify-center animate-pulse">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-white">Mission Control</h3>
              <p className="text-white/50 text-xs font-mono">{address.slice(0, 8)}...{address.slice(-6)}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white/5 rounded-lg">
              <p className="text-white font-bold text-lg">{significantTokens.length}</p>
              <p className="text-white/50 text-xs">Token Rockets</p>
            </div>
            <div className="p-2 bg-white/5 rounded-lg">
              <p className="text-white font-bold text-lg">{rockets.filter(r => !r.isMainWallet && !r.id.includes("_holder_")).length}</p>
              <p className="text-white/50 text-xs">Active Launches</p>
            </div>
            <div className="p-2 bg-white/5 rounded-lg">
              <p className="text-white font-bold text-lg">{rockets.filter(r => r.id.includes("_holder_")).length}</p>
              <p className="text-white/50 text-xs">Orbiting Holders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 md:left-auto md:right-4 md:top-4">
        <div className="bg-solana-card/95 backdrop-blur-sm border border-white/10 rounded-xl p-2 flex flex-col gap-1">
          <button
            onClick={() => setViewport(prev => ({ ...prev, zoom: Math.min(3, prev.zoom + 0.2) }))}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
            aria-label="Zoom in"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button
            onClick={() => setViewport(prev => ({ ...prev, zoom: Math.max(0.3, prev.zoom - 0.2) }))}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
            aria-label="Zoom out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button
            onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
            aria-label="Reset view"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute bottom-4 left-4 md:left-4 md:bottom-4 md:w-56">
        <div className="bg-solana-card/95 backdrop-blur-sm border border-white/10 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-xs">Zoom Level</span>
            <span className="text-solana-blue font-mono text-sm">{Math.round(viewport.zoom * 100)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-solana-purple to-solana-blue rounded-full transition-all duration-300"
              style={{ width: `${((viewport.zoom - 0.3) / 2.7) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/40 mt-1">
            <span>0.3x</span>
            <span>1x</span>
            <span>3x</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 md:left-auto md:right-4 md:bottom-4 md:w-56">
        <div className="bg-solana-card/95 backdrop-blur-sm border border-white/10 rounded-xl p-3">
          <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Legend
          </h3>
          <div className="space-y-1.5 text-xs">
            <LegendItem color="#9945FF" label="Mission Control" icon={<MissionIcon />} />
            <LegendItem color="#3b82f6" label="SPL Token Rocket" icon={<RocketIcon />} />
            <LegendItem color="#14F195" label="Token-2022 Rocket" icon={<RocketIcon />} />
            <LegendItem color="#ef4444" label="Suspicious Rocket" icon={<RocketIcon />} />
            <LegendItem color="#64748b" label="Holder Drone" icon={<DroneIcon />} />
          </div>
        </div>
      </div>

      {/* Controls Help */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:-translate-x-0 md:right-4 md:w-80">
        <div className="bg-solana-card/95 backdrop-blur-sm border border-white/10 rounded-xl p-3">
          <h3 className="font-semibold text-white mb-2">Controls</h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-white/60">
            <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-white/10 rounded">Drag</kbd><span>Pan view</span></div>
            <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-white/10 rounded">Scroll</kbd><span>Zoom</span></div>
            <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-white/10 rounded">Double-click</kbd><span>Quick zoom</span></div>
            <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-white/10 rounded">Click Rocket</kbd><span>Open on Solscan</span></div>
            <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-white/10 rounded">+/-</kbd><span>Zoom in/out</span></div>
            <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-white/10 rounded">0</kbd><span>Reset view</span></div>
            <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-white/10 rounded">Arrows</kbd><span>Pan</span></div>
            <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-white/10 rounded">R</kbd><span>Reset</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, icon }: { color: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 flex items-center justify-center">
          <div className="w-4 h-4" style={{ backgroundColor: color, maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' d='M12 2L15 12h-6zM10 12v8h4v-8z'/%3E%3C/svg%3E")`, WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' d='M12 2L15 12h-6zM10 12v8h4v-8z'/%3E%3C/svg%3E")` }} />
        </div>
        <span className="text-white/70">{label}</span>
      </div>
    </div>
  );
}

function MissionIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
}
function RocketIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
}
function DroneIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>;
}