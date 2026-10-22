"use client";

import { useState, useEffect, useCallback } from "react";

const DEV_WALLET = "q8QWr2Xo5KXaiFKjdFzi8W8PZgCJ9Vj4ofGfVistzPv";

interface PhantomProvider {
  publicKey: { toBase58: () => string; toString: () => string } | null;
  isConnected: boolean;
  signTransaction: (tx: any) => Promise<any>;
  signAllTransactions: (txs: any[]) => Promise<any[]>;
  connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: (args?: any) => void) => void;
  request: (args: { method: string; params?: any }) => Promise<any>;
}

interface SolflareProvider {
  publicKey: { toBase58: () => string } | null;
  isConnected: boolean;
  signTransaction: (tx: any) => Promise<any>;
  signAllTransactions: (txs: any[]) => Promise<any[]>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: (args?: any) => void) => void;
  off: (event: string, callback: (args?: any) => void) => void;
}

type WalletProvider = PhantomProvider | SolflareProvider;

declare global {
  interface Window {
    phantom?: { solana?: PhantomProvider };
    solflare?: SolflareProvider;
  }
}

export type WalletInfo = {
  connected: boolean;
  publicKey: string | null;
  provider: WalletProvider | null;
};

export function useWallet() {
  const [wallet, setWallet] = useState<WalletInfo>({
    connected: false,
    publicKey: null,
    provider: null,
  });

  const detectProvider = useCallback((): WalletProvider | null => {
    if (typeof window === "undefined") return null;

    if (window.solflare) {
      return window.solflare;
    }

    if (window.phantom?.solana) {
      return window.phantom.solana;
    }

    return null;
  }, []);

  const connect = useCallback(async () => {
    const provider = detectProvider();
    if (!provider) {
      alert("Please install a Solana wallet (Phantom or Solflare)");
      return;
    }

    try {
      let publicKey: { toBase58: () => string } | null = null;

      if ("request" in provider) {
        const resp = await provider.request!({
          method: "sol_connect",
          params: [undefined],
        });
        publicKey = resp.publicKey;
      } else {
        const result = await (provider.connect() as Promise<any>);
        if (result && typeof result === 'object' && 'publicKey' in result) {
          publicKey = result.publicKey;
        } else if (provider.publicKey) {
          publicKey = provider.publicKey;
        }
      }

      if (!publicKey) throw new Error("No public key returned");

      setWallet({
        connected: true,
        publicKey: publicKey.toBase58(),
        provider,
      });
    } catch (err: any) {
      console.error("Failed to connect wallet:", err);
      alert(err.message || "Failed to connect wallet");
    }
  }, [detectProvider]);

  const disconnect = useCallback(async () => {
    if (wallet.provider) {
      try {
        if ("disconnect" in wallet.provider) {
          await wallet.provider.disconnect();
        }
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
        provider.on("disconnect", () => {});
      } catch {}
    };
  }, [detectProvider]);

  return { wallet, connect, disconnect, signTransaction, detectProvider, devWallet: DEV_WALLET };
}
