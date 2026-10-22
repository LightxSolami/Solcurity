"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface SnakeGameState {
  snake: { x: number; y: number }[];
  food: { x: number; y: number };
  direction: { x: number; y: number };
  score: number;
  gameOver: boolean;
  gameStarted: boolean;
  gameSpeed: number;
}

export interface SnakeGameProps {
  onGameOver?: (score: number) => void;
  onScoreUpdate?: (score: number) => void;
  boardSize?: number;
  cellSize?: number;
  initialSpeed?: number;
}

const BOARD_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREASE = 5;
const MAX_SPEED = 80;
const GRID_SIZE = 20;

export function SnakeGame({
  onGameOver,
  onScoreUpdate,
  boardSize = BOARD_SIZE,
  cellSize = GRID_SIZE,
  initialSpeed = INITIAL_SPEED,
}: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameIntervalRef = useRef<number>(initialSpeed);

  const [gameState, setGameState] = useState<SnakeGameState>(() =>
    getInitialState(boardSize)
  );

  function getInitialState(size: number): SnakeGameState {
    const snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    return {
      snake,
      food: generateFood(snake, size),
      direction: { x: 1, y: 0 },
      score: 0,
      gameOver: false,
      gameStarted: false,
      gameSpeed: initialSpeed,
    };
  }

  function generateFood(snake: { x: number; y: number }[], size: number): { x: number; y: number } {
    const emptyCells: { x: number; y: number }[] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!snake.some((segment) => segment.x === x && segment.y === y)) {
          emptyCells.push({ x, y });
        }
      }
    }
    if (emptyCells.length === 0) return { x: 0, y: 0 };
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!gameState.gameStarted) {
        if (e.key === "Enter" || e.key === " ") {
          setGameState((prev) => ({ ...prev, gameStarted: true }));
        }
        return;
      }

      if (gameState.gameOver) {
        if (e.key === "Enter" || e.key === " ") {
          setGameState(getInitialState(boardSize));
        }
        return;
      }

      const newDirection = (() => {
        switch (e.key) {
          case "ArrowUp":
          case "w":
          case "W":
            return { x: 0, y: -1 };
          case "ArrowDown":
          case "s":
          case "S":
            return { x: 0, y: 1 };
          case "ArrowLeft":
          case "a":
          case "A":
            return { x: -1, y: 0 };
          case "ArrowRight":
          case "d":
          case "D":
            return { x: 1, y: 0 };
          default:
            return null;
        }
      })();

      if (newDirection) {
        // Prevent 180-degree turns
        if (
          newDirection.x === -gameState.direction.x &&
          newDirection.y === -gameState.direction.y
        ) {
          return;
        }
        setGameState((prev) => ({
          ...prev,
          direction: newDirection,
        }));
      }
    },
    [gameState.direction, gameState.gameStarted, gameState.gameOver, boardSize, initialSpeed, onGameOver, onScoreUpdate]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const update = useCallback(() => {
    setGameState((prev) => {
      if (!prev.gameStarted || prev.gameOver) return prev;

      const head = {
        x: prev.snake[0].x + prev.direction.x,
        y: prev.snake[0].y + prev.direction.y,
      };

      // Wall collision
      if (
        head.x < 0 ||
        head.x >= boardSize ||
        head.y < 0 ||
        head.y >= boardSize ||
        prev.snake.some(
          (segment) => segment.x === head.x && segment.y === head.y
        )
      ) {
        return {
          ...prev,
          gameOver: true,
          gameStarted: false,
        };
      }

      const newSnake = [head, ...prev.snake];

      // Food collision
      if (head.x === prev.food.x && head.y === prev.food.y) {
        const newScore = prev.score + 10;
        const newSpeed = Math.max(MAX_SPEED, prev.gameSpeed - SPEED_INCREASE);
        const newFood = generateFood(newSnake, boardSize);

        return {
          ...prev,
          snake: newSnake,
          food: newFood,
          score: newScore,
          gameSpeed: newSpeed,
        };
      }

      // Normal movement - remove tail
      const newTail = newSnake.slice(0, -1);

      return {
        ...prev,
        snake: newTail,
        score: prev.score,
      };
    });
  }, [boardSize]);

  useEffect(() => {
    const gameStateSnapshot = gameState;
    if (!gameStateSnapshot.gameStarted || gameStateSnapshot.gameOver) return;

    let frameId: number;
    let lastUpdateTime = 0;

    const animate = (time: number) => {
      if (time - lastUpdateTime >= gameStateSnapshot.gameSpeed) {
        update();
        lastUpdateTime = time;
      }
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [gameState.gameStarted, gameState.gameOver, gameState.gameSpeed, update]);

  useEffect(() => {
    if (gameState.gameOver && onGameOver) {
      onGameOver(gameState.score);
    }
  }, [gameState.gameOver, gameState.score, onGameOver]);

  useEffect(() => {
    if (onScoreUpdate) {
      onScoreUpdate(gameState.score);
    }
  }, [gameState.score, onScoreUpdate]);

  // Reset game when it was running and now gameOver changed
  useEffect(() => {
    if (gameState.gameOver && gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  }, [gameState.gameOver]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cellSizePx = cellSize;
    const size = boardSize;

    canvas.width = cellSizePx * size;
    canvas.height = cellSizePx * size;

    // Clear
    ctx.fillStyle = "#0a0a23";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid background
    ctx.strokeStyle = "#1a1a3e";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= size; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSizePx, 0);
      ctx.lineTo(i * cellSizePx, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSizePx);
      ctx.lineTo(canvas.width, i * cellSizePx);
      ctx.stroke();
    }

    // Draw food
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(
      gameState.food.x * cellSizePx + cellSizePx / 2,
      gameState.food.y * cellSizePx + cellSizePx / 2,
      cellSizePx / 2.5,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw snake
    gameState.snake.forEach((segment, index) => {
      const x = segment.x * cellSizePx;
      const y = segment.y * cellSizePx;

      if (index === 0) {
        // Head - gradient blue/purple
        const gradient = ctx.createRadialGradient(
          x + cellSizePx / 2,
          y + cellSizePx / 2,
          0,
          x + cellSizePx / 2,
          y + cellSizePx / 2,
          cellSizePx / 2
        );
        gradient.addColorStop(0, "#3b82f6");
        gradient.addColorStop(1, "#8b5cf6");
        ctx.fillStyle = gradient;
      } else {
        // Body
        const intensity = Math.max(0.6, 1 - index * 0.05);
        ctx.fillStyle = `rgba(59, 130, 246, ${intensity})`;
      }

      ctx.fillRect(x, y, cellSizePx, cellSizePx);

      // Border
      ctx.strokeStyle = index === 0 ? "#ffffff" : "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellSizePx, cellSizePx);

      // Eyes on head
      if (index === 0) {
        ctx.fillStyle = "#000000";
        const eyeSize = 3;
        const eyeOffsetX = 5;
        const eyeOffsetY = 5;

        ctx.beginPath();
        ctx.arc(x + cellSizePx / 2 - eyeOffsetX, y + cellSizePx / 2 - eyeOffsetY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + cellSizePx / 2 + eyeOffsetX, y + cellSizePx / 2 - eyeOffsetY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw game over overlay
    if (!gameState.gameStarted && gameState.gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40);

      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillText(`Score: ${gameState.score}`, canvas.width / 2, canvas.height / 2);

      ctx.font = "16px system-ui, sans-serif";
      ctx.fillStyle = "#9945FF";
      ctx.fillText("Press ENTER to restart", canvas.width / 2, canvas.height / 2 + 40);
    } else if (!gameState.gameStarted) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SNAKE ARENA", canvas.width / 2, canvas.height / 2 - 20);

      ctx.font = "18px system-ui, sans-serif";
      ctx.fillStyle = "#9945FF";
      ctx.fillText("Press ENTER or SPACE to start", canvas.width / 2, canvas.height / 2 + 20);

      ctx.fillStyle = "#8b5cf6";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText("Use ARROW KEYS or WASD to move", canvas.width / 2, canvas.height / 2 + 50);
    }
  }, [gameState, boardSize, cellSize]);

  useInterval(draw, 16);

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div className="relative mb-4">
        <canvas
          ref={canvasRef}
          className="rounded-xl border-2 border-white/10 shadow-2xl bg-[#0a0a23]"
          style={{ imageRendering: "pixelated" }}
        />
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4 text-center">
          <div>
            <p className="text-white/50 text-xs">Score</p>
            <p className="text-2xl font-bold text-white">{gameState.score}</p>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div>
            <p className="text-white/50 text-xs">Length</p>
            <p className="text-2xl font-bold text-white">{gameState.snake.length}</p>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div>
            <p className="text-white/50 text-xs">Speed</p>
            <p className="text-2xl font-bold text-solana-blue">
              {Math.round(((initialSpeed - gameState.gameSpeed) / (initialSpeed - MAX_SPEED)) * 100)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const tick = () => {
      savedCallback.current();
    };

    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}
