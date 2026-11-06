import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SolSnake Arena | Solcurity",
  description: "Play the free SolSnake practice arena against four bots.",
};

export default function HomePage() {
  return (
    <iframe
      src="/solsnake/index.html"
      title="SolSnake practice arena"
      className="block w-full border-0"
      style={{ height: "min(820px, max(600px, calc(100dvh - 150px)))" }}
    />
  );
}
