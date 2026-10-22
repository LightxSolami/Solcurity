"use client";

import { useState } from "react";
import { SnakeGame } from "@/components/games/SnakeGame";

type Room = {
  id: string;
  name: string;
  entry: number;
  maxPlayers: number;
  status: "waiting" | "playing" | "finished";
  escrowAddress?: string;
};

const DEFAULT_ROOMS: Room[] = [
  { id: "r-0.05", name: "Room 0.05 SOL", entry: 0.05, maxPlayers: 5, status: "waiting" },
  { id: "r-0.1", name: "Room 0.1 SOL", entry: 0.1, maxPlayers: 5, status: "waiting" },
  { id: "r-random", name: "Room Random SOL", entry: 0, maxPlayers: 5, status: "waiting" },
];

export function SnakeGameLobby() {
  const [rooms] = useState<Room[]>(DEFAULT_ROOMS);
  const [selected, setSelected] = useState<string>("r-0.05");
  const [randomAmount, setRandomAmount] = useState("");
  const [players] = useState<Record<string, number>>({ "r-0.05": 0, "r-0.1": 0, "r-random": 0 });
  const [gameStarted, setGameStarted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const selectedRoom = rooms.find((r) => r.id === selected);
  const entryAmount = selected === "r-random" && randomAmount ? parseFloat(randomAmount) : selectedRoom?.entry || 0;

  function handleStartGame() {
    setGameStarted(true);
    setFinalScore(null);
  }

  function handleGameOver(score: number) {
    setFinalScore(score);
    setGameStarted(false);
  }

  function handleRestart() {
    setGameStarted(true);
    setFinalScore(null);
  }

  if (gameStarted) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            Room: {selectedRoom?.name} | Entry: {entryAmount.toFixed(2)} SOL
          </h2>
          <button
            onClick={() => setGameStarted(false)}
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-2">Snake Arena</h1>
        <p className="text-white/60 max-w-2xl">Compete with 4 other snakes. Last snake alive wins the full pot. Entry: 0.05 SOL, 0.1 SOL or a random amount.</p>
      </div>

      {finalScore !== null && (
        <div className="mb-6 p-4 bg-solana-purple/10 border border-solana-purple/30 rounded-xl">
          <p className="text-white text-center">
            <span className="font-bold text-solana-blue">Game Over</span> - Your score: {finalScore}
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
            <p className="text-white/60 text-sm">Winner takes {(room.entry * 5).toFixed(2)} SOL</p>
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
          onClick={handleStartGame}
          disabled={!entryAmount || entryAmount < 0.01}
          className="px-8 py-3 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>Play Game ({entryAmount.toFixed(2)} SOL entry)</span>
        </button>

        <p className="text-white/50 text-xs">
          5-player multiplayer mode coming soon. Currently single-player Snake with SOL betting UI.
        </p>
      </div>
    </div>
  );
}
