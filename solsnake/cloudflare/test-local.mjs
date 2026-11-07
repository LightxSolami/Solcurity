import assert from "node:assert/strict";

const serverUrl = process.env.SOLSNAKE_LOCAL_URL || "ws://127.0.0.1:8787/ws";
let socket;
let receivedConfig = false;
let receivedStart = false;

try {
  const pageUrl = new URL(serverUrl);
  pageUrl.protocol = pageUrl.protocol === "wss:" ? "https:" : "http:";
  pageUrl.pathname = "/";
  const page = await fetch(pageUrl);
  assert.equal(page.ok, true);
  assert.match(await page.text(), /SOLSNAKE ONLINE/);

  socket = new WebSocket(serverUrl);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for a game snapshot.")), 20_000);

    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      console.log(`Worker message: ${message.t}`);
      if (message.t === "cfg") {
        receivedConfig = true;
        assert.equal(message.paid, false);
        socket.send(JSON.stringify({ t: "join", tier: "free", name: "LocalTest" }));
      } else if (message.t === "start") {
        receivedStart = true;
        socket.send(JSON.stringify({ t: "in", a: 0, b: false }));
      } else if (message.t === "s") {
        clearTimeout(timeout);
        resolve();
      } else if (message.t === "err") {
        clearTimeout(timeout);
        reject(new Error(message.msg));
      }
    });

    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("Could not connect to the local Worker."));
    });
  });

  assert.equal(receivedConfig, true);
  assert.equal(receivedStart, true);

  const paidSocket = new WebSocket(serverUrl);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out checking paid-room lock.")), 5_000);
    paidSocket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      if (message.t === "cfg") {
        paidSocket.send(JSON.stringify({ t: "join", tier: "0.5", wallet: "not-used" }));
      } else if (message.t === "err") {
        clearTimeout(timeout);
        assert.match(message.msg, /Only free rooms are available/);
        resolve();
      }
    });
    paidSocket.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("Could not verify the paid-room lock."));
    });
  });
  paidSocket.close();
  console.log("Cloudflare Worker WebSocket match passed.");
} finally {
  socket?.close();
}
