"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Connection as SolanaConnection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createSolanaConnection } from "@/lib/solana-rpc";

// Types
interface WalletNode {
  address: string;
  label?: string;
  x: number;
  y: number;
  z: number;
  type: "tracked" | "insider" | "whale" | "exchange" | "unknown" | "new" | "program";
  balance: number;
  volume24h: number;
  txCount: number;
  isInsider: boolean;
  connections: any[];
  lastActive: number;
  riskScore: number;
}

interface Connection {
  from: string;
  to: string;
  amount: number;
  token: string;
  timestamp: number;
  type: "buy" | "sell" | "transfer" | "swap";
}

interface InsiderWallet {
  address: string;
  confidence: number;
  reasons: string[];
  knownAddresses: string[];
  patterns: InsiderPattern[];
}

interface InsiderPattern {
  type: "coordinated_buy" | "coordinated_sell" | "sniping" | "wash_trading" | "front_running";
  timestamp: number;
  wallets: string[];
  token: string;
  profit?: number;
}

// Constants
const INITIAL_WALLETS: WalletNode[] = [
  { address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", label: "Whale #1", x: 0, y: 0, z: 0, type: "whale", balance: 12500, volume24h: 45000, txCount: 127, isInsider: false, connections: [], lastActive: Date.now(), riskScore: 15 },
  { address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", label: "Insider Cluster A", x: 150, y: 100, z: 50, type: "insider", balance: 8500, volume24h: 120000, txCount: 342, isInsider: true, connections: [], lastActive: Date.now() - 1000 * 60 * 5, riskScore: 95 },
  { address: "3vQB7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJos", label: "Exchange Hot Wallet", x: -200, y: -150, z: -20, type: "exchange", balance: 850000, volume24h: 2500000, txCount: 15420, isInsider: false, connections: [], lastActive: Date.now() - 1000 * 60 * 1, riskScore: 10 },
  { address: "8sP2qR5mN9vX4wY7zA1bC3dE6fG9hJ2kL5mN8pQ1rS", label: "Sniper Bot", x: 80, y: -120, z: 30, type: "insider", balance: 3200, volume24h: 85000, txCount: 567, isInsider: true, connections: [], lastActive: Date.now() - 1000 * 60 * 2, riskScore: 88 },
  { address: "4fG7hJ2kL5mN8pQ1rS4fG7hJ2kL5mN8pQ1rS4fG7h", label: "Whale #2", x: -180, y: 200, z: -10, type: "whale", balance: 45000, volume24h: 180000, txCount: 89, isInsider: false, connections: [], lastActive: Date.now() - 1000 * 60 * 15, riskScore: 22 },
  { address: "9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", label: "Insider Cluster B", x: -50, y: 180, z: 80, type: "insider", balance: 12000, volume24h: 220000, txCount: 567, isInsider: true, connections: [], lastActive: Date.now() - 1000 * 60 * 3, riskScore: 92 },
  { address: "2vQB7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJos", label: "New Token Creator", x: 220, y: -80, z: 40, type: "new", balance: 500, volume24h: 12000, txCount: 45, isInsider: true, connections: [], lastActive: Date.now() - 1000 * 60 * 10, riskScore: 75 },
  { address: "6sP2qR5mN9vX4wY7zA1bC3dE6fG9hJ2kL5mN8pQ1rS", label: "MEV Bot", x: 30, y: 30, z: 100, type: "insider", balance: 8000, volume24h: 340000, txCount: 1234, isInsider: true, connections: [], lastActive: Date.now() - 1000 * 60 * 1, riskScore: 90 },
];

const TOKEN_SYMBOLS = ["SOL", "USDC", "USDT", "BONK", "WIF", "JUP", "PYTH", "JTO", "RENDER", "ORCA", "RAY", "MNGO"];

function generateConnections() {
  const connections: any[] = [];
  const addresses = INITIAL_WALLETS.map(w => w.address);
  
  for (let i = 0; i < 50; i++) {
    const from = addresses[Math.floor(Math.random() * addresses.length)];
    const to = addresses[Math.floor(Math.random() * addresses.length)];
    if (from === to) continue;
    
    connections.push({
      from,
      to,
      amount: Math.random() * 10000 + 100,
      token: TOKEN_SYMBOLS[Math.floor(Math.random() * TOKEN_SYMBOLS.length)],
      timestamp: Date.now() - Math.random() * 1000 * 60 * 60 * 24,
      type: (Math.random() > 0.5 ? "buy" : Math.random() > 0.5 ? "sell" : "transfer") as "buy" | "sell" | "transfer",
    });
  }
  return connections;
}

const CONNECTIONS = generateConnections();

const INSIDERS = [
  {
    address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    confidence: 0.95,
    reasons: ["Coordinated buying with Cluster B", "Sniping new tokens within 1 block", "Shared funding source detected"],
    knownAddresses: ["9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", "8sP2qR5mN9vX4wY7zA1bC3dE6fG9hJ2kL5mN8pQ1rS"],
    patterns: [
      { type: "coordinated_buy", timestamp: Date.now() - 1000 * 60 * 60 * 2, wallets: ["7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", "9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"], token: "BONK", profit: 45000 },
      { type: "sniping", timestamp: Date.now() - 1000 * 60 * 30, wallets: ["7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"], token: "WIF" },
    ]
  },
  {
    address: "8sP2qR5mN9vX4wY7zA1bC3dE6fG9hJ2kL5mN8pQ1rS",
    confidence: 0.88,
    reasons: ["Sniping new token launches", "Consistently first buyer", "High win rate on new tokens"],
    knownAddresses: ["7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"],
    patterns: [
      { type: "sniping", timestamp: Date.now() - 1000 * 60 * 15, wallets: ["8sP2qR5mN9vX4wY7zA1bC3dE6fG9hJ2kL5mN8pQ1rS"], token: "NEW_TOKEN" },
    ]
  },
  {
    address: "6sP2qR5mN9vX4wY7zA1bC3dE6fG9hJ2kL5mN8pQ1rS",
    confidence: 0.90,
    reasons: ["MEV extraction detected", "Front-running large orders", "Gas optimization patterns"],
    knownAddresses: [],
    patterns: [
      { type: "front_running", timestamp: Date.now() - 1000 * 60 * 5, wallets: ["6sP2qR5mN9vX4wY7zA1bC3dE6fG9hJ2kL5mN8pQ1rS"], token: "SOL" },
      { type: "wash_trading", timestamp: Date.now() - 1000 * 60 * 60, wallets: ["6sP2qR5mN9vX4wY7zA1bC3dE6fG9hJ2kL5mN8pQ1rS"], token: "RAY" },
    ]
  },
];

// Helper functions
function getTypeColor(type: string) {
  switch (type) {
    case "insider": return "#ef4444";
    case "whale": return "#3b82f6";
    case "exchange": return "#22c55e";
    case "new": return "#f59e0b";
    case "program": return "#8b5cf6";
    default: return "#64748b";
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case "insider": return "INSIDER";
    case "whale": return "WHALE";
    case "exchange": return "EXCHANGE";
    case "new": return "NEW";
    case "program": return "PROGRAM";
    default: return "UNKNOWN";
  }
}

function truncateAddr(addr: string, start = 6, end = 4) {
  return `${addr.slice(0, start)}...${addr.slice(-end)}`;
}

function formatNumber(num: number, decimals = 2): string {
  if (num >= 1e9) return (num / 1e9).toFixed(decimals) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(decimals) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(decimals) + "K";
  return num.toFixed(decimals);
}

function formatSol(num: number): string {
  return num.toFixed(4) + " SOL";
}

function formatUsd(num: number | null): string {
  return num === null ? "N/A" : "$" + formatNumber(num, 2);
}

function formatPercentage(num: number): string {
  return num.toFixed(2) + "%";
}

function getConnectionColor(type: string) {
  switch (type) {
    case "buy": return "#3b82f6";
    case "sell": return "#ef4444";
    case "swap": return "#f59e0b";
    default: return "#22c55e";
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Main Component
export function FuturisticWalletTracker() {
  const [wallets] = useState(INITIAL_WALLETS);
  const [connections] = useState(CONNECTIONS);
  const [insiders] = useState(INSIDERS);
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [hoveredWallet, setHoveredWallet] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d">("24h");
  const [viewMode, setViewMode] = useState<"3d" | "2d" | "network">("3d");
  const [showInsidersOnly, setShowInsidersOnly] = useState(false);
  const [showConnections, setShowConnections] = useState(true);
  const [showTrails, setShowTrails] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0, z: 500 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState("insiders");
  const [walletInput, setWalletInput] = useState("");
  const [walletError, setWalletError] = useState<string | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);
  const particleRef = useRef<Array<{x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, color: string}>>([]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Track wallet handler
  const handleTrackWallet = useCallback(async () => {
    if (!walletInput.trim()) return;
    
    setWalletError(null);
    setLoadingWallet(true);
    
    const address = walletInput.trim();
    if (address.length < 32 || address.length > 44) {
      setWalletError("Invalid Solana address format");
      setLoadingWallet(false);
      return;
    }
    
    try {
      const connection = createSolanaConnection();
      const pubkey = new PublicKey(address);
      
      const accountInfo = await connection.getAccountInfo(pubkey);
      if (!accountInfo) {
        setWalletError("Wallet not found on Solana mainnet");
        setLoadingWallet(false);
        return;
      }
      
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      });
      
      const balance = await connection.getBalance(pubkey);
      const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 20 });
      
      let tokenCount = 0;
      for (const tokenAccount of tokenAccounts.value) {
        const parsed = tokenAccount.account.data.parsed;
        if (parsed?.info?.tokenAmount?.uiAmount) tokenCount++;
      }
      
      const balanceSol = (balance / 1e9).toFixed(4);
      alert(`Successfully tracked wallet: ${address.slice(0, 8)}...${address.slice(-6)}
SOL Balance: ${(balance / 1e9).toFixed(4)}
Token Accounts: ${tokenCount}
Recent Transactions: ${signatures.length}`);
      
    } catch (err: any) {
      setWalletError(err.message || "Failed to fetch wallet data");
    } finally {
      setLoadingWallet(false);
    }
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    
    resize();
    window.addEventListener("resize", resize);

let lastTime = 0;
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      // Cap frame rate to 60fps max, throttle on mobile
      const minFrameTime = isMobile ? 1000 / 30 : 1000 / 60; // 30fps on mobile, 60fps on desktop
      if (deltaTime >= minFrameTime) {
        timeRef.current += deltaTime * 0.001 * animationSpeed;
        render(ctx, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
        lastTime = currentTime;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animate(performance.now());
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [animationSpeed, showConnections, showTrails]);

  const render = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = "#050515";
    ctx.fillRect(0, 0, width, height);

    drawGrid(ctx, width, height);
    
    if (showTrails) drawParticles(ctx, width, height);
    if (showConnections) drawConnections(ctx, width, height);
    drawWallets(ctx, width, height);

    if (hoveredWallet) drawTooltip(ctx, hoveredWallet, width, height);
  }, [showTrails, showConnections]);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = "#0a0f2a";
    ctx.lineWidth = 0.5;
    const gridSize = 80;
    const offsetX = (cameraPosition.x % gridSize) * 0.5;
    const offsetY = (cameraPosition.y % gridSize) * 0.5;
    
    ctx.beginPath();
    for (let x = -offsetX; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = -offsetY; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  };

  const drawParticles = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const newParticles: Array<{x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, color: string}> = [];
    const wallets = INITIAL_WALLETS;
    
    wallets.forEach((wallet) => {
      if (wallet.txCount > 10 && Math.random() < 0.02 * animationSpeed) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        newParticles.push({
          x: wallet.x + width / 2,
          y: wallet.y + height / 2,
          z: wallet.z,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          vz: (Math.random() - 0.5) * 2,
          life: 1,
          color: getTypeColor(wallet.type)
        });
      }
    });

    particleRef.current.forEach(p => {
      p.x += p.vx * animationSpeed;
      p.y += p.vy * animationSpeed;
      p.z += p.vz * animationSpeed;
      p.life -= 0.01 * animationSpeed;
      
      if (p.life > 0) {
        newParticles.push(p);
        const alpha = p.life * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 * p.life, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(p.color, alpha);
        ctx.fill();
      }
    });
    
    particleRef.current = newParticles;
  };

  const drawConnections = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const centerX = width / 2 + cameraPosition.x * 0.1;
    const centerY = height / 2 + cameraPosition.y * 0.1;
    
    CONNECTIONS.forEach(conn => {
      const fromWallet = INITIAL_WALLETS.find(w => w.address === conn.from);
      const toWallet = INITIAL_WALLETS.find(w => w.address === conn.to);
      if (!fromWallet || !toWallet) return;
      
      const fromX = centerX + fromWallet.x;
      const fromY = centerY + fromWallet.y;
      const toX = centerX + toWallet.x;
      const toY = centerY + toWallet.y;
      
      const progress = (timeRef.current * 0.5) % 1;
      const currentX = fromX + (toX - fromX) * progress;
      const currentY = fromY + (toY - fromY) * progress;
      
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.strokeStyle = hexToRgba(getConnectionColor(conn.type), 0.15);
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(currentX, currentY, 3, 0, Math.PI * 2);
      ctx.fillStyle = getConnectionColor(conn.type);
      ctx.fill();
      
      const pulseSize = 4 + Math.sin(timeRef.current * 3) * 2;
      ctx.beginPath();
      ctx.arc(fromX, fromY, pulseSize, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(getConnectionColor(conn.type), 0.5);
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  };

  const drawWallets = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const centerX = width / 2 + cameraPosition.x * 0.1;
    const centerY = height / 2 + cameraPosition.y * 0.1;
    
    INITIAL_WALLETS.forEach((wallet) => {
      if (showInsidersOnly && !wallet.isInsider) return;
      
      const x = centerX + wallet.x;
      const y = centerY + wallet.y;
      const color = getTypeColor(wallet.type);
      const isSelected = selectedWallet?.address === wallet.address;
      const isHovered = hoveredWallet?.address === wallet.address;
      const pulse = 1 + Math.sin(timeRef.current * 2 + wallet.x * 0.01) * 0.15;
      const size = Math.max(8, Math.min(40, wallet.balance / 1000)) * pulse;
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
      gradient.addColorStop(0, hexToRgba(color, 0.3));
      gradient.addColorStop(1, hexToRgba(color, 0));
      ctx.beginPath();
      ctx.arc(x, y, size * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      if (wallet.isInsider) {
        for (let i = 0; i < 3; i++) {
          const ringSize = size + 10 + i * 15 + Math.sin(timeRef.current * 1.5 + i) * 5;
          ctx.beginPath();
          ctx.arc(x, y, ringSize, 0, Math.PI * 2);
          ctx.strokeStyle = hexToRgba("#ef4444", 0.3 - i * 0.1);
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      
      ctx.strokeStyle = isSelected ? "#ffffff" : (isHovered ? "#ffffff" : hexToRgba(color, 0.5));
      ctx.lineWidth = isSelected || isHovered ? 3 : 1.5;
      ctx.stroke();
      
      const innerSize = size * 0.4;
      ctx.beginPath();
      ctx.arc(x, y, innerSize, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba("#ffffff", 0.2);
      ctx.fill();
      
      if (wallet.label && (wallet.type === "whale" || wallet.type === "exchange" || wallet.isInsider || isSelected || isHovered)) {
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(wallet.label, x, y - size - 8);
      }
      
      if (isSelected || isHovered) {
        drawWalletBadge(ctx, x, y + size + 20, wallet);
      }
    });
  };

  const drawWalletBadge = (ctx: CanvasRenderingContext2D, x: number, y: number, wallet: any) => {
    const badgeWidth = 140;
    const badgeHeight = 80;
    const badgeX = x - badgeWidth / 2;
    const badgeY = y;
    
    ctx.fillStyle = "rgba(10, 10, 30, 0.95)";
    ctx.strokeStyle = getTypeColor(wallet.type);
    ctx.lineWidth = 1;
    roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 8);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(truncateAddr(wallet.address, 8, 6), badgeX + 10, badgeY + 18);
    
    ctx.fillStyle = getTypeColor(wallet.type);
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.fillText(getTypeLabel(wallet.type), badgeX + 10, badgeY + 34);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillText(`${formatNumber(wallet.balance)} SOL`, badgeX + 10, badgeY + 48);
    ctx.fillText(`${wallet.txCount} tx / 24h`, badgeX + 10, badgeY + 60);
    
    if (wallet.isInsider) {
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.fillText("⚠ INSIDER DETECTED", badgeX + 10, badgeY + 72);
    }
  };

  const drawTooltip = (ctx: CanvasRenderingContext2D, wallet: any, width: number, height: number) => {
    const tooltipWidth = 220;
    const tooltipHeight = 120;
    const x = Math.min(Math.max(wallet.x + width / 2 + 60, tooltipWidth / 2), width - tooltipWidth / 2);
    const y = Math.min(Math.max(wallet.y + height / 2 - tooltipHeight / 2, tooltipHeight / 2), height - tooltipHeight / 2);
    
    ctx.fillStyle = "rgba(5, 5, 25, 0.95)";
    ctx.strokeStyle = getTypeColor(wallet.type);
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, tooltipWidth, tooltipHeight, 10);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(wallet.label || truncateAddr(wallet.address), x + 12, y + 22);
    
    ctx.fillStyle = getTypeColor(wallet.type);
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.fillText(getTypeLabel(wallet.type), x + 12, y + 38);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillText(`Balance: ${formatNumber(wallet.balance)} SOL`, x + 12, y + 54);
    ctx.fillText(`24h Volume: ${formatNumber(wallet.volume24h)}`, x + 12, y + 68);
    ctx.fillText(`Transactions: ${wallet.txCount}`, x + 12, y + 82);
    ctx.fillText(`Risk Score: ${wallet.riskScore}/100`, x + 12, y + 96);
    
    if (wallet.isInsider) {
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.fillText("⚠ INSIDER", x + 12, y + 110);
    }
  };

  // Event handlers - with touch support
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2 + cameraPosition.x * 0.1;
    const centerY = rect.height / 2 + cameraPosition.y * 0.1;
    
    let found = null;
    let minDist = 50;
    
    INITIAL_WALLETS.forEach((wallet) => {
      if (showInsidersOnly && !wallet.isInsider) return;
      const wx = centerX + wallet.x;
      const wy = centerY + wallet.y;
      const dist = Math.sqrt((x - wx) ** 2 + (y - wy) ** 2);
      if (dist < minDist) {
        minDist = dist;
        found = wallet;
      }
    });
    
    setHoveredWallet(found);
  }, [cameraPosition, showInsidersOnly]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const centerX = rect.width / 2 + cameraPosition.x * 0.1;
    const centerY = rect.height / 2 + cameraPosition.y * 0.1;
    
    let found = null;
    let minDist = 50;
    
    INITIAL_WALLETS.forEach((wallet) => {
      if (showInsidersOnly && !wallet.isInsider) return;
      const wx = centerX + wallet.x;
      const wy = centerY + wallet.y;
      const dist = Math.sqrt((x - wx) ** 2 + (y - wy) ** 2);
      if (dist < minDist) {
        minDist = dist;
        found = wallet;
      }
    });
    
    setHoveredWallet(found);
  }, [cameraPosition, showInsidersOnly]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2 + cameraPosition.x * 0.1;
    const centerY = rect.height / 2 + cameraPosition.y * 0.1;
    
    INITIAL_WALLETS.forEach((wallet) => {
      if (showInsidersOnly && !wallet.isInsider) return;
      const wx = centerX + wallet.x;
      const wy = centerY + wallet.y;
      const dist = Math.sqrt((x - wx) ** 2 + (y - wy) ** 2);
      const size = Math.max(8, Math.min(40, wallet.balance / 1000));
      if (dist < size + 10) {
        setSelectedWallet(wallet);
        setPanelOpen("analytics");
      }
    });
  }, [showInsidersOnly]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const centerX = rect.width / 2 + cameraPosition.x * 0.1;
    const centerY = rect.height / 2 + cameraPosition.y * 0.1;
    
    INITIAL_WALLETS.forEach((wallet) => {
      if (showInsidersOnly && !wallet.isInsider) return;
      const wx = centerX + wallet.x;
      const wy = centerY + wallet.y;
      const dist = Math.sqrt((x - wx) ** 2 + (y - wy) ** 2);
      const size = Math.max(8, Math.min(40, wallet.balance / 1000));
      if (dist < size + 10) {
        setSelectedWallet(wallet);
        setPanelOpen("analytics");
      }
    });
  }, [showInsidersOnly]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setCameraPosition(prev => ({
      ...prev,
      z: Math.max(100, Math.min(1000, prev.z - e.deltaY * 0.5))
    }));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const startX = e.clientX;
    const startY = e.clientY;
    const startRot = { ...rotation };
    const startCam = { ...cameraPosition };
    
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      setRotation({
        x: startRot.x - dy * 0.005,
        y: startRot.y + dx * 0.005,
        z: startRot.z
      });
      setCameraPosition({
        x: startCam.x - dx * 0.5,
        y: startCam.y + dy * 0.5,
        z: startCam.z
      });
    };
    
    const handleUp = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }, [rotation, cameraPosition]);

  const totalVolume = INITIAL_WALLETS.reduce((sum, w) => sum + w.volume24h, 0);
  const insiderCount = INITIAL_WALLETS.filter(w => w.isInsider).length;
  const whaleCount = INITIAL_WALLETS.filter(w => w.type === "whale").length;
  const avgRisk = INITIAL_WALLETS.reduce((sum, w) => sum + w.riskScore, 0) / INITIAL_WALLETS.length;

  return (
    <div className="min-h-screen bg-[#050515] text-white overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#050515]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-solana-purple to-solana-blue flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0 3-4.03 3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold tracking-tight">Solcurity Fly Map</h1>
              <p className="text-xs text-white/50">Real-time wallet intelligence & insider detection</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/70 text-sm">
              <span className={`h-2 w-2 rounded-full animate-pulse ${showInsidersOnly ? "bg-red-500" : "bg-green-500"}`} />
              LIVE
            </div>
            
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value as "1h" | "24h" | "7d")}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-solana-purple"
            >
              <option value="1h">1 Hour</option>
              <option value="24h">24 Hours</option>
              <option value="7d">7 Days</option>
            </select>
            
            <div className="flex items-center gap-1 border border-white/10 rounded-xl p-1 bg-white/5">
              {(["3d", "2d", "network"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${viewMode === mode ? "bg-solana-purple/20 text-solana-blue" : "text-white/60 hover:text-white"}`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Wallet Address Input Bar - responsive */}
      <div className="fixed top-[60px] md:top-[72px] left-0 right-0 z-30 bg-[#050515]/95 backdrop-blur-sm border-b border-white/10 px-4 py-3" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="max-w-4xl mx-auto flex items-center gap-2 flex-wrap">
          <label className="text-white/60 text-sm font-medium whitespace-nowrap hidden sm:block">Track Wallet:</label>
          <input
            type="text"
            value={walletInput}
            onChange={(e) => setWalletInput(e.target.value)}
            placeholder="Enter Solana wallet address (e.g., 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM)"
            className="flex-1 min-w-0 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-solana-purple text-base font-mono"
            maxLength={44}
          />
          <button
            onClick={handleTrackWallet}
            disabled={!walletInput.trim() || loadingWallet}
            className="px-4 py-3 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loadingWallet ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Tracking...
              </>
            ) : (
              'Track Wallet'
            )}
          </button>
          {walletError && (
            <span className="text-risk-critical text-sm ml-2">{walletError}</span>
          )}
        </div>
      </div>

      {/* Main Map */}
      <main className="pt-16 md:pt-24 h-screen overflow-hidden">
        <div className="relative h-full w-full flex">
          {/* Map Canvas */}
          <div className="flex-1 relative overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair touch-none"
              onMouseMove={handleMouseMove}
              onClick={handleClick}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onTouchMove={handleTouchMove}
              onTouchStart={handleTouchStart}
              style={{ touchAction: "none" }}
            />
            
            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-10 bg-[#050515]/90 backdrop-blur-sm border border-white/10 rounded-xl p-3">
              <div className="flex flex-wrap gap-3">
                {[
                  { type: "insider", label: "INSIDER" },
                  { type: "whale", label: "WHALE" },
                  { type: "exchange", label: "EXCHANGE" },
                  { type: "new", label: "NEW" },
                ].map(({ type, label }) => (
                  <div key={type} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTypeColor(type) }} />
                    <span className="text-xs text-white/70">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Time indicator */}
            <div className="absolute top-4 right-4 z-10 bg-[#050515]/90 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2">
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <span className="h-2 w-2 rounded-full animate-pulse bg-green-500" />
                <span>LIVE · {timeRange.toUpperCase()}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
              <button
                onClick={() => setAnimationSpeed(s => Math.min(3, s + 0.5))}
                className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center"
                title="Speed up"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l4-4z" /></svg>
              </button>
              <button
                onClick={() => setAnimationSpeed(s => Math.max(0.25, s - 0.25))}
                className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center"
                title="Slow down"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 10-5.656-5.656l-4 4z" /></svg>
              </button>
              <button
                onClick={() => setShowTrails(!showTrails)}
                className={`w-10 h-10 rounded-xl border border-white/10 bg-white/5 transition-colors flex items-center justify-center ${showTrails ? "bg-solana-purple/20 text-solana-blue" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                title="Particle trails"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542 7z" /></svg>
              </button>
              <button
                onClick={() => setShowConnections(!showConnections)}
                className={`w-10 h-10 rounded-xl border border-white/10 bg-white/5 transition-colors flex items-center justify-center ${showConnections ? "bg-solana-blue/20 text-solana-blue" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                title="Connections"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l4-4z" /></svg>
              </button>
              <button
                onClick={() => setShowInsidersOnly(!showInsidersOnly)}
                className={`w-10 h-10 rounded-xl border border-white/10 bg-white/5 transition-colors flex items-center justify-center ${showInsidersOnly ? "bg-red-500/20 text-red-500" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                title="Insiders only"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </button>
            </div>
          </div>

          {/* Side Panels */}
          <aside className="fixed right-0 top-16 md:top-[72px] bottom-0 w-96 md:w-96 bg-[#050515]/95 backdrop-blur-sm border-l border-white/10 overflow-y-auto z-30 hidden lg:block">
            {/* Search */}
            <div className="p-4 border-b border-white/10">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search wallet address or label..."
                className="w-full px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-solana-purple text-sm"
              />
            </div>

            {/* Tabs */}
            <div className="border-b border-white/10">
              <nav className="flex" role="tablist">
                {[
                  { id: "insiders", label: "⚠ INSIDERS", count: insiderCount },
                  { id: "connections", label: "🔗 FLOWS", count: CONNECTIONS.length },
                  { id: "analytics", label: "📊 ANALYTICS" },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setPanelOpen(tab.id)}
                    className={`flex-1 py-3 px-2 text-sm font-medium transition border-b-2 ${panelOpen === tab.id ? "border-solana-purple text-solana-blue" : "border-transparent text-white/50 hover:text-white"}`}
                    role="tab"
                    aria-selected={panelOpen === tab.id}
                  >
                    {tab.label} <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-white/10 text-white/60">{tab.count}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Panel Content */}
            <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {panelOpen === "insiders" && (
                <div className="space-y-4">
                  <h3 className="text-white font-semibold">Detected Insider Wallets</h3>
                  <p className="text-white/50 text-sm mb-4">{insiders.length} wallets flagged with high confidence</p>
                  
                  {insiders.map(insider => {
                    const wallet = INITIAL_WALLETS.find(w => w.address === insider.address);
                    return (
                      <div key={insider.address} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-500 font-bold">INSIDER</span>
                              <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-500 font-bold">{Math.round(insider.confidence * 100)}%</span>
                            </div>
                            <p className="mt-1 font-mono text-sm text-white/70">{insider.address}</p>
                            {wallet && <p className="text-xs text-white/50">{wallet.label}</p>}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-500">{wallet ? wallet.riskScore : 0}/100</p>
                            <p className="text-xs text-white/50">RISK SCORE</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm text-white/60">
                          <p><strong>Reasons:</strong> {insider.reasons.join(", ")}</p>
                          <p><strong>Known associates:</strong> {insider.knownAddresses.map(a => truncateAddr(a)).join(", ")}</p>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-red-500/20">
                          <p className="text-xs text-white/50 mb-2">Recent patterns:</p>
                          <div className="flex flex-wrap gap-2">
                            {insider.patterns.map((pattern, i) => (
                              <span key={i} className="px-2 py-1 rounded text-xs bg-red-500/10 text-red-500 border border-red-500/20">
                                {pattern.type.replace("_", " ").toUpperCase()} · {pattern.token}
                                {pattern.profit && ` (+${formatNumber(pattern.profit)} SOL)`}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {panelOpen === "connections" && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <h3 className="text-white font-semibold">Live Transaction Flows</h3>
                  <p className="text-white/50 text-sm mb-3">{CONNECTIONS.length} transactions in selected time range</p>
                  
                  {CONNECTIONS.slice(0, 30).map((conn, i) => {
                    const from = INITIAL_WALLETS.find(w => w.address === conn.from);
                    const to = INITIAL_WALLETS.find(w => w.address === conn.to);
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0`} style={{ backgroundColor: getConnectionColor(conn.type) }}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={conn.type === "buy" ? "M12 19V5m0 0-5 5m5-5 5 5" : conn.type === "sell" ? "M12 5v14m0 0 5-5m-5 5-5-5" : "M7 12h10m0 0-4-4m4 4-4 4"} />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${conn.type === "buy" ? "bg-blue-500/20 text-blue-500" : conn.type === "sell" ? "bg-red-500/20 text-red-500" : "bg-yellow-500/20 text-yellow-500"}`}>
                              {conn.type.toUpperCase()}
                            </span>
                            <span className="text-xs text-white/60 font-mono">{conn.token}</span>
                          </div>
                          <p className="text-xs text-white/40 truncate">
                            {from?.label || truncateAddr(conn.from)} → {to?.label || truncateAddr(conn.to)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-white font-semibold">{conn.amount.toFixed(2)}</p>
                          <p className="text-xs text-white/40">SOL</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {panelOpen === "analytics" && (
                <div className="space-y-4">
                  <h3 className="text-white font-semibold">Network Analytics</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <p className="text-xs text-white/50 uppercase tracking-wider">TOTAL VOLUME</p>
                      <p className="font-mono text-lg font-semibold text-white">{formatNumber(INITIAL_WALLETS.reduce((sum, w) => sum + w.volume24h, 0))}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <p className="text-xs text-white/50 uppercase tracking-wider">BUY VOLUME</p>
                      <p className="font-mono text-lg font-semibold text-blue-500">{formatNumber(CONNECTIONS.filter(c => c.type === "buy").reduce((sum, c) => sum + c.amount, 0))}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <p className="text-xs text-white/50 uppercase tracking-wider">SELL VOLUME</p>
                      <p className="font-mono text-lg font-semibold text-red-500">{formatNumber(CONNECTIONS.filter(c => c.type === "sell").reduce((sum, c) => sum + c.amount, 0))}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <p className="text-xs text-white/50 uppercase tracking-wider">NET FLOW</p>
                      <p className="font-mono text-lg font-semibold text-green-500">{formatNumber(CONNECTIONS.filter(c => c.type === "buy").reduce((sum, c) => sum + c.amount, 0) - CONNECTIONS.filter(c => c.type === "sell").reduce((sum, c) => sum + c.amount, 0))}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <p className="text-xs text-white/50 uppercase tracking-wider">INSIDER %</p>
                      <p className="font-mono text-lg font-semibold text-red-500">{((INSIDERS.length / INITIAL_WALLETS.length) * 100).toFixed(1)}%</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <p className="text-xs text-white/50 uppercase tracking-wider">AVG TX/WALLET</p>
                      <p className="font-mono text-lg font-semibold text-purple-500">{(CONNECTIONS.length / INITIAL_WALLETS.length).toFixed(1)}</p>
                    </div>
                  </div>

                  <h4 className="text-white font-semibold mt-6">Top Wallets by Volume</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {INITIAL_WALLETS
                      .sort((a, b) => b.volume24h - a.volume24h)
                      .slice(0, 10)
                      .map((wallet, i) => (
                        <div key={wallet.address} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: getTypeColor(wallet.type) }}>
                              {i + 1}
                            </span>
                            <div>
                              <p className="font-mono text-sm text-white">{wallet.label || truncateAddr(wallet.address)}</p>
                              <p className="text-xs text-white/50">{wallet.address.slice(0, 10)}...{wallet.address.slice(-6)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-white">{formatNumber(wallet.volume24h)}</p>
                            <p className="text-xs text-white/50">24h VOL</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Bottom Stats Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#050515]/95 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
            <div><p className="text-xs text-white/50 uppercase tracking-wider">TOTAL VOLUME</p><p className="font-mono text-lg font-semibold text-white">{formatNumber(totalVolume)}</p></div>
            <div><p className="text-xs text-white/50 uppercase tracking-wider">INSIDERS</p><p className="font-mono text-lg font-semibold text-red-500">{insiderCount}</p></div>
            <div><p className="text-xs text-white/50 uppercase tracking-wider">WHALES</p><p className="font-mono text-lg font-semibold text-blue-500">{whaleCount}</p></div>
            <div><p className="text-xs text-white/50 uppercase tracking-wider">AVG RISK</p><p className="font-mono text-lg font-semibold text-yellow-500">{avgRisk.toFixed(0)}/100</p></div>
            <div><p className="text-xs text-white/50 uppercase tracking-wider">WALLETS</p><p className="font-mono text-lg font-semibold text-green-500">{INITIAL_WALLETS.length}</p></div>
            <div><p className="text-xs text-white/50 uppercase tracking-wider">FLOWS</p><p className="font-mono text-lg font-semibold text-purple-500">{CONNECTIONS.length}</p></div>
          </div>
        </div>
      </footer>
    </div>
  );
}