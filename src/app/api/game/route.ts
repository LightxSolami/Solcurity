import { NextRequest, NextResponse } from "next/server";
import { Keypair, PublicKey, SystemProgram, Transaction, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { z } from "zod";

const DEV_WALLET = "q8QWr2Xo5KXaiFKjdFzi8W8PZgCJ9Vj4ofGfVistzPv";
const FEE_PERCENT = 0.05;

const GameActionSchema = z.object({
  action: z.enum(["create-game", "join-game", "submit-score", "get-game", "payout"]),
  gameId: z.string().optional(),
  playerPubkey: z.string().optional(),
  entryFee: z.number().optional(),
  signature: z.string().optional(),
  score: z.number().optional(),
  winner: z.string().optional(),
});

const MAX_PLAYERS = 5;

interface GameState {
  gameId: string;
  players: { pubkey: string; score: number; joined: boolean }[];
  entryFee: number;
  pot: number;
  status: "waiting" | "playing" | "finished";
  winner: string | null;
  createdAt: number;
  signatures: Record<string, string>;
  maxPlayers: number;
}

const activeGames: Record<string, GameState> = {};
const gameSignatures: Record<string, string> = {};

const RPC_URL = "https://solana-mainnet.g.alchemy.com/v2/demo";
const connection = new Connection(RPC_URL, {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 30000,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = GameActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    switch (data.action) {
      case "create-game": {
        if (!data.playerPubkey || !data.entryFee) {
          return NextResponse.json({ error: "playerPubkey and entryFee required" }, { status: 400 });
        }

        const gameId = Math.random().toString(36).substring(2, 15);
        const game: GameState = {
          gameId,
          players: [{ pubkey: data.playerPubkey, score: 0, joined: true }],
          entryFee: data.entryFee,
          pot: data.entryFee,
          status: "waiting",
          winner: null,
          createdAt: Date.now(),
          signatures: {},
          maxPlayers: MAX_PLAYERS,
        };

        activeGames[gameId] = game;

        return NextResponse.json({ gameId, game });
      }

      case "join-game": {
        if (!data.gameId || !data.playerPubkey || !data.entryFee || !data.signature) {
          return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const game = activeGames[data.gameId];
        if (!game) {
          return NextResponse.json({ error: "Game not found" }, { status: 404 });
        }

        if (game.status !== "waiting") {
          return NextResponse.json({ error: "Game already started or finished" }, { status: 400 });
        }

        if (game.players.some((p) => p.pubkey === data.playerPubkey)) {
          return NextResponse.json({ error: "Player already joined" }, { status: 400 });
        }

        if (data.entryFee !== game.entryFee) {
          return NextResponse.json({ error: "Entry fee mismatch" }, { status: 400 });
        }

        const tx = new Transaction();
        tx.feePayer = new PublicKey(data.playerPubkey);
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(data.playerPubkey),
            toPubkey: new PublicKey(DEV_WALLET),
            lamports: Math.floor(data.entryFee * LAMPORTS_PER_SOL),
          })
        );

        game.players.push({ pubkey: data.playerPubkey, score: 0, joined: true });
        game.pot += data.entryFee;
        game.signatures[data.playerPubkey] = data.signature;

        activeGames[data.gameId] = game;

        if (game.players.length === game.maxPlayers) {
          game.status = "playing";
        }

        return NextResponse.json({ gameId: data.gameId, game });
      }

      case "submit-score": {
        if (!data.gameId || !data.playerPubkey || data.score === undefined) {
          return NextResponse.json({ error: "gameId, playerPubkey, and score required" }, { status: 400 });
        }

        const game = activeGames[data.gameId];
        if (!game) {
          return NextResponse.json({ error: "Game not found" }, { status: 404 });
        }

        const player = game.players.find((p) => p.pubkey === data.playerPubkey);
        if (!player) {
          return NextResponse.json({ error: "Player not in game" }, { status: 400 });
        }

        player.score = data.score;

        const allFinished = game.players.every((p) => p.score > 0 || p === game.players[game.players.length - 1]);

        if (allFinished && game.status === "playing") {
          const winner = game.players.reduce((max, p) => (p.score > max.score ? p : max), game.players[0]);
          game.winner = winner.pubkey;
          game.status = "finished";

          return NextResponse.json({ gameId: data.gameId, game, winner: winner.pubkey });
        }

        return NextResponse.json({ gameId: data.gameId, game });
      }

      case "get-game": {
        if (!data.gameId) {
          return NextResponse.json({ error: "gameId required" }, { status: 400 });
        }

        const game = activeGames[data.gameId];
        if (!game) {
          return NextResponse.json({ error: "Game not found" }, { status: 404 });
        }

        return NextResponse.json({ game });
      }

      case "payout": {
        if (!data.gameId) {
          return NextResponse.json({ error: "gameId required" }, { status: 400 });
        }

        const game = activeGames[data.gameId];
        if (!game) {
          return NextResponse.json({ error: "Game not found" }, { status: 404 });
        }

        if (!game.winner || game.status !== "finished") {
          return NextResponse.json({ error: "Game not finished" }, { status: 400 });
        }

        const winnerShare = game.pot * (1 - FEE_PERCENT);
        const devFee = game.pot * FEE_PERCENT;

        return NextResponse.json({
          gameId: data.gameId,
          winner: game.winner,
          winnerShare: winnerShare.toFixed(4),
          devFee: devFee.toFixed(4),
          totalPot: game.pot.toFixed(4),
          feePercent: FEE_PERCENT * 100,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Game API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
