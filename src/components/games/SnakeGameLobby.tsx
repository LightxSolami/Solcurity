"use client";

import { useState, useEffect, useCallback } from "react";
import { SnakeGame } from "@/components/games/SnakeGame";
import { useWallet } from "@/hooks/useWallet";

type Room = {
  id: string;
  name: string;
  entry: number;
  maxPlayers: number;
  status: "waiting" | "playing" | "finished";
  escrowAddress?: string;
};

const DEFAULT_ROOMS: Room[] = [
  { id: "r-0.05", name: "0.05 SOL", entry: 0.05, maxPlayers: 5, status: "waiting" },
  { id: "r-0.1", name: "0.1 SOL", entry: 0.1, maxPlayers: 5, status: "waiting" },
  { id: "r-1", name: "1 SOL", entry: 1, maxPlayers: 5, status: "waiting" },
  { id: "r-5", name: "5 SOL", entry: 5, maxPlayers: 5, status: "waiting" },
  { id: "r-random", name: "Random Amount", entry: 0, maxPlayers: 5, status: "waiting" },
];

interface GameSession {
  gameId: string;
  game: any;
}

export function SnakeGameLobby() {
  const [rooms] = useState<Room[]>(DEFAULT_ROOMS);
  const [selected, setSelected] = useState<string>("r-0.05");
  const [randomAmount, setRandomAmount] = useState("");
  const [players] = useState<Record<string, number>>({ "r-0.05": 0, "r-0.1": 0, "r-random": 0 });
  const [gameStarted, setGameStarted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [showBettingModal, setShowBettingModal] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string>("");
  const [gamePhase, setGamePhase] = useState<"lobby" | "betting" | "playing" | "results">("lobby");
  const [winnerInfo, setWinnerInfo] = useState<any>(null);

  const { wallet, connect, disconnect } = useWallet();

  const selectedRoom = rooms.find((r) => r.id === selected);
  const entryAmount = selected === "r-random" && randomAmount ? parseFloat(randomAmount) : selectedRoom?.entry || 0;

  const createGame = useCallback(async () => {
    if (!wallet.connected || !wallet.publicKey) {
      await connect();
      return;
    }

    setGamePhase("betting");
    setShowBettingModal(true);
    setTransactionStatus("Creating game session...");

    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-game",
          playerPubkey: wallet.publicKey,
          entryFee: entryAmount,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setGameSession({ gameId: data.gameId, game: data.game });
      setTransactionStatus("Game created! Starting...");
      setShowBettingModal(false);
      setGamePhase("playing");
      setGameStarted(true);
    } catch (err: any) {
      setTransactionStatus(err.message || "Failed to create game");
    }
  }, [wallet, connect, entryAmount]);

  const handleGameOver = (score: number) => {
    setFinalScore(score);
    setGameStarted(false);
    setGamePhase("results");

    if (gameSession) {
      fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "payout",
          gameId: gameSession.gameId,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) setWinnerInfo(data);
        })
        .catch(console.error);
    }
  };

  const handleRestart = () => {
    setFinalScore(null);
    setWinnerInfo(null);
    setGamePhase("lobby");
    setGameStarted(false);
    setGameSession(null);
  };

  const formatSol = (lamports: number) => (lamports / 1e9).toFixed(4);

  if (gamePhase === "playing" && gameStarted) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            Room: {selectedRoom?.name} | Entry: {entryAmount.toFixed(2)} SOL
          </h2>
          <button
            onClick={handleRestart}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm"
          >
            Back to Lobby
          </button>
        </div>
        <div className="flex justify-center">
          <SnakeGame onGameOver={handleGameOver} />
        </div>
      </div>
    );
  }

  if (gamePhase === "results") {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">Game Over</h1>
          <p className="text-white/60">Score: {finalScore || 0}</p>

          {winnerInfo && (
            <div className="mt-6 p-6 bg-solana-card border border-white/10 rounded-2xl max-w-md mx-auto">
              <h3 className="text-xl font-bold text-white mb-4">Game Results</h3>
              <div className="space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-white/60">Total Pot:</span>
                  <span className="text-white font-bold">{winnerInfo.totalPot} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Winner:</span>
                  <span className="text-solana-blue font-bold">{winnerInfo.winner === wallet.publicKey ? "You Win!" : "Someone else won"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Your Share:</span>
                  <span className="text-solana-green font-bold">{winnerInfo.winnerShare} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Dev Fee (5%):</span>
                  <span className="text-white/50">{winnerInfo.devFee} SOL</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleRestart}
            className="mt-6 px-8 py-3 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-2">Snake Arena</h1>
        <p className="text-white/60 max-w-2xl">Compete with other snakes. Winner takes the pot minus 5% dev fee.</p>
      </div>

      {/* Wallet Connection */}
      <div className="mb-6 flex items-center justify-between p-4 bg-solana-card border border-white/10 rounded-xl">
        <div className="flex items-center gap-3">
          {wallet.connected ? (
            <>
              <div className="w-10 h-10 rounded-full bg-solana-purple/20 flex items-center justify-center">
                <span className="text-solana-blue font-bold text-sm">
                  {wallet.publicKey?.slice(0, 2)}...{wallet.publicKey?.slice(-2)}
                </span>
              </div>
              <span className="text-white font-mono text-sm">{wallet.publicKey?.slice(0, 8)}...{wallet.publicKey?.slice(-6)}</span>
            </>
          ) : (
            <>
              <span className="text-white/60">Connect your wallet to play</span>
              <button
                onClick={connect}
                className="px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors text-sm"
              >
                Connect Wallet
              </button>
            </>
          )}
        </div>
        <div className="text-white/40 text-xs">
          Dev Fee: 5% to {DEV_WALLET.slice(0, 6)}...{DEV_WALLET.slice(-4)}
        </div>
      </div>

      {finalScore !== null && gamePhase === "lobby" && (
        <div className="mb-6 p-4 bg-solana-purple/10 border border-solana-purple/30 rounded-xl">
          <p className="text-white text-center">
            Previous score: {finalScore}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <div
            key={room.id}
            className={`bg-solana-card border rounded-2xl p-6 cursor-pointer transition-all ${
              selected === room.id ? "border-solana-purple" : "border-white/10 hover:border-white/20"
            }`}
            onClick={() => setSelected(room.id)}
          >
            <h3 className="font-semibold text-white">{room.name}</h3>
            <p className="text-white/60 text-sm mt-1">{players[room.id]}/5 Players</p>
            <p className="text-white/60 text-sm">Winner takes {(room.entry * 5 * 0.95).toFixed(2)} SOL</p>
          </div>
        ))}
      </div>

      {selected === "r-random" && (
        <div className="mt-6 bg-solana-card border border-white/10 rounded-2xl p-6">
          <label className="text-white/60 text-sm">Random entry amount (SOL)</label>
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={randomAmount}
            onChange={(e) => setRandomAmount(e.target.value)}
            className="w-full mt-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
          />
        </div>
      )}

      <div className="mt-6 flex flex-col items-center gap-4">
        <button
          onClick={createGame}
          disabled={!wallet.connected || !entryAmount || entryAmount < 0.01}
          className="px-8 py-3 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>
            {wallet.connected
              ? `Play Game (${entryAmount.toFixed(2)} SOL entry)`
              : "Connect Wallet to Play"
            }
          </span>
        </button>
      </div>

      {/* Betting Modal */}
      {showBettingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-solana-card border border-white/10 rounded-2xl p-6 w-80">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Bet</h3>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-white/60">Entry Fee:</span>
                <span className="text-white font-bold">{entryAmount.toFixed(2)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Potential Win:</span>
                <span className="text-solana-green font-bold">{(entryAmount * 5 * 0.95).toFixed(2)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Dev Fee:</span>
                <span className="text-white/50">{(entryAmount * 5 * 0.05).toFixed(2)} SOL</span>
              </div>
            </div>
            <div className="text-xs text-white/40 mb-4">
              Your wallet will be prompted to approve the transaction.
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBettingModal(false)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={createGame}
                className="px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors text-sm"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Status Toast */}
      {transactionStatus && (
        <div className="fixed bottom-4 right-4 bg-solana-card border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80">
          {transactionStatus}
        </div>
      )}
    </div>
  );
}

const DEV_WALLET = "q8QWr2Xo5KXaiFKjdFzi8W8PZgCJ9Vj4ofGfVistzPv";
