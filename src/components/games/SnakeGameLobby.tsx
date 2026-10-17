"use client";

import { useState } from "react";

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-2">Snake Arena</h1>
        <p className="text-white/60 max-w-2xl">Compete with 4 other snakes. Last snake alive wins the full pot. Entry: 0.05 SOL, 0.1 SOL or a random amount.</p>
      </div>

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
            <p className="text-white/60 text-sm">Winner takes {room.entry === 0 ? "Random" : (room.entry * 5).toFixed(2)} SOL</p>
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

      <div className="mt-8 p-4 bg-risk-moderate/10 border border-risk-moderate/30 rounded-xl">
        <p className="text-risk-moderate text-sm font-semibold">Game logic and escrow integration are not yet implemented. The escrow and payout systems must use Solana wallets, not private keys.</p>
      </div>
    </div>
  );
}
