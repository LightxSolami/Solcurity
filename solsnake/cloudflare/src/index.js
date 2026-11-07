import { Match, DT, MAX } from "../../server/game.js";

const FILL_MS = 8_000;
const MAX_CONNECTIONS = 50;
const MAX_MESSAGE_LENGTH = 16_384;
const MAX_MESSAGES_PER_SECOND = 90;
const BOT_NAMES = ["Nova", "Vex", "Kira", "Zed", "Rex"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      if (url.pathname !== "/ws") {
        return new Response("Not found", { status: 404 });
      }
      const id = env.GAME_LOBBY.idFromName("free-room");
      return env.GAME_LOBBY.get(id).fetch(request);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }

    if (url.pathname === "/") {
      url.pathname = "/online.html";
    }
    return env.ASSETS.fetch(new Request(url, request));
  },
};

export class GameLobby {
  constructor(state) {
    this.state = state;
    this.clients = new Map();
    this.queue = [];
    this.match = null;
    this.queueTimer = null;
    this.gameTimer = null;
  }

  async fetch(request) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    if (this.clients.size >= MAX_CONNECTIONS) {
      return new Response("Game server is full", { status: 503 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();

    const player = {
      ws: server,
      name: "Player",
      bot: false,
      gone: false,
      joined: false,
      messages: 0,
      messageWindow: Date.now(),
      joinTimeout: null,
    };
    player.joinTimeout = setTimeout(() => {
      if (!player.joined) {
        this.closePlayer(player, 1008, "Join timed out");
      }
    }, 15_000);
    this.clients.set(server, player);

    server.addEventListener("message", (event) => this.onMessage(player, event.data));
    server.addEventListener("close", () => this.onClose(player));
    server.addEventListener("error", () => this.onClose(player));
    this.send(player, { t: "cfg", paid: false });

    return new Response(null, { status: 101, webSocket: client });
  }

  onMessage(player, data) {
    if (player.gone || typeof data !== "string" || data.length > MAX_MESSAGE_LENGTH) {
      this.closePlayer(player, 1009, "Invalid message");
      return;
    }

    const now = Date.now();
    if (now - player.messageWindow >= 1_000) {
      player.messageWindow = now;
      player.messages = 0;
    }
    if (++player.messages > MAX_MESSAGES_PER_SECOND) {
      this.closePlayer(player, 1008, "Too many messages");
      return;
    }

    let message;
    try {
      message = JSON.parse(data);
    } catch {
      this.closePlayer(player, 1007, "Invalid JSON");
      return;
    }

    if (message?.t === "join") {
      this.join(player, message);
      return;
    }

    if (message?.t === "in" && this.match) {
      const snake = this.match.S.find((item) => item.p === player);
      if (!snake?.alive) return;
      if (Number.isFinite(message.a)) {
        snake.ta = message.a % (Math.PI * 2);
      }
      snake.boost = message.b === true;
      return;
    }

    this.send(player, { t: "err", msg: "Unknown or unavailable game action." });
  }

  join(player, message) {
    if (player.joined) {
      this.send(player, { t: "err", msg: "This connection has already joined." });
      return;
    }
    if (message.tier && message.tier !== "free") {
      this.send(player, { t: "err", msg: "Only free rooms are available. SOL rooms are disabled." });
      this.closePlayer(player, 1008, "Paid rooms are disabled");
      return;
    }

    player.joined = true;
    clearTimeout(player.joinTimeout);
    player.name = String(message.name || "Player")
      .replace(/[^\w -]/g, "")
      .slice(0, 12) || "Player";
    this.queue.push(player);
    this.send(player, { t: "wait", n: this.queue.length, bots: true });

    if (!this.match && this.queue.length >= MAX) {
      this.startQueued(false);
    } else {
      this.scheduleQueueStart();
    }
  }

  scheduleQueueStart() {
    if (this.match || this.queueTimer || this.queue.length === 0) return;
    if (this.queue.length >= MAX) {
      this.startQueued(false);
      return;
    }
    this.queueTimer = setTimeout(() => {
      this.queueTimer = null;
      this.startQueued(true);
    }, FILL_MS);
  }

  startQueued(fillWithBots) {
    clearTimeout(this.queueTimer);
    this.queueTimer = null;
    if (this.match || this.queue.length === 0) return;

    const humans = this.queue.splice(0, MAX);
    const players = [...humans];
    if (fillWithBots) {
      for (let i = 0; players.length < MAX; i++) {
        players.push({ bot: true, name: BOT_NAMES[i], gone: false });
      }
    }

    const match = new Match(players, (finishedMatch) => this.finishMatch(finishedMatch));
    this.match = match;
    humans.forEach((player) => this.send(player, { t: "start" }));
    this.gameTimer = setInterval(() => {
      match.tick();
      if (!match.over) {
        for (const snake of match.S) {
          if (!snake.bot && !snake.p.gone) {
            this.send(snake.p, match.snapFor(snake));
          }
        }
      }
    }, DT * 1_000);
  }

  finishMatch(match) {
    clearInterval(this.gameTimer);
    this.gameTimer = null;
    if (this.match !== match) return;

    for (const snake of match.S) {
      if (snake.bot || snake.p.gone) continue;
      this.send(snake.p, {
        t: "end",
        place: snake.place || MAX,
        len: Math.round(snake.len),
        kills: snake.k,
      });
      this.closePlayer(snake.p, 1000, "Match finished");
    }
    this.match = null;
    this.scheduleQueueStart();
  }

  send(player, message) {
    if (player.gone) return;
    try {
      player.ws.send(typeof message === "string" ? message : JSON.stringify(message));
    } catch {
      this.onClose(player);
    }
  }

  closePlayer(player, code, reason) {
    if (player.gone) return;
    try {
      player.ws.close(code, reason);
    } catch {
      this.onClose(player);
    }
  }

  onClose(player) {
    if (player.gone) return;
    player.gone = true;
    clearTimeout(player.joinTimeout);
    this.clients.delete(player.ws);
    this.queue = this.queue.filter((queuedPlayer) => queuedPlayer !== player);
    if (!this.match && this.queue.length === 0) {
      clearTimeout(this.queueTimer);
      this.queueTimer = null;
    } else {
      this.scheduleQueueStart();
    }
  }
}
