import { NextRequest, NextResponse } from "next/server";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { withRpcRetry } from "@/lib/solana-rpc";
import { SolanaAddressSchema } from "@/lib/validators";
import { getClientIp, RateLimiter } from "@/lib/rate-limit";

const trackerRateLimiter = new RateLimiter(120, 15 * 60 * 1000);

const SignatureSchema = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{64,88}$/, "Invalid transaction signature");

const QuerySchema = z.object({
  address: SolanaAddressSchema,
  before: SignatureSchema.optional(),
  until: SignatureSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  const rateCheck = trackerRateLimiter.check(getClientIp(request.headers));
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Tracker rate limit reached. Please wait before refreshing." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  const parsed = QuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries())
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid tracker request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { address, before, until, limit } = parsed.data;
  const wallet = new PublicKey(address);

  try {
    const { signatures, balanceLamports } = await withRpcRetry((connection) =>
      Promise.all([
        connection.getSignaturesForAddress(wallet, {
          limit: limit + 1,
          ...(before ? { before } : {}),
          ...(until ? { until } : {}),
        }),
        connection.getBalance(wallet, "confirmed"),
      ]).then(([recentSignatures, balance]) => ({
        signatures: recentSignatures,
        balanceLamports: balance,
      }))
    );

    const page = signatures.slice(0, limit);
    const transactions = page.length
      ? await withRpcRetry(
          (connection) =>
            connection.getParsedTransactions(
              page.map((signatureInfo) => signatureInfo.signature),
              { commitment: "confirmed", maxSupportedTransactionVersion: 0 }
            ),
          2
        ).catch((error: unknown) => {
          console.warn("Wallet tracker transaction details unavailable:", error);
          return page.map(() => null);
        })
      : [];

    const detailsAvailable =
      page.length === 0 || transactions.some((transaction) => transaction !== null);
    const activities = page.map((signatureInfo, index) => {
      const transaction = transactions[index];
      const meta = transaction?.meta;
      const accountKeys = transaction?.transaction.message.accountKeys ?? [];
      const walletIndex = accountKeys.findIndex(
        (key) => key.pubkey.toBase58() === address
      );
      const solChange =
        walletIndex >= 0 && meta
          ? (meta.postBalances[walletIndex] - meta.preBalances[walletIndex]) /
            LAMPORTS_PER_SOL
          : 0;
      const tokenDeltas = new Map<string, number>();

      for (const balance of meta?.preTokenBalances ?? []) {
        if (balance.owner === address) {
          tokenDeltas.set(
            balance.mint,
            (tokenDeltas.get(balance.mint) ?? 0) -
              Number(balance.uiTokenAmount.uiAmountString ?? 0)
          );
        }
      }
      for (const balance of meta?.postTokenBalances ?? []) {
        if (balance.owner === address) {
          tokenDeltas.set(
            balance.mint,
            (tokenDeltas.get(balance.mint) ?? 0) +
              Number(balance.uiTokenAmount.uiAmountString ?? 0)
          );
        }
      }

      const tokenChanges = Array.from(tokenDeltas.entries())
        .filter(([, amount]) => amount !== 0)
        .map(([mint, amount]) => ({ mint, amount }));
      const counterparties = accountKeys
        .filter((key) => key.signer && key.pubkey.toBase58() !== address)
        .map((key) => key.pubkey.toBase58());

      return {
        signature: signatureInfo.signature,
        slot: signatureInfo.slot,
        blockTime: signatureInfo.blockTime,
        success: signatureInfo.err === null,
        detailsAvailable: transaction !== null,
        solChange,
        tokenChanges,
        counterparties,
        feeLamports: meta?.fee ?? null,
      };
    });

    return NextResponse.json({
      address,
      balanceSol: balanceLamports / LAMPORTS_PER_SOL,
      activities,
      detailsAvailable,
      hasMore: signatures.length > limit,
      fetchedAt: Date.now(),
    });
  } catch (error) {
    console.error("Wallet tracker RPC error:", error);
    return NextResponse.json(
      { error: "Unable to retrieve wallet activity right now. Please try again." },
      { status: 502 }
    );
  }
}
