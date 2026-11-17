import { act, renderHook } from "@testing-library/react";
import { getPhantomMobileRedirectUrl, useWallet } from "@/hooks/useWallet";

describe("getPhantomMobileRedirectUrl", () => {
  it("builds Phantom's browse deeplink with the app origin as ref", () => {
    const dappUrl = "https://solcurity.app/scanner?mint=abc123";
    const deeplink = new URL(getPhantomMobileRedirectUrl(dappUrl));

    expect(deeplink.origin).toBe("https://phantom.com");
    expect(deeplink.pathname).toBe(`/ul/browse/${encodeURIComponent(dappUrl)}`);
    expect(deeplink.searchParams.get("ref")).toBe("https://solcurity.app");
  });
});

describe("useWallet Phantom provider selection", () => {
  afterEach(() => {
    delete window.phantom;
    delete window.solana;
    delete window.solflare;
    jest.restoreAllMocks();
  });

  it("connects to an available Phantom provider before another wallet", async () => {
    const publicKey = (key: string) => ({
      toBase58: () => key,
      toString: () => key,
    });
    const createProvider = (key: string) => ({
      publicKey: null as ReturnType<typeof publicKey> | null,
      isConnected: false,
      isPhantom: false,
      isSolflare: false,
      connect: jest.fn(async () => ({ publicKey: publicKey(key) })),
      disconnect: jest.fn(async () => {}),
      signTransaction: jest.fn(),
      signAllTransactions: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    });
    const phantom = createProvider("PhantomWallet111111111111111111111111111111");
    const solflare = createProvider("SolflareWallet111111111111111111111111111");
    phantom.isPhantom = true;
    solflare.isSolflare = true;
    window.phantom = { solana: phantom };
    window.solflare = solflare;
    const alert = jest.spyOn(window, "alert").mockImplementation(() => {});
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(phantom.connect).toHaveBeenCalledTimes(1);
    expect(solflare.connect).not.toHaveBeenCalled();
    expect(result.current.wallet.publicKey).toBe("PhantomWallet111111111111111111111111111111");
    expect(alert).not.toHaveBeenCalled();
  });
});
