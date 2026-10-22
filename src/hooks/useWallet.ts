"use client";

import { useState, useEffect, useCallback } from "react";

const DEV_WALLET = "q8QWr2Xo5KXaiFKjdFzi8W8PZgCJ9Vj4ofGfVistzPv";

interface SolanaProvider {
  publicKey: { toBase58: () => string; toString: () => string } | null;
  isConnected: boolean;
  isPhantom?: boolean;
  isSolflare?: boolean;
  signTransaction: (tx: any) => Promise<any>;
  signAllTransactions: (txs: any[]) => Promise<any[]>;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toBase58: () => string } }>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: (args?: any) => void) => void;
  off: (event: string, callback: (args?: any) => void) => void;
  request?: (args: { method: string; params?: any }) => Promise<any>;
}

declare global {
  interface Window {
    solana?: SolanaProvider;
    phantom?: { solana?: SolanaProvider };
    solflare?: SolanaProvider;
  }
}

type WalletInfo = {
  connected: boolean;
  publicKey: string | null;
  provider: SolanaProvider | null;
};

export function useWallet() {
  const [wallet, setWallet] = useState<WalletInfo>({
    connected: false,
    publicKey: null,
    provider: null,
  });

  const detectProvider = useCallback((): SolanaProvider | null => {
    if (typeof window === "undefined") return null;

    if (window.solflare && (window.solflare as any).isSolflare) {
      return window.solflare;
    }

    if (window.solana && window.solana.isPhantom) {
      return window.solana;
    }

    if (window.phantom?.solana) {
      return window.phantom.solana;
    }

    if (window.solflare) {
      return window.solflare;
    }

    return null;
  }, []);

  const connect = useCallback(async () => {
    const provider = detectProvider();
    if (!provider) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        const dappUrl = encodeURIComponent(window.location.href);
        const timeout = setTimeout(() => {
          window.location.href = "https://phantom.app/mobile";
        }, 3000);
        window.location.href = `phantom://uplink?app=Solcurity&dappUrl=${dappUrl}`;
      } else {
        alert("Please install a Solana wallet (Phantom or Solflare)");
      }
      return;
    }

    try {
      let publicKey: { toBase58: () => string } | null = null;

      if (provider.connect) {
        const result = await provider.connect();
        publicKey = result?.publicKey || provider.publicKey;
      } else if (provider.request) {
        const resp = await provider.request({
          method: "solana_connect",
        });
        publicKey = resp?.publicKey;
      }

      if (!publicKey) {
        throw new Error("No public key returned");
      }

      setWallet({
        connected: true,
        publicKey: publicKey.toBase58(),
        provider,
      });
    } catch (err: any) {
      console.error("Failed to connect wallet:", err);
      if (err.code === 4001 || err.message?.includes("reject")) {
        alert("Wallet connection rejected");
      } else {
        alert(err.message || "Failed to connect wallet");
      }
    }
  }, [detectProvider]);

  const disconnect = useCallback(async () => {
    if (wallet.provider) {
      try {
        await wallet.provider.disconnect();
      } catch (e) {
        console.error("Disconnect error:", e);
      }
    }
    setWallet({
      connected: false,
      publicKey: null,
      provider: null,
    });
  }, [wallet.provider]);

  const signTransaction = useCallback(
    async (transaction: any) => {
      if (!wallet.provider) {
        throw new Error("Wallet not connected");
      }
      return await wallet.provider.signTransaction(transaction);
    },
    [wallet.provider]
  );

  useEffect(() => {
    const provider = detectProvider();
    if (!provider) return;

    const handleConnect = () => {
      if (provider.publicKey) {
        setWallet({
          connected: true,
          publicKey: provider.publicKey.toBase58(),
          provider,
        });
      }
    };

    const handleDisconnect = () => {
      setWallet({
        connected: false,
        publicKey: null,
        provider: null,
      });
    };

    try {
      provider.on("connect", handleConnect);
      provider.on("disconnect", handleDisconnect);
    } catch {}

    return () => {
      try {
        provider.off?.("connect", handleConnect);
        provider.off?.("disconnect", handleDisconnect);
      } catch {}
    };
  }, [detectProvider]);

  return { wallet, connect, disconnect, signTransaction, detectProvider, devWallet: DEV_WALLET };
}

export function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export function getPhantomMobileRedirectUrl(): string {
  const appName = "Solcurity";
  const redirectUrl = encodeURIComponent(window.location.origin);
  return `https://phantom.app/uplink?app=${appName}&redirect=${redirectUrl}`;
}
