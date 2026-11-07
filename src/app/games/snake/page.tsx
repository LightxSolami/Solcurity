import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Snake Arena | Solcurity",
  description: "Play SolSnake practice or free online multiplayer.",
};

export default function SnakeGamePage() {
  const gameUrl = process.env.NEXT_PUBLIC_SOLSNAKE_SERVER_URL?.trim();
  const src = gameUrl ? new URL("/", gameUrl).toString() : "/solsnake/index.html";

  return (
    <iframe
      src={src}
      title={gameUrl ? "SolSnake online multiplayer arena" : "SolSnake practice arena"}
      className="snake-arena-frame block w-full border-0"
      style={{ height: "min(820px, max(600px, calc(100dvh - 150px)))" }}
    />
  );
}
